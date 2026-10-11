const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../src/server');
const { connectTestDB, clearTestDB, disconnectTestDB } = require('../setup/db');
const { seedTestFarmer } = require('../fixtures/data');
const Farmer = require('../../src/models/Farmer');

describe('Integration: Authentication and Farmer Authorization Flow', () => {
  let farmer;

  beforeAll(async () => {
    await connectTestDB();
  });

  afterAll(async () => {
    await disconnectTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
    farmer = await seedTestFarmer({
      phone: '9876543210'
    });
  });

  describe('POST /api/auth/send-otp', () => {
    test('returns 400 when phone number is missing or empty', async () => {
      const res = await request(app)
        .post('/api/auth/send-otp')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/Phone number is required/i);
    });

    test('returns 404 when phone number is not registered under any farmer profile', async () => {
      const res = await request(app)
        .post('/api/auth/send-otp')
        .send({ phone: '9999999999' });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/not registered/i);
    });

    test('successfully generates 6-digit OTP and stores on farmer document', async () => {
      const res = await request(app)
        .post('/api/auth/send-otp')
        .send({ phone: '9876543210' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.mockOtp).toBeDefined();
      expect(res.body.mockOtp).toMatch(/^\d{6}$/);

      const updated = await Farmer.findById(farmer._id);
      expect(updated.otp).toBe(res.body.mockOtp);
      expect(updated.otpExpires).toBeInstanceOf(Date);
      expect(updated.otpExpires.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe('POST /api/auth/verify-otp', () => {
    test('returns 400 when phone or otp is missing', async () => {
      const res = await request(app)
        .post('/api/auth/verify-otp')
        .send({ phone: '9876543210' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/Phone number and OTP are required/i);
    });

    test('returns 404 when phone number does not exist', async () => {
      const res = await request(app)
        .post('/api/auth/verify-otp')
        .send({ phone: '0000000000', otp: '123456' });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    test('returns 400 when OTP is incorrect', async () => {
      farmer.otp = '654321';
      farmer.otpExpires = new Date(Date.now() + 5 * 60 * 1000);
      await farmer.save();

      const res = await request(app)
        .post('/api/auth/verify-otp')
        .send({ phone: '9876543210', otp: '111111' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/Invalid or expired OTP/i);
    });

    test('returns 400 when OTP has expired', async () => {
      farmer.otp = '654321';
      farmer.otpExpires = new Date(Date.now() - 1000); // Expired 1 second ago
      await farmer.save();

      const res = await request(app)
        .post('/api/auth/verify-otp')
        .send({ phone: '9876543210', otp: '654321' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/Invalid or expired OTP/i);
    });

    test('successfully verifies valid OTP and clears OTP credentials', async () => {
      farmer.otp = '123456';
      farmer.otpExpires = new Date(Date.now() + 5 * 60 * 1000);
      await farmer.save();

      const res = await request(app)
        .post('/api/auth/verify-otp')
        .send({ phone: '9876543210', otp: '123456' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.farmer).toBeDefined();
      expect(res.body.farmer.phone).toBe('9876543210');

      const verified = await Farmer.findById(farmer._id);
      expect(verified.otp).toBeNull();
      expect(verified.otpExpires).toBeNull();
    });
  });

  describe('GET /api/farmer/:id', () => {
    test('returns 400 for invalid ObjectId format', async () => {
      const res = await request(app).get('/api/farmer/invalid-id-format');
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/Invalid farmer ID format/i);
    });

    test('returns 404 when farmer does not exist', async () => {
      const randomId = new mongoose.Types.ObjectId();
      const res = await request(app).get(`/api/farmer/${randomId}`);
      expect(res.status).toBe(404);
      expect(res.body.error).toMatch(/Farmer not found/i);
    });

    test('returns 200 with farmer profile for valid ID', async () => {
      const res = await request(app).get(`/api/farmer/${farmer._id}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.farmer._id).toBe(farmer._id.toString());
    });
  });
});
