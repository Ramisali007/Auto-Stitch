const Store = require('../models/Store');

// Default initial stores for seeding if collection is empty
const DEFAULT_STORES = [
  {
    name: 'Auto Stitch Experience Center',
    city: 'Faisalabad',
    address: 'FAST-NU, FAST Square, 9 Km from Faisalabad Motorway Interchange towards Chiniot',
    phone: '+92 325 2204959',
    hours: 'Mon - Sat: 09 AM - 06 PM',
    latitude: 31.481525,
    longitude: 73.018659,
    mapUrl: 'https://maps.google.com/maps?q=31.481525,73.018659&hl=en&z=15&output=embed',
    isActive: true,
  },
  {
    name: 'Gulberg Boutique Hub',
    city: 'Lahore',
    address: 'M.M Alam Road, Gulberg III, Lahore',
    phone: '+92 42 111 222 333',
    hours: 'Mon - Sun: 11 AM - 10 PM',
    latitude: 31.5115,
    longitude: 74.3486,
    mapUrl: 'https://maps.google.com/maps?q=31.5115,74.3486&hl=en&z=15&output=embed',
    isActive: true,
  },
  {
    name: 'Clifton Flagship Store',
    city: 'Karachi',
    address: 'Dolmen Mall, Clifton, Karachi',
    phone: '+92 21 333 444 555',
    hours: 'Mon - Sun: 10 AM - 11 PM',
    latitude: 24.8138,
    longitude: 67.0311,
    mapUrl: 'https://maps.google.com/maps?q=24.8138,67.0311&hl=en&z=15&output=embed',
    isActive: true,
  }
];

// @desc    Get all active stores (auto-seeds defaults on first run if empty)
// @route   GET /api/stores
// @access  Public
const getStores = async (req, res) => {
  try {
    let stores = await Store.find({ isActive: true }).lean();
    
    if (stores.length === 0) {
      await Store.insertMany(DEFAULT_STORES);
      stores = await Store.find({ isActive: true }).lean();
    }

    res.json({ success: true, count: stores.length, stores });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

module.exports = { getStores };
