const mongoose = require('mongoose');
const SupportTicket = require('../models/SupportTicket');
const Order = require('../models/Order');
const sendEmail = require('../utils/sendEmail');
const { getContactReplyTemplate } = require('../utils/emailTemplates');

// @desc    Handle Contact Form Submission (Validate Order + Persist Ticket + Async Auto-Reply)
// @route   POST /api/support/contact
// @access  Public
const handleContactInquiry = async (req, res) => {
  try {
    const { firstName, lastName, email, topic, message, orderNumber } = req.body;

    if (!firstName || !email || !topic || !message) {
      return res.status(400).json({ success: false, message: 'Please provide all required fields' });
    }

    const trimmedOrderNum = orderNumber ? String(orderNumber).trim() : '';

    // Validate order number if provided or if topic requires an order
    let validatedOrder = null;

    if (trimmedOrderNum) {
      const cleanStr = trimmedOrderNum.replace(/^[#\s]+/, '').replace(/^AS-?/i, '').trim();

      // 1. Direct ObjectId match
      if (mongoose.Types.ObjectId.isValid(trimmedOrderNum)) {
        validatedOrder = await Order.findById(trimmedOrderNum).lean();
      } else if (mongoose.Types.ObjectId.isValid(cleanStr)) {
        validatedOrder = await Order.findById(cleanStr).lean();
      }

      // 2. Tracking number match
      if (!validatedOrder) {
        validatedOrder = await Order.findOne({
          $or: [
            { trackingNumber: { $regex: new RegExp(`^${trimmedOrderNum}$`, 'i') } },
            { trackingNumber: { $regex: new RegExp(`^${cleanStr}$`, 'i') } }
          ]
        }).lean();
      }

      // 3. Short suffix ID match (e.g., last 6 characters like '5D90F0' or '#AS-5D90F0')
      if (!validatedOrder && cleanStr.length >= 4) {
        const recentOrders = await Order.find({}).sort({ createdAt: -1 }).limit(500).select('_id trackingNumber').lean();
        validatedOrder = recentOrders.find(o => {
          const idHex = o._id.toString().toLowerCase();
          const target = cleanStr.toLowerCase();
          return idHex.endsWith(target) || (o.trackingNumber && o.trackingNumber.toLowerCase() === target);
        });
      }

      if (!validatedOrder) {
        return res.status(400).json({
          success: false,
          message: 'Invalid Order Number. Please place a correct order number.'
        });
      }
    } else if (['Order Status', 'Returns & Exchanges'].includes(topic)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide your order number for this inquiry.'
      });
    }

    const recordedOrderNumber = validatedOrder ? validatedOrder._id.toString() : trimmedOrderNum;

    // 1. Persist to MongoDB SupportTicket collection
    const ticket = await SupportTicket.create({
      firstName: firstName.trim(),
      lastName: lastName ? lastName.trim() : '',
      email: email.toLowerCase().trim(),
      topic,
      message,
      orderNumber: recordedOrderNumber,
      status: 'open',
    });

    // 2. Send Auto-Reply asynchronously in background (Eliminates SMTP lag / instant submission)
    sendEmail({
      email: email.toLowerCase().trim(),
      subject: `We've received your inquiry [Ticket #${ticket._id.toString().slice(-6).toUpperCase()}]: ${topic}`,
      html: getContactReplyTemplate(`${firstName} ${lastName || ''}`.trim(), topic)
    }).catch(emailErr => {
      console.error('[SUPPORT] Background auto-reply error:', emailErr.message);
    });

    // 3. Respond immediately to the frontend
    return res.status(201).json({
      success: true,
      message: 'Inquiry submitted successfully! A confirmation email has been dispatched to your inbox.',
      ticketId: ticket._id
    });
  } catch (error) {
    console.error('Support inquiry error:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Get all support tickets (Admin)
// @route   GET /api/support/tickets
// @access  Private (Admin)
const getSupportTickets = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};
    const tickets = await SupportTicket.find(filter).sort({ createdAt: -1 }).lean();
    res.json({ success: true, count: tickets.length, tickets });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Update support ticket status or notes (Admin)
// @route   PATCH /api/support/tickets/:id
// @access  Private (Admin)
const updateTicketStatus = async (req, res) => {
  try {
    const { status, adminNotes } = req.body;
    const ticket = await SupportTicket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    if (status) ticket.status = status;
    if (adminNotes !== undefined) ticket.adminNotes = adminNotes;

    await ticket.save();
    res.json({ success: true, message: 'Ticket updated successfully', ticket });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { handleContactInquiry, getSupportTickets, updateTicketStatus };
