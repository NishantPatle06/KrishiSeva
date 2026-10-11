const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../src/server');
const { connectTestDB, clearTestDB, disconnectTestDB } = require('../setup/db');
const { seedTestFarmer, seedTestSupply, seedFertilizerSupply } = require('../fixtures/data');
const Supply = require('../../src/models/Supply');
const Booking = require('../../src/models/Booking');

describe('Integration: Booking Lifecycle and Atomic Stock Reservation', () => {
  let farmer;
  let seedSupply;
  let fertilizerSupply;

  beforeAll(async () => {
    await connectTestDB();
  });

  afterAll(async () => {
    await disconnectTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
    farmer = await seedTestFarmer({
      landParcels: [
        { khasraNo: 'K101', sizeAcres: 2.0, location: 'Field 1' } // Seeds quota: 100 KG, Fert: 200 KG
      ]
    });
    seedSupply = await seedTestSupply({ stock: 50 });
    fertilizerSupply = await seedFertilizerSupply({ stock: 100 });
  });

  test('successfully processes valid safe booking and decrements stock', async () => {
    const payload = {
      farmerId: farmer._id.toString(),
      items: [
        {
          supplyId: seedSupply._id.toString(),
          quantity: 20,
          selectedDealer: 'PACS Rampur (Cooperative Society - Govt)'
        }
      ],
      selectedKhasras: ['K101'],
      pincode: '462001',
      deliveryAddress: 'Village Rampur, Bhopal'
    };

    const res = await request(app)
      .post('/api/book/safe')
      .send(payload);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.bookings).toHaveLength(1);
    expect(res.body.bookings[0].status).toBe('Completed');
    expect(res.body.bookings[0].quantity).toBe(20);

    // Verify stock decremented in DB
    const updatedSupply = await Supply.findById(seedSupply._id);
    expect(updatedSupply.stock).toBe(30);

    // Verify booking record persisted
    const bookingsInDb = await Booking.find({ farmerId: farmer._id });
    expect(bookingsInDb).toHaveLength(1);
  });

  test('rejects booking with missing or invalid farmerId', async () => {
    const res = await request(app)
      .post('/api/book/safe')
      .send({
        farmerId: 'invalid-id',
        items: [{ supplyId: seedSupply._id.toString(), quantity: 10 }],
        selectedKhasras: ['K101'],
        pincode: '462001',
        deliveryAddress: 'Village Rampur'
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('rejects booking when farmer does not exist', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app)
      .post('/api/book/safe')
      .send({
        farmerId: fakeId.toString(),
        items: [{ supplyId: seedSupply._id.toString(), quantity: 10 }],
        selectedKhasras: ['K101'],
        pincode: '462001',
        deliveryAddress: 'Village Rampur'
      });

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/Farmer not found/i);
  });

  test('rejects booking with missing land khasras', async () => {
    const res = await request(app)
      .post('/api/book/safe')
      .send({
        farmerId: farmer._id.toString(),
        items: [{ supplyId: seedSupply._id.toString(), quantity: 10 }],
        selectedKhasras: [],
        pincode: '462001',
        deliveryAddress: 'Village Rampur'
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/select at least one land Khasra/i);
  });

  test('rejects booking with empty items array', async () => {
    const res = await request(app)
      .post('/api/book/safe')
      .send({
        farmerId: farmer._id.toString(),
        items: [],
        selectedKhasras: ['K101'],
        pincode: '462001',
        deliveryAddress: 'Village Rampur'
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/No items in the booking list/i);
  });

  test('rejects booking with negative or zero quantity', async () => {
    const res = await request(app)
      .post('/api/book/safe')
      .send({
        farmerId: farmer._id.toString(),
        items: [{ supplyId: seedSupply._id.toString(), quantity: -5 }],
        selectedKhasras: ['K101'],
        pincode: '462001',
        deliveryAddress: 'Village Rampur'
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Invalid booking quantity/i);
  });

  test('rejects booking with non-existent supply items', async () => {
    const fakeSupplyId = new mongoose.Types.ObjectId();
    const res = await request(app)
      .post('/api/book/safe')
      .send({
        farmerId: farmer._id.toString(),
        items: [{ supplyId: fakeSupplyId.toString(), quantity: 10 }],
        selectedKhasras: ['K101'],
        pincode: '462001',
        deliveryAddress: 'Village Rampur'
      });

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/could not be found/i);
  });

  test('rejects booking when requested quantity exceeds available stock', async () => {
    // Current stock is 50, requested is 60
    const res = await request(app)
      .post('/api/book/safe')
      .send({
        farmerId: farmer._id.toString(),
        items: [{ supplyId: seedSupply._id.toString(), quantity: 60 }],
        selectedKhasras: ['K101'],
        pincode: '462001',
        deliveryAddress: 'Village Rampur'
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Insufficient stock/i);

    // Stock must remain unchanged
    const supplyCheck = await Supply.findById(seedSupply._id);
    expect(supplyCheck.stock).toBe(50);
  });

  test('rejects booking when requested quantity exceeds subsidy quota for land', async () => {
    // K101 is 2.0 acres -> Seeds quota = 100 KG.
    // Set inventory stock very high (500 KG)
    seedSupply.stock = 500;
    await seedSupply.save();

    // Request 120 KG (exceeds 100 KG quota)
    const res = await request(app)
      .post('/api/book/safe')
      .send({
        farmerId: farmer._id.toString(),
        items: [{ supplyId: seedSupply._id.toString(), quantity: 120 }],
        selectedKhasras: ['K101'],
        pincode: '462001',
        deliveryAddress: 'Village Rampur'
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/exceeds remaining quota/i);

    // Stock must remain intact
    const supplyCheck = await Supply.findById(seedSupply._id);
    expect(supplyCheck.stock).toBe(500);
  });

  test('atomically rolls back reserved stock when later cart item reservation fails', async () => {
    // seedSupply has stock: 50, fertilizerSupply has stock: 5
    // Cart requests:
    // Item 1: seedSupply quantity 20 (feasible)
    // Item 2: fertilizerSupply quantity 20 (fails: 5 < 20)
    fertilizerSupply.stock = 5;
    await fertilizerSupply.save();

    const res = await request(app)
      .post('/api/book/safe')
      .send({
        farmerId: farmer._id.toString(),
        items: [
          { supplyId: seedSupply._id.toString(), quantity: 20 },
          { supplyId: fertilizerSupply._id.toString(), quantity: 20 }
        ],
        selectedKhasras: ['K101'],
        pincode: '462001',
        deliveryAddress: 'Village Rampur'
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Insufficient stock/i);

    // ROLLBACK VERIFICATION:
    // seedSupply must be restored to 50 (NOT 30!)
    const seedCheck = await Supply.findById(seedSupply._id);
    expect(seedCheck.stock).toBe(50);

    // fertilizerSupply remains 5
    const fertCheck = await Supply.findById(fertilizerSupply._id);
    expect(fertCheck.stock).toBe(5);

    // No bookings created
    const bookingCount = await Booking.countDocuments();
    expect(bookingCount).toBe(0);
  });
});
