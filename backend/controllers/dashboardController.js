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

module.exports = { getCustomerStats, getBoutiqueStats };
