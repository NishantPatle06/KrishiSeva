const { connectTestDB, clearTestDB, disconnectTestDB } = require('../setup/db');
const { calculateQuotaStatus, QUOTA_PER_ACRE } = require('../../src/controllers/bookingController');
const { seedTestFarmer, seedTestSupply } = require('../fixtures/data');
const Booking = require('../../src/models/Booking');

describe('Unit: Subsidy Quota Calculation Logic', () => {
  let farmer;
  let supplySeeds;

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
        { khasraNo: 'K101', sizeAcres: 2.0, location: 'Field 1' },
        { khasraNo: 'K102', sizeAcres: 3.0, location: 'Field 2' }
      ]
    });
    supplySeeds = await seedTestSupply();
  });

  test('verifies statutory quota rates per acre', () => {
    expect(QUOTA_PER_ACRE.seeds).toBe(50);
    expect(QUOTA_PER_ACRE.fertilizers).toBe(100);
  });

  test('calculates correct quota for selected land parcel', async () => {
    // Only K101 selected: 2.0 acres -> seeds max = 2.0 * 50 = 100
    const quota = await calculateQuotaStatus(farmer, ['K101'], 'seeds');
    expect(quota.totalAcreage).toBe(2.0);
    expect(quota.maxAllowed).toBe(100);
    expect(quota.used).toBe(0);
    expect(quota.remaining).toBe(100);
  });

  test('calculates aggregated quota across multiple selected land parcels', async () => {
    // Both K101 and K102 selected: 2.0 + 3.0 = 5.0 acres -> fertilizers max = 5.0 * 100 = 500
    const quota = await calculateQuotaStatus(farmer, ['K101', 'K102'], 'fertilizers');
    expect(quota.totalAcreage).toBe(5.0);
    expect(quota.maxAllowed).toBe(500);
    expect(quota.used).toBe(0);
    expect(quota.remaining).toBe(500);
  });

  test('deducts past completed bookings against selected khasras and category', async () => {
    // Create a completed booking of 40 KG seeds on K101
    await Booking.create({
      farmerId: farmer._id,
      supplyId: supplySeeds._id,
      quantity: 40,
      priceType: 'subsidized',
      totalPrice: 12000,
      selectedKhasras: ['K101'],
      selectedDealer: 'PACS Rampur',
      pincode: '462001',
      deliveryAddress: 'Village Rampur',
      status: 'Completed'
    });

    const quota = await calculateQuotaStatus(farmer, ['K101'], 'seeds');
    expect(quota.totalAcreage).toBe(2.0);
    expect(quota.maxAllowed).toBe(100);
    expect(quota.used).toBe(40);
    expect(quota.remaining).toBe(60);
  });

  test('ignores pending or failed past bookings when computing utilized quota', async () => {
    await Booking.create({
      farmerId: farmer._id,
      supplyId: supplySeeds._id,
      quantity: 40,
      priceType: 'subsidized',
      totalPrice: 12000,
      selectedKhasras: ['K101'],
      selectedDealer: 'PACS Rampur',
      pincode: '462001',
      deliveryAddress: 'Village Rampur',
      status: 'Failed'
    });

    const quota = await calculateQuotaStatus(farmer, ['K101'], 'seeds');
    expect(quota.used).toBe(0);
    expect(quota.remaining).toBe(100);
  });

  test('does not allow remaining quota to fall below zero', async () => {
    // Artificial booking of 120 KG seeds on parcel with only 100 KG quota
    await Booking.create({
      farmerId: farmer._id,
      supplyId: supplySeeds._id,
      quantity: 120,
      priceType: 'subsidized',
      totalPrice: 36000,
      selectedKhasras: ['K101'],
      selectedDealer: 'PACS Rampur',
      pincode: '462001',
      deliveryAddress: 'Village Rampur',
      status: 'Completed'
    });

    const quota = await calculateQuotaStatus(farmer, ['K101'], 'seeds');
    expect(quota.used).toBe(120);
    expect(quota.remaining).toBe(0);
  });

  test('returns 0 quota when selected khasra does not belong to farmer', async () => {
    const quota = await calculateQuotaStatus(farmer, ['NON_EXISTENT_KHASRA'], 'seeds');
    expect(quota.totalAcreage).toBe(0);
    expect(quota.maxAllowed).toBe(0);
    expect(quota.remaining).toBe(0);
  });
});
