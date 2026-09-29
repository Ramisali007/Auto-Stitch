// Mock sendEmail to prevent waiting on live external SMTP servers during test execution
jest.mock('../utils/sendEmail', () => jest.fn().mockResolvedValue(true));

const request = require('supertest');
const { app } = require('../server');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { Customer, BoutiqueOwner, Admin } = require('../models/User');
const Boutique = require('../models/Boutique');
const Product = require('../models/Product');
const Order = require('../models/Order');
const CustomizationRequest = require('../models/CustomizationRequest');
const Bid = require('../models/Bid');
const TryOnJob = require('../models/TryOnJob');

jest.setTimeout(45000);

describe('🚨 ADVERSARIAL RED-TEAM BREAK TESTING', () => {
  let userAToken, userBToken, boutiqueAToken, boutiqueBToken, adminToken;
  let userA, userB, boutiqueOwnerA, boutiqueOwnerB, adminUser;
  let boutiqueA, boutiqueB;
  let productA, productB;
  let customizationReqA;

  beforeAll(async () => {
    // Ensure MongoDB connection is established
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

    // Generate deterministic test users
    const timestamp = Date.now();

    // 1. Create Customer A and Customer B
    userA = await Customer.create({
      name: `Adversary Customer A ${timestamp}`,
      email: `adv_customer_a_${timestamp}@test.com`,
      password: 'Password123!',
      role: 'customer',
      isActive: true,
      isVerified: true
    });

    userB = await Customer.create({
      name: `Adversary Customer B ${timestamp}`,
      email: `adv_customer_b_${timestamp}@test.com`,
      password: 'Password123!',
      role: 'customer',
      isActive: true,
      isVerified: true
    });

    // 2. Create Boutique Owner A and Boutique Owner B
    boutiqueOwnerA = await BoutiqueOwner.create({
      name: `Atelier Owner A ${timestamp}`,
      email: `adv_boutique_a_${timestamp}@test.com`,
      password: 'Password123!',
      role: 'boutique_owner',
      isActive: true,
      isVerified: true
    });

    boutiqueA = await Boutique.create({
      owner: boutiqueOwnerA._id,
      name: `Atelier A ${timestamp}`,
      isApproved: true,
      kyc: { status: 'verified', cnic: '1234567890123' }
    });

    boutiqueOwnerB = await BoutiqueOwner.create({
      name: `Atelier Owner B ${timestamp}`,
      email: `adv_boutique_b_${timestamp}@test.com`,
      password: 'Password123!',
      role: 'boutique_owner',
      isActive: true,
      isVerified: true
    });

    boutiqueB = await Boutique.create({
      owner: boutiqueOwnerB._id,
      name: `Atelier B ${timestamp}`,
      isApproved: true,
      kyc: { status: 'verified', cnic: '9876543210987' }
    });

    // 3. Create Admin User
    adminUser = await Admin.create({
      name: `Admin Tester ${timestamp}`,
      email: `adv_admin_${timestamp}@test.com`,
      password: 'Password123!',
      role: 'admin',
      isActive: true,
      isVerified: true
    });

    // 4. Generate JWTs
    const secret = process.env.JWT_SECRET || 'autostitch_development_jwt_secret_key_2026_secure';
    userAToken = jwt.sign({ id: userA._id, role: 'customer' }, secret, { expiresIn: '1h' });
    userBToken = jwt.sign({ id: userB._id, role: 'customer' }, secret, { expiresIn: '1h' });
    boutiqueAToken = jwt.sign({ id: boutiqueOwnerA._id, role: 'boutique_owner' }, secret, { expiresIn: '1h' });
    boutiqueBToken = jwt.sign({ id: boutiqueOwnerB._id, role: 'boutique_owner' }, secret, { expiresIn: '1h' });
    adminToken = jwt.sign({ id: adminUser._id, role: 'admin' }, secret, { expiresIn: '1h' });

    // 5. Create Product owned by Boutique A and Product owned by Boutique B
    productA = await Product.create({
      boutique: boutiqueA._id,
      name: 'Luxury Velvet Shawl (Atelier A)',
      description: 'Exclusive hand-crafted shawl from Atelier A',
      category: 'Formal',
      price: 15000,
      stock: 5,
      status: 'approved',
      isActive: true,
      images: ['/Photos/pexels-dhanno-25184995.jpg']
    });

    productB = await Product.create({
      boutique: boutiqueB._id,
      name: 'Silk Organza Suit (Atelier B)',
      description: 'Exclusive design from Atelier B',
      category: 'Bridal',
      price: 45000,
      stock: 2,
      status: 'approved',
      isActive: true,
      images: ['/Photos/pexels-dhanno-29413563.jpg']
    });

    // 6. Create Customization Request by Customer A
    customizationReqA = await CustomizationRequest.create({
      customer: userA._id,
      product: productA._id,
      selectedRegions: ['neckline', 'embroidery'],
      description: 'Need gold gota work on sleeves and neckline',
      budget: 20000,
      status: 'submitted',
      expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000)
    });
  });

  afterAll(async () => {
    // Cleanup created test records
    if (userA && userB) await Customer.deleteMany({ _id: { $in: [userA._id, userB._id] } });
    if (boutiqueOwnerA && boutiqueOwnerB) await BoutiqueOwner.deleteMany({ _id: { $in: [boutiqueOwnerA._id, boutiqueOwnerB._id] } });
    if (adminUser) await Admin.deleteMany({ _id: adminUser._id });
    if (boutiqueA && boutiqueB) await Boutique.deleteMany({ _id: { $in: [boutiqueA._id, boutiqueB._id] } });
    if (productA && productB) await Product.deleteMany({ _id: { $in: [productA._id, productB._id] } });
    if (customizationReqA) {
      await CustomizationRequest.deleteMany({ _id: customizationReqA._id });
      await Bid.deleteMany({ customizationRequest: customizationReqA._id });
    }
  });

  // ========================================================
  // SECTION 1: MULTI-BOUTIQUE TENANT ISOLATION BREAK TESTS
  // ========================================================
  describe('1. Multi-Boutique Tenant Isolation Attacks', () => {
    it('ATTACK: Boutique B attempts to edit Boutique A product -> MUST RETURN 403', async () => {
      const res = await request(app)
        .put(`/api/products/${productA._id}`)
        .set('Authorization', `Bearer ${boutiqueBToken}`)
        .send({
          name: 'Hacked Product Title by Boutique B',
          price: 100
        });

      expect([401, 403]).toContain(res.statusCode);
      expect(res.body.success).toBe(false);

      // Verify product A remained untouched in DB
      const freshProductA = await Product.findById(productA._id);
      expect(freshProductA.name).toBe('Luxury Velvet Shawl (Atelier A)');
      expect(freshProductA.price).toBe(15000);
    });

    it('ATTACK: Boutique B attempts to delete Boutique A product -> MUST RETURN 403', async () => {
      const res = await request(app)
        .delete(`/api/products/${productA._id}`)
        .set('Authorization', `Bearer ${boutiqueBToken}`);

      expect([401, 403]).toContain(res.statusCode);
      expect(res.body.success).toBe(false);

      const freshProductA = await Product.findById(productA._id);
      expect(freshProductA.isActive).toBe(true);
    });

    it('ATTACK: Customer attempts to call boutique-only routes -> MUST RETURN 403', async () => {
      const res = await request(app)
        .get('/api/products/my-products')
        .set('Authorization', `Bearer ${userAToken}`);

      expect([401, 403]).toContain(res.statusCode);
      expect(res.body.success).toBe(false);
    });
  });

  // ========================================================
  // SECTION 2: BIDDING SYSTEM & STATE MACHINE ATTACK
  // ========================================================
  describe('2. Bidding Engine & State Machine Attacks', () => {
    let bidFromBoutiqueAId;

    it('ATTACK: Submit negative price bid -> MUST RETURN 400', async () => {
      const res = await request(app)
        .post(`/api/bids/requests/${customizationReqA._id}/bid`)
        .set('Authorization', `Bearer ${boutiqueAToken}`)
        .send({
          price: -5000,
          timeline: 7,
          notes: 'Malicious negative price'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('ATTACK: Submit zero/negative timeline -> MUST RETURN 400', async () => {
      const res = await request(app)
        .post(`/api/bids/requests/${customizationReqA._id}/bid`)
        .set('Authorization', `Bearer ${boutiqueAToken}`)
        .send({
          price: 18000,
          timeline: -3,
          notes: 'Invalid negative timeline'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('VALID: Boutique A submits legitimate bid -> MUST SUCCEED (200/201)', async () => {
      const res = await request(app)
        .post(`/api/bids/requests/${customizationReqA._id}/bid`)
        .set('Authorization', `Bearer ${boutiqueAToken}`)
        .send({
          price: 18000,
          timeline: 7,
          notes: 'Hand-crafted gold zardozi stitching in 7 business days'
        });

      expect([200, 201]).toContain(res.statusCode);
      expect(res.body.success).toBe(true);
      bidFromBoutiqueAId = res.body.data?._id || res.body.bid?._id;
    });

    it('ATTACK: Boutique A submits duplicate bid on same request -> MUST RETURN 400', async () => {
      const res = await request(app)
        .post(`/api/bids/requests/${customizationReqA._id}/bid`)
        .set('Authorization', `Bearer ${boutiqueAToken}`)
        .send({
          price: 16000,
          timeline: 5,
          notes: 'Duplicate bid attempt'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('ATTACK: Customer B attempts to accept Customer A bid -> MUST RETURN 403/404', async () => {
      if (!bidFromBoutiqueAId) return;

      const res = await request(app)
        .patch(`/api/bids/requests/${customizationReqA._id}/accept/${bidFromBoutiqueAId}`)
        .set('Authorization', `Bearer ${userBToken}`)
        .send({ paymentMethod: 'cod' });

      expect([401, 403, 404]).toContain(res.statusCode);
      expect(res.body.success).toBe(false);
    });

    it('VALID: Customer A accepts Boutique A bid -> Auto-creates Order & marks status bid_accepted', async () => {
      if (!bidFromBoutiqueAId) return;

      const res = await request(app)
        .patch(`/api/bids/requests/${customizationReqA._id}/accept/${bidFromBoutiqueAId}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ paymentMethod: 'cod' });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);

      const updatedReq = await CustomizationRequest.findById(customizationReqA._id);
      expect(updatedReq.status).toBe('bid_accepted');
    });

    it('ATTACK: Boutique B attempts to bid on closed/accepted request -> MUST RETURN 400', async () => {
      const res = await request(app)
        .post(`/api/bids/requests/${customizationReqA._id}/bid`)
        .set('Authorization', `Bearer ${boutiqueBToken}`)
        .send({
          price: 17000,
          timeline: 6,
          notes: 'Late bid attempt'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  // ========================================================
  // SECTION 3: VTO PRIVACY & IDOR BREAK TESTS
  // ========================================================
  describe('3. Virtual Try-On Privacy & IDOR Attacks', () => {
    let jobAId, sessionTokenA;

    beforeAll(async () => {
      if (!productA) return;
      const sessionRes = await request(app)
        .post('/api/vto/session')
        .send({ productId: productA._id.toString() });

      jobAId = sessionRes.body.jobId;
      sessionTokenA = sessionRes.body.sessionToken;

      // Associate Job A with Customer A
      if (jobAId) {
        await TryOnJob.findOneAndUpdate({ jobId: jobAId }, { user: userA._id });
      }
    });

    it('ATTACK: Customer B attempts to read Customer A VTO job -> MUST RETURN 403', async () => {
      if (!jobAId) return;

      const res = await request(app)
        .get(`/api/vto/jobs/${jobAId}`)
        .set('Authorization', `Bearer ${userBToken}`);

      expect([401, 403]).toContain(res.statusCode);
      expect(res.body.success).toBe(false);
    });

    it('ATTACK: Anonymous user attempts to read job with spoofed session -> MUST RETURN 403', async () => {
      if (!jobAId) return;

      const res = await request(app)
        .get(`/api/vto/jobs/${jobAId}`)
        .set('x-vto-session', 'fake-spoofed-session-token');

      expect([401, 403]).toContain(res.statusCode);
      expect(res.body.success).toBe(false);
    });

    it('VALID: Authorized Customer A reads own VTO job -> MUST SUCCEED (200)', async () => {
      if (!jobAId) return;

      const res = await request(app)
        .get(`/api/vto/jobs/${jobAId}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .set('x-vto-session', sessionTokenA);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.jobId).toBe(jobAId);
    });
  });

  // ========================================================
  // SECTION 4: COUPON & FINANCIAL INTEGRITY BREAK TESTS
  // ========================================================
  describe('4. Coupon Validation & Financial Edge Case Attacks', () => {
    it('ATTACK: Validate promo code with empty string -> MUST RETURN 400', async () => {
      const res = await request(app)
        .post('/api/coupons/validate')
        .send({ code: '', cartTotal: 5000 });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('ATTACK: Use FLAT500 on cart below minimum amount (3000) -> MUST RETURN 400', async () => {
      const res = await request(app)
        .post('/api/coupons/validate')
        .send({ code: 'FLAT500', cartTotal: 1500 });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Minimum order');
    });

    it('VALID: Use FLAT500 on cart above minimum amount (5000) -> Returns 500 discount', async () => {
      const res = await request(app)
        .post('/api/coupons/validate')
        .send({ code: 'FLAT500', cartTotal: 5000 });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.coupon.discountAmount).toBe(500);
    });

    it('VALID: Use EID20 (20% off) on 10,000 cart -> Returns 2000 discount', async () => {
      const res = await request(app)
        .post('/api/coupons/validate')
        .send({ code: 'EID20', cartTotal: 10000 });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.coupon.discountAmount).toBe(2000);
    });

    it('VALID: Use FREESHIP -> Sets freeShipping flag to true', async () => {
      const res = await request(app)
        .post('/api/coupons/validate')
        .send({ code: 'FREESHIP', cartTotal: 4000 });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.coupon.freeShipping).toBe(true);
    });
  });

  // ========================================================
  // SECTION 5: MALFORMED INPUT & INJECTION TESTS
  // ========================================================
  describe('5. Input Sanitization & Malformed Input Handling', () => {
    it('ATTACK: Query products with NoSQL injection object in price -> Gracefully handeled', async () => {
      const res = await request(app)
        .get('/api/products?minPrice[gt]=0');

      // Express and Mongoose query casting must handle or ignore without crashing the server
      expect([200, 400]).toContain(res.statusCode);
      if (res.statusCode === 200) {
        expect(res.body.success).toBe(true);
      }
    });

    it('ATTACK: Query single product with non-ObjectId string -> Returns 404/500 gracefully without unhandled promise', async () => {
      const res = await request(app)
        .get('/api/products/not-a-valid-mongodb-id');

      expect([400, 404, 500]).toContain(res.statusCode);
      expect(res.body.success).toBe(false);
    });
  });
});
