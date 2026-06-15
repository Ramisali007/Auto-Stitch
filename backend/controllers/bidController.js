const CustomizationRequest = require('../models/CustomizationRequest');
const Bid = require('../models/Bid');
const Order = require('../models/Order');
const Boutique = require('../models/Boutique');
const { z } = require('zod');
const sendEmail = require('../utils/sendEmail');
const { getOrderConfirmationTemplate } = require('../utils/emailTemplates');

const customizationRequestSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  selectedRegions: z.array(z.enum(['neckline', 'sleeves', 'hemline', 'embroidery', 'collar', 'cuffs'])).min(1),
  description: z.string().max(2000).optional().default(''),
  referenceImages: z.array(z.string()).max(5).optional().default([]),
  budget: z.number().positive().optional(),
});

const submitBidSchema = z.object({
  price: z.number().positive('Price must be positive'),
  timeline: z.number().int().positive('Timeline must be a positive number of days'),
  notes: z.string().max(1000).optional(),
  portfolioImages: z.array(z.string()).max(5).optional().default([]),
});

// @desc    Create a customization request
// @route   POST /api/bids/request
// @access  Private (Customer)
const createCustomizationRequest = async (req, res) => {
  try {
    const parsed = customizationRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      const errors = parsed.error.issues.map(i => i.message).join(', ');
      return res.status(400).json({ success: false, message: errors });
    }
    const { productId, selectedRegions, description, referenceImages, budget } = parsed.data;

    const customizationRequest = await CustomizationRequest.create({
      customer: req.user._id,
      product: productId,
      selectedRegions,
      description,
      referenceImages,
      budget,
      status: 'submitted',
      expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000), // 72 hours
    });

    res.status(201).json({ success: true, data: customizationRequest });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Get all customization requests (for boutiques to bid on)
// @route   GET /api/bids/requests
// @access  Private (Boutique Owner)
const getAvailableRequests = async (req, res) => {
  try {
    const boutique = await Boutique.findOne({ owner: req.user._id });
    if (!boutique) {
      return res.status(404).json({ success: false, message: 'Boutique not found' });
    }

    // Find requests that are open (submitted or bidding) 
    // AND that this boutique hasn't bid on yet
    const requests = await CustomizationRequest.find({ 
      status: { $in: ['submitted', 'bidding'] },
      bids: { $nin: await Bid.find({ boutique: boutique._id }).distinct('customizationRequest') }
    })
      .populate('customer', 'name avatar')
      .populate('product', 'name images category')
      .lean();

    // Handle mock products that couldn't be populated
    const data = requests.map(req => {
      if (!req.product || typeof req.product === 'string') {
        return {
          ...req,
          product: { name: 'Editorial Garment', images: [req.referenceImages[0] || ''], category: 'Luxury Pret' }
        };
      }
      return req;
    });

    res.status(200).json({ success: true, count: data.length, data });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Submit a bid for a customization request
// @route   POST /api/bids/requests/:requestId/bid
// @access  Private (Boutique Owner)
const submitBid = async (req, res) => {
  try {
    const parsed = submitBidSchema.safeParse(req.body);
    if (!parsed.success) {
      const errors = parsed.error.issues.map(i => i.message).join(', ');
      return res.status(400).json({ success: false, message: errors });
    }
    const { price, timeline, notes, portfolioImages } = parsed.data;
    const { requestId } = req.params;

    const boutique = await Boutique.findOne({ owner: req.user._id });
    if (!boutique) {
      return res.status(404).json({ success: false, message: 'Boutique not found' });
    }

    const request = await CustomizationRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    if (request.status !== 'submitted' && request.status !== 'bidding') {
      return res.status(400).json({ success: false, message: 'Request is no longer open for bidding' });
    }

    // Check if boutique already bid
    const existingBid = await Bid.findOne({ customizationRequest: requestId, boutique: boutique._id });
    if (existingBid) {
      return res.status(400).json({ success: false, message: 'You have already submitted a bid for this request' });
    }

    const bid = await Bid.create({
      customizationRequest: requestId,
      boutique: boutique._id,
      price,
      timeline,
      notes,
      portfolioImages,
    });

    // Update request status to 'bidding' and add bid reference
    request.status = 'bidding';
    if (!request.bids.includes(bid._id)) {
      request.bids.push(bid._id);
    }
    await request.save();

    res.status(201).json({ success: true, data: bid });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Get bids for a specific customization request (for customer)
// @route   GET /api/bids/requests/:requestId/bids
// @access  Private (Customer)
const getBidsForRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const request = await CustomizationRequest.findById(requestId)
      .populate({
        path: 'bids',
        populate: { path: 'boutique', select: 'name logo reputationScore owner' }
      });

    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    // Only customer who made the request can see the bids
    if (request.customer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to view these bids' });
    }

    // If a bid is already accepted, only return that one (remove others from view)
    if (request.status === 'bid_accepted' && request.acceptedBid) {
      const acceptedBid = await Bid.findById(request.acceptedBid)
        .populate({ path: 'boutique', select: 'name logo reputationScore owner' })
        .lean();
      return res.status(200).json({ success: true, data: acceptedBid ? [acceptedBid] : [] });
    }

    res.status(200).json({ success: true, data: request.bids });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Accept a bid
// @route   PATCH /api/bids/requests/:requestId/accept/:bidId
// @access  Private (Customer)
const acceptBid = async (req, res) => {
  try {
    const { requestId, bidId } = req.params;
    const { paymentMethod = 'cod' } = req.body;
    console.log(`[AcceptBid] Start - Request: ${requestId}, Bid: ${bidId}, User: ${req.user._id}, Method: ${paymentMethod}`);

    const request = await CustomizationRequest.findById(requestId);
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });

    if (request.customer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const bid = await Bid.findById(bidId);
    if (!bid) return res.status(404).json({ success: false, message: 'Bid not found' });

    // Fetch the original product being customized to get its image
    const Product = require('../models/Product');
    let productImage = '';
    if (require('mongoose').Types.ObjectId.isValid(request.product)) {
      const productDoc = await Product.findById(request.product);
      if (productDoc && productDoc.images && productDoc.images.length > 0) {
        productImage = productDoc.images[0];
      }
    }

    // Create a New Order automatically
    const Order = require('../models/Order');
    const acceptedBoutique = await Boutique.findById(bid.boutique);

    // Create the Order document
    try {
      console.log(`[AcceptBid] Attempting Order.create for Request: ${requestId}`);
      const order = await Order.create({
        customer: req.user._id,
        boutique: bid.boutique,
        items: [{
          product: require('mongoose').Types.ObjectId.isValid(request.product) ? (request.product._id || request.product) : '69f5155aca01a992cebe9f58', 
          name: `Custom Design: ${request.description.substring(0, 30)}...`,
          image: productImage || request.referenceImages?.[0] || '',
          price: bid.price,
          quantity: 1
        }],
        shippingAddress: {
          street: 'Awaiting Confirmation',
          city: 'Faisalabad',
          province: 'Punjab',
          postalCode: '38000'
        },
        paymentMethod,
        itemsTotal: bid.price,
        total: bid.price,
        status: 'placed',
        isCustomOrder: true,
        customizationRequest: requestId
      });

      let stripeSessionUrl = null;
      if (paymentMethod === 'card') {
        const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
        const session = await stripe.checkout.sessions.create({
          payment_method_types: ['card'],
          line_items: [
            {
              price_data: {
                currency: 'usd',
                product_data: {
                  name: `Bespoke Proposal - Custom Design: ${request.description.substring(0, 30)}...`,
                },
                unit_amount: Math.round((bid.price / 280) * 100),
              },
              quantity: 1,
            },
          ],
          mode: 'payment',
          success_url: `${process.env.CLIENT_URL}/bids?success=true&orderId=${order._id}&session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${process.env.CLIENT_URL}/bids?canceled=true`,
          client_reference_id: order._id.toString(),
          customer_email: req.user.email,
        });

        order.stripePaymentIntentId = session.id;
        await order.save();
        stripeSessionUrl = session.url;
      }

      // Mark this bid as accepted
      bid.status = 'accepted';
      await bid.save();

      // Reject all other bids for this request
      await Bid.updateMany(
        { customizationRequest: requestId, _id: { $ne: bidId } },
        { status: 'rejected' }
      );

      // Update Request status
      request.status = 'bid_accepted';
      request.acceptedBid = bidId;
      await request.save();

      console.log(`[AcceptBid] Order created successfully: ${order._id}`);
      
      // Notify the Boutique Owner
      const Notification = require('../models/Notification');
      if (acceptedBoutique) {
        await Notification.create({
          recipient: acceptedBoutique.owner,
          recipientModel: 'BoutiqueOwner',
          sender: req.user._id,
          senderModel: 'Customer',
          type: 'bid_accepted',
          title: 'New Order Confirmed!',
          message: `${req.user.name} has accepted your proposal and placed an order!`,
          link: '/boutique/orders'
        });
      }

      res.status(200).json({ 
        success: true, 
        message: 'Bid accepted and Order created!',
        data: { request, bid, order, stripeSessionUrl } 
      });

      // Send Confirmation Email Asynchronously
      try {
        await sendEmail({
          email: req.user.email,
          subject: `Boutique Order Confirmed - #AS-${order._id.toString().slice(-6).toUpperCase()}`,
          html: getOrderConfirmationTemplate(order, req.user.name)
        });
      } catch (emailErr) {
        console.error('CRITICAL: BID EMAIL DELIVERY FAILED:', emailErr.message);
      }
    } catch (createErr) {
      console.error('[AcceptBid] Order Creation Failed:', createErr);
      throw createErr; // Rethrow to be caught by outer catch
    }
  } catch (error) {
    console.error('[AcceptBid] General Error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Get customer's own customization requests
// @route   GET /api/bids/my-requests
// @access  Private (Customer)
const getMyRequests = async (req, res) => {
  try {
    const requests = await CustomizationRequest.find({ customer: req.user._id })
      .populate('product', 'name images')
      .sort({ createdAt: -1 })
      .lean();

    const data = requests.map(req => {
      if (!req.product || typeof req.product === 'string') {
        return {
          ...req,
          product: { name: 'Editorial Garment', images: [req.referenceImages[0] || ''] }
        };
      }
      return req;
    });

    res.status(200).json({ success: true, count: data.length, data });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Delete a customization request
// @route   DELETE /api/bids/requests/:requestId
// @access  Private (Customer)
const deleteCustomizationRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const request = await CustomizationRequest.findById(requestId);

    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    // Only owner can delete
    if (request.customer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // Optional: Only allow deletion if no bid is accepted
    if (request.status === 'bid_accepted') {
      return res.status(400).json({ success: false, message: 'Cannot delete a request after a bid has been accepted' });
    }

    // Delete associated bids first
    await Bid.deleteMany({ customizationRequest: requestId });
    
    // Delete the request
    await CustomizationRequest.findByIdAndDelete(requestId);

    res.status(200).json({ success: true, message: 'Request deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Get boutique owner's bids
// @route   GET /api/bids/my-bids
// @access  Private (Boutique Owner)
const getMyBids = async (req, res) => {
  try {
    const boutique = await Boutique.findOne({ owner: req.user._id });
    if (!boutique) {
      return res.status(404).json({ success: false, message: 'Boutique not found' });
    }

    const bids = await Bid.find({ boutique: boutique._id, status: 'pending' })
      .sort('-createdAt')
      .populate({
        path: 'customizationRequest',
        populate: { path: 'customer', select: 'name' }
      })
      .lean();

    res.json({ success: true, bids });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

module.exports = {
  createCustomizationRequest,
  getAvailableRequests,
  submitBid,
  getBidsForRequest,
  acceptBid,
  getMyRequests,
  deleteCustomizationRequest,
  getMyBids,
};
