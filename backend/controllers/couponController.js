const Coupon = require('../models/Coupon');

// Default built-in coupons for FYP demo
const DEMO_COUPONS = {
  'EID20': {
    code: 'EID20',
    description: 'Eid Festive 20% Discount across collections',
    discountType: 'percentage',
    discountValue: 20,
    minOrderAmount: 0,
    maxDiscountAmount: 10000,
  },
  'AUTOSTITCH10': {
    code: 'AUTOSTITCH10',
    description: '10% Welcome Discount on your luxury wardrobe',
    discountType: 'percentage',
    discountValue: 10,
    minOrderAmount: 0,
    maxDiscountAmount: 5000,
  },
  'FLAT500': {
    code: 'FLAT500',
    description: 'Flat PKR 500 Off on your artisanal checkout',
    discountType: 'flat',
    discountValue: 500,
    minOrderAmount: 3000,
  },
  'FREESHIP': {
    code: 'FREESHIP',
    description: 'Complimentary Express Courier Nationwide',
    discountType: 'free_shipping',
    discountValue: 250,
    minOrderAmount: 0,
  },
};

// @desc    Validate coupon code
// @route   POST /api/coupons/validate
// @access  Public
const validateCoupon = async (req, res) => {
  try {
    const { code, cartTotal = 0 } = req.body;

    if (!code || !code.trim()) {
      return res.status(400).json({ success: false, message: 'Please enter a coupon code.' });
    }

    const cleanCode = code.trim().toUpperCase();

    // 1. Check in Database first
    let coupon = await Coupon.findOne({ code: cleanCode, isActive: true });

    // 2. Fallback to built-in Demo coupon if not yet in database
    if (!coupon && DEMO_COUPONS[cleanCode]) {
      coupon = DEMO_COUPONS[cleanCode];
    }

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: `Promo code "${cleanCode}" is invalid or has expired. Try "EID20" or "AUTOSTITCH10".`
      });
    }

    // Check expiry if Date object exists
    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
      return res.status(400).json({ success: false, message: 'This promo code has expired.' });
    }

    // Check minimum order amount
    if (coupon.minOrderAmount > 0 && cartTotal < coupon.minOrderAmount) {
      return res.status(400).json({
        success: false,
        message: `Minimum order of PKR ${coupon.minOrderAmount.toLocaleString()} required for code ${coupon.code}.`
      });
    }

    // Calculate discount amount
    let discountAmount = 0;
    let freeShipping = false;

    if (coupon.discountType === 'percentage') {
      discountAmount = Math.round((cartTotal * coupon.discountValue) / 100);
      if (coupon.maxDiscountAmount && discountAmount > coupon.maxDiscountAmount) {
        discountAmount = coupon.maxDiscountAmount;
      }
    } else if (coupon.discountType === 'flat') {
      discountAmount = Math.min(coupon.discountValue, cartTotal);
    } else if (coupon.discountType === 'free_shipping') {
      freeShipping = true;
      discountAmount = 250; // Standard shipping waiver
    }

    res.json({
      success: true,
      message: `Promo code "${coupon.code}" applied successfully!`,
      coupon: {
        code: coupon.code,
        description: coupon.description,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        discountAmount,
        freeShipping
      }
    });
  } catch (error) {
    console.error('Coupon validation error:', error);
    res.status(500).json({ success: false, message: 'Server error validating coupon', error: error.message });
  }
};

// @desc    Get all active coupons (Admin / Public banner)
// @route   GET /api/coupons
// @access  Public
const getActiveCoupons = async (req, res) => {
  try {
    const dbCoupons = await Coupon.find({ isActive: true }).lean();
    const demoList = Object.values(DEMO_COUPONS);
    
    // Combine and deduplicate
    const combinedMap = new Map();
    demoList.forEach(c => combinedMap.set(c.code, c));
    dbCoupons.forEach(c => combinedMap.set(c.code, c));

    res.json({ success: true, coupons: Array.from(combinedMap.values()) });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

module.exports = {
  validateCoupon,
  getActiveCoupons
};
