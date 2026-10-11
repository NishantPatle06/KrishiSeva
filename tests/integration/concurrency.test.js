const request = require('supertest');
const app = require('../../src/server');
const { connectTestDB, clearTestDB, disconnectTestDB } = require('../setup/db');
const { seedTestFarmer, seedTestSupply } = require('../fixtures/data');
const Supply = require('../../src/models/Supply');
const Booking = require('../../src/models/Booking');

describe('Integration: High-Concurrency Inventory Reservation & Race Condition Verification', () => {
  beforeAll(async () => {
    await connectTestDB();
  });

  afterAll(async () => {
    await disconnectTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
  });

  test('SAFE CONCURRENCY: guarantees stock never falls below 0 when 3 concurrent requests compete for the same inventory', async () => {
    // Inventory starting at exactly 10 units
    const supply = await seedTestSupply({ stock: 10 });

    // Seed 3 distinct farmers so process-level farmerLocks do not block each other
    const farmer1 = await seedTestFarmer({ phone: '9876543201', aadhaar: '111111111111' });
    const farmer2 = await seedTestFarmer({ phone: '9876543202', aadhaar: '222222222222' });
    const farmer3 = await seedTestFarmer({ phone: '9876543203', aadhaar: '333333333333' });

    const makeBooking = (farmer) => {
      return request(app)
        .post('/api/book/safe')
        .send({
          farmerId: farmer._id.toString(),
          items: [{ supplyId: supply._id.toString(), quantity: 10 }],
          selectedKhasras: ['101/1'],
          pincode: '462001',
          deliveryAddress: 'Village Rampur'
        });
    };

    // Fire 3 simultaneous booking requests against the single available stock
    const responses = await Promise.all([
      makeBooking(farmer1),
      makeBooking(farmer2),
      makeBooking(farmer3)
    ]);

    const successes = responses.filter(r => r.status === 200 && r.body.success === true);
    const failures = responses.filter(r => r.status === 400 && r.body.success === false);

    // EXACTLY 1 request should acquire the 10 units; the other 2 MUST be rejected
    expect(successes).toHaveLength(1);
    expect(failures).toHaveLength(2);

    // MongoDB validation: final stock MUST be 0, never negative
    const finalSupply = await Supply.findById(supply._id);
    expect(finalSupply.stock).toBe(0);

    // Only 1 booking persisted in database
    const totalBookings = await Booking.countDocuments();
    expect(totalBookings).toBe(1);
  });

  test('SAFE CONCURRENCY: handles 5 concurrent partial claims with exact exhaustion', async () => {
    // Inventory starting at 15 units
    const supply = await seedTestSupply({ stock: 15 });

    // 5 distinct farmers each requesting 5 units (total 25 units requested against 15)
    const farmers = await Promise.all([
      seedTestFarmer({ phone: '9100000001', aadhaar: '100000000001' }),
      seedTestFarmer({ phone: '9100000002', aadhaar: '100000000002' }),
      seedTestFarmer({ phone: '9100000003', aadhaar: '100000000003' }),
      seedTestFarmer({ phone: '9100000004', aadhaar: '100000000004' }),
      seedTestFarmer({ phone: '9100000005', aadhaar: '100000000005' })
    ]);

    const responses = await Promise.all(
      farmers.map(farmer =>
        request(app)
          .post('/api/book/safe')
          .send({
            farmerId: farmer._id.toString(),
            items: [{ supplyId: supply._id.toString(), quantity: 5 }],
            selectedKhasras: ['101/1'],
            pincode: '462001',
            deliveryAddress: 'Village Rampur'
          })
      )
    );

    const successfulBookings = responses.filter(r => r.status === 200);
    const failedBookings = responses.filter(r => r.status === 400);

    // Exactly 3 succeed (3 * 5 = 15 units claimed); exactly 2 fail
    expect(successfulBookings).toHaveLength(3);
    expect(failedBookings).toHaveLength(2);

    const finalSupply = await Supply.findById(supply._id);
    expect(finalSupply.stock).toBe(0);

    const totalBookings = await Booking.countDocuments();
    expect(totalBookings).toBe(3);
  });

  test('UNSAFE RACE CONDITION: demonstrates inventory over-allocation under concurrent requests', async () => {
    // Note: Supply schema has min: 0 on stock, but Mongoose findOne/save without runValidators
    // bypasses validation in the original bookUnsafe implementation.
    const supply = await seedTestSupply({ stock: 10 });

    const farmerA = await seedTestFarmer({ phone: '9200000001', aadhaar: '200000000001' });
    const farmerB = await seedTestFarmer({ phone: '9200000002', aadhaar: '200000000002' });

    const makeUnsafeBooking = (farmer) => {
      return request(app)
        .post('/api/book/unsafe')
        .send({
          farmerId: farmer._id.toString(),
          items: [{ supplyId: supply._id.toString(), quantity: 10 }],
          selectedKhasras: ['101/1'],
          pincode: '462001',
          deliveryAddress: 'Village Rampur'
        });
    };

    // Both requests read stock=10, pause 1.5s, then decrement
    const [resA, resB] = await Promise.all([
      makeUnsafeBooking(farmerA),
      makeUnsafeBooking(farmerB)
    ]);

    // In unsafe endpoint, BOTH requests erroneously succeed due to the read-then-write race
    expect(resA.status).toBe(200);
    expect(resB.status).toBe(200);

    // Stock falls to 0 or below (over-allocated by 10 bags)
    const finalSupply = await Supply.findById(supply._id);
    expect(finalSupply.stock).toBeLessThanOrEqual(0);

    // Both bookings were recorded, causing over-distribution
    const totalBookings = await Booking.countDocuments();
    expect(totalBookings).toBe(2);
  }, 10000); // 10s timeout to accommodate 1.5s simulated delay in bookUnsafe
});
