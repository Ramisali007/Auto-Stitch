// Mock sendEmail to avoid waiting on SMTP servers during tests
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
const Message = require('../models/Message');

jest.setTimeout(45000);

describe('🛡️ COMPREHENSIVE SECURITY AUDIT & VERIFICATION SUITE', () => {
  let customerUser, boutiqueOwnerUser, rogueCustomer, rogueBoutiqueOwner;
  let customerToken, boutiqueToken, rogueCustomerToken, rogueBoutiqueToken;
  let testBoutique, rogueBoutique;
  let testProduct;

  beforeAll(async () => {
    // Wait for DB connection
    if (mongoose.connection.readyState !== 1) {
      await new Promise((resolve) => {
        const interval = setInterval(() => {
          if (mongoose.connection.readyState === 1) {
            clearInterval(interval);
            resolve();
          }
        }, 150);
      });
    }

    const timestamp = Date.now();

    // 1. Create legit customer
    customerUser = await Customer.create({
      name: `Audit Customer ${timestamp}`,
      email: `audit_cust_${timestamp}@test.com`,
      password: 'Password123!',
      role: 'customer',
      isActive: true,
      isVerified: true
    });
    customerToken = jwt.sign({ id: customerUser._id, role: 'customer' }, process.env.JWT_SECRET, { expiresIn: '1h' });

    // 2. Create rogue customer
    rogueCustomer = await Customer.create({
      name: `Rogue Customer ${timestamp}`,
      email: `rogue_cust_${timestamp}@test.com`,
      password: 'Password123!',
      role: 'customer',
      isActive: true,
      isVerified: true
    });
    rogueCustomerToken = jwt.sign({ id: rogueCustomer._id, role: 'customer' }, process.env.JWT_SECRET, { expiresIn: '1h' });

    // 3. Create boutique owners and boutiques
    boutiqueOwnerUser = await BoutiqueOwner.create({
      name: `Legit Boutique Owner ${timestamp}`,
      email: `legit_boutique_${timestamp}@test.com`,
      password: 'Password123!',
      role: 'boutique_owner',
      isActive: true,
      isVerified: true
    });
    boutiqueToken = jwt.sign({ id: boutiqueOwnerUser._id, role: 'boutique_owner' }, process.env.JWT_SECRET, { expiresIn: '1h' });

    testBoutique = await Boutique.create({
      name: `Legit Atelier ${timestamp}`,
      owner: boutiqueOwnerUser._id,
      isApproved: true,
      slug: `legit-atelier-${timestamp}`
    });

    rogueBoutiqueOwner = await BoutiqueOwner.create({
      name: `Rogue Boutique Owner ${timestamp}`,
      email: `rogue_boutique_${timestamp}@test.com`,
      password: 'Password123!',
      role: 'boutique_owner',
      isActive: true,
      isVerified: true
    });
    rogueBoutiqueToken = jwt.sign({ id: rogueBoutiqueOwner._id, role: 'boutique_owner' }, process.env.JWT_SECRET, { expiresIn: '1h' });

    rogueBoutique = await Boutique.create({
      name: `Rogue Atelier ${timestamp}`,
      owner: rogueBoutiqueOwner._id,
      isApproved: true,
      slug: `rogue-atelier-${timestamp}`
    });

    // 4. Create legitimate test product (price: 7500)
    testProduct = await Product.create({
      name: `Luxury Embroidered Kurta ${timestamp}`,
      description: 'Handcrafted luxury garment for security audit testing',
      price: 7500,
      stock: 50,
      boutique: testBoutique._id,
      category: 'Luxury Pret',
      status: 'approved',
      images: ['https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b']
    });
  });

  afterAll(async () => {
    // Clean up created audit records
    try {
      if (customerUser) await Customer.findByIdAndDelete(customerUser._id);
      if (rogueCustomer) await Customer.findByIdAndDelete(rogueCustomer._id);
      if (boutiqueOwnerUser) await BoutiqueOwner.findByIdAndDelete(boutiqueOwnerUser._id);
      if (rogueBoutiqueOwner) await BoutiqueOwner.findByIdAndDelete(rogueBoutiqueOwner._id);
      if (testBoutique) await Boutique.findByIdAndDelete(testBoutique._id);
      if (rogueBoutique) await Boutique.findByIdAndDelete(rogueBoutique._id);
      if (testProduct) await Product.findByIdAndDelete(testProduct._id);
    } catch (_) {}
  });

  // ==========================================
  // 1. CRITICAL: PATH TRAVERSAL & SSRF IN /api/vto/download
  // ==========================================
  describe('🔴 1. Path Traversal & SSRF Defense in /api/vto/download', () => {
    test('Blocks directory traversal attempt to read backend/.env', async () => {
      const res = await request(app).get('/api/vto/download?url=/uploads/../.env');
      expect([400, 403]).toContain(res.status);
      expect(res.body.success).toBe(false);
      expect(res.text).not.toContain('JWT_SECRET');
      expect(res.text).not.toContain('MONGO_URI');
    });

    test('Blocks directory traversal attempt using encoded slashes and nested paths', async () => {
      const res = await request(app).get('/api/vto/download?url=/uploads/../../server.js');
      expect([400, 403]).toContain(res.status);
      expect(res.body.success).toBe(false);
    });

    test('Blocks SSRF attempt to fetch AWS / cloud metadata IP (169.254.169.254)', async () => {
      const res = await request(app).get('/api/vto/download?url=http://169.254.169.254/latest/meta-data/');
      expect([400, 403]).toContain(res.status);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/untrusted|unsafe/i);
    });

    test('Blocks SSRF attempt to probe loopback/localhost', async () => {
      const res = await request(app).get('/api/vto/download?url=http://127.0.0.1:5000/api/health');
      expect([400, 403]).toContain(res.status);
      expect(res.body.success).toBe(false);
    });
  });

  // ==========================================
  // 2. CRITICAL: 2FA BYPASS PREVENTION
  // ==========================================
  describe('🔴 2. 2FA Bypass Prevention', () => {
    test('Rejects access when a tempToken with is2FAPending is used on protected routes', async () => {
      const JWT_2FA_SECRET = process.env.JWT_2FA_SECRET || (process.env.JWT_SECRET + '_2fa_temp');
      const tempToken = jwt.sign(
        { id: customerUser._id, role: 'customer', is2FAPending: true },
        JWT_2FA_SECRET,
        { expiresIn: '5m' }
      );

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${tempToken}`);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    test('Rejects tempToken signed with JWT_SECRET if is2FAPending flag is present', async () => {
      const forgedTempToken = jwt.sign(
        { id: customerUser._id, role: 'customer', is2FAPending: true },
        process.env.JWT_SECRET,
        { expiresIn: '5m' }
      );

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${forgedTempToken}`);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/two-factor/i);
    });
  });

  // ==========================================
  // 3. CRITICAL: GOOGLE LOGIN TOKEN FORGERY DEFENSE
  // ==========================================
  describe('🔴 3. Google Login Forged Token Defense', () => {
    test('Rejects arbitrary fake/forged base64 JWT payload in google login', async () => {
      const fakePayload = Buffer.from(JSON.stringify({ email: customerUser.email, name: 'Attacker' })).toString('base64');
      const fakeJwt = `eyJhbGciOiJSUzI1NiJ9.${fakePayload}.invalidSignature`;

      const res = await request(app)
        .post('/api/auth/google')
        .send({ credential: fakeJwt });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/invalid|expired|forged/i);
    });
  });

  // ==========================================
  // 4. CRITICAL: SERVER-AUTHORITATIVE PRICING & TOTALS
  // ==========================================
  describe('🔴 4. Server-Authoritative Pricing & Totals', () => {
    test('Overrides client-tampered price: charges DB price (7500) instead of client-supplied PKR 1', async () => {
      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          items: [{
            product: testProduct._id.toString(),
            name: 'Hacked Price Item',
            price: 1, // Attacker sends 1 PKR!
            quantity: 1,
            size: 'M',
            color: 'Ivory'
          }],
          shippingAddress: {
            street: '123 Test Ave',
            city: 'Lahore',
            province: 'Punjab',
            postalCode: '54000'
          },
          paymentMethod: 'cod',
          itemsTotal: 1, // Attacker sends 1 PKR total!
          total: 1
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.order.items[0].price).toBe(7500); // Authoritative DB price!
      expect(res.body.order.itemsTotal).toBe(7500);
      expect(res.body.order.total).toBe(7500); // Free shipping over 5000 PKR

      // Clean up order
      await Order.findByIdAndDelete(res.body.order._id);
    });
  });

  // ==========================================
  // 5. HIGH: INSTALLMENT PAID EXPLOIT DEFENSE
  // ==========================================
  describe('🟠 5. Installment Pay Exploit Defense', () => {
    test('Blocks marking installment as paid without valid Stripe verification session', async () => {
      // Create an installment order
      const installmentOrder = await Order.create({
        customer: customerUser._id,
        boutique: testBoutique._id,
        items: [{
          product: testProduct._id,
          name: testProduct.name,
          price: 8000,
          quantity: 1
        }],
        shippingAddress: {
          street: '123 Test Ave',
          city: 'Lahore',
          province: 'Punjab',
          postalCode: '54000'
        },
        paymentMethod: 'stripe_installment',
        itemsTotal: 8000,
        shippingCost: 0,
        total: 8000,
        installmentPlan: {
          enabled: true,
          installments: [
            { amount: 2000, dueDate: new Date(), status: 'pending' },
            { amount: 2000, dueDate: new Date(), status: 'pending' }
          ]
        }
      });

      // Rogue customer or unverified call tries to mark installment #0 as paid for free
      const res = await request(app)
        .post(`/api/orders/${installmentOrder._id}/installments/0/pay`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({}); // No sessionId!

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/verification failed/i);

      // Verify DB record remained pending
      const checkOrder = await Order.findById(installmentOrder._id);
      expect(checkOrder.installmentPlan.installments[0].status).toBe('pending');

      await Order.findByIdAndDelete(installmentOrder._id);
    });
  });

  // ==========================================
  // 6. HIGH: STRIPE WEBHOOK SIGNATURE VERIFICATION
  // ==========================================
  describe('🟠 6. Unsigned Stripe Webhook Rejection', () => {
    test('Rejects unsigned webhook request without stripe-signature header', async () => {
      const res = await request(app)
        .post('/api/orders/webhook')
        .send({
          type: 'checkout.session.completed',
          data: { object: { client_reference_id: 'some_order_id' } }
        });

      expect([400, 401]).toContain(res.status);
    });

    test('Rejects webhook request with forged / invalid stripe signature', async () => {
      const res = await request(app)
        .post('/api/orders/webhook')
        .set('stripe-signature', 't=12345,v1=fake_signature_hash')
        .send({
          type: 'checkout.session.completed',
          data: { object: { client_reference_id: 'some_order_id' } }
        });

      expect([400, 401]).toContain(res.status);
    });
  });

  // ==========================================
  // 7. HIGH: IN-CHAT QUOTATION AUTHORIZATION & IDOR
  // ==========================================
  describe('🟠 7. In-Chat Quotation Authorization & Tampering Defense', () => {
    test('Blocks customer from sending a price quotation message', async () => {
      const res = await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          receiverId: boutiqueOwnerUser._id.toString(),
          boutiqueId: testBoutique._id.toString(),
          content: 'I set my own price',
          quoteData: {
            isQuote: true,
            title: 'Hacked Tailoring',
            price: 500
          }
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/only boutique/i);
    });

    test('Blocks unauthorized user from accepting someone else quotation', async () => {
      // Boutique sends legit quote to Customer A
      const msg = await Message.create({
        sender: boutiqueOwnerUser._id,
        senderModel: 'BoutiqueOwner',
        receiver: customerUser._id,
        receiverModel: 'Customer',
        boutique: testBoutique._id,
        content: 'Your quote is PKR 12,000',
        quoteData: {
          isQuote: true,
          title: 'Custom Bridal Lehenga',
          price: 12000,
          isAccepted: false
        }
      });

      // Rogue customer tries to accept it
      const res = await request(app)
        .patch(`/api/messages/${msg._id}/accept-quote`)
        .set('Authorization', `Bearer ${rogueCustomerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);

      await Message.findByIdAndDelete(msg._id);
    });
  });

  // ==========================================
  // 8. HIGH: BID DOUBLE-ACCEPT & REQUEST MATCHING
  // ==========================================
  describe('🟠 8. Bid Double Acceptance & Cross-Request Exploits', () => {
    test('Blocks accepting a bid from a different customization request', async () => {
      // Create Request 1
      const req1 = await CustomizationRequest.create({
        customer: customerUser._id,
        product: testProduct._id.toString(),
        selectedRegions: ['neckline'],
        description: 'Request 1 description',
        status: 'bidding'
      });

      // Create Request 2
      const req2 = await CustomizationRequest.create({
        customer: customerUser._id,
        product: testProduct._id.toString(),
        selectedRegions: ['sleeves'],
        description: 'Request 2 description',
        status: 'bidding'
      });

      // Create Bid for Request 2
      const bidForReq2 = await Bid.create({
        customizationRequest: req2._id,
        boutique: testBoutique._id,
        price: 5000,
        timeline: 7,
        status: 'pending'
      });

      // Attacker tries to accept bidForReq2 on req1!
      const res = await request(app)
        .patch(`/api/bids/requests/${req1._id}/accept/${bidForReq2._id}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ paymentMethod: 'cod' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/does not belong/i);

      await CustomizationRequest.findByIdAndDelete(req1._id);
      await CustomizationRequest.findByIdAndDelete(req2._id);
      await Bid.findByIdAndDelete(bidForReq2._id);
    });

    test('Blocks double accepting a bid on an already accepted request', async () => {
      const customReq = await CustomizationRequest.create({
        customer: customerUser._id,
        product: testProduct._id.toString(),
        selectedRegions: ['hemline'],
        description: 'Double accept test request',
        status: 'bid_accepted' // Already accepted!
      });

      const bid = await Bid.create({
        customizationRequest: customReq._id,
        boutique: testBoutique._id,
        price: 4500,
        timeline: 5,
        status: 'accepted'
      });

      const res = await request(app)
        .patch(`/api/bids/requests/${customReq._id}/accept/${bid._id}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ paymentMethod: 'cod' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);

      await CustomizationRequest.findByIdAndDelete(customReq._id);
      await Bid.findByIdAndDelete(bid._id);
    });
  });

  // ==========================================
  // 9. HIGH: BOUTIQUE ORDER ACCESS IDOR DEFENSE
  // ==========================================
  describe('🟠 9. Boutique Order IDOR Defense', () => {
    test('Prevents Rogue Boutique Owner from accessing orders of another boutique', async () => {
      // Order belongs to testBoutique
      const order = await Order.create({
        customer: customerUser._id,
        boutique: testBoutique._id,
        items: [{
          product: testProduct._id,
          name: testProduct.name,
          price: 7500,
          quantity: 1,
          boutique: testBoutique._id
        }],
        shippingAddress: {
          street: 'Private Street 42',
          city: 'Karachi',
          province: 'Sindh',
          postalCode: '74000'
        },
        paymentMethod: 'cod',
        itemsTotal: 7500,
        total: 7500
      });

      // Rogue boutique owner queries this order
      const res = await request(app)
        .get(`/api/orders/${order._id}`)
        .set('Authorization', `Bearer ${rogueBoutiqueToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/not authorized/i);

      await Order.findByIdAndDelete(order._id);
    });
  });

  // ==========================================
  // 11. HIGH: PUBLIC TRACKING PII PROTECTION & CASTERRO FIX
  // ==========================================
  describe('🟠 11. Public Tracking PII Protection & CastError Fix', () => {
    test('Non-existent reference ID returns 404 rather than 500 CastError', async () => {
      const res = await request(app)
        .post('/api/orders/track')
        .send({ referenceId: 'UNKNOWN' });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/not found/i);
    });

    test('Public tracking response masks street address to protect customer privacy', async () => {
      const order = await Order.create({
        customer: customerUser._id,
        boutique: testBoutique._id,
        items: [{
          product: testProduct._id,
          name: testProduct.name,
          price: 7500,
          quantity: 1
        }],
        shippingAddress: {
          street: 'Sensitive Customer House #99B, Secret Colony',
          city: 'Islamabad',
          province: 'Federal',
          postalCode: '44000'
        },
        paymentMethod: 'cod',
        itemsTotal: 7500,
        total: 7500,
        status: 'in_production'
      });

      const refId = order._id.toString().slice(-6).toUpperCase();
      const res = await request(app)
        .post('/api/orders/track')
        .send({ referenceId: refId });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      // Street address must NOT be leaked
      expect(res.body.order.shippingAddress.street).toBeUndefined();
      expect(res.body.order.shippingAddress.city).toBe('Islamabad');

      await Order.findByIdAndDelete(order._id);
    });
  });

  // ==========================================
  // 13. HIGH: ORDER STATUS TRANSITION VALIDATION
  // ==========================================
  describe('🟠 13. Order Status Transition State Machine', () => {
    test('Boutique cannot illegally jump order status from "placed" directly to "refunded"', async () => {
      const order = await Order.create({
        customer: customerUser._id,
        boutique: testBoutique._id,
        items: [{
          product: testProduct._id,
          name: testProduct.name,
          price: 7500,
          quantity: 1,
          boutique: testBoutique._id
        }],
        shippingAddress: {
          street: '123 Test St',
          city: 'Lahore',
          province: 'Punjab',
          postalCode: '54000'
        },
        status: 'placed',
        paymentMethod: 'cod',
        itemsTotal: 7500,
        total: 7500
      });

      const res = await request(app)
        .patch(`/api/orders/${order._id}/status`)
        .set('Authorization', `Bearer ${boutiqueToken}`)
        .send({ status: 'refunded' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/invalid order status transition/i);

      await Order.findByIdAndDelete(order._id);
    });
  });

  // ==========================================
  // FUNCTIONAL & HYGIENE VERIFICATIONS
  // ==========================================
  describe('🟡 Reviews Require Verified Purchase', () => {
    test('Customer who has not purchased product cannot submit review', async () => {
      const res = await request(app)
        .post(`/api/products/${testProduct._id}/reviews`)
        .set('Authorization', `Bearer ${rogueCustomerToken}`)
        .send({
          rating: 5,
          comment: 'Never bought this but writing fake review!'
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/verified purchaser/i);
    });
  });

  describe('🟡 Profile Update Email Uniqueness', () => {
    test('Cannot change profile email to another existing customer email', async () => {
      const res = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${rogueCustomerToken}`)
        .send({ email: customerUser.email });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/already in use/i);
    });
  });
});
