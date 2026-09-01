const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema(
  {
    code: { 
      type: String, 
      required: true, 
      unique: true, 
      uppercase: true, 
      trim: true 
    },
    description: { type: String, default: '' },
    discountType: { 
      type: String, 
      enum: ['percentage', 'flat', 'free_shipping'], 
      default: 'percentage' 
    },
    discountValue: { 
      type: Number, 
      required: true, 
      min: 0 
    },
    minOrderAmount: { 
      type: Number, 
      default: 0 
    },
    maxDiscountAmount: { 
      type: Number, 
      default: null 
    },
    expiresAt: { 
      type: Date, 
      default: () => new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) 
    },
    usageLimit: { 
      type: Number, 
      default: 1000 
    },
    timesUsed: { 
      type: Number, 
      default: 0 
    },
    isActive: { 
      type: Boolean, 
      default: true 
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Coupon', couponSchema);
