const Boutique = require('../models/Boutique');

// @desc    Get boutique details by ID
// @route   GET /api/boutiques/:id
// @access  Public
const getBoutiqueById = async (req, res) => {
  try {
    const mongoose = require('mongoose');
    let boutique = null;

    if (mongoose.Types.ObjectId.isValid(req.params.id)) {
      boutique = await Boutique.findById(req.params.id).populate('owner', 'name email');
    }

    if (!boutique) {
      boutique = await Boutique.findOne({ 
        name: { $regex: new RegExp(`^${req.params.id}$`, 'i') } 
      }).populate('owner', 'name email');
    }

    if (!boutique) {
      return res.status(404).json({ success: false, message: 'Boutique not found' });
    }
    res.json({ success: true, data: boutique });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Get all boutiques (for directory & catalogue)
// @route   GET /api/boutiques
// @access  Public
const getAllBoutiques = async (req, res) => {
  try {
    const boutiques = await Boutique.find({ isApproved: true }).populate('owner', 'name');
    res.json({ success: true, count: boutiques.length, data: boutiques });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Get logged in boutique profile
// @route   GET /api/boutiques/me
// @access  Private (Boutique Owner)
const getMyBoutique = async (req, res) => {
  try {
    let boutique = await Boutique.findOne({ owner: req.user._id }).populate('owner', 'name email phone');
    if (!boutique) {
      // Create a default boutique profile for the owner if one does not exist
      boutique = await Boutique.create({
        owner: req.user._id,
        name: `${req.user.name}'s Atelier`,
        description: 'Boutique tailoring and bespoke Pakistani couture atelier.',
        contact: { email: req.user.email, phone: req.user.phone || '' },
        kyc: { status: 'pending', submittedAt: new Date() }
      });
    }
    res.json({ success: true, data: boutique });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Submit KYC documents for boutique verification
// @route   PUT /api/boutiques/kyc
// @access  Private (Boutique Owner)
const submitBoutiqueKyc = async (req, res) => {
  try {
    const { cnic, businessCertificate, notes, name, description, address, contact } = req.body;

    if (!cnic) {
      return res.status(400).json({ success: false, message: 'National CNIC number is required' });
    }

    const cleanCnic = String(cnic).replace(/\D/g, '');
    if (cleanCnic.length !== 13) {
      return res.status(400).json({ success: false, message: 'National CNIC must be exactly 13 numeric digits' });
    }

    let boutique = await Boutique.findOne({ owner: req.user._id });
    if (!boutique) {
      boutique = new Boutique({ owner: req.user._id, name: name || `${req.user.name}'s Atelier` });
    }

    if (name) boutique.name = name.trim();
    if (description !== undefined) boutique.description = description.trim();
    if (address) boutique.address = { ...boutique.address, ...address };
    if (contact) boutique.contact = { ...boutique.contact, ...contact };

    boutique.kyc = {
      status: 'pending',
      cnic: cleanCnic,
      businessCertificate: (businessCertificate !== undefined ? businessCertificate : (boutique.kyc?.businessCertificate || '')).trim(),
      submittedAt: new Date(),
      reviewNotes: (notes || 'Submitted for administrator verification').trim()
    };

    await boutique.save();

    // Create notification for all admins
    try {
      const Notification = require('../models/Notification');
      const { Admin } = require('../models/User');
      const admins = await Admin.find({});
      for (const admin of admins) {
        await Notification.create({
          recipient: admin._id,
          recipientModel: 'Admin',
          sender: req.user._id,
          senderModel: 'BoutiqueOwner',
          type: 'boutique_approved',
          title: 'New Boutique KYC Submitted',
          message: `${boutique.name} submitted KYC documents for verification.`,
          link: '/admin'
        });
      }
    } catch (_) {}

    res.json({
      success: true,
      message: 'KYC documents submitted successfully. Verification status is pending Admin review.',
      boutique
    });
  } catch (error) {
    console.error('Submit KYC error:', error);
    res.status(500).json({ success: false, message: 'Server error submitting KYC', error: error.message });
  }
};

module.exports = {
  getBoutiqueById,
  getAllBoutiques,
  getMyBoutique,
  submitBoutiqueKyc
};
