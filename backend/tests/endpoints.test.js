// Mock sendEmail to prevent waiting on live external SMTP servers during test execution
jest.mock('../utils/sendEmail', () => jest.fn().mockResolvedValue(true));

const request = require('supertest');
const { app } = require('../server');
const speakeasy = require('speakeasy');

describe('E-Commerce & Core Business Logic Tests', () => {
  it('GET /api/stores should return active physical stores', async () => {
    const res = await request(app).get('/api/stores');
    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.stores)).toBe(true);
    expect(res.body.stores.length).toBeGreaterThan(0);
  });

  it('POST /api/subscribe should validate invalid email format', async () => {
    const res = await request(app)
      .post('/api/subscribe')
      .send({ email: 'invalid-email-string' });
    expect(res.statusCode).toEqual(400);
    expect(res.body.success).toBe(false);
  });

  it('POST /api/subscribe should reject empty email payload', async () => {
    const res = await request(app)
      .post('/api/subscribe')
      .send({});
    expect(res.statusCode).toEqual(400);
    expect(res.body.success).toBe(false);
  });

  it('POST /api/support/contact should validate missing required fields', async () => {
    const res = await request(app)
      .post('/api/support/contact')
      .send({ firstName: 'Test' }); // Missing email, topic, message
    expect(res.statusCode).toEqual(400);
    expect(res.body.success).toBe(false);
  });

  it('POST /api/support/contact should reject non-existent order number', async () => {
    const res = await request(app)
      .post('/api/support/contact')
      .send({
        firstName: 'Zain',
        email: 'zain@example.com',
        topic: 'Order Status',
        message: 'Where is my parcel?',
        orderNumber: '65f123456789012345678901' // non-existent order ID
      });
    expect(res.statusCode).toEqual(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Invalid Order Number. Please place a correct order number.');
  });

  it('POST /api/support/contact should create ticket when all fields provided', async () => {
    const res = await request(app)
      .post('/api/support/contact')
      .send({
        firstName: 'Ayesha',
        lastName: 'Khan',
        email: 'ayesha.test@example.com',
        topic: 'Custom Stitching Order Inquiry',
        message: 'I want to ask about custom sleeve embroidery turnaround time.'
      });
    expect(res.statusCode).toEqual(201);
    expect(res.body.success).toBe(true);
    expect(res.body.ticketId).toBeDefined();
  });

  it('TOTP Generation & Verification Logic should generate valid 6-digit tokens', () => {
    const secret = speakeasy.generateSecret({ length: 20 });
    expect(secret.base32).toBeDefined();

    const token = speakeasy.totp({
      secret: secret.base32,
      encoding: 'base32'
    });
    expect(token).toHaveLength(6);

    const verified = speakeasy.totp.verify({
      secret: secret.base32,
      encoding: 'base32',
      token: token,
      window: 1
    });
    expect(verified).toBe(true);
  });

  it('POST /api/auth/2fa/validate-login should reject invalid tokens', async () => {
    const res = await request(app)
      .post('/api/auth/2fa/validate-login')
      .send({ tempToken: 'fake-temp-token', token: '000000' });
    expect(res.statusCode).toEqual(401);
    expect(res.body.success).toBe(false);
  });
});
