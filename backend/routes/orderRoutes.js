const express = require('express');
const router = express.Router();
const { 
  getMyOrders, 
  getOrder, 
  createOrder, 
  updateOrderStatus, 
  getBoutiqueOrders, 
  cancelOrder, 
  deleteOrder, 
  trackOrder, 
  verifyOrderPayment,
  handleStripeWebhook,
  payInstallment,
  createInstallmentStripeSession,
  requestOrderReturn,
  reviewOrderReturn
} = require('../controllers/orderController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { trackOrderLimiter } = require('../middleware/rateLimiter');

// Stripe webhook (public)
router.post('/webhook', handleStripeWebhook);

// Public tracking route
router.post('/track', trackOrderLimiter, trackOrder);

// Customer routes
router.get('/', protect, authorize('customer'), getMyOrders);
router.post('/', protect, authorize('customer'), createOrder);
router.post('/:id/verify-payment', protect, verifyOrderPayment);
router.post('/:id/installments/:installmentIndex/pay', protect, authorize('customer'), payInstallment);
router.post('/:id/installments/:installmentIndex/stripe-session', protect, authorize('customer'), createInstallmentStripeSession);
router.post('/:id/request-return', protect, authorize('customer'), requestOrderReturn);
router.patch('/:id/review-return', protect, authorize('boutique_owner'), reviewOrderReturn);
router.patch('/:id/cancel', protect, cancelOrder);
router.get('/boutique', protect, authorize('boutique_owner'), getBoutiqueOrders);
router.get('/:id', protect, getOrder);
router.patch('/:id/status', protect, authorize('boutique_owner'), updateOrderStatus);
router.delete('/:id', protect, authorize('boutique_owner'), deleteOrder);

module.exports = router;

