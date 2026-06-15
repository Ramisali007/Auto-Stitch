const express = require('express');
const router = express.Router();
const { register, login, logout, getMe, refreshToken, googleLogin, facebookLogin, updateProfile, updatePassword, forgotPassword, verifyOTP, resetPassword } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/register', register);
router.post('/login', login);
router.post('/google', googleLogin);
router.post('/facebook', facebookLogin);
router.post('/logout', logout);
router.post('/forgotpassword', forgotPassword);
router.post('/verifyotp', verifyOTP);
router.put('/resetpassword', resetPassword);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.put('/updatepassword', protect, updatePassword);
router.post('/refresh', refreshToken);

module.exports = router;
