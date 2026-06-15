const express = require('express');
const router = express.Router();
const { getMyOrders, getOrder, createOrder, updateOrderStatus, getBoutiqueOrders, cancelOrder, deleteOrder, trackOrder, verifyOrderPayment } = require('../controllers/orderController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { trackOrderLimiter } = require('../middleware/rateLimiter');

// Public tracking route
router.post('/track', trackOrderLimiter, trackOrder);

// Customer routes
router.get('/', protect, authorize('customer'), getMyOrders);
router.post('/', protect, authorize('customer'), createOrder);
router.post('/:id/verify-payment', protect, verifyOrderPayment);
router.patch('/:id/cancel', protect, cancelOrder);
router.get('/boutique', protect, authorize('boutique_owner'), getBoutiqueOrders);
router.get('/:id', protect, getOrder);
router.patch('/:id/status', protect, authorize('boutique_owner'), updateOrderStatus);
router.delete('/:id', protect, authorize('boutique_owner'), deleteOrder);

module.exports = router;

