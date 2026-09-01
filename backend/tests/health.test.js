const request = require('supertest');
const { app } = require('../server');

describe('API Health & System Tests', () => {
  it('GET /api/health should return status 200 with running message', async () => {
    const res = await request(app).get('/api/health');
    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toContain('Auto Stitch API is running');
  });

  it('GET /api/unknown-endpoint should return status 404', async () => {
    const res = await request(app).get('/api/non-existent-route-12345');
    expect(res.statusCode).toEqual(404);
    expect(res.body.success).toBe(false);
  });
});
