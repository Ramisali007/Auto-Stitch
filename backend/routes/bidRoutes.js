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

// Customer routes
router.post('/request', protect, authorize('customer'), createCustomizationRequest);
router.get('/my-requests', protect, authorize('customer'), getMyRequests);
router.get('/requests/:requestId/bids', protect, authorize('customer'), getBidsForRequest);
router.patch('/requests/:requestId/accept/:bidId', protect, authorize('customer'), acceptBid);
router.delete('/requests/:requestId', protect, authorize('customer'), deleteCustomizationRequest);

// Boutique routes
router.get('/requests', protect, authorize('boutique_owner'), getAvailableRequests);
router.post('/requests/:requestId/bid', protect, authorize('boutique_owner'), submitBid);
router.get('/my-bids', protect, authorize('boutique_owner'), getMyBids);

module.exports = router;

