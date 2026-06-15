const express = require('express');
const router = express.Router();
const { subscribeNewsletter } = require('../controllers/subscriptionController');

router.post('/subscribe', subscribeNewsletter);

module.exports = router;
