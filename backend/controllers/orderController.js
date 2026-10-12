const Order = require('../models/Order');
const Product = require('../models/Product');
const { z } = require('zod');
const stripe = process.env.STRIPE_SECRET_KEY ? require('stripe')(process.env.STRIPE_SECRET_KEY) : null;
const sendEmail = require('../utils/sendEmail');
const { getOrderConfirmationTemplate, getOrderStatusTemplate } = require('../utils/emailTemplates');
const { calculateDiscount } = require('./couponController');

const orderItemSchema = z.object({
  product: z.string().min(1),
  name: z.string().optional(),
  image: z.string().optional(),
  price: z.number().optional(),
  quantity: z.number().int().min(1).default(1),
  size: z.string().optional(),
  color: z.string().optional(),
  boutique: z.string().optional(),
});

const createOrderSchema = z.object({
  items: z.array(orderItemSchema).min(1, 'At least one item is required'),
  boutique: z.string().optional(),
  shippingAddress: z.object({
    street: z.string().min(1, 'Street is required'),
    city: z.string().min(1, 'City is required'),
    province: z.string().min(1, 'Province is required'),
    postalCode: z.string().min(1, 'Postal code is required'),
  }),
  paymentMethod: z.enum(['cod', 'card', 'stripe_full', 'stripe_installment']).optional().default('cod'),
  itemsTotal: z.number().optional(),
  shippingCost: z.number().min(0).optional(),
  discount: z.number().min(0).optional(),
  couponCode: z.string().optional(),
  total: z.number().optional(),
  notes: z.string().max(1000).optional(),
});

// @desc    Get customer's orders
// @route   GET /api/orders
// @access  Private (Customer)
const getMyOrders = async (req, res) => {
  try {
    require('../models/CustomizationRequest');
    const orders = await Order.find({ customer: req.user._id })
      .sort({ createdAt: -1 })
      .populate('boutique', 'name logo')
      .populate('items.product', 'images name')
      .populate('customizationRequest')
      .lean();

    res.json({ success: true, count: orders.length, orders });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Get single order
// @route   GET /api/orders/:id
// @access  Private
const getOrder = async (req, res) => {
  try {
    require('../models/CustomizationRequest');
    const order = await Order.findById(req.params.id)
      .populate('items.product', 'name images')
      .populate('customer', 'name email phone')
      .populate('boutique', 'name owner logo phone address')
      .populate('customizationRequest')
      .lean();

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const isCustomerOwner = order.customer?._id?.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    let isBoutiqueOwnerOfOrder = false;

    if (req.user.role === 'boutique_owner') {
      const Boutique = require('../models/Boutique');
      const userBoutique = await Boutique.findOne({ owner: req.user._id });
      if (userBoutique) {
        const boutiqueIdStr = userBoutique._id.toString();
        const primaryMatch = order.boutique?._id?.toString() === boutiqueIdStr || order.boutique?.owner?.toString() === req.user._id.toString();
        const itemMatch = (order.items || []).some(i => i.boutique?.toString() === boutiqueIdStr || i.boutique?._id?.toString() === boutiqueIdStr);
        if (primaryMatch || itemMatch) {
          isBoutiqueOwnerOfOrder = true;
        }
      }
    }

    if (!isCustomerOwner && !isAdmin && !isBoutiqueOwnerOfOrder) {
      return res.status(403).json({ success: false, message: 'Not authorized to view this order' });
    }

    res.json({ success: true, order });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Create new order
// @route   POST /api/orders
// @access  Private (Customer)
const createOrder = async (req, res) => {
  try {
    const parsed = createOrderSchema.safeParse(req.body);
    if (!parsed.success) {
      const errors = parsed.error.issues.map(i => i.message).join(', ');
      return res.status(400).json({ success: false, message: errors });
    }

    const { items, shippingAddress, paymentMethod, couponCode, notes } = parsed.data;

    // Pre-check Stripe availability before reserving inventory or creating order
    if (['card', 'stripe_full', 'stripe_installment'].includes(paymentMethod) && !stripe) {
      return res.status(400).json({
        success: false,
        message: 'Stripe payment is not configured on this server. Please select Cash on Delivery (COD).'
      });
    }

    const mongoose = require('mongoose');
    const verifiedItems = [];
    let serverItemsTotal = 0;

    for (const item of items) {
      if (!mongoose.Types.ObjectId.isValid(item.product)) {
        return res.status(400).json({ 
          success: false, 
          message: `"${item.name || 'Selected item'}" is an editorial showcase piece and cannot be purchased directly online.` 
        });
      }

      const dbProduct = await Product.findById(item.product);
      if (!dbProduct) {
        return res.status(404).json({ success: false, message: `Product not found: ${item.name || item.product}` });
      }

      const authoritativePrice = (dbProduct.discountPrice && dbProduct.discountPrice > 0)
        ? dbProduct.discountPrice
        : dbProduct.price;

      const itemQty = Math.max(1, item.quantity || 1);
      serverItemsTotal += authoritativePrice * itemQty;

      verifiedItems.push({
        product: dbProduct._id,
        name: dbProduct.name,
        image: item.image || (dbProduct.images && dbProduct.images[0]) || '',
        price: authoritativePrice,
        quantity: itemQty,
        size: item.size || 'STD',
        color: item.color || '',
        boutique: dbProduct.boutique || item.boutique
      });
    }

    // Re-calculate coupon discount on server
    let serverDiscount = 0;
    let serverFreeShipping = false;

    if (couponCode && couponCode.trim()) {
      const discountResult = await calculateDiscount(couponCode, serverItemsTotal);
      serverDiscount = discountResult.discountAmount || 0;
      serverFreeShipping = discountResult.freeShipping || false;
    }

    const serverShippingCost = (serverFreeShipping || serverItemsTotal > 5000) ? 0 : 250;
    const serverTotal = Math.max(0, serverItemsTotal + serverShippingCost - serverDiscount);

    // Atomically reserve inventory for all items in order
    const reservedItems = [];
    for (const item of verifiedItems) {
      const qty = item.quantity;
      const updated = await Product.findOneAndUpdate(
        { _id: item.product, stock: { $gte: qty } },
        { $inc: { stock: -qty, soldCount: qty } },
        { new: true }
      );

      if (!updated) {
        // Rollback any items already reserved in this transaction
        for (const resItem of reservedItems) {
          await Product.findByIdAndUpdate(resItem.id, {
            $inc: { stock: resItem.qty, soldCount: -resItem.qty }
          });
        }
        return res.status(400).json({
          success: false,
          message: `"${item.name}" has insufficient stock or just sold out in the atelier.`
        });
      }
      reservedItems.push({ id: item.product, qty });
    }

    const primaryBoutique = verifiedItems[0]?.boutique || parsed.data.boutique;
    let order;

    try {
      order = await Order.create({
        customer: req.user._id,
        boutique: primaryBoutique,
        items: verifiedItems,
        shippingAddress,
        paymentMethod,
        itemsTotal: serverItemsTotal,
        shippingCost: serverShippingCost,
        discount: serverDiscount,
        couponCode: couponCode || '',
        total: serverTotal,
        notes,
        statusHistory: [{ status: 'placed', note: 'Order placed successfully' }],
        installmentPlan: {
          enabled: paymentMethod === 'stripe_installment',
          installments: paymentMethod === 'stripe_installment' ? [
            { amount: Math.round(serverTotal / 4), dueDate: new Date(), status: 'pending' },
            { amount: Math.round(serverTotal / 4), dueDate: new Date(Date.now() + 14 * 86400000), status: 'pending' },
            { amount: Math.round(serverTotal / 4), dueDate: new Date(Date.now() + 28 * 86400000), status: 'pending' },
            { amount: Math.round(serverTotal / 4), dueDate: new Date(Date.now() + 42 * 86400000), status: 'pending' },
          ] : []
        }
      });
    } catch (orderCreateErr) {
      for (const resItem of reservedItems) {
        await Product.findByIdAndUpdate(resItem.id, {
          $inc: { stock: resItem.qty, soldCount: -resItem.qty }
        });
      }
      throw orderCreateErr;
    }

    let stripeSessionUrl = null;

    if (['card', 'stripe_full', 'stripe_installment'].includes(paymentMethod)) {
      try {
        const exchangeRate = parseFloat(process.env.EXCHANGE_RATE_PKR_USD) || 280;

        const line_items = verifiedItems.map(item => ({
          price_data: {
            currency: 'usd',
            product_data: {
              name: item.name,
            },
            unit_amount: Math.round((item.price / exchangeRate) * 100),
          },
          quantity: item.quantity,
        }));

        if (serverShippingCost > 0) {
          line_items.push({
            price_data: {
              currency: 'usd',
              product_data: { name: 'Shipping' },
              unit_amount: Math.round((serverShippingCost / exchangeRate) * 100),
            },
            quantity: 1,
          });
        }

        let stripeDiscounts = [];
        if (serverDiscount > 0) {
          const discountUsdCents = Math.round((serverDiscount / exchangeRate) * 100);
          if (discountUsdCents > 0) {
            try {
              const stripeCoupon = await stripe.coupons.create({
                amount_off: discountUsdCents,
                currency: 'usd',
                duration: 'once',
                name: `Promo (${couponCode || 'PROMO'})`,
              });
              stripeDiscounts = [{ coupon: stripeCoupon.id }];
            } catch (couponErr) {
              console.warn('Could not create Stripe dynamic coupon:', couponErr.message);
            }
          }
        }

        const sessionParams = {
          payment_method_types: ['card'],
          line_items,
          mode: 'payment',
          success_url: `${process.env.CLIENT_URL}/checkout?success=true&orderId=${order._id}&session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${process.env.CLIENT_URL}/checkout?canceled=true`,
          client_reference_id: order._id.toString(),
          customer_email: req.user.email,
        };

        if (stripeDiscounts.length > 0) {
          sessionParams.discounts = stripeDiscounts;
        }

        const session = await stripe.checkout.sessions.create(sessionParams);

        order.stripePaymentIntentId = session.id;
        await order.save();
        stripeSessionUrl = session.url;
      } catch (stripeErr) {
        console.error('Stripe session creation error:', stripeErr);
        // Rollback reserved stock and delete order on gateway failure
        for (const resItem of reservedItems) {
          await Product.findByIdAndUpdate(resItem.id, {
            $inc: { stock: resItem.qty, soldCount: -resItem.qty }
          });
        }
        await Order.findByIdAndDelete(order._id);
        return res.status(500).json({ success: false, message: 'Failed to initialize payment gateway session. Stock was restored.' });
      }
    }

    res.status(201).json({ success: true, order, stripeSessionUrl });

    // Send Confirmation Email Asynchronously
    try {
      await sendEmail({
        email: req.user.email,
        subject: `Order Confirmed - #AS-${order._id.toString().slice(-6).toUpperCase()}`,
        html: getOrderConfirmationTemplate(order, req.user.name)
      });
    } catch (emailErr) {
      console.error('CRITICAL: EMAIL DELIVERY FAILED:', emailErr.message);
    }
  } catch (error) {
    console.error('CRITICAL ORDER ERROR:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

const ALLOWED_BOUTIQUE_TRANSITIONS = {
  placed: ['accepted', 'cancelled'],
  accepted: ['in_production', 'cancelled'],
  in_production: ['ready_to_ship', 'cancelled'],
  ready_to_ship: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
  dispute: ['refund_requested', 'delivered'],
  refund_requested: ['refunded', 'dispute'],
  refunded: []
};

// @desc    Update order status (boutique owner)
// @route   PATCH /api/orders/:id/status
// @access  Private (Boutique Owner)
const updateOrderStatus = async (req, res) => {
  try {
    const { status, note, trackingNumber, trackingUrl } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Verify the boutique owner owns this order
    const Boutique = require('../models/Boutique');
    const boutique = await Boutique.findOne({ owner: req.user._id });
    if (!boutique) {
      return res.status(403).json({ success: false, message: 'Not authorized: Boutique profile not found' });
    }

    const boutiqueIdStr = boutique._id.toString();
    const primaryMatch = order.boutique?.toString() === boutiqueIdStr;
    const itemMatch = (order.items || []).some(i => i.boutique?.toString() === boutiqueIdStr);

    if (!primaryMatch && !itemMatch && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to update this order' });
    }

    // Validate state machine transitions
    const allowed = ALLOWED_BOUTIQUE_TRANSITIONS[order.status] || [];
    if (req.user.role !== 'admin' && !allowed.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid order status transition from "${order.status}" to "${status}". Allowed transitions: ${allowed.join(', ') || 'none'}`
      });
    }

    order.status = status;
    if (trackingNumber) order.trackingNumber = trackingNumber;
    if (trackingUrl) order.trackingUrl = trackingUrl;
    order.statusHistory.push({ status, note: note || `Status updated to ${status}` });

    // Auto-complete customization request if delivered
    if (status === 'delivered' && order.isCustomOrder && order.customizationRequest) {
      const CustomizationRequest = require('../models/CustomizationRequest');
      await CustomizationRequest.findByIdAndUpdate(order.customizationRequest, { status: 'completed' });
    }

    await order.save();
    res.json({ success: true, order });

    // Send Status Update Email
    try {
      const orderWithCustomer = await Order.findById(order._id).populate('customer', 'name email');
      await sendEmail({
        email: orderWithCustomer.customer.email,
        subject: `Order Update: ${status.toUpperCase()} - #AS-${order._id.toString().slice(-6).toUpperCase()}`,
        html: getOrderStatusTemplate(orderWithCustomer, orderWithCustomer.customer.name)
      });
    } catch (emailErr) {
      console.error('FAILED TO SEND STATUS UPDATE EMAIL:', emailErr);
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Get boutique orders
// @route   GET /api/orders/boutique
// @access  Private (Boutique Owner)
const getBoutiqueOrders = async (req, res) => {
  try {
    const Boutique = require('../models/Boutique');
    const boutique = await Boutique.findOne({ owner: req.user._id });
    if (!boutique) {
      return res.status(404).json({ success: false, message: 'Boutique not found' });
    }

    require('../models/CustomizationRequest');
    const orders = await Order.find({
      $or: [
        { boutique: boutique._id },
        { 'items.boutique': boutique._id }
      ]
    })
      .sort({ createdAt: -1 })
      .populate('customer', 'name email phone')
      .populate('items.product', 'images name')
      .populate('customizationRequest')
      .lean();

    res.json({ success: true, count: orders.length, orders });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Cancel order (customer)
// @route   PATCH /api/orders/:id/cancel
// @access  Private (Customer)
const cancelOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Ensure customer owns this order OR boutique owner owns this order
    const isCustomer = order.customer.toString() === req.user._id.toString();
    const Boutique = require('../models/Boutique');
    const boutique = await Boutique.findOne({ owner: req.user._id });
    const isBoutiqueOwner = boutique && order.boutique.toString() === boutique._id.toString();

    if (!isCustomer && !isBoutiqueOwner) {
      return res.status(403).json({ success: false, message: 'Not authorized to cancel this order' });
    }

    // Only allow cancellation if order is not in production/shipped
    const cancellableStatuses = ['placed', 'accepted'];
    if (!cancellableStatuses.includes(order.status)) {
      return res.status(400).json({ success: false, message: `Cannot cancel order at ${order.status} stage` });
    }

    order.status = 'cancelled';
    order.statusHistory.push({ 
      status: 'cancelled', 
      note: `Order cancelled by ${isBoutiqueOwner ? 'Boutique' : 'Customer'}` 
    });

    await order.save();

    // Restore atelier stock for cancelled items
    const mongoose = require('mongoose');
    if (order.items && Array.isArray(order.items)) {
      for (const item of order.items) {
        if (item.product && mongoose.Types.ObjectId.isValid(item.product)) {
          const qty = Math.max(1, item.quantity || 1);
          try {
            await Product.findByIdAndUpdate(item.product, {
              $inc: { stock: qty, soldCount: -qty }
            });
          } catch (restoralErr) {
            console.warn('[Inventory Restoral] Notice on cancellation:', restoralErr.message);
          }
        }
      }
    }

    res.json({ success: true, message: 'Order cancelled successfully', order });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Delete order (boutique owner)
// @route   DELETE /api/orders/:id
// @access  Private (Boutique Owner)
const deleteOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    // Verify ownership
    const Boutique = require('../models/Boutique');
    const boutique = await Boutique.findOne({ owner: req.user._id });
    if (!boutique || order.boutique.toString() !== boutique._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // Only allow deleting cancelled orders
    if (order.status !== 'cancelled') {
      return res.status(400).json({ success: false, message: 'Only cancelled orders can be deleted' });
    }

    await Order.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Order deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Track order by reference ID
// @route   POST /api/orders/track
// @access  Public
const trackOrder = async (req, res) => {
  try {
    const { referenceId } = req.body;
    if (!referenceId || typeof referenceId !== 'string') {
      return res.status(400).json({ success: false, message: 'Reference ID is required' });
    }

    const cleanRef = referenceId.trim().toUpperCase();
    const strippedRef = cleanRef.replace(/^AS-/, '');
    const mongoose = require('mongoose');
    let order = null;

    // 1. Direct indexed match on referenceId (with or without AS-)
    order = await Order.findOne({
      $or: [
        { referenceId: cleanRef },
        { referenceId: strippedRef },
        { referenceId: `AS-${cleanRef}` },
      ]
    })
      .populate('boutique', 'name logo address phone')
      .populate('items.product', 'name images')
      .lean();

    // 2. If valid 24-char ObjectId
    if (!order && mongoose.Types.ObjectId.isValid(referenceId.trim())) {
      order = await Order.findById(referenceId.trim())
        .populate('boutique', 'name logo address phone')
        .populate('items.product', 'name images')
        .lean();
    }

    // 3. Fallback matching last 6 characters of ObjectId via $expr to prevent CastError
    if (!order && cleanRef.length === 6) {
      order = await Order.findOne({
        $expr: {
          $regexMatch: {
            input: { $toString: '$_id' },
            regex: cleanRef + '$',
            options: 'i'
          }
        }
      })
        .populate('boutique', 'name logo address phone')
        .populate('items.product', 'name images')
        .lean();
    }

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found with this Reference ID' });
    }

    // Protect customer PII in public tracking response
    const sanitizedAddress = {
      city: order.shippingAddress?.city || 'Regional Dispatch',
      province: order.shippingAddress?.province || 'Regional Hub'
    };

    res.json({ 
      success: true, 
      message: `Order #AS-${cleanRef} located successfully.`,
      order: {
        _id: order._id,
        referenceId: order.referenceId || order._id.toString().slice(-6).toUpperCase(),
        status: order.status,
        statusHistory: order.statusHistory || [],
        items: (order.items || []).map(item => ({
          name: item.name,
          quantity: item.quantity,
          image: item.image,
          size: item.size,
          color: item.color
        })),
        total: order.total,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        shippingAddress: sanitizedAddress,
        trackingNumber: order.trackingNumber,
        trackingUrl: order.trackingUrl,
        boutique: order.boutique ? { name: order.boutique.name, logo: order.boutique.logo } : null,
        createdAt: order.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Verify Stripe payment success for an order
// @route   POST /api/orders/:id/verify-payment
// @access  Private (Customer)
const verifyOrderPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { sessionId } = req.body;

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Ensure customer owns the order
    if (order.customer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const sessionToVerify = sessionId || order.stripePaymentIntentId;
    if (!sessionToVerify) {
      return res.status(400).json({ success: false, message: 'No Stripe session found for this order' });
    }

    if (!stripe) {
      return res.status(400).json({ success: false, message: 'Stripe is not configured on the server' });
    }

    // Retrieve session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionToVerify);

    if (session.payment_status === 'paid') {
      order.paymentStatus = 'paid';
      if (session.payment_intent) {
        order.stripePaymentIntentId = session.payment_intent.toString(); // Save the actual payment intent ID
      }
      await order.save();
      return res.json({ success: true, message: 'Payment verified successfully', order });
    } else {
      return res.status(400).json({ success: false, message: 'Payment not completed yet', paymentStatus: session.payment_status });
    }
  } catch (error) {
    console.error('[VerifyPayment] Error:', error);
    res.status(500).json({ success: false, message: 'Server error verifying payment', error: error.message });
  }
};

// @desc    Handle Stripe Webhooks
// @route   POST /api/orders/webhook
// @access  Public (Stripe signature verified)
const handleStripeWebhook = async (req, res) => {
  if (!process.env.STRIPE_WEBHOOK_SECRET || !stripe) {
    console.error('[Stripe Webhook] Error: STRIPE_WEBHOOK_SECRET is not configured on this server');
    return res.status(400).send('Webhook signing secret is not configured.');
  }

  const signature = req.headers['stripe-signature'];
  if (!signature) {
    return res.status(400).send('Missing Stripe-Signature header.');
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.rawBody || req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('[Stripe Webhook Signature Verification Failed]:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const orderId = session.metadata?.orderId || session.client_reference_id;
        const installmentIdx = session.metadata?.installmentIndex;

        if (orderId) {
          const order = await Order.findById(orderId).populate('customer', 'name email');
          if (order) {
            if (installmentIdx !== undefined && order.installmentPlan?.installments) {
              const idx = parseInt(installmentIdx, 10);
              if (order.installmentPlan.installments[idx]) {
                order.installmentPlan.installments[idx].status = 'paid';
                order.installmentPlan.installments[idx].paidAt = new Date();
                
                const allPaid = order.installmentPlan.installments.every(inst => inst.status === 'paid');
                if (allPaid) {
                  order.paymentStatus = 'paid';
                }
              }
            } else {
              order.paymentStatus = 'paid';
              if (order.status === 'placed') {
                order.status = 'accepted';
                order.statusHistory.push({ status: 'accepted', note: 'Payment received via Stripe Webhook' });
              }
            }

            if (session.payment_intent) {
              order.stripePaymentIntentId = session.payment_intent.toString();
            }

            await order.save();
            console.log(`[Stripe Webhook] Order #${orderId} state updated successfully`);

            // Email confirmation if customer email is available
            if (order.customer?.email) {
              try {
                await sendEmail({
                  email: order.customer.email,
                  subject: `Payment Confirmed: Order #AS-${order._id.toString().slice(-6).toUpperCase()}`,
                  html: getOrderConfirmationTemplate(order, order.customer.name)
                });
              } catch (e) {
                console.warn('[Stripe Webhook] Email trigger notice:', e.message);
              }
            }
          }
        }
        break;
      }
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object;
        const order = await Order.findOne({ stripePaymentIntentId: paymentIntent.id });
        if (order) {
          order.paymentStatus = 'paid';
          await order.save();
          console.log(`[Stripe Webhook] Order #${order._id} payment succeeded`);
        }
        break;
      }
      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object;
        const order = await Order.findOne({ stripePaymentIntentId: paymentIntent.id });
        if (order) {
          order.paymentStatus = 'failed';
          await order.save();
          console.log(`[Stripe Webhook] Order #${order._id} payment failed`);
        }
        break;
      }
      case 'checkout.session.expired': {
        const session = event.data.object;
        const orderId = session.metadata?.orderId || session.client_reference_id;
        if (orderId) {
          const mongoose = require('mongoose');
          const order = await Order.findById(orderId);
          if (order && order.paymentStatus === 'pending') {
            order.status = 'cancelled';
            order.paymentStatus = 'failed';
            order.statusHistory.push({ status: 'cancelled', note: 'Stripe checkout session expired without payment' });
            await order.save();

            // Restore atelier stock for expired items
            if (order.items && Array.isArray(order.items)) {
              for (const item of order.items) {
                if (item.product && mongoose.Types.ObjectId.isValid(item.product)) {
                  const qty = Math.max(1, item.quantity || 1);
                  try {
                    await Product.findByIdAndUpdate(item.product, {
                      $inc: { stock: qty, soldCount: -qty }
                    });
                  } catch (_) {}
                }
              }
            }
            console.log(`[Stripe Webhook] Order #${orderId} session expired: Inventory restored.`);
          }
        }
        break;
      }
      default:
        break;
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('[Stripe Webhook Handler Error]:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
};

// @desc    Pay individual order installment
// @route   POST /api/orders/:id/installments/:installmentIndex/pay
// @access  Private (Customer or Admin)
const payInstallment = async (req, res) => {
  try {
    const { id, installmentIndex } = req.params;
    const { sessionId } = req.body;
    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const index = parseInt(installmentIndex, 10);
    if (!order.installmentPlan?.installments || !order.installmentPlan.installments[index]) {
      return res.status(400).json({ success: false, message: 'Invalid installment index' });
    }

    if (order.installmentPlan.installments[index].status === 'paid') {
      return res.status(400).json({ success: false, message: 'Installment is already paid' });
    }

    const isAdmin = req.user.role === 'admin';
    let verifiedPayment = false;

    if (isAdmin) {
      verifiedPayment = true;
    } else if (sessionId && stripe) {
      if (order.customer.toString() !== req.user._id.toString()) {
        return res.status(403).json({ success: false, message: 'Not authorized' });
      }

      const session = await stripe.checkout.sessions.retrieve(sessionId);
      if (
        session &&
        session.payment_status === 'paid' &&
        (session.metadata?.orderId === order._id.toString() || session.client_reference_id === order._id.toString()) &&
        session.metadata?.installmentIndex === index.toString()
      ) {
        verifiedPayment = true;
      }
    }

    if (!verifiedPayment) {
      return res.status(400).json({
        success: false,
        message: 'Payment verification failed. A verified Stripe session or admin clearance is required.'
      });
    }

    order.installmentPlan.installments[index].status = 'paid';
    order.installmentPlan.installments[index].paidAt = new Date();

    // Check if all installments are paid
    const allPaid = order.installmentPlan.installments.every(inst => inst.status === 'paid');
    if (allPaid) {
      order.paymentStatus = 'paid';
    }

    await order.save();

    res.json({
      success: true,
      message: `Installment #${index + 1} marked as paid successfully`,
      order
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Create Stripe Checkout Session for individual installment milestone
// @route   POST /api/orders/:id/installments/:installmentIndex/stripe-session
// @access  Private (Customer)
const createInstallmentStripeSession = async (req, res) => {
  try {
    const { id, installmentIndex } = req.params;
    const order = await Order.findById(id).populate('boutique', 'name');

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.customer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const index = parseInt(installmentIndex, 10);
    if (!order.installmentPlan?.installments || !order.installmentPlan.installments[index]) {
      return res.status(400).json({ success: false, message: 'Invalid installment index' });
    }

    const installment = order.installmentPlan.installments[index];
    if (installment.status === 'paid') {
      return res.status(400).json({ success: false, message: 'Installment is already paid' });
    }

    if (!stripe) {
      return res.status(400).json({ success: false, message: 'Stripe payments are not configured on this server.' });
    }

    const exchangeRate = parseFloat(process.env.EXCHANGE_RATE_PKR_USD) || 280;
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Installment #${index + 1} (${order.boutique?.name || 'Auto Stitch'}) - Ref: #AS-${order.referenceId || order._id.toString().slice(-6).toUpperCase()}`,
            },
            unit_amount: Math.max(100, Math.round(((installment.amount || 1000) / exchangeRate) * 100)),
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.CLIENT_URL}/orders/${order._id}?installment_paid=${index}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/orders/${order._id}?canceled=true`,
      client_reference_id: order._id.toString(),
      customer_email: req.user.email,
      metadata: {
        orderId: order._id.toString(),
        installmentIndex: index.toString()
      }
    });

    res.json({ success: true, url: session.url, sessionId: session.id });
  } catch (error) {
    console.error('Installment Stripe Error:', error);
    res.status(500).json({ success: false, message: 'Failed to create payment session', error: error.message });
  }
};

// @desc    Request alteration or return on an order
// @route   POST /api/orders/:id/request-return
// @access  Private (Customer)
const requestOrderReturn = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, evidenceImages = [], notes = '' } = req.body;

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.customer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    if (order.status !== 'delivered') {
      return res.status(400).json({ success: false, message: 'Returns or alterations can only be requested after order delivery' });
    }

    order.status = 'refund_requested';
    order.returnRequest = {
      reason: `${reason}${notes ? `: ${notes}` : ''}`,
      evidenceImages,
      requestedAt: new Date(),
      status: 'pending'
    };
    order.statusHistory.push({
      status: 'refund_requested',
      note: `Alteration/Return requested: ${reason}`
    });

    await order.save();

    // Create Notification for the Boutique Owner
    try {
      const Notification = require('../models/Notification');
      const Boutique = require('../models/Boutique');
      const boutique = await Boutique.findById(order.boutique);
      if (boutique) {
        await Notification.create({
          recipient: boutique.owner,
          recipientModel: 'BoutiqueOwner',
          sender: req.user._id,
          senderModel: 'Customer',
          type: 'order_status',
          title: 'Alteration/Return Request Received',
          message: `${req.user.name} submitted an alteration request for Order #AS-${order._id.toString().slice(-6).toUpperCase()}`,
          link: '/boutique/orders'
        });
      }
    } catch (_) {}

    res.json({ success: true, message: 'Return/alteration request submitted to boutique for review', order });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Review alteration or return request
// @route   PATCH /api/orders/:id/review-return
// @access  Private (Boutique Owner)
const reviewOrderReturn = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, note } = req.body; // 'approved' or 'rejected'

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be approved or rejected' });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const Boutique = require('../models/Boutique');
    const boutique = await Boutique.findOne({ owner: req.user._id });
    if (!boutique || order.boutique.toString() !== boutique._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to review this order' });
    }

    if (!order.returnRequest) {
      return res.status(400).json({ success: false, message: 'No return request found for this order' });
    }

    order.returnRequest.status = status;
    if (status === 'approved') {
      order.status = 'refunded';
      order.statusHistory.push({
        status: 'refunded',
        note: note || 'Alteration/Return approved by boutique'
      });
    } else {
      order.status = 'delivered';
      order.statusHistory.push({
        status: 'delivered',
        note: note || 'Alteration/Return request declined by boutique'
      });
    }

    await order.save();

    // Create Notification for the Customer
    try {
      const Notification = require('../models/Notification');
      await Notification.create({
        recipient: order.customer,
        recipientModel: 'Customer',
        sender: req.user._id,
        senderModel: 'BoutiqueOwner',
        type: 'order_status',
        title: `Alteration Request ${status === 'approved' ? 'Approved' : 'Declined'}`,
        message: `Your alteration request for #AS-${order._id.toString().slice(-6).toUpperCase()} was ${status}.`,
        link: `/orders/${order._id}`
      });
    } catch (_) {}

    res.json({ success: true, message: `Return request ${status}`, order });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

module.exports = { 
  getMyOrders, 
  getOrder, 
  createOrder, 
  updateOrderStatus, 
  getBoutiqueOrders, 
  cancelOrder, 
  deleteOrder, 
  trackOrder, 
  verifyOrderPayment,
  handleStripeWebhook,
  payInstallment,
  createInstallmentStripeSession,
  requestOrderReturn,
  reviewOrderReturn
};


