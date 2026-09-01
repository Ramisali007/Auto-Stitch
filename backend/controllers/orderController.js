const Order = require('../models/Order');
const Product = require('../models/Product');
const { z } = require('zod');
const stripe = process.env.STRIPE_SECRET_KEY ? require('stripe')(process.env.STRIPE_SECRET_KEY) : null;
const sendEmail = require('../utils/sendEmail');
const { getOrderConfirmationTemplate, getOrderStatusTemplate } = require('../utils/emailTemplates');

const orderItemSchema = z.object({
  product: z.string().min(1),
  name: z.string().min(1),
  image: z.string().optional(),
  price: z.number().positive(),
  quantity: z.number().int().min(1),
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
  itemsTotal: z.number().positive(),
  shippingCost: z.number().min(0).optional().default(0),
  discount: z.number().min(0).optional().default(0),
  couponCode: z.string().optional(),
  total: z.number().positive(),
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

    // Ensure customer can only view their own orders
    if (order.customer._id.toString() !== req.user._id.toString() && req.user.role !== 'admin' && req.user.role !== 'boutique_owner') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
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

    const { items, shippingAddress, paymentMethod, itemsTotal, shippingCost, discount, total, couponCode, notes } = parsed.data;

    const order = await Order.create({
      customer: req.user._id,
      boutique: items[0].boutique || parsed.data.boutique,
      items,
      shippingAddress,
      paymentMethod,
      itemsTotal,
      shippingCost,
      discount,
      couponCode,
      total,
      notes,
      statusHistory: [{ status: 'placed', note: 'Order placed successfully' }],
      installmentPlan: {
        enabled: paymentMethod === 'stripe_installment'
      }
    });

    // Deduct stock & increment sold count for ordered products
    try {
      for (const item of items) {
        if (item.product) {
          await Product.findByIdAndUpdate(item.product, {
            $inc: { 
              stock: -Math.max(1, item.quantity || 1), 
              soldCount: Math.max(1, item.quantity || 1) 
            }
          });
        }
      }
    } catch (stockErr) {
      console.warn('[Stock Management] Notice on inventory update:', stockErr.message);
    }

    let stripeSessionUrl = null;

    if (['card', 'stripe_full', 'stripe_installment'].includes(paymentMethod)) {
      if (!stripe) {
        return res.status(400).json({ success: false, message: 'Stripe payment is not configured on this server. Please select Cash on Delivery (COD).' });
      }
      const line_items = items.map(item => ({
        price_data: {
          currency: 'usd',
          product_data: {
            name: item.name,
          },
          unit_amount: Math.round((item.price / 280) * 100), // Convert PKR to USD for Sandbox support
        },
        quantity: item.quantity,
      }));

      // Add shipping cost if applicable
      if (shippingCost > 0) {
        line_items.push({
          price_data: {
            currency: 'usd',
            product_data: { name: 'Shipping' },
            unit_amount: Math.round((shippingCost / 280) * 100),
          },
          quantity: 1,
        });
      }

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items,
        mode: 'payment',
        success_url: `${process.env.CLIENT_URL}/checkout?success=true&orderId=${order._id}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.CLIENT_URL}/checkout?canceled=true`,
        client_reference_id: order._id.toString(),
        customer_email: req.user.email,
      });

      order.stripePaymentIntentId = session.id;
      await order.save();

      stripeSessionUrl = session.url;
    }

    res.status(201).json({ success: true, order, stripeSessionUrl });

    // Send Confirmation Email Asynchronously
    try {
      // Use req.user directly since it's populated by protect middleware
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
    if (!boutique || order.boutique.toString() !== boutique._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this order' });
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
    const orders = await Order.find({ boutique: boutique._id })
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
    if (!referenceId) {
      return res.status(400).json({ success: false, message: 'Reference ID is required' });
    }

    // Reference ID query using indexed referenceId field (case-insensitive)
    let order = await Order.findOne({ referenceId: referenceId.toUpperCase() })
      .populate('customer', 'name email')
      .populate('boutique', 'name logo address phone')
      .populate('items.product', 'name images')
      .lean();

    // Fallback regex to support legacy orders (matching last 6 characters of ObjectId)
    if (!order) {
      order = await Order.findOne({
        _id: { $regex: new RegExp(referenceId + '$', 'i') }
      })
        .populate('customer', 'name email')
        .populate('boutique', 'name logo address phone')
        .populate('items.product', 'name images')
        .lean();
    }

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found with this Reference ID' });
    }

    // Send status email to the customer registered with this order (non-blocking)
    if (order.customer?.email) {
      sendEmail({
        email: order.customer.email,
        subject: `Order Status Request - #AS-${referenceId.toUpperCase()}`,
        html: getOrderStatusTemplate(order, order.customer.name)
      }).catch(err => console.log('Track email notice:', err.message));
    }

    res.json({ 
      success: true, 
      message: `Order #AS-${referenceId.toUpperCase()} located successfully.`,
      order: {
        _id: order._id,
        referenceId: order.referenceId || order._id.toString().slice(-6).toUpperCase(),
        status: order.status,
        statusHistory: order.statusHistory || [],
        items: order.items || [],
        total: order.total,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        shippingAddress: order.shippingAddress,
        trackingNumber: order.trackingNumber,
        trackingUrl: order.trackingUrl,
        boutique: order.boutique,
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
  let event = req.body;

  if (process.env.STRIPE_WEBHOOK_SECRET && stripe) {
    const signature = req.headers['stripe-signature'];
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
                  html: getOrderConfirmationTemplate(order.customer.name, order._id.toString().slice(-6).toUpperCase(), order.total)
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
// @access  Private (Customer)
const payInstallment = async (req, res) => {
  try {
    const { id, installmentIndex } = req.params;
    const order = await Order.findById(id);

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

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Installment #${index + 1} (${order.boutique?.name || 'Auto Stitch'}) - Ref: #AS-${order._id.toString().slice(-6).toUpperCase()}`,
            },
            unit_amount: Math.max(100, Math.round(((installment.amount || 1000) / 280) * 100)),
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


