const express = require('express');
const router = express.Router();
const { validateCoupon, getActiveCoupons } = require('../controllers/couponController');

router.post('/validate', validateCoupon);
router.get('/', getActiveCoupons);

module.exports = router;
