const Boutique = require('../models/Boutique');

// @desc    Get boutique details by ID
// @route   GET /api/boutiques/:id
// @access  Public
const getBoutiqueById = async (req, res) => {
  try {
    const mongoose = require('mongoose');
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid Boutique ID format' });
    }

    const boutique = await Boutique.findById(req.params.id).populate('owner', 'name email');
    if (!boutique) {
      return res.status(404).json({ success: false, message: 'Boutique not found' });
    }
    res.json({ success: true, data: boutique });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Get all boutiques (for catalogue)
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

module.exports = {
  getBoutiqueById,
  getAllBoutiques
};
