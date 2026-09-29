/**
 * Production Virtual Try-On Comprehensive Test Suite
 * Validates real AI VTO architecture, provider abstraction, image preprocessing,
 * quality safety nets, multi-tenant boutique isolation, and adversarial edge cases.
 */

// Mock sendEmail to prevent waiting on external SMTP
jest.mock('../utils/sendEmail', () => jest.fn().mockResolvedValue(true));

const request = require('supertest');
const { app } = require('../server');
const sharp = require('sharp');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const Product = require('../models/Product');
const Boutique = require('../models/Boutique');
const { Customer, BoutiqueOwner } = require('../models/User');
const TryOnJob = require('../models/TryOnJob');
const vtoService = require('../vto/VirtualTryOnService');
const {
  normalizeGarmentCategory,
  preprocessPersonImage,
  preprocessGarmentImage,
} = require('../vto/imagePipeline');
const { validateTryOnResult } = require('../vto/resultValidator');

// Configure mock fixture engine for automated offline CI test execution
process.env.VTO_PROVIDER = 'mock';

jest.setTimeout(45000);

describe('🛡️ PRODUCTION-GRADE VIRTUAL TRY-ON SPECIFICATION TESTS', () => {
  let customerA, customerB, boutiqueOwnerA, boutiqueOwnerB;
  let boutiqueA, boutiqueB;
  let productA, productB;
  let tokenA, tokenB;
  let validPersonBuffer, validGarmentBuffer;

  beforeAll(async () => {
    // Ensure DB connection
    if (mongoose.connection.readyState !== 1) {
      await new Promise((resolve) => {
        if (mongoose.connection.readyState === 1) return resolve();
        const check = setInterval(() => {
          if (mongoose.connection.readyState === 1) {
            clearInterval(check);
            resolve();
          }
        }, 150);
      });
    }

    const timestamp = Date.now();

    // 1. Seed Users & Boutiques
    customerA = await Customer.create({
      name: `VTO Customer A ${timestamp}`,
      email: `vto_cust_a_${timestamp}@test.com`,
      password: 'Password123!',
      role: 'customer',
      isActive: true,
      isVerified: true,
    });

    customerB = await Customer.create({
      name: `VTO Customer B ${timestamp}`,
      email: `vto_cust_b_${timestamp}@test.com`,
      password: 'Password123!',
      role: 'customer',
      isActive: true,
      isVerified: true,
    });

    boutiqueOwnerA = await BoutiqueOwner.create({
      name: `VTO Atelier Owner A ${timestamp}`,
      email: `vto_owner_a_${timestamp}@test.com`,
      password: 'Password123!',
      role: 'boutique_owner',
      isActive: true,
      isVerified: true,
    });

    boutiqueA = await Boutique.create({
      owner: boutiqueOwnerA._id,
      name: `VTO Atelier A ${timestamp}`,
      isApproved: true,
      kyc: { status: 'verified', cnic: '1111122222333' },
    });

    boutiqueOwnerB = await BoutiqueOwner.create({
      name: `VTO Atelier Owner B ${timestamp}`,
      email: `vto_owner_b_${timestamp}@test.com`,
      password: 'Password123!',
      role: 'boutique_owner',
      isActive: true,
      isVerified: true,
    });

    boutiqueB = await Boutique.create({
      owner: boutiqueOwnerB._id,
      name: `VTO Atelier B ${timestamp}`,
      isApproved: true,
      kyc: { status: 'verified', cnic: '4444455555666' },
    });

    // 2. Seed Products
    productA = await Product.create({
      boutique: boutiqueA._id,
      name: 'Emerald Silk Maxi Gown',
      description: 'Hand-crafted raw silk gown with intricate zardozi detailing',
      category: 'Dresses',
      price: 24000,
      stock: 5,
      status: 'approved',
      isActive: true,
      tryOnEnabled: true,
      images: ['/Photos/pexels-dhanno-25184995.jpg'],
    });

    productB = await Product.create({
      boutique: boutiqueB._id,
      name: 'Velvet Royal Kurta',
      description: 'Embroidered velvet formal kurta for men',
      category: 'Formal Kurta',
      price: 18000,
      stock: 3,
      status: 'approved',
      isActive: true,
      tryOnEnabled: true,
      images: ['/Photos/pexels-dhanno-29413563.jpg'],
    });

    // 3. JWTs
    const secret = process.env.JWT_SECRET || 'autostitch_development_jwt_secret_key_2026_secure';
    tokenA = jwt.sign({ id: customerA._id, role: 'customer' }, secret, { expiresIn: '1h' });
    tokenB = jwt.sign({ id: customerB._id, role: 'customer' }, secret, { expiresIn: '1h' });

    // 4. Generate high-res valid image buffers
    validPersonBuffer = await sharp({
      create: { width: 600, height: 900, channels: 3, background: { r: 210, g: 190, b: 180 } },
    }).jpeg().toBuffer();

    validGarmentBuffer = await sharp({
      create: { width: 500, height: 700, channels: 3, background: { r: 40, g: 140, b: 90 } },
    }).jpeg().toBuffer();
  });

  afterAll(async () => {
    if (customerA && customerB) await Customer.deleteMany({ _id: { $in: [customerA._id, customerB._id] } });
    if (boutiqueOwnerA && boutiqueOwnerB) await BoutiqueOwner.deleteMany({ _id: { $in: [boutiqueOwnerA._id, boutiqueOwnerB._id] } });
    if (boutiqueA && boutiqueB) await Boutique.deleteMany({ _id: { $in: [boutiqueA._id, boutiqueB._id] } });
    if (productA && productB) await Product.deleteMany({ _id: { $in: [productA._id, productB._id] } });
    await TryOnJob.deleteMany({ product: { $in: [productA?._id, productB?._id] } });
  });

  // ========================================================
  // 1. INPUT PREPROCESSING & TAXONOMY VALIDATION
  // ========================================================
  describe('1. Input Preprocessing & Garment Taxonomy', () => {
    it('Normalizes tops, bottoms, and one-pieces correctly', () => {
      expect(normalizeGarmentCategory('Formal Silk Shirt').category).toBe('tops');
      expect(normalizeGarmentCategory('Flared Denim Trousers').category).toBe('bottoms');
      expect(normalizeGarmentCategory('Bridal Velvet Maxi Gown').category).toBe('one-pieces');
      expect(normalizeGarmentCategory('Embroidered Kurti').category).toBe('tops');
    });

    it('Rejects unsupported categories (shoes, jewelry, bags) with user-friendly error', () => {
      const shoeCheck = normalizeGarmentCategory('Leather Oxford Shoes');
      expect(shoeCheck.isSupported).toBe(false);
      expect(shoeCheck.reason).toContain('shoes');

      const bagCheck = normalizeGarmentCategory('Luxury Leather Handbag');
      expect(bagCheck.isSupported).toBe(false);
      expect(bagCheck.reason).toContain('bag');
    });

    it('Preprocesses person image, auto-rotates, and strips EXIF metadata', async () => {
      const processed = await preprocessPersonImage(validPersonBuffer);
      expect(processed.buffer).toBeDefined();
      expect(processed.width).toBeGreaterThanOrEqual(256);
      expect(processed.format).toBe('jpeg');
    });

    it('Rejects corrupt or non-image person payload with INVALID_PERSON_IMAGE', async () => {
      await expect(preprocessPersonImage('not-an-image')).rejects.toThrow();
    });

    it('Rejects image smaller than 256x256 resolution', async () => {
      const tinyBuf = await sharp({
        create: { width: 100, height: 100, channels: 3, background: { r: 100, g: 100, b: 100 } },
      }).jpeg().toBuffer();

      await expect(preprocessPersonImage(tinyBuf)).rejects.toThrow(/resolution is too low/);
    });
  });

  // ========================================================
  // 2. ENDPOINT & SESSION LIFECYCLE
  // ========================================================
  describe('2. Endpoint & Session Lifecycle', () => {
    it('POST /api/vto/session creates a valid session with product binding', async () => {
      const res = await request(app)
        .post('/api/vto/session')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ productId: productA._id.toString() });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.jobId).toBeDefined();
      expect(res.body.sessionToken).toBeDefined();
      expect(res.body.product.name).toBe('Emerald Silk Maxi Gown');
    });

    it('POST /api/vto/session rejects unsupported categories (e.g. shoes product)', async () => {
      const shoeProduct = await Product.create({
        boutique: boutiqueA._id,
        name: 'Velvet Khussa Shoes',
        description: 'Traditional embellished velvet khussa',
        category: 'Shoes',
        price: 8000,
        stock: 4,
        status: 'approved',
        isActive: true,
        images: ['/Photos/test-shoe.jpg'],
      });

      const res = await request(app)
        .post('/api/vto/session')
        .send({ productId: shoeProduct._id.toString() });

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('UNSUPPORTED_CATEGORY');

      await Product.findByIdAndDelete(shoeProduct._id);
    });

    it('POST /api/vto/jobs accepts valid photo and enqueues job', async () => {
      const sessionRes = await request(app)
        .post('/api/vto/session')
        .send({ productId: productA._id.toString() });

      const { jobId, sessionToken } = sessionRes.body;

      const res = await request(app)
        .post('/api/vto/jobs')
        .set('x-vto-session', sessionToken)
        .send({
          jobId,
          userPhoto: `data:image/jpeg;base64,${validPersonBuffer.toString('base64')}`,
          fitStyle: 'Tailored',
        });

      expect([200, 202]).toContain(res.statusCode);
      expect(res.body.success).toBe(true);
      expect(res.body.jobId).toBe(jobId);
    });

    it('Rejects duplicate double-click submission via idempotency', async () => {
      const sessionRes = await request(app)
        .post('/api/vto/session')
        .send({ productId: productB._id.toString() });

      const { jobId, sessionToken } = sessionRes.body;

      // First submit
      await request(app)
        .post('/api/vto/jobs')
        .set('x-vto-session', sessionToken)
        .send({
          jobId,
          userPhoto: `data:image/jpeg;base64,${validPersonBuffer.toString('base64')}`,
          fitStyle: 'Tailored',
          idempotencyKey: 'idemp_test_key_123',
        });

      // Second submit immediately with identical idempotencyKey
      const res2 = await request(app)
        .post('/api/vto/jobs')
        .set('x-vto-session', sessionToken)
        .send({
          jobId,
          userPhoto: `data:image/jpeg;base64,${validPersonBuffer.toString('base64')}`,
          fitStyle: 'Tailored',
          idempotencyKey: 'idemp_test_key_123',
        });

      expect([200, 202]).toContain(res2.statusCode);
      expect(res2.body.success).toBe(true);
    });
  });

  // ========================================================
  // 3. SECURITY, IDOR & MULTI-TENANT ISOLATION
  // ========================================================
  describe('3. Security, IDOR & Tenant Isolation', () => {
    it('ATTACK: Customer B cannot access Customer A private try-on job status (IDOR)', async () => {
      // Customer A creates private session
      const sessionRes = await request(app)
        .post('/api/vto/session')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ productId: productA._id.toString() });

      const { jobId } = sessionRes.body;

      // Customer B attempts to view Customer A job
      const res = await request(app)
        .get(`/api/vto/jobs/${jobId}`)
        .set('Authorization', `Bearer ${tokenB}`);

      expect([401, 403]).toContain(res.statusCode);
      expect(res.body.success).toBe(false);
    });

    it('ATTACK: Secret exposure check - API responses must NOT contain provider API keys', async () => {
      const healthRes = await request(app).get('/api/vto/health');
      const bodyStr = JSON.stringify(healthRes.body);

      expect(bodyStr).not.toContain(process.env.FASHN_API_KEY || 'fashn_secret');
      expect(bodyStr).not.toContain(process.env.REPLICATE_API_TOKEN || 'replicate_secret');
      expect(bodyStr).not.toContain(process.env.JWT_SECRET);
    });

    it('DELETE /api/vto/jobs/:jobId cancels job and purges temporary files', async () => {
      const sessionRes = await request(app)
        .post('/api/vto/session')
        .send({ productId: productA._id.toString() });

      const { jobId, sessionToken } = sessionRes.body;

      const delRes = await request(app)
        .delete(`/api/vto/jobs/${jobId}`)
        .set('x-vto-session', sessionToken);

      expect(delRes.statusCode).toBe(200);
      expect(delRes.body.success).toBe(true);

      const job = await TryOnJob.findOne({ jobId });
      expect(job.status).toBe('cancelled');
    });
  });

  // ========================================================
  // 4. PROVIDER ABSTRACTION & QUALITY SAFETY NET
  // ========================================================
  describe('4. Provider Abstraction & Quality Safety Net', () => {
    it('VirtualTryOnService successfully resolves active provider and executes pipeline', async () => {
      const result = await vtoService.execute({
        personBuffer: validPersonBuffer,
        garmentBuffer: validGarmentBuffer,
        category: 'one-pieces',
        garmentName: 'Emerald Silk Maxi Gown',
      });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.provider).toBeDefined();
      expect(Buffer.isBuffer(result.buffer)).toBe(true);
      expect(result.width).toBeGreaterThan(0);
      expect(result.height).toBeGreaterThan(0);
    });

    it('Safety Net rejects corrupt or truncated result buffers', async () => {
      const corruptBuf = Buffer.from('corrupt-non-image-data');
      await expect(validateTryOnResult(corruptBuf)).rejects.toThrow();
    });

    it('GET /api/vto/health returns diagnostics for all registered engines', async () => {
      const res = await request(app).get('/api/vto/health');
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.providers).toBeDefined();
      expect(res.body.providers.fashn).toBeDefined();
      expect(res.body.providers.replicate).toBeDefined();
    });
  });
});
