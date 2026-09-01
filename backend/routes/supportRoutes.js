const express = require('express');
const router = express.Router();
const { handleContactInquiry, getSupportTickets, updateTicketStatus } = require('../controllers/supportController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.post('/contact', handleContactInquiry);
router.get('/tickets', protect, authorize('admin'), getSupportTickets);
router.patch('/tickets/:id', protect, authorize('admin'), updateTicketStatus);

module.exports = router;
