const express = require('express');
const router = express.Router();
const { getChatbotResponse } = require('../controllers/chatbotController');
const { chatbotLimiter } = require('../middleware/rateLimiter');

router.post('/', chatbotLimiter, getChatbotResponse);

module.exports = router;
