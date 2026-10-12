import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Eye, EyeOff, CheckCircle, ArrowLeft, ShieldCheck, Mail, KeyRound } from 'lucide-react';
import API_URL from '../../config/api';
import './MinimalAuth.css';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const portalParam = searchParams.get('portal');

  // Steps: 1: Email, 2: OTP, 3: New Password, 4: Success
  const [step, setStep] = useState(1);
  
  // Account details
  const [email, setEmail] = useState('');
  const [role, setRole] = useState(() => {
    if (portalParam === 'admin') return 'admin';
    if (portalParam === 'boutique' || portalParam === 'boutique_owner') return 'boutique_owner';
    return 'customer';
  });

  // Verification & reset credentials
  const [otp, setOtp] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // UI states
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'Reset Security Credentials — Auto Stitch';
  }, []);

  // Sync role if portal query param changes
  useEffect(() => {
    if (portalParam === 'admin') setRole('admin');
    else if (portalParam === 'boutique' || portalParam === 'boutique_owner') setRole('boutique_owner');
    else if (portalParam === 'customer') setRole('customer');
  }, [portalParam]);

  // Resend cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const getLoginUrl = (targetRole = role) => {
    if (targetRole === 'admin') return '/admin-login';
    if (targetRole === 'boutique_owner') return '/boutique-login';
    return '/login';
  };

  const getRoleDisplayName = (targetRole = role) => {
    if (targetRole === 'admin') return 'Administrator';
    if (targetRole === 'boutique_owner') return 'Boutique Atelier';
    return 'Customer';
  };

  // Step 1: Request OTP
  const handleRequestOTP = async (e) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail) return toast.error('Please enter your account email');

    setIsSubmitting(true);
    try {
      const res = await axios.post(`${API_URL}/api/auth/forgotpassword`, {
        email: cleanEmail,
        role,
      });

      toast.success(res.data.message || '6-digit verification code dispatched to your email.');
      setCooldown(60);
      setStep(2);
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to dispatch verification code';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Resend OTP in Step 2
  const handleResendOTP = async () => {
    if (cooldown > 0 || isSubmitting) return;
    const cleanEmail = email.trim();
    if (!cleanEmail) return toast.error('Email is missing. Please restart recovery.');

    setIsSubmitting(true);
    try {
      const res = await axios.post(`${API_URL}/api/auth/forgotpassword`, {
        email: cleanEmail,
        role,
      });

      toast.success(res.data.message || 'New 6-digit verification code sent.');
      setCooldown(60);
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to resend code';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    const cleanOtp = otp.trim();
    if (cleanOtp.length !== 6) return toast.error('Please enter the complete 6-digit verification code');

    setIsSubmitting(true);
    try {
      const res = await axios.post(`${API_URL}/api/auth/verifyotp`, {
        email: email.trim(),
        role,
        otp: cleanOtp,
      });

      if (res.data.resetToken) {
        setResetToken(res.data.resetToken);
      }
      toast.success('Code verified successfully!');
      setStep(3);
    } catch (error) {
      const msg = error.response?.data?.message || 'Invalid or expired verification code';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 3: Reset Password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (password.length < 6) {
      return toast.error('Password must be at least 6 characters in length');
    }
    if (password !== confirmPassword) {
      return toast.error('Passwords do not match');
    }

    setIsSubmitting(true);
    try {
      const res = await axios.put(`${API_URL}/api/auth/resetpassword`, {
        email: email.trim(),
        role,
        resetToken,
        otp: otp.trim(),
        password,
      });

      toast.success(res.data.message || 'Password updated successfully!');
      setStep(4);
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to update password. Please try again.';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="minimal-auth-page page-enter">
      <div className="minimal-auth-container">
        
        {/* STEP 1: EMAIL & PORTAL ENTRY */}
        {step === 1 && (
          <>
            <h1 className="minimal-auth-title">Forgot Password</h1>
            <p className="minimal-auth-subtitle">
              Enter your registered {getRoleDisplayName()} email address to receive a secure 6-digit verification code.
            </p>

            <form onSubmit={handleRequestOTP} className="minimal-auth-form">
              <div className="minimal-form-group">
                <label>Security Portal*</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="minimal-auth-select"
                >
                  <option value="customer">Customer Portal</option>
                  <option value="boutique_owner">Boutique Atelier Portal</option>
                  <option value="admin">Administrator Portal</option>
                </select>
              </div>

              <div className="minimal-form-group">
                <label>Account Email*</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                  autoFocus
                />
              </div>

              <button type="submit" className="minimal-submit-btn" disabled={isSubmitting}>
                {isSubmitting ? 'Dispatching Code...' : 'Send Verification Code'}
              </button>

              <div className="minimal-auth-footer">
                <Link to={getLoginUrl()} className="minimal-cancel-link">
                  Return to {getRoleDisplayName()} Login
                </Link>
              </div>
            </form>
          </>
        )}

        {/* STEP 2: ENTER OTP */}
        {step === 2 && (
          <>
            <h1 className="minimal-auth-title">Verify Code</h1>
            <p className="minimal-auth-subtitle">
              Enter the 6-digit passcode sent to <strong>{email}</strong> ({getRoleDisplayName()}).
            </p>

            <form onSubmit={handleVerifyOTP} className="minimal-auth-form">
              <div className="minimal-form-group">
                <label>6-Digit Verification Code*</label>
                <input
                  type="text"
                  maxLength="6"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  className="otp-input"
                  placeholder="000000"
                  required
                  autoFocus
                />
              </div>

              <div className="resend-otp-row">
                <span>Didn't receive code?</span>
                <button
                  type="button"
                  onClick={handleResendOTP}
                  disabled={cooldown > 0 || isSubmitting}
                  className="resend-btn"
                >
                  {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend Code'}
                </button>
              </div>

              <button type="submit" className="minimal-submit-btn" disabled={isSubmitting || otp.length !== 6}>
                {isSubmitting ? 'Verifying...' : 'Verify Code'}
              </button>

              <div className="minimal-auth-footer">
                <button
                  type="button"
                  onClick={() => { setStep(1); setOtp(''); }}
                  className="minimal-cancel-link"
                >
                  Change Email or Portal
                </button>
              </div>
            </form>
          </>
        )}

        {/* STEP 3: NEW PASSWORD */}
        {step === 3 && (
          <>
            <h1 className="minimal-auth-title">New Password</h1>
            <p className="minimal-auth-subtitle">
              Establish a new secure password for your {getRoleDisplayName()} account.
            </p>

            <form onSubmit={handleResetPassword} className="minimal-auth-form">
              <div className="minimal-form-group">
                <label>New Password*</label>
                <div className="password-input-wrapper">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    required
                    autoFocus
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="minimal-form-group">
                <label>Confirm New Password*</label>
                <div className="password-input-wrapper">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat password"
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label="Toggle confirm password visibility"
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button type="submit" className="minimal-submit-btn" disabled={isSubmitting}>
                {isSubmitting ? 'Updating Credentials...' : 'Save New Password'}
              </button>
            </form>
          </>
        )}

        {/* STEP 4: SUCCESS CONFIRMATION */}
        {step === 4 && (
          <div className="minimal-success-view">
            <div className="minimal-success-icon-wrap">
              <CheckCircle size={40} />
            </div>
            <h1 className="minimal-auth-title">Password Changed</h1>
            <p>
              Your security credentials have been updated successfully. You can now access your {getRoleDisplayName()} portal using your new password.
            </p>

            <button
              type="button"
              onClick={() => navigate(getLoginUrl())}
              className="minimal-submit-btn"
              style={{ width: '100%' }}
            >
              Sign In to {getRoleDisplayName()}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
