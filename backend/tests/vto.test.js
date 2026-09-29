const request = require('supertest');
const { app } = require('../server');
const sharp = require('sharp');
const TryOnJob = require('../models/TryOnJob');
const Product = require('../models/Product');
const Boutique = require('../models/Boutique');
process.env.VTO_PROVIDER = 'mock';

const vtoService = require('../vto/VirtualTryOnService');

describe('Virtual Try-On (VTO) Subsystem Tests', () => {
  let sampleProduct;
  let sampleBoutique;

  beforeAll(async () => {
    // Find or create test product & boutique
    sampleBoutique = await Boutique.findOne();
    sampleProduct = await Product.findOne({ isActive: true });
  });

  it('GET /api/vto/catalog should return active try-on enabled garments', async () => {
    const res = await request(app).get('/api/vto/catalog');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.products)).toBe(true);
  });

  it('GET /api/vto/health should return provider diagnostics', async () => {
    const res = await request(app).get('/api/vto/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.activeProvider).toBeDefined();
  });

  it('POST /api/vto/session should reject missing productId', async () => {
    const res = await request(app)
      .post('/api/vto/session')
      .send({});
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('POST /api/vto/session should create job with valid product', async () => {
    if (!sampleProduct) return;

    const res = await request(app)
      .post('/api/vto/session')
      .send({ productId: sampleProduct._id.toString() });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.jobId).toBeDefined();
    expect(res.body.sessionToken).toBeDefined();
  });

  it('POST /api/vto/jobs should reject corrupted / fake non-image payload', async () => {
    if (!sampleProduct) return;

    const sessionRes = await request(app)
      .post('/api/vto/session')
      .send({ productId: sampleProduct._id.toString() });

    const { jobId, sessionToken } = sessionRes.body;

    const res = await request(app)
      .post('/api/vto/jobs')
      .set('x-vto-session', sessionToken)
      .send({
        jobId,
        userPhoto: 'data:image/png;base64,bm90LWEtcmVhbC1pbWFnZQ==', // "not-a-real-image"
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('VirtualTryOnService should validate and execute inference on active provider', async () => {
    // Create 400x600 test buffers
    const personBuffer = await sharp({
      create: { width: 400, height: 600, channels: 3, background: { r: 240, g: 220, b: 210 } }
    }).jpeg().toBuffer();

    const garmentBuffer = await sharp({
      create: { width: 400, height: 600, channels: 3, background: { r: 180, g: 40, b: 60 } }
    }).jpeg().toBuffer();

    const result = await vtoService.execute({
      personBuffer,
      garmentBuffer,
      category: 'one-pieces',
      garmentName: 'Silk Gown',
    });

    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(Buffer.isBuffer(result.buffer)).toBe(true);

    const meta = await sharp(result.buffer).metadata();
    expect(meta.width).toBeGreaterThan(0);
    expect(meta.height).toBeGreaterThan(0);
  });

  it('DELETE /api/vto/jobs/:jobId should cancel job and return 200', async () => {
    if (!sampleProduct) return;

    // Create a session first
    const sessionRes = await request(app)
      .post('/api/vto/session')
      .send({ productId: sampleProduct._id.toString() });

    const { jobId, sessionToken } = sessionRes.body;

    const cancelRes = await request(app)
      .delete(`/api/vto/jobs/${jobId}`)
      .set('x-vto-session', sessionToken);

    expect(cancelRes.statusCode).toBe(200);
    expect(cancelRes.body.success).toBe(true);

    const jobInDb = await TryOnJob.findOne({ jobId });
    expect(jobInDb.status).toBe('cancelled');
  });
});
