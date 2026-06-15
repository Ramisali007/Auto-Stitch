const express = require('express');
const router = express.Router();
const { getCustomerStats, getBoutiqueStats } = require('../controllers/dashboardController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/customer', protect, authorize('customer'), getCustomerStats);
router.get('/boutique', protect, authorize('boutique_owner'), getBoutiqueStats);

module.exports = router;
