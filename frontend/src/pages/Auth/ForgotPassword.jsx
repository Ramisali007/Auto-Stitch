import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import API_URL from '../../config/api';
import './MinimalAuth.css';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: Email, 2: OTP, 3: New Password
  
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('customer');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'Reset Password — Auto Stitch';
  }, []);

  // Step 1: Request OTP
  const handleRequestOTP = async (e) => {
    e.preventDefault();
    if (!email) return toast.error('Email is required');
    
    setIsSubmitting(true);
    try {
      await axios.post(`${API_URL}/api/auth/forgotpassword`, { email, role });
      toast.success('6-digit OTP sent to your email!');
      setStep(2);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send OTP');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) return toast.error('Please enter 6-digit OTP');

    setIsSubmitting(true);
    try {
      await axios.post(`${API_URL}/api/auth/verifyotp`, { email, role, otp });
      toast.success('OTP Verified!');
      setStep(3);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Invalid or expired OTP');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 3: Reset Password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) return toast.error('Passwords do not match');
    if (password.length < 6) return toast.error('Password must be at least 6 characters');

    setIsSubmitting(true);
    try {
      await axios.put(`${API_URL}/api/auth/resetpassword`, { email, role, otp, password });
      toast.success('Password updated successfully!');
      navigate('/login');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reset password');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="minimal-auth-page page-enter">
      <div className="minimal-auth-container">
        <h1 className="minimal-auth-title">
          {step === 1 ? 'Forgot Password' : step === 2 ? 'Verify OTP' : 'New Password'}
        </h1>
        <p className="minimal-auth-subtitle">
          {step === 1 ? 'Enter your email to receive a reset code.' : 
           step === 2 ? `Enter the 6-digit code sent to ${email}` : 
           'Choose a new secure password for your account.'}
        </p>

        {/* STEP 1: EMAIL */}
        {step === 1 && (
          <form onSubmit={handleRequestOTP} className="minimal-auth-form">
            <div className="minimal-form-group">
              <label>Portal*</label>
              <select value={role} onChange={(e) => setRole(e.target.value)} className="minimal-auth-select">
                <option value="customer">Customer Portal</option>
                <option value="boutique_owner">Boutique Portal</option>
                <option value="admin">Admin Portal</option>
              </select>
            </div>
            <div className="minimal-form-group">
              <label>Email*</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
            </div>
            <button type="submit" className="minimal-submit-btn" disabled={isSubmitting}>
              {isSubmitting ? 'Sending...' : 'Send OTP'}
            </button>
            <div className="minimal-auth-footer">
              <Link to="/login" className="minimal-cancel-link">Back to Login</Link>
            </div>
          </form>
        )}

        {/* STEP 2: OTP */}
        {step === 2 && (
          <form onSubmit={handleVerifyOTP} className="minimal-auth-form">
            <div className="minimal-form-group">
              <label>Enter 6-Digit Code*</label>
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
            <button type="submit" className="minimal-submit-btn" disabled={isSubmitting}>
              {isSubmitting ? 'Verifying...' : 'Verify Code'}
            </button>
            <div className="minimal-auth-footer">
              <button type="button" onClick={() => setStep(1)} className="minimal-cancel-link" style={{background:'none', border:'none'}}>
                Change Email
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: NEW PASSWORD */}
        {step === 3 && (
          <form onSubmit={handleResetPassword} className="minimal-auth-form">
            <div className="minimal-form-group">
              <label>New Password*</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoFocus />
            </div>
            <div className="minimal-form-group">
              <label>Confirm New Password*</label>
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
            </div>
            <button type="submit" className="minimal-submit-btn" disabled={isSubmitting}>
              {isSubmitting ? 'Updating...' : 'Reset Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
