const express = require('express');
const router = express.Router();
const { 
  register, 
  login, 
  logout, 
  getMe, 
  refreshToken, 
  googleLogin, 
  facebookLogin, 
  updateProfile, 
  updatePassword, 
  forgotPassword, 
  verifyOTP, 
  resetPassword,
  setup2FA,
  verify2FA,
  disable2FA,
  validateLogin2FA
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/register', register);
router.post('/login', login);
router.post('/google', googleLogin);
router.post('/facebook', facebookLogin);
router.post('/logout', logout);
router.post('/forgotpassword', forgotPassword);
router.post('/verifyotp', verifyOTP);
router.put('/resetpassword', resetPassword);

// 2FA Routes
router.post('/2fa/setup', protect, setup2FA);
router.post('/2fa/verify', protect, verify2FA);
router.post('/2fa/disable', protect, disable2FA);
router.post('/2fa/validate-login', validateLogin2FA);

// User Profile Routes
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.put('/updatepassword', protect, updatePassword);
router.post('/refresh', refreshToken);

module.exports = router;
