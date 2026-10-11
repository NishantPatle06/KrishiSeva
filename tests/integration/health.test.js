const request = require('supertest');
const app = require('../../src/server');
const { connectTestDB, disconnectTestDB } = require('../setup/db');

describe('Integration: Health and Monitoring Endpoints', () => {
  beforeAll(async () => {
    await connectTestDB();
  });

  afterAll(async () => {
    await disconnectTestDB();
  });

  test('GET /api/health returns 200 with operational status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toBe('KrishiSeva Agricultural Portal');
    expect(res.body.database).toBe('connected');
    expect(res.body.timestamp).toBeDefined();

    // Verify no secret leak
    const payloadStr = JSON.stringify(res.body);
    expect(payloadStr).not.toContain('mongodb://');
    expect(payloadStr).not.toContain('password');
    expect(payloadStr).not.toContain('secret');
  });

  test('GET /health redirects to /api/health', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/api/health');
  });
});
