const mongoose = require('mongoose');
const Farmer = require('../models/Farmer');
const Supply = require('../models/Supply');
const Booking = require('../models/Booking');
const twilio = require('twilio');

// Initialize Twilio Client
let twilioClient = null;
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
  twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
}

// Helper to send real SMS via Twilio
async function sendSmsNotification(phone, text) {
  if (!twilioClient) {
    console.log(`[SMS LOG] Twilio credentials not configured. Mock output:\n${text}`);
    return;
  }
  
  if (process.env.TWILIO_ACCOUNT_SID === 'ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX') {
    console.log(`[SMS LOG] Twilio placeholder credentials detected. SMS dispatch skipped. Mock output:\n${text}`);
    return;
  }

  try {
    // Prepends Indian country code (+91)
    const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;
    await twilioClient.messages.create({
      body: text,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: formattedPhone
    });
    console.log(`[SMS SUCCESS] Real SMS successfully sent to ${formattedPhone}`);
  } catch (error) {
    console.error(`[SMS ERROR] Failed to send real SMS: ${error.message}`);
  }
}

// Helper to introduce latency (simulating real-world processing/payment check delay)
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Dynamic Quota Configuration
const QUOTA_PER_ACRE = {
  seeds: 50,      // 50 KG seeds per acre
  fertilizers: 100 // 100 KG fertilizers per acre
};

// Lock to serialize booking requests per farmer for safe concurrency
const farmerLocks = new Set();

/**
 * HELPER: Calculates dynamic quota and current utilization for a farmer based on selected khasras
 */
async function calculateQuotaStatus(farmer, selectedKhasras, category) {
  const matchedParcels = farmer.landParcels.filter(p => selectedKhasras.includes(p.khasraNo));
  const totalAcreage = matchedParcels.reduce((sum, p) => sum + p.sizeAcres, 0);
  
  const limitPerAcre = QUOTA_PER_ACRE[category] || 0;
  const maxAllowed = Math.floor(totalAcreage * limitPerAcre);

  const pastBookings = await Booking.find({
    farmerId: farmer._id,
    selectedKhasras: { $in: selectedKhasras },
    status: 'Completed'
  }).populate('supplyId');

  let used = 0;
  for (const b of pastBookings) {
    if (b.supplyId && b.supplyId.category === category) {
      used += b.quantity;
    }
  }

  return {
    totalAcreage,
    maxAllowed,
    used,
    remaining: Math.max(0, maxAllowed - used)
  };
}

/**
 * UNSAFE BOOKING (Demonstrates Race Conditions with Cart items)
 * Read-then-write check. Vulnerable to multiple submissions at once.
 */
exports.bookUnsafe = async (req, res) => {
  const { farmerId, items, selectedKhasras, pincode, deliveryAddress } = req.body; // items: [{ supplyId, quantity, selectedDealer }]

  try {
    if (!farmerId || !mongoose.Types.ObjectId.isValid(farmerId)) {
      return res.status(400).json({ success: false, error: 'Valid farmerId is required' });
    }

    const farmer = await Farmer.findById(farmerId);
    if (!farmer) return res.status(404).json({ success: false, error: 'Farmer not found' });

    if (!selectedKhasras || !Array.isArray(selectedKhasras) || selectedKhasras.length === 0) {
      return res.status(400).json({ success: false, error: 'Please select at least one land Khasra record' });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: 'No items in the booking list' });
    }

    const hasInvalidQty = items.some(i => !i || !i.supplyId || !i.quantity || typeof i.quantity !== 'number' || i.quantity <= 0 || !Number.isInteger(i.quantity));
    if (hasInvalidQty) {
      return res.status(400).json({ success: false, error: 'Invalid booking quantity. Quantity must be a positive integer.' });
    }

    if (!pincode || !deliveryAddress) {
      return res.status(400).json({ success: false, error: 'Pincode and shipping address are required.' });
    }

    // 1. Gather all supplies to check stock and categories
    const supplyIds = items.map(i => i.supplyId);
    const supplies = await Supply.find({ _id: { $in: supplyIds } });

    if (supplies.length !== new Set(supplyIds.map(String)).size) {
      return res.status(404).json({ success: false, error: 'One or more items in your cart could not be found.' });
    }

    // Map items with supply details
    const cartItems = items.map(item => {
      const supply = supplies.find(s => s._id.toString() === item.supplyId.toString());
      return { ...item, category: supply.category, name: supply.name, marketPrice: supply.marketPrice, subsidizedPrice: supply.subsidizedPrice, currentStock: supply.stock, supplyDoc: supply };
    });

    // 2. Sum up quantities by category
    let seedsRequested = 0;
    let fertilizersRequested = 0;
    for (const item of cartItems) {
      if (item.category === 'seeds') seedsRequested += item.quantity;
      if (item.category === 'fertilizers') fertilizersRequested += item.quantity;
    }

    // 3. Quota check (UNSAFE - read phase)
    if (seedsRequested > 0) {
      const seedsQuota = await calculateQuotaStatus(farmer, selectedKhasras, 'seeds');
      if (seedsRequested > seedsQuota.remaining) {
        return res.status(400).json({ success: false, error: `Seeds request (${seedsRequested} KG) exceeds remaining quota (${seedsQuota.remaining} KG).` });
      }
    }
    if (fertilizersRequested > 0) {
      const fertQuota = await calculateQuotaStatus(farmer, selectedKhasras, 'fertilizers');
      if (fertilizersRequested > fertQuota.remaining) {
        return res.status(400).json({ success: false, error: `Fertilizer request (${fertilizersRequested} KG) exceeds remaining quota (${fertQuota.remaining} KG).` });
      }
    }

    // 4. Stock check (UNSAFE - read phase)
    for (const item of cartItems) {
      if (item.currentStock < item.quantity) {
        return res.status(400).json({ success: false, error: `Insufficient stock for ${item.name}. Available: ${item.currentStock}` });
      }
    }

    // Simulate high latency / payment gateway delays (1.5 seconds)
    await sleep(1500);

    // 5. Update stock and save (UNSAFE - read then write)
    const bookings = [];
    for (const item of cartItems) {
      item.supplyDoc.stock -= item.quantity;
      await item.supplyDoc.save();

      // Apply a 30% price markup surcharge if selectedDealer is Private Shop
      const isPrivate = item.selectedDealer && item.selectedDealer.includes('(Private Shop)');
      const finalPrice = isPrivate ? Math.round(item.subsidizedPrice * 1.30) : item.subsidizedPrice;

      const booking = await Booking.create({
        farmerId,
        supplyId: item.supplyId,
        quantity: item.quantity,
        priceType: 'subsidized',
        totalPrice: item.quantity * finalPrice,
        selectedKhasras,
        selectedDealer: item.selectedDealer || 'PACS Rampur (Cooperative Society - Govt)',
        pincode,
        deliveryAddress,
        status: 'Completed'
      });
      bookings.push(booking);
    }

    // Send SMS receipt via Twilio SMS helper
    const smsText = `Dear ${farmer.name}, your E-Vikas allocation has been confirmed! E-Token: EV-REC-${bookings[0]._id.toString().substring(12).toUpperCase()}. Items: ${cartItems.map(i => `${i.quantity} KG ${i.name}`).join(', ')}. Pick-up Dealer: ${bookings[0].selectedDealer || 'PACS Rampur'}`;
    await sendSmsNotification(farmer.phone, smsText);

    res.json({
      success: true,
      message: 'Unsafe booking completed (Race conditions likely occurred)',
      bookings
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * SAFE BOOKING (Cart-based Concurrency Protected)
 * Uses Atomic MongoDB updates with complete rollback logic on failure.
 */
exports.bookSafe = async (req, res) => {
  const { farmerId, items, selectedKhasras, pincode, deliveryAddress } = req.body; // items: [{ supplyId, quantity, selectedDealer }]

  if (!farmerId || !mongoose.Types.ObjectId.isValid(farmerId)) {
    return res.status(400).json({ success: false, error: 'Valid farmerId is required' });
  }

  // Lock farmer transactions
  while (farmerLocks.has(farmerId)) {
    await sleep(50);
  }

  try {
    farmerLocks.add(farmerId);

    const farmer = await Farmer.findById(farmerId);
    if (!farmer) return res.status(404).json({ success: false, error: 'Farmer not found' });

    if (!selectedKhasras || !Array.isArray(selectedKhasras) || selectedKhasras.length === 0) {
      return res.status(400).json({ success: false, error: 'Please select at least one land Khasra record' });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: 'No items in the booking list' });
    }

    const hasInvalidQty = items.some(i => !i || !i.supplyId || !i.quantity || typeof i.quantity !== 'number' || i.quantity <= 0 || !Number.isInteger(i.quantity));
    if (hasInvalidQty) {
      return res.status(400).json({ success: false, error: 'Invalid booking quantity. Quantity must be a positive integer.' });
    }

    if (!pincode || !deliveryAddress) {
      return res.status(400).json({ success: false, error: 'Pincode and shipping address are required.' });
    }

    // Gather supplies
    const supplyIds = items.map(i => i.supplyId);
    const supplies = await Supply.find({ _id: { $in: supplyIds } });

    if (supplies.length !== new Set(supplyIds.map(String)).size) {
      return res.status(404).json({ success: false, error: 'One or more items in your cart could not be found.' });
    }

    const cartItems = items.map(item => {
      const supply = supplies.find(s => s._id.toString() === item.supplyId.toString());
      return { ...item, category: supply.category, name: supply.name, marketPrice: supply.marketPrice, subsidizedPrice: supply.subsidizedPrice };
    });

    // 1. Calculate quota check (SAFE: locked per farmer)
    let seedsRequested = 0;
    let fertilizersRequested = 0;
    for (const item of cartItems) {
      if (item.category === 'seeds') seedsRequested += item.quantity;
      if (item.category === 'fertilizers') fertilizersRequested += item.quantity;
    }

    if (seedsRequested > 0) {
      const seedsQuota = await calculateQuotaStatus(farmer, selectedKhasras, 'seeds');
      if (seedsRequested > seedsQuota.remaining) {
        return res.status(400).json({ success: false, error: `Seeds request (${seedsRequested} KG) exceeds remaining quota (${seedsQuota.remaining} KG).` });
      }
    }
    if (fertilizersRequested > 0) {
      const fertQuota = await calculateQuotaStatus(farmer, selectedKhasras, 'fertilizers');
      if (fertilizersRequested > fertQuota.remaining) {
        return res.status(400).json({ success: false, error: `Fertilizer request (${fertilizersRequested} KG) exceeds remaining quota (${fertQuota.remaining} KG).` });
      }
    }

    // 2. Perform ATOMIC stock reservations with rollback support
    const completedReservations = [];
    let reservationFailed = false;
    let failedItemName = '';

    for (const item of cartItems) {
      const updatedSupply = await Supply.findOneAndUpdate(
        { _id: item.supplyId, stock: { $gte: item.quantity } },
        { $inc: { stock: -item.quantity } },
        { new: true }
      );

      if (!updatedSupply) {
        reservationFailed = true;
        failedItemName = item.name;
        break;
      }
      completedReservations.push({ supplyId: item.supplyId, quantity: item.quantity });
    }

    // If reservation fails for any item, ROLLBACK everything that was reserved
    if (reservationFailed) {
      for (const res of completedReservations) {
        await Supply.findByIdAndUpdate(res.supplyId, { $inc: { stock: res.quantity } });
      }
      return res.status(400).json({ success: false, error: `Booking failed: Insufficient stock for ${failedItemName}` });
    }

    // Simulate payment transaction step (200ms)
    await sleep(200);

    // 3. Create Booking records
    const bookings = [];
    for (const item of cartItems) {
      // Apply a 30% price markup surcharge if selectedDealer is Private Shop
      const isPrivate = item.selectedDealer && item.selectedDealer.includes('(Private Shop)');
      const finalPrice = isPrivate ? Math.round(item.subsidizedPrice * 1.30) : item.subsidizedPrice;

      const booking = await Booking.create({
        farmerId,
        supplyId: item.supplyId,
        quantity: item.quantity,
        priceType: 'subsidized',
        totalPrice: item.quantity * finalPrice,
        selectedKhasras,
        selectedDealer: item.selectedDealer || 'PACS Rampur (Cooperative Society - Govt)',
        pincode,
        deliveryAddress,
        status: 'Completed'
      });
      bookings.push(booking);
    }

    // Send SMS receipt via Twilio SMS helper
    const smsText = `Dear ${farmer.name}, your E-Vikas allocation has been confirmed! E-Token: EV-REC-${bookings[0]._id.toString().substring(12).toUpperCase()}. Items: ${cartItems.map(i => `${i.quantity} KG ${i.name}`).join(', ')}. Pick-up Dealer: ${bookings[0].selectedDealer || 'PACS Rampur'}`;
    await sendSmsNotification(farmer.phone, smsText);

    res.json({
      success: true,
      message: 'Safe booking completed successfully!',
      bookings
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  } finally {
    farmerLocks.delete(farmerId); // Release lock
  }
};

// Export helper functions for modular testing
exports.calculateQuotaStatus = calculateQuotaStatus;
exports.QUOTA_PER_ACRE = QUOTA_PER_ACRE;
exports.sendSmsNotification = sendSmsNotification;

