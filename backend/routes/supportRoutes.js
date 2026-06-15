const express = require('express');
const router = express.Router();
const { handleContactInquiry } = require('../controllers/supportController');

router.post('/contact', handleContactInquiry);

module.exports = router;
