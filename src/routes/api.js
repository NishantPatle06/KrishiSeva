const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const Farmer = require('../models/Farmer');
const Supply = require('../models/Supply');
const Booking = require('../models/Booking');

// Mock OTP Generator
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// Route: Send OTP (Mock)
router.post('/auth/send-otp', async (req, res) => {
  const { phone } = req.body;
  try {
    const farmer = await Farmer.findOne({ phone });
    if (!farmer) {
      return res.status(404).json({ success: false, error: 'Phone number not registered under any Farmer profile.' });
    }

    const otp = generateOTP();
    const expiry = new Date(Date.now() + 5 * 60 * 1000); // 5 mins

    farmer.otp = otp;
    farmer.otpExpires = expiry;
    await farmer.save();

    console.log(`\n====================================`);
    console.log(`[OTP SERVICE] Send to ${phone}: OTP is ${otp}`);
    console.log(`====================================\n`);

    res.json({ 
      success: true, 
      message: 'OTP sent to registered phone (Simulated).', 
      mockOtp: otp 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Route: Verify OTP
router.post('/auth/verify-otp', async (req, res) => {
  const { phone, otp } = req.body;
  try {
    const farmer = await Farmer.findOne({ phone });
    if (!farmer) return res.status(404).json({ success: false, error: 'Farmer profile not found.' });

    if (!farmer.otp || farmer.otp !== otp || new Date() > farmer.otpExpires) {
      return res.status(400).json({ success: false, error: 'Invalid or expired OTP.' });
    }

    farmer.otp = null;
    farmer.otpExpires = null;
    await farmer.save();

    res.json({ success: true, message: 'OTP verified successfully.', farmer });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Route: Fetch Farmer Profile Details
router.get('/farmer/:id', async (req, res) => {
  try {
    const farmer = await Farmer.findById(req.params.id);
    if (!farmer) return res.status(404).json({ success: false, error: 'Farmer not found' });
    res.json({ success: true, farmer });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Route: Get supplies catalog
router.get('/supplies', async (req, res) => {
  try {
    const supplies = await Supply.find({});
    res.json({ success: true, supplies });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Route: Calculate Quota Dynamic Status
router.post('/farmer/:id/quota-status', async (req, res) => {
  const { selectedKhasras, category } = req.body;
  try {
    const farmer = await Farmer.findById(req.params.id);
    if (!farmer) return res.status(404).json({ success: false, error: 'Farmer not found' });

    const QUOTA_PER_ACRE = { seeds: 50, fertilizers: 100 };
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

    res.json({
      success: true,
      quota: {
        totalAcreage,
        maxAllowed,
        used,
        remaining: Math.max(0, maxAllowed - used)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Booking Routes
router.post('/book/unsafe', bookingController.bookUnsafe);
router.post('/book/safe', bookingController.bookSafe);

// Reset Database API
router.post('/reset', async (req, res) => {
  const { farmerId } = req.body;
  try {
    await Booking.deleteMany({});
    
    // Reset supplies inventory to KG scale
    await Supply.updateOne({ name: 'Certified Wheat Seeds (HD-2967)' }, { stock: 500 });
    await Supply.updateOne({ name: 'Paddy Seeds (IR-64)' }, { stock: 1000 });
    await Supply.updateOne({ name: 'Hybrid Maize Seeds' }, { stock: 800 });
    await Supply.updateOne({ name: 'Government Neem-Coated Urea (Soda)' }, { stock: 5000 });
    await Supply.updateOne({ name: 'Di-Ammonium Phosphate (DAP)' }, { stock: 4000 });
    await Supply.updateOne({ name: 'Muriate of Potash (MOP)' }, { stock: 3000 });
    await Supply.updateOne({ name: 'Single Super Phosphate (SSP)' }, { stock: 2000 });
    await Supply.updateOne({ name: 'Granular NPK Complex' }, { stock: 2500 });

    let farmer = null;
    if (farmerId) {
      farmer = await Farmer.findById(farmerId);
    } else {
      farmer = await Farmer.findOne();
    }

    const supplies = await Supply.find();
    res.json({ success: true, message: 'Database reset successful', farmer, supplies });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
