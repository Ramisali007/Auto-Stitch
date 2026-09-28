const express = require('express');
const router = express.Router();
const { subscribeNewsletter, unsubscribeNewsletter, getSubscribers, deleteSubscriber } = require('../controllers/subscriptionController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.post('/subscribe', subscribeNewsletter);
router.post('/unsubscribe', unsubscribeNewsletter);
router.get('/subscribers', protect, authorize('admin'), getSubscribers);
router.delete('/subscribers/:id', protect, authorize('admin'), deleteSubscriber);

module.exports = router;
