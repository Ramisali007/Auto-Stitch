const express = require('express');
const router = express.Router();
const { 
  createCustomizationRequest, 
  getAvailableRequests, 
  submitBid, 
  getBidsForRequest, 
  acceptBid,
  getMyRequests,
  deleteCustomizationRequest,
  getMyBids
} = require('../controllers/bidController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Customization Request & Management routes (Available to all registered users: customers, boutique owners, admins)
router.post('/request', protect, authorize('customer', 'boutique_owner', 'admin'), createCustomizationRequest);
router.get('/my-requests', protect, authorize('customer', 'boutique_owner', 'admin'), getMyRequests);
router.get('/requests/:requestId/bids', protect, authorize('customer', 'boutique_owner', 'admin'), getBidsForRequest);
router.patch('/requests/:requestId/accept/:bidId', protect, authorize('customer', 'boutique_owner', 'admin'), acceptBid);
router.delete('/requests/:requestId', protect, authorize('customer', 'boutique_owner', 'admin'), deleteCustomizationRequest);

// Boutique bidding pool routes
router.get('/requests', protect, authorize('boutique_owner'), getAvailableRequests);
router.post('/requests/:requestId/bid', protect, authorize('boutique_owner'), submitBid);
router.get('/my-bids', protect, authorize('boutique_owner'), getMyBids);

module.exports = router;

