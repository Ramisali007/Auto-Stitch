const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, minlength: 6, select: false },
    role: { type: String, enum: ['customer', 'boutique_owner', 'admin'], default: 'customer' },
    avatar: { type: String, default: '' },
    phone: { type: String, default: '' },
    address: {
      street: String,
      city: String,
      province: String,
      postalCode: String,
    },
    provider: { type: String, enum: ['local', 'google', 'facebook'], default: 'local' },
    providerId: { type: String },
    isVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    twoFactorEnabled: { type: Boolean, default: false },
    twoFactorSecret: { type: String, select: false },
    loginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date },
    refreshToken: { type: String },
    wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
    consent: {
      imageProcessing: { type: Boolean, default: false },
      dataRetention: { type: Boolean, default: false },
      marketing: { type: Boolean, default: false },
      consentDate: { type: Date },
    },
    notifications: {
      email: { type: Boolean, default: true },
      inApp: { type: Boolean, default: true },
      push: { type: Boolean, default: false },
      orderUpdates: { type: Boolean, default: true },
      promotions: { type: Boolean, default: false },
    },
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    resetPasswordLastSent: Date,
    resetOtpAttempts: { type: Number, default: 0 },
    resetAuthToken: String,
    resetAuthExpire: Date,
  },
  { timestamps: true }
);

// ... (existing methods)

// Generate 6-digit cryptographically secure numeric OTP for password reset (5-minute expiry)
userSchema.methods.getResetPasswordToken = function () {
  // Cryptographically secure random 6-digit number
  const otp = crypto.randomInt(100000, 1000000).toString();

  // Hash token and set to resetPasswordToken field
  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(otp)
    .digest('hex');

  // Set expire (5 minutes)
  this.resetPasswordExpire = Date.now() + 5 * 60 * 1000;
  this.resetPasswordLastSent = Date.now();
  this.resetOtpAttempts = 0;

  return otp;
};

// Hash password before saving
userSchema.pre('save', async function () {
  if (!this.isModified('password') || !this.password) return;
  this.password = await bcrypt.hash(this.password, 10);
});

// Match password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Check if account is locked
userSchema.virtual('isLocked').get(function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Create separate models for different collections
const Customer = mongoose.model('Customer', userSchema, 'customers');
const BoutiqueOwner = mongoose.model('BoutiqueOwner', userSchema, 'boutique_owners');
const Admin = mongoose.model('Admin', userSchema, 'admins');
const User = mongoose.model('User', userSchema, 'users');

// Helper to get model by role
const getUserModel = (role) => {
  const normalized = (role || '').toLowerCase().trim();
  switch (normalized) {
    case 'admin':
      return Admin;
    case 'boutique_owner':
    case 'boutique':
      return BoutiqueOwner;
    case 'customer':
    case 'user':
      return Customer;
    default:
      return Customer;
  }
};

module.exports = {
  Customer,
  BoutiqueOwner,
  Admin,
  getUserModel,
  // For backward compatibility during migration, we can also export a "User" proxy or just one of them
  User
};

