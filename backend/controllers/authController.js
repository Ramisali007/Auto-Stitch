const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const { User, Admin, BoutiqueOwner, Customer, getUserModel } = require('../models/User');
const Boutique = require('../models/Boutique');
const { z } = require('zod');
const sendEmail = require('../utils/sendEmail');
const { getWelcomeTemplate, getPasswordResetOtpTemplate } = require('../utils/emailTemplates');
// ===== Zod Validation Schemas =====
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.(com|org|net|edu|gov|mil|co|info|io|pk|uk|us|ca|au)$/i;

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(50).trim(),
  email: z.string().email('Invalid email address').regex(EMAIL_REGEX, 'Please enter a valid email domain (e.g., .com, .net)').trim().toLowerCase(),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Password must contain at least one special character'),
  role: z.enum(['customer', 'boutique_owner']).optional().default('customer'),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address').regex(EMAIL_REGEX, 'Please enter a valid email domain (e.g., .com, .net)').trim().toLowerCase(),
  password: z.string().min(1, 'Password is required'),
  portal: z.enum(['customer', 'boutique', 'admin']).optional().default('customer'),
});

// Secret for short-lived 2FA pre-authentication tokens
const JWT_2FA_SECRET = process.env.JWT_2FA_SECRET || (process.env.JWT_SECRET + '_2fa_temp');

// Generate tokens (15m access token, 7d refresh token)
const generateTokens = (id, role) => {
  const accessToken = jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: '15m' });
  const refreshToken = jwt.sign({ id, role }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
  return { accessToken, refreshToken };
};

// Set token cookies
const sendTokenResponse = async (user, statusCode, res) => {
  const { accessToken, refreshToken } = generateTokens(user._id, user.role);

  // Store refresh token in user document for rotation and revocation
  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
  };

  res
    .status(statusCode)
    .cookie('accessToken', accessToken, { ...cookieOptions, maxAge: 15 * 60 * 1000 }) // 15 mins
    .cookie('refreshToken', refreshToken, { ...cookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000 }) // 7 days
    .json({
      success: true,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        phone: user.phone,
        address: user.address,
        notifications: user.notifications,
        isVerified: user.isVerified,
      },
      accessToken,
    });
};

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      const errors = parsed.error.issues.map(i => i.message).join(', ');
      return res.status(400).json({ success: false, message: errors });
    }
    const { name, email, password, role } = parsed.data;
    const { captchaToken } = req.body;

    // Verify reCAPTCHA if configured
    if (process.env.RECAPTCHA_SECRET_KEY) {
      if (!captchaToken) {
        return res.status(400).json({ success: false, message: 'Please complete the reCAPTCHA verification' });
      }
      try {
        const verificationUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${captchaToken}`;
        const verifyRes = await fetch(verificationUrl, { method: 'POST' });
        const verifyData = await verifyRes.json();

        if (!verifyData.success) {
          const errorCodes = verifyData['error-codes'] || [];
          const isHostnameMismatch = errorCodes.includes('hostname-mismatch');
          if (!isHostnameMismatch) {
            return res.status(400).json({ success: false, message: 'reCAPTCHA verification failed. Please try again.' });
          }
        }
      } catch (captchaErr) {
        console.error('[reCAPTCHA Notice]:', captchaErr.message);
        return res.status(500).json({ success: false, message: 'Unable to verify reCAPTCHA. Please try again.' });
      }
    }

    const Model = getUserModel(role);
    const userExists = await Model.findOne({ email });
    if (userExists) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    const user = await Model.create({ name, email, password, role });

    // If boutique_owner, create a pending boutique profile
    if (role === 'boutique_owner') {
      await Boutique.create({
        owner: user._id,
        name: `${name}'s Boutique`,
        isApproved: false,
        kyc: { status: 'pending' }
      });
    }

    try {
      await sendEmail({
        email: user.email,
        subject: 'Welcome to Auto Stitch',
        html: getWelcomeTemplate(user.name, user.role),
      });
    } catch (emailErr) {
      console.error('Welcome email failed to send:', emailErr);
    }

    sendTokenResponse(user, 201, res);
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      const errors = parsed.error.issues.map(i => i.message).join(', ');
      return res.status(400).json({ success: false, message: errors });
    }
    const { email, password, portal, captchaToken } = req.body;

    // Verify reCAPTCHA if configured
    if (process.env.RECAPTCHA_SECRET_KEY) {
      if (!captchaToken) {
        return res.status(400).json({ success: false, message: 'Please complete the reCAPTCHA verification' });
      }
      try {
        const verificationUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${captchaToken}`;
        const verifyRes = await fetch(verificationUrl, { method: 'POST' });
        const verifyData = await verifyRes.json();

        if (!verifyData.success) {
          const errorCodes = verifyData['error-codes'] || [];
          const isHostnameMismatch = errorCodes.includes('hostname-mismatch');
          if (!isHostnameMismatch) {
            return res.status(400).json({ success: false, message: 'reCAPTCHA verification failed. Please try again.' });
          }
        }
      } catch (captchaErr) {
        console.error('[reCAPTCHA Login Notice]:', captchaErr.message);
        return res.status(500).json({ success: false, message: 'Unable to verify reCAPTCHA. Please try again.' });
      }
    }

    let user;
    if (portal === 'admin') {
      user = await Admin.findOne({ email }).select('+password');
    } else if (portal === 'boutique') {
      user = await BoutiqueOwner.findOne({ email }).select('+password');
    } else {
      user = await Customer.findOne({ email }).select('+password');
    }

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials for this portal' });
    }

    // Role vs Portal Enforcement
    if (user.role === 'admin' && portal !== 'admin') {
      return res.status(403).json({ success: false, message: 'Administrators must use the dedicated Admin Portal to log in.' });
    }

    if (user.role === 'boutique_owner' && portal !== 'boutique') {
      return res.status(403).json({ success: false, message: 'Boutique owners must log in through the Boutique Portal.' });
    }

    if (user.role === 'customer' && portal !== 'customer') {
      return res.status(403).json({ success: false, message: 'Customers must log in through the Customer Portal.' });
    }

    if (user.isLocked) {
      return res.status(423).json({ success: false, message: 'Account locked. Please try again later.' });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Your account has been deactivated by an administrator. Please contact support.' });
    }

    // Check if boutique owner is approved
    if (user.role === 'boutique_owner') {
      const boutique = await Boutique.findOne({ owner: user._id });
      if (!boutique || !boutique.isApproved) {
        return res.status(403).json({
          success: false,
          message: 'Your boutique account is pending admin verification. Please wait for approval.',
          isPending: true
        });
      }
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      user.loginAttempts += 1;
      if (user.loginAttempts >= 5) {
        user.lockUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 min lock
      }
      await user.save();
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Reset login attempts
    user.loginAttempts = 0;
    user.lockUntil = undefined;
    await user.save();

    // If 2FA is enabled for this account
    if (user.twoFactorEnabled) {
      const { twoFactorToken } = req.body;
      if (!twoFactorToken) {
        const tempToken = jwt.sign(
          { id: user._id, role: user.role, is2FAPending: true },
          JWT_2FA_SECRET,
          { expiresIn: '5m' }
        );
        return res.json({
          success: true,
          requires2FA: true,
          tempToken,
          message: 'Two-Factor Authentication required. Please enter your 6-digit authenticator code.'
        });
      }

      const Model = getUserModel(user.role);
      const userWithSecret = await Model.findById(user._id).select('+twoFactorSecret');
      const verified = speakeasy.totp.verify({
        secret: userWithSecret.twoFactorSecret,
        encoding: 'base32',
        token: twoFactorToken.trim(),
        window: 1
      });

      if (!verified) {
        return res.status(401).json({ success: false, message: 'Invalid 2FA verification code' });
      }
    }

    sendTokenResponse(user, 200, res);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
const logout = async (req, res) => {
  try {
    const token = req.cookies?.refreshToken;
    if (token) {
      const decoded = jwt.decode(token);
      if (decoded && decoded.id && decoded.role) {
        const Model = getUserModel(decoded.role);
        await Model.findByIdAndUpdate(decoded.id, { $unset: { refreshToken: 1 } });
      }
    }
  } catch (_) {}

  res
    .clearCookie('accessToken')
    .clearCookie('refreshToken')
    .json({ success: true, message: 'Logged out successfully' });
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  try {
    const Model = getUserModel(req.user.role);
    const user = await Model.findById(req.user._id).select('-refreshToken -twoFactorSecret');
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Refresh access token
// @route   POST /api/auth/refresh
// @access  Public
const refreshToken = async (req, res) => {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) return res.status(401).json({ success: false, message: 'No refresh token' });

    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    const Model = getUserModel(decoded.role);
    const user = await Model.findById(decoded.id);
    if (!user || user.refreshToken !== token) {
      return res.status(401).json({ success: false, message: 'Invalid or revoked refresh token' });
    }

    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user._id, user.role);
    user.refreshToken = newRefreshToken;
    await user.save({ validateBeforeSave: false });

    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    };

    res
      .cookie('accessToken', accessToken, {
        ...cookieOptions,
        maxAge: 15 * 60 * 1000,
      })
      .cookie('refreshToken', newRefreshToken, {
        ...cookieOptions,
        maxAge: 7 * 24 * 60 * 60 * 1000,
      })
      .json({ success: true, accessToken });
  } catch (error) {
    res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
  }
};

// @desc    Google login (server-side verification & token exchange)
// @route   POST /api/auth/google
// @access  Public
const googleLogin = async (req, res) => {
  try {
    const { credential, token, accessToken, access_token, role = 'customer' } = req.body;
    const bearerToken = accessToken || access_token;
    const idToken = credential || token;

    if (!idToken && !bearerToken) {
      return res.status(400).json({ success: false, message: 'Google credential or access token is required' });
    }

    let googleUser = null;

    // 1. If accessToken provided (e.g. from useGoogleLogin), fetch from userinfo endpoint
    if (bearerToken) {
      try {
        const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${bearerToken}` },
        });
        if (response.ok) {
          googleUser = await response.json();
        }
      } catch (fetchErr) {
        console.warn('Google userinfo fetch warning:', fetchErr.message);
      }
    }

    // 2. If idToken provided, verify with Google's tokeninfo endpoint
    if (!googleUser && idToken) {
      try {
        const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);
        if (response.ok) {
          googleUser = await response.json();
          // Verify aud against GOOGLE_CLIENT_ID if configured
          if (process.env.GOOGLE_CLIENT_ID && googleUser.aud !== process.env.GOOGLE_CLIENT_ID) {
            return res.status(401).json({ success: false, message: 'Unauthorized Google client ID' });
          }
        }
      } catch (fetchErr) {
        console.warn('Google token verification fetch warning:', fetchErr.message);
      }
    }

    if (!googleUser || !googleUser.email) {
      return res.status(401).json({ success: false, message: 'Invalid, forged, or expired Google authentication credentials' });
    }

    const { email, name, picture: avatar, sub: googleId } = googleUser;
    const cleanEmail = email.toLowerCase().trim();

    let user = await Customer.findOne({ email: cleanEmail });

    if (!user) {
      user = await Customer.create({
        name: name || 'Google User',
        email: cleanEmail,
        avatar: avatar || '',
        provider: 'google',
        providerId: googleId,
        password: crypto.randomBytes(32).toString('hex'),
        isVerified: true
      });
      
      try {
        await sendEmail({
          email: user.email,
          subject: 'Welcome to Auto Stitch',
          html: getWelcomeTemplate(user.name, user.role),
        });
      } catch (emailErr) {
        console.error('Welcome email failed to send:', emailErr);
      }
    } else {
      if (!user.avatar && avatar) user.avatar = avatar;
      if (!user.provider || user.provider === 'local') {
        user.provider = 'google';
        user.providerId = googleId;
      }
      user.isVerified = true;
      await user.save();
    }

    sendTokenResponse(user, 200, res);
  } catch (error) {
    console.error('Google Login error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Facebook login (server-side verification)
// @route   POST /api/auth/facebook
// @access  Public
const facebookLogin = async (req, res) => {
  try {
    const { accessToken: fbAccessToken } = req.body;

    if (!fbAccessToken) {
      return res.status(400).json({ success: false, message: 'Facebook access token is required' });
    }

    // Verify the token with Facebook's Graph API server-side
    const fbRes = await fetch(`https://graph.facebook.com/me?fields=id,name,email,picture.type(large)&access_token=${fbAccessToken}`);

    if (!fbRes.ok) {
      return res.status(401).json({ success: false, message: 'Invalid Facebook token' });
    }

    const fbUser = await fbRes.json();
    const { name, email, id: facebookId, picture } = fbUser;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Could not retrieve email from Facebook. Please ensure email permissions are granted.' });
    }

    let user = await Customer.findOne({ email });

    if (!user) {
      user = await Customer.create({
        name,
        email,
        avatar: picture?.data?.url || '',
        provider: 'facebook',
        providerId: facebookId,
        password: crypto.randomBytes(32).toString('hex'),
        isVerified: true
      });

      try {
        await sendEmail({
          email: user.email,
          subject: 'Welcome to Auto Stitch',
          html: getWelcomeTemplate(user.name, user.role),
        });
      } catch (emailErr) {
        console.error('Welcome email failed to send:', emailErr);
      }
    } else if (user.role === 'admin') {
      return res.status(403).json({ success: false, message: 'Administrators must use the dedicated Admin Portal to log in.' });
    }

    sendTokenResponse(user, 200, res);
  } catch (error) {
    console.error('Facebook Login error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
const updateProfile = async (req, res) => {
  try {
    const Model = getUserModel(req.user.role);
    const user = await Model.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const { name, email, phone, address, notifications } = req.body;

    if (name) user.name = name;
    if (email && email.toLowerCase().trim() !== user.email) {
      const cleanEmail = email.toLowerCase().trim();
      const { Customer, BoutiqueOwner, Admin } = require('../models/User');
      const existing = (await Customer.findOne({ email: cleanEmail, _id: { $ne: user._id } })) ||
                       (await BoutiqueOwner.findOne({ email: cleanEmail, _id: { $ne: user._id } })) ||
                       (await Admin.findOne({ email: cleanEmail, _id: { $ne: user._id } }));
      if (existing) {
        return res.status(400).json({ success: false, message: 'Email is already in use by another account' });
      }
      user.email = cleanEmail;
      user.isVerified = false;
    }
    if (phone) user.phone = phone;
    if (address) user.address = address;
    if (notifications) {
      user.notifications = {
        email: notifications.email ?? user.notifications?.email ?? true,
        inApp: notifications.inApp ?? user.notifications?.inApp ?? true,
        push: notifications.push ?? user.notifications?.push ?? false,
        orderUpdates: notifications.orderUpdates ?? user.notifications?.orderUpdates ?? true,
        promotions: notifications.promotions ?? user.notifications?.promotions ?? false,
      };
    }

    const updatedUser = await user.save();

    // Sync to Boutique model if the user is a boutique owner
    if (user.role === 'boutique_owner') {
      const boutique = await Boutique.findOne({ owner: user._id });
      if (boutique) {
        if (address) boutique.address = address;
        if (phone) {
          boutique.contact = boutique.contact || {};
          boutique.contact.phone = phone;
        }
        if (email) {
          boutique.contact = boutique.contact || {};
          boutique.contact.email = email;
        }
        await boutique.save();
      }
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        avatar: updatedUser.avatar,
        phone: updatedUser.phone,
        address: updatedUser.address,
        notifications: updatedUser.notifications,
        isVerified: updatedUser.isVerified,
      },
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Update password
// @route   PUT /api/auth/updatepassword
// @access  Private
const updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const Model = getUserModel(req.user.role);
    const user = await Model.findById(req.user._id).select('+password');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Check if it's a local user
    if (user.provider !== 'local') {
      return res.status(400).json({ success: false, message: 'Social login users cannot change passwords here' });
    }

    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid current password' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    console.error('Update password error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Forgot password (Universal: Customer, Boutique, Admin)
// @route   POST /api/auth/forgotpassword
// @access  Public
const forgotPassword = async (req, res) => {
  try {
    const { email, role = 'customer' } = req.body;

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({ success: false, message: 'Please enter a valid email format.' });
    }

    const normalizedRole = (role || 'customer').toLowerCase().trim();
    const Model = getUserModel(normalizedRole);
    let user = await Model.findOne({ email: normalizedEmail });
    if (!user && (normalizedRole === 'customer' || normalizedRole === 'user')) {
      user = await User.findOne({ email: normalizedEmail });
    }

    // Privacy-safe response: return generic success message if account doesn't exist
    if (!user) {
      return res.status(200).json({
        success: true,
        message: 'If an account exists for this email, a 6-digit verification code has been sent.',
      });
    }

    // Rate-limiting resends: enforce 60-second cooldown
    if (user.resetPasswordLastSent) {
      const timeSinceLast = Date.now() - new Date(user.resetPasswordLastSent).getTime();
      if (timeSinceLast < 60000) {
        const waitSeconds = Math.ceil((60000 - timeSinceLast) / 1000);
        return res.status(429).json({
          success: false,
          message: `Please wait ${waitSeconds} seconds before requesting a new code.`,
        });
      }
    }

    // Generate cryptographically secure OTP and 5-min expiration
    const otp = user.getResetPasswordToken();
    user.resetAuthToken = undefined;
    user.resetAuthExpire = undefined;
    await user.save({ validateBeforeSave: false });

    // Format human-friendly role name for email
    let roleLabel = 'Customer';
    if (user.role === 'boutique_owner' || normalizedRole === 'boutique' || normalizedRole === 'boutique_owner') {
      roleLabel = 'Boutique Atelier';
    } else if (user.role === 'admin' || normalizedRole === 'admin') {
      roleLabel = 'Administrator';
    }

    const html = getPasswordResetOtpTemplate(user.name || roleLabel, otp, roleLabel);

    try {
      await sendEmail({
        email: user.email,
        subject: `Your AutoStitch Password Reset Code: ${otp}`,
        html,
      });

      console.log(`[ForgotPassword] Verification code dispatched to ${user.email} (${roleLabel})`);

      res.status(200).json({
        success: true,
        message: 'A 6-digit verification code has been sent to your email.',
      });
    } catch (err) {
      console.error('[ForgotPassword] Email send error:', err);
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save({ validateBeforeSave: false });
      return res.status(500).json({ success: false, message: 'Failed to dispatch email. Please try again later.' });
    }
  } catch (error) {
    console.error('[ForgotPassword] Unexpected error:', error);
    res.status(500).json({ success: false, message: 'Server error processing request' });
  }
};

// @desc    Verify OTP and issue single-use Reset Authorization Token
// @route   POST /api/auth/verifyotp
// @access  Public
const verifyOTP = async (req, res) => {
  try {
    const { email, role = 'customer', otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Email and 6-digit verification code are required.' });
    }

    const cleanOtp = otp.toString().trim();
    if (!/^\d{6}$/.test(cleanOtp)) {
      return res.status(400).json({ success: false, message: 'Verification code must be exactly 6 numeric digits.' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const normalizedRole = (role || 'customer').toLowerCase().trim();
    const Model = getUserModel(normalizedRole);
    let user = await Model.findOne({ email: normalizedEmail });
    if (!user && (normalizedRole === 'customer' || normalizedRole === 'user')) {
      user = await User.findOne({ email: normalizedEmail });
    }

    if (!user || !user.resetPasswordToken || !user.resetPasswordExpire) {
      return res.status(400).json({
        success: false,
        message: 'No active password reset request found for this account. Please request a new code.',
      });
    }

    // Check expiration (5 minutes)
    if (new Date(user.resetPasswordExpire).getTime() < Date.now()) {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      user.resetOtpAttempts = 0;
      await user.save({ validateBeforeSave: false });
      return res.status(400).json({
        success: false,
        message: 'The verification code has expired. Please request a new code.',
      });
    }

    // Check attempt limits (max 5)
    if ((user.resetOtpAttempts || 0) >= 5) {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      user.resetOtpAttempts = 0;
      await user.save({ validateBeforeSave: false });
      return res.status(429).json({
        success: false,
        message: 'Too many incorrect attempts. For security reasons, please request a new verification code.',
      });
    }

    // Hash user-provided OTP and compare
    const enteredHash = crypto.createHash('sha256').update(cleanOtp).digest('hex');

    if (user.resetPasswordToken !== enteredHash) {
      user.resetOtpAttempts = (user.resetOtpAttempts || 0) + 1;
      await user.save({ validateBeforeSave: false });
      const remaining = Math.max(0, 5 - user.resetOtpAttempts);
      return res.status(400).json({
        success: false,
        message: `Incorrect verification code. ${remaining} attempt(s) remaining.`,
      });
    }

    // Successful OTP match! Invalidate OTP so it cannot be reused
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    user.resetOtpAttempts = 0;

    // Issue a short-lived (15 minutes), single-use random reset authorization token
    const rawResetToken = crypto.randomBytes(32).toString('hex');
    user.resetAuthToken = crypto.createHash('sha256').update(rawResetToken).digest('hex');
    user.resetAuthExpire = new Date(Date.now() + 15 * 60 * 1000);
    await user.save({ validateBeforeSave: false });

    return res.status(200).json({
      success: true,
      message: 'Code verified successfully.',
      resetToken: rawResetToken,
    });
  } catch (error) {
    console.error('[VerifyOTP] Unexpected error:', error);
    res.status(500).json({ success: false, message: 'Server error verifying code' });
  }
};

// @desc    Reset password (using single-use Reset Token or OTP)
// @route   PUT /api/auth/resetpassword
// @access  Public
const resetPassword = async (req, res) => {
  try {
    const { email, role = 'customer', resetToken, otp, password } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required.' });
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters in length.' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const normalizedRole = (role || 'customer').toLowerCase().trim();
    const Model = getUserModel(normalizedRole);
    let user = await Model.findOne({ email: normalizedEmail }).select('+password');
    if (!user && (normalizedRole === 'customer' || normalizedRole === 'user')) {
      user = await User.findOne({ email: normalizedEmail }).select('+password');
    }

    if (!user) {
      return res.status(400).json({ success: false, message: 'Account not found.' });
    }

    let isAuthorized = false;

    // 1. Primary secure path: using the single-use resetToken issued by verifyOTP
    if (resetToken && user.resetAuthToken && user.resetAuthExpire) {
      if (new Date(user.resetAuthExpire).getTime() > Date.now()) {
        const hashedToken = crypto.createHash('sha256').update(resetToken.trim()).digest('hex');
        if (user.resetAuthToken === hashedToken) {
          isAuthorized = true;
        }
      }
    }

    // 2. Secondary fallback path: using active OTP directly (backward compatibility)
    if (!isAuthorized && otp && user.resetPasswordToken && user.resetPasswordExpire) {
      if (new Date(user.resetPasswordExpire).getTime() > Date.now()) {
        const hashedOtp = crypto.createHash('sha256').update(otp.toString().trim()).digest('hex');
        if (user.resetPasswordToken === hashedOtp) {
          isAuthorized = true;
        }
      }
    }

    if (!isAuthorized) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired password reset authorization. Please request a new verification code.',
      });
    }

    // Set new password (pre-save hook will hash it with bcrypt cost 10)
    user.password = password;

    // Invalidate all reset tokens and OTP state
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    user.resetPasswordLastSent = undefined;
    user.resetOtpAttempts = 0;
    user.resetAuthToken = undefined;
    user.resetAuthExpire = undefined;

    // Invalidate old refresh token and unlock account if previously locked
    user.refreshToken = undefined;
    user.loginAttempts = 0;
    user.lockUntil = undefined;

    await user.save();

    console.log(`[ResetPassword] Password successfully updated for account: ${user.email} (Role: ${user.role})`);

    // Return clean success message; do NOT automatically log in
    res.status(200).json({
      success: true,
      message: 'Your password has been successfully reset. Please log in with your new credentials.',
    });
  } catch (error) {
    console.error('[ResetPassword] Unexpected error:', error);
    res.status(500).json({ success: false, message: 'Server error resetting password' });
  }
};

// @desc    Setup 2FA - Generate Secret and QR Code Data URL
// @route   POST /api/auth/2fa/setup
// @access  Private
const setup2FA = async (req, res) => {
  try {
    const Model = getUserModel(req.user.role);
    const user = await Model.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const secret = speakeasy.generateSecret({
      name: `Auto Stitch (${user.email})`,
      issuer: 'Auto Stitch',
      length: 20
    });

    const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);

    res.json({
      success: true,
      secret: secret.base32,
      otpauthUrl: secret.otpauth_url,
      qrCodeUrl
    });
  } catch (error) {
    console.error('Setup 2FA error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate 2FA secret' });
  }
};

// @desc    Verify and enable 2FA
// @route   POST /api/auth/2fa/verify
// @access  Private
const verify2FA = async (req, res) => {
  try {
    const { token, secret } = req.body;
    if (!token || !secret) {
      return res.status(400).json({ success: false, message: 'Verification code and secret are required' });
    }

    const verified = speakeasy.totp.verify({
      secret: secret,
      encoding: 'base32',
      token: token.trim(),
      window: 1
    });

    if (!verified) {
      return res.status(400).json({ success: false, message: 'Invalid verification code. Please check your authenticator app.' });
    }

    const Model = getUserModel(req.user.role);
    const user = await Model.findById(req.user._id);
    user.twoFactorSecret = secret;
    user.twoFactorEnabled = true;
    await user.save();

    res.json({ 
      success: true, 
      message: 'Two-Factor Authentication has been successfully enabled for your account!' 
    });
  } catch (error) {
    console.error('Verify 2FA error:', error);
    res.status(500).json({ success: false, message: 'Failed to enable 2FA' });
  }
};

// @desc    Disable 2FA
// @route   POST /api/auth/2fa/disable
// @access  Private
const disable2FA = async (req, res) => {
  try {
    const { password, token } = req.body;
    const Model = getUserModel(req.user.role);
    const user = await Model.findById(req.user._id).select('+password +twoFactorSecret');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (password) {
      const isMatch = await user.matchPassword(password);
      if (!isMatch) {
        return res.status(401).json({ success: false, message: 'Incorrect password' });
      }
    } else if (token && user.twoFactorSecret) {
      const verified = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: 'base32',
        token: token.trim(),
        window: 1
      });
      if (!verified) {
        return res.status(400).json({ success: false, message: 'Invalid 2FA code' });
      }
    } else {
      return res.status(400).json({ success: false, message: 'Password or 2FA code is required to disable 2FA' });
    }

    user.twoFactorEnabled = false;
    user.twoFactorSecret = undefined;
    await user.save();

    res.json({ success: true, message: 'Two-Factor Authentication has been disabled' });
  } catch (error) {
    console.error('Disable 2FA error:', error);
    res.status(500).json({ success: false, message: 'Failed to disable 2FA' });
  }
};

// @desc    Validate 2FA code during login
// @route   POST /api/auth/2fa/validate-login
// @access  Public
const validateLogin2FA = async (req, res) => {
  try {
    const { tempToken, token } = req.body;
    if (!tempToken || !token) {
      return res.status(400).json({ success: false, message: 'Temp token and verification code are required' });
    }

    let decoded;
    try {
      decoded = jwt.verify(tempToken, JWT_2FA_SECRET);
    } catch (e) {
      return res.status(401).json({ success: false, message: '2FA session expired. Please log in again.' });
    }

    if (!decoded.is2FAPending) {
      return res.status(401).json({ success: false, message: 'Invalid 2FA session' });
    }

    const Model = getUserModel(decoded.role);
    const user = await Model.findById(decoded.id).select('+twoFactorSecret');
    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
      return res.status(400).json({ success: false, message: '2FA is not configured for this account' });
    }

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: token.trim(),
      window: 1
    });

    if (!verified) {
      return res.status(400).json({ success: false, message: 'Invalid 2FA verification code' });
    }

    sendTokenResponse(user, 200, res);
  } catch (error) {
    console.error('Validate Login 2FA error:', error);
    res.status(500).json({ success: false, message: 'Server error verifying 2FA' });
  }
};

module.exports = {
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
};

