const express = require('express');
const router = express.Router();
const { 
  getCustomerStats, 
  getBoutiqueStats, 
  getBoutiquePayouts, 
  requestBoutiquePayout 
} = require('../controllers/dashboardController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/customer', protect, authorize('customer'), getCustomerStats);
router.get('/boutique', protect, authorize('boutique_owner'), getBoutiqueStats);
router.get('/boutique/payouts', protect, authorize('boutique_owner'), getBoutiquePayouts);
router.post('/boutique/payouts/request', protect, authorize('boutique_owner'), requestBoutiquePayout);

module.exports = router;
