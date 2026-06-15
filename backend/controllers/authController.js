const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { User, Admin, BoutiqueOwner, Customer, getUserModel } = require('../models/User');
const Boutique = require('../models/Boutique');
const { z } = require('zod');
const sendEmail = require('../utils/sendEmail');
const { getWelcomeTemplate } = require('../utils/emailTemplates');
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

// Generate tokens
const generateTokens = (id, role) => {
  const accessToken = jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: '7d' });
  const refreshToken = jwt.sign({ id, role }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
  return { accessToken, refreshToken };
};

// Set token cookies
const sendTokenResponse = (user, statusCode, res) => {
  const { accessToken, refreshToken } = generateTokens(user._id, user.role);

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
  };

  res
    .status(statusCode)
    .cookie('accessToken', accessToken, { ...cookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000 }) // 7 days
    .cookie('refreshToken', refreshToken, { ...cookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000 })
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

    // Verify reCAPTCHA
    if (!captchaToken) {
      return res.status(400).json({ success: false, message: 'reCAPTCHA verification is required' });
    }

    const verificationUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${captchaToken}`;
    const verifyRes = await fetch(verificationUrl, { method: 'POST' });
    const verifyData = await verifyRes.json();

    if (!verifyData.success) {
      return res.status(400).json({ success: false, message: 'reCAPTCHA verification failed' });
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

    // Verify reCAPTCHA
    if (!captchaToken) {
      return res.status(400).json({ success: false, message: 'reCAPTCHA verification is required' });
    }

    const verificationUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${captchaToken}`;
    const verifyRes = await fetch(verificationUrl, { method: 'POST' });
    const verifyData = await verifyRes.json();

    if (!verifyData.success) {
      return res.status(400).json({ success: false, message: 'reCAPTCHA verification failed' });
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
    if (!user) return res.status(401).json({ success: false, message: 'User not found' });

    const accessToken = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: '7d',
    });

    res
      .cookie('accessToken', accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      })
      .json({ success: true, accessToken });
  } catch (error) {
    res.status(401).json({ success: false, message: 'Invalid refresh token' });
  }
};

// @desc    Google login (server-side verification)
// @route   POST /api/auth/google
// @access  Public
const googleLogin = async (req, res) => {
  try {
    const { accessToken: googleAccessToken } = req.body;

    if (!googleAccessToken) {
      return res.status(400).json({ success: false, message: 'Google access token is required' });
    }

    // Verify the token with Google's API server-side
    const googleRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${googleAccessToken}` },
    });

    if (!googleRes.ok) {
      return res.status(401).json({ success: false, message: 'Invalid Google token' });
    }

    const googleUser = await googleRes.json();
    const { name, email, picture: avatar, sub: googleId } = googleUser;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Could not retrieve email from Google' });
    }

    let user = await Customer.findOne({ email });

    if (!user) {
      // Create new user if they don't exist
      user = await Customer.create({
        name,
        email,
        avatar,
        provider: 'google',
        providerId: googleId,
        password: crypto.randomBytes(32).toString('hex'), // Secure random password
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
      // Restriction: Admins cannot social login through customer portal
      return res.status(403).json({ success: false, message: 'Administrators must use the dedicated Admin Portal to log in.' });
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
    if (email) user.email = email;
    if (phone) user.phone = phone;
    if (address) user.address = address;
    if (notifications) user.notifications = notifications;

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

// @desc    Forgot password
// @route   POST /api/auth/forgotpassword
// @access  Public
const forgotPassword = async (req, res) => {
  try {
    const { email, role = 'customer' } = req.body;

    const Model = getUserModel(role);
    const user = await Model.findOne({ email });

    if (!user) {
      return res.status(200).json({ success: true, message: 'If an account exists with that email, a verification OTP has been sent' });
    }

    // Get reset OTP
    const otp = user.getResetPasswordToken();

    await user.save({ validateBeforeSave: false });

    const html = `
      <div style="font-family: 'Arial', sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 10px; overflow: hidden;">
        <div style="background-color: #001f3f; padding: 20px; text-align: center;">
          <h1 style="color: #c5a059; margin: 0; font-size: 28px; letter-spacing: 2px;">AUTO STITCH.</h1>
        </div>
        <div style="padding: 30px; background-color: #ffffff; text-align: center;">
          <h2 style="color: #333; margin-top: 0;">Password Reset OTP</h2>
          <p style="color: #555; line-height: 1.6; font-size: 16px;">
            You requested to reset your password. Use the 6-digit code below to proceed:
          </p>
          <div style="margin: 30px 0; background-color: #f4f4f4; padding: 20px; border-radius: 10px; display: inline-block;">
            <h1 style="color: #c5a059; font-size: 40px; letter-spacing: 10px; margin: 0;">${otp}</h1>
          </div>
          <p style="color: #999; font-size: 14px;">
            This code will expire in 10 minutes. If you did not request this, please ignore this email.
          </p>
        </div>
        <div style="background-color: #f9f9f9; padding: 15px; text-align: center; border-top: 1px solid #eeeeee;">
          <p style="color: #999; font-size: 12px; margin: 0;">
            © ${new Date().getFullYear()} Auto Stitch Designs. All rights reserved.
          </p>
        </div>
      </div>
    `;

    try {
      await sendEmail({
        email: user.email,
        subject: 'Password Reset OTP - Auto Stitch',
        html,
      });

      res.status(200).json({ success: true, message: 'OTP sent to your email' });
    } catch (err) {
      console.error('Email send error:', err);
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save({ validateBeforeSave: false });
      return res.status(500).json({ success: false, message: 'Email could not be sent' });
    }
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Verify OTP
// @route   POST /api/auth/verifyotp
// @access  Public
const verifyOTP = async (req, res) => {
  try {
    const { email, role = 'customer', otp } = req.body;

    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(otp)
      .digest('hex');

    const Model = getUserModel(role);
    const user = await Model.findOne({
      email,
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }

    res.status(200).json({ success: true, message: 'OTP verified' });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Reset password (using OTP)
// @route   PUT /api/auth/resetpassword
// @access  Public
const resetPassword = async (req, res) => {
  try {
    const { email, role = 'customer', otp, password } = req.body;

    // Get hashed token from OTP
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(otp)
      .digest('hex');

    const Model = getUserModel(role);
    const user = await Model.findOne({
      email,
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP session' });
    }

    // Set new password
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    sendTokenResponse(user, 200, res);
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
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
  resetPassword
};
