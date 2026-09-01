const Order = require('../models/Order');
const CustomizationRequest = require('../models/CustomizationRequest');
const Product = require('../models/Product');

// @desc    Get customer dashboard stats
// @route   GET /api/dashboard/customer
// @access  Private (Customer)
const getCustomerStats = async (req, res) => {
  try {
    const totalOrders = await Order.countDocuments({ customer: req.user._id });
    const activeRequests = await CustomizationRequest.countDocuments({ 
      customer: req.user._id, 
      status: { $in: ['submitted', 'bidding'] } 
    });
    
    // For now, these are static or semi-calculated
    const wishlistCount = req.user.wishlist ? req.user.wishlist.length : 0;
    
    // Fetch recent orders
    const recentOrders = await Order.find({ customer: req.user._id })
      .sort({ createdAt: -1 })
      .limit(3)
      .populate('items.product', 'name images');

    res.json({
      success: true,
      stats: {
        totalOrders,
        wishlistCount,
        tryOnsUsed: await CustomizationRequest.countDocuments({ customer: req.user._id }),
        activeRequests
      },
      recentOrders
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Get boutique dashboard stats
// @route   GET /api/dashboard/boutique
// @access  Private (Boutique Owner)
const getBoutiqueStats = async (req, res) => {
  try {
    const boutique = await require('../models/Boutique').findOne({ owner: req.user._id });
    if (!boutique) {
      return res.status(404).json({ success: false, message: 'Boutique not found' });
    }

    const totalProducts = await Product.countDocuments({ boutique: boutique._id });
    const totalOrders = await Order.countDocuments({ boutique: boutique._id });
    const pendingBids = await require('../models/Bid').countDocuments({ boutique: boutique._id, status: 'pending' });

    res.json({
      success: true,
      boutique: {
        isApproved: boutique.isApproved,
        kyc: boutique.kyc,
        address: boutique.address,
        contact: boutique.contact,
        name: boutique.name
      },
      stats: {
        totalProducts,
        totalOrders,
        pendingBids,
        revenue: await Order.aggregate([
          { 
            $match: { 
              boutique: boutique._id, 
              $or: [{ paymentStatus: 'paid' }, { status: 'delivered' }] 
            } 
          },
          { $group: { _id: null, total: { $sum: '$total' } } }
        ]).then(r => r[0]?.total || 0)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Get boutique payout summary and history
// @route   GET /api/dashboard/boutique/payouts
// @access  Private (Boutique Owner)
const getBoutiquePayouts = async (req, res) => {
  try {
    const Boutique = require('../models/Boutique');
    const boutique = await Boutique.findOne({ owner: req.user._id });
    if (!boutique) {
      return res.status(404).json({ success: false, message: 'Boutique not found' });
    }

    // Compute delivered / paid order revenue
    const orders = await Order.find({ boutique: boutique._id }).lean();
    
    let grossEarnings = 0;
    let inProgressGross = 0;

    orders.forEach(order => {
      if (order.status === 'delivered' || order.paymentStatus === 'paid') {
        grossEarnings += (order.total || 0);
      } else if (!['cancelled', 'refunded'].includes(order.status)) {
        inProgressGross += (order.total || 0);
      }
    });

    const platformFeeRate = 0.10; // 10% platform fee
    const netEarnings = Math.round(grossEarnings * (1 - platformFeeRate));
    const pendingEarnings = Math.round(inProgressGross * (1 - platformFeeRate));

    const totalWithdrawn = (boutique.payoutHistory || [])
      .filter(p => p.status === 'processed' || p.status === 'approved')
      .reduce((sum, p) => sum + p.amount, 0);

    const pendingRequests = (boutique.payoutHistory || [])
      .filter(p => p.status === 'pending')
      .reduce((sum, p) => sum + p.amount, 0);

    const availableBalance = Math.max(0, netEarnings - totalWithdrawn - pendingRequests);

    res.json({
      success: true,
      data: {
        grossEarnings,
        netEarnings,
        platformFeeRate: '10%',
        availableBalance,
        pendingBalance: pendingEarnings,
        totalWithdrawn,
        pendingRequestsAmount: pendingRequests,
        bankDetails: boutique.bankDetails || {},
        payoutHistory: boutique.payoutHistory || []
      }
    });
  } catch (error) {
    console.error('Boutique payouts error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch payout records', error: error.message });
  }
};

// @desc    Submit a boutique payout withdrawal request
// @route   POST /api/dashboard/boutique/payouts/request
// @access  Private (Boutique Owner)
const requestBoutiquePayout = async (req, res) => {
  try {
    const { amount, bankName, accountTitle, accountNumber, iban, notes } = req.body;
    const numAmount = Number(amount);

    if (!numAmount || numAmount < 1000) {
      return res.status(400).json({ success: false, message: 'Minimum withdrawal amount is PKR 1,000' });
    }

    const Boutique = require('../models/Boutique');
    const boutique = await Boutique.findOne({ owner: req.user._id });
    if (!boutique) {
      return res.status(404).json({ success: false, message: 'Boutique not found' });
    }

    // Update bank details if provided
    if (bankName || accountTitle || accountNumber || iban) {
      boutique.bankDetails = {
        bankName: bankName || boutique.bankDetails?.bankName || '',
        accountTitle: accountTitle || boutique.bankDetails?.accountTitle || '',
        accountNumber: accountNumber || boutique.bankDetails?.accountNumber || '',
        iban: iban || boutique.bankDetails?.iban || '',
      };
    }

    if (!boutique.bankDetails?.accountNumber && !accountNumber) {
      return res.status(400).json({ success: false, message: 'Please provide bank account details for transfer' });
    }

    // Verify available balance
    const orders = await Order.find({ boutique: boutique._id }).lean();
    let grossEarnings = 0;
    orders.forEach(order => {
      if (order.status === 'delivered' || order.paymentStatus === 'paid') {
        grossEarnings += (order.total || 0);
      }
    });

    const netEarnings = Math.round(grossEarnings * 0.90);
    const totalWithdrawn = (boutique.payoutHistory || [])
      .filter(p => p.status === 'processed' || p.status === 'approved')
      .reduce((sum, p) => sum + p.amount, 0);

    const pendingRequests = (boutique.payoutHistory || [])
      .filter(p => p.status === 'pending')
      .reduce((sum, p) => sum + p.amount, 0);

    const availableBalance = Math.max(0, netEarnings - totalWithdrawn - pendingRequests);

    if (numAmount > availableBalance) {
      return res.status(400).json({
        success: false,
        message: `Requested amount exceeds available balance (PKR ${availableBalance.toLocaleString()})`
      });
    }

    const ref = `PAY-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
    const payoutRecord = {
      amount: numAmount,
      status: 'pending',
      requestedAt: new Date(),
      notes: notes || 'Direct bank disbursement request',
      transactionRef: ref
    };

    if (!boutique.payoutHistory) boutique.payoutHistory = [];
    boutique.payoutHistory.unshift(payoutRecord);
    await boutique.save();

    res.status(201).json({
      success: true,
      message: `Payout request of PKR ${numAmount.toLocaleString()} submitted successfully! Ref: ${ref}`,
      payoutRecord
    });
  } catch (error) {
    console.error('Request payout error:', error);
    res.status(500).json({ success: false, message: 'Failed to submit payout request', error: error.message });
  }
};

module.exports = { 
  getCustomerStats, 
  getBoutiqueStats, 
  getBoutiquePayouts, 
  requestBoutiquePayout 
};
