const { Customer, BoutiqueOwner, Admin, User, getUserModel } = require('../models/User');
const Product = require('../models/Product');
const Boutique = require('../models/Boutique');
const Order = require('../models/Order');
const sendEmail = require('../utils/sendEmail');
const { getBoutiqueStatusTemplate } = require('../utils/emailTemplates');

// @desc    Get admin dashboard stats
// @route   GET /api/admin/stats
// @access  Private (Admin)
const getAdminStats = async (req, res) => {
  try {
    // Get distinct emails from all collections to ensure a unique count
    const [customerEmails, ownerEmails, adminEmails, userEmails] = await Promise.all([
      Customer.distinct('email'),
      BoutiqueOwner.distinct('email'),
      Admin.distinct('email'),
      User.distinct('email')
    ]);

    // Combine all and deduplicate
    const allEmails = [...customerEmails, ...ownerEmails, ...adminEmails, ...userEmails];
    const totalUsers = new Set(allEmails.map(e => e.toLowerCase())).size;


    const productCount = await Product.countDocuments();
    const boutiqueCount = await Boutique.countDocuments({ isApproved: true });
    
    // Revenue from completed or in-progress orders
    const orders = await Order.find({ status: { $nin: ['Cancelled', 'Refunded'] } }).lean();
    const totalRevenue = orders.reduce((acc, order) => acc + (order.total || 0), 0);

    res.json({
      success: true,
      stats: {
        totalUsers: totalUsers,
        activeProducts: productCount,
        registeredBoutiques: boutiqueCount,
        totalRevenue
      }
    });
  } catch (error) {
    console.error('Admin Stats Error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Get all pending boutiques
// @route   GET /api/admin/boutiques/pending
// @access  Private (Admin)
const getPendingBoutiques = async (req, res) => {
  try {
    const boutiques = await Boutique.find({ isApproved: false })
      .populate('owner', 'name email phone')
      .sort({ createdAt: -1 })
      .lean();
    
    res.json({ success: true, count: boutiques.length, boutiques });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Approve a boutique
// @route   PUT /api/admin/boutiques/:id/approve
// @access  Private (Admin)
const approveBoutique = async (req, res) => {
  try {
    const boutique = await Boutique.findById(req.params.id).populate('owner', 'name email');
    
    if (!boutique) {
      return res.status(404).json({ success: false, message: 'Boutique not found' });
    }

    boutique.isApproved = true;
    boutique.kyc.status = 'verified';
    boutique.kyc.reviewedAt = new Date();
    
    await boutique.save();
    
    if (boutique.owner && boutique.owner.email) {
      try {
        await sendEmail({
          email: boutique.owner.email,
          subject: 'Boutique Verification Approved - Auto Stitch',
          html: getBoutiqueStatusTemplate(boutique.owner.name, 'approved')
        });
      } catch (err) {
        console.error('Failed to send boutique approval email:', err);
      }
    }

    res.json({ success: true, message: 'Boutique approved successfully', boutique });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Reject a boutique
// @route   PUT /api/admin/boutiques/:id/reject
// @access  Private (Admin)
const rejectBoutique = async (req, res) => {
  try {
    const { reason } = req.body;
    const boutique = await Boutique.findById(req.params.id).populate('owner', 'name email');
    
    if (!boutique) {
      return res.status(404).json({ success: false, message: 'Boutique not found' });
    }

    boutique.isApproved = false;
    boutique.kyc.status = 'rejected';
    boutique.kyc.reviewNotes = reason || 'Does not meet requirements';
    boutique.kyc.reviewedAt = new Date();
    
    await boutique.save();
    
    if (boutique.owner && boutique.owner.email) {
      try {
        await sendEmail({
          email: boutique.owner.email,
          subject: 'Boutique Verification Rejected - Auto Stitch',
          html: getBoutiqueStatusTemplate(boutique.owner.name, 'rejected', boutique.kyc.reviewNotes)
        });
      } catch (err) {
        console.error('Failed to send boutique rejection email:', err);
      }
    }

    res.json({ success: true, message: 'Boutique rejected', boutique });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Get all users (Customers, Boutique Owners, and Admins)
// @route   GET /api/admin/users
// @access  Private (Admin)
const getAllUsers = async (req, res) => {
  try {
    const customers = await Customer.find({}).select('-password -twoFactorSecret').lean();
    const owners = await BoutiqueOwner.find({}).select('-password -twoFactorSecret').lean();
    const admins = await Admin.find({}).select('-password -twoFactorSecret').lean();
    const legacyUsers = await User.find({}).select('-password -twoFactorSecret').lean();
    
    // Use a Map to deduplicate by email
    const userMap = new Map();

    // Add legacy users first (lowest priority)
    legacyUsers.forEach(u => userMap.set(u.email.toLowerCase(), { ...u, source: 'users' }));
    
    // Overwrite with specialized data (higher priority)
    customers.forEach(u => userMap.set(u.email.toLowerCase(), { ...u, role: 'customer', source: 'customers' }));
    owners.forEach(u => userMap.set(u.email.toLowerCase(), { ...u, role: 'boutique_owner', source: 'boutique_owners' }));
    admins.forEach(u => userMap.set(u.email.toLowerCase(), { ...u, role: 'admin', source: 'admins' }));

    const allUsers = Array.from(userMap.values())
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({ success: true, count: allUsers.length, users: allUsers });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Toggle user active status
// @route   PATCH /api/admin/users/:id/status
// @access  Private (Admin)
const toggleUserStatus = async (req, res) => {
  try {
    const { role, source } = req.body;
    
    let Model;
    if (source === 'users') {
      Model = User;
    } else {
      Model = getUserModel(role);
    }
    
    const user = await Model.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.isActive = !user.isActive;
    await user.save();

    res.json({ success: true, message: `User ${user.isActive ? 'activated' : 'deactivated'}`, isActive: user.isActive });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { role, source } = req.query;
    
    console.log(`[Admin Delete] Attempting to purge user. ID: ${id}, Role: ${role}, Source: ${source}`);

    let Model;
    if (source === 'users') {
      Model = User;
    } else {
      Model = getUserModel(role);
    }

    if (!Model) {
      return res.status(400).json({ success: false, message: `Invalid model for role: ${role}, source: ${source}` });
    }
    
    const user = await Model.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Identity not found in records' });
    }

    // If it's a boutique owner, purge their entire ecosystem
    if (role === 'boutique_owner' || user.role === 'boutique_owner') {
      const boutique = await Boutique.findOne({ owner: user._id });
      if (boutique) {
        console.log(`[Admin Delete] Purging boutique profile: ${boutique.name}`);
        await Product.deleteMany({ boutique: boutique._id });
        await Boutique.findByIdAndDelete(boutique._id);
      }
    }

    await Model.findByIdAndDelete(id);
    console.log(`[Admin Delete] Success. Identity ${id} has been purged.`);

    res.json({ success: true, message: 'Identity and associated ecosystems purged successfully' });
  } catch (error) {
    console.error('[Admin Delete] Error:', error);
    res.status(500).json({ success: false, message: 'Platform error during purge', error: error.message });
  }
};

const verifyUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { role, source } = req.body;
    const { User } = require('../models/User');
    
    let Model;
    if (source === 'users') {
      Model = User;
    } else {
      Model = getUserModel(role);
    }
    
    const user = await Model.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.isVerified = true;
    await user.save();

    res.json({ success: true, message: 'User identity verified successfully', isVerified: true });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error during verification', error: error.message });
  }
};

// @desc    Get all products for moderation
// @route   GET /api/admin/products
// @access  Private (Admin)
const getAllProducts = async (req, res) => {
  try {
    const { status } = req.query;
    const query = {};
    if (status && status !== 'all') query.status = status;

    const products = await Product.find(query)
      .populate('boutique', 'name')
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, count: products.length, products });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Update product status (Approve/Reject)
// @route   PATCH /api/admin/products/:id/status
// @access  Private (Admin)
const updateProductStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['approved', 'rejected', 'pending'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    product.status = status;
    // If approved, ensure it's visible
    if (status === 'approved') product.isActive = true;
    if (status === 'rejected') product.isActive = false;

    await product.save();

    res.json({ success: true, message: `Product ${status}`, product });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Delete product (Admin)
// @route   DELETE /api/admin/products/:id
// @access  Private (Admin)
const deleteProductAdmin = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    res.json({ success: true, message: 'Product permanently removed' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

module.exports = {
  getAdminStats,
  getPendingBoutiques,
  approveBoutique,
  rejectBoutique,
  getAllUsers,
  toggleUserStatus,
  deleteUser,
  verifyUser,
  getAllProducts,
  updateProductStatus,
  deleteProductAdmin
};
