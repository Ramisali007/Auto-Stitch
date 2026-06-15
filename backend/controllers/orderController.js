const Order = require('../models/Order');
const { z } = require('zod');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
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
    const orders = await Order.find({ customer: req.user._id })
      .sort({ createdAt: -1 })
      .populate('boutique', 'name logo')
      .populate('items.product', 'images name')
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
    const order = await Order.findById(req.params.id)
      .populate('items.product', 'name images')
      .populate('customer', 'name email')
      .populate('boutique', 'name owner logo')
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

    let stripeSessionUrl = null;

    if (['card', 'stripe_full', 'stripe_installment'].includes(paymentMethod)) {
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

    const orders = await Order.find({ boutique: boutique._id })
      .sort({ createdAt: -1 })
      .populate('customer', 'name email')
      .populate('items.product', 'images name')
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

// @desc    Track order by reference ID (sends email)
// @route   POST /api/orders/track
// @access  Public
const trackOrder = async (req, res) => {
  try {
    const { referenceId } = req.body;
    if (!referenceId) {
      return res.status(400).json({ success: false, message: 'Reference ID is required' });
    }

    // Reference ID query using indexed referenceId field (case-insensitive)
    let order = await Order.findOne({ referenceId: referenceId.toUpperCase() }).populate('customer', 'name email');

    // Fallback regex to support legacy orders (matching last 6 characters of ObjectId)
    if (!order) {
      order = await Order.findOne({
        _id: { $regex: new RegExp(referenceId + '$', 'i') }
      }).populate('customer', 'name email');
    }

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found with this Reference ID' });
    }

    // Send status email to the customer registered with this order
    await sendEmail({
      email: order.customer.email,
      subject: `Order Status Request - #AS-${referenceId.toUpperCase()}`,
      html: getOrderStatusTemplate(order, order.customer.name)
    });

    res.json({ 
      success: true, 
      message: `Status email has been sent to ${order.customer.email.replace(/(.{2})(.*)(?=@)/, (gp1, gp2, gp3) => gp2 + '*'.repeat(gp3.length))}` 
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

module.exports = { getMyOrders, getOrder, createOrder, updateOrderStatus, getBoutiqueOrders, cancelOrder, deleteOrder, trackOrder, verifyOrderPayment };
