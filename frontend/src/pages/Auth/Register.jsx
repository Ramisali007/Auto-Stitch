import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, User, Sparkles, ArrowRight, Store } from 'lucide-react';
import { FaGoogle, FaFacebookF } from 'react-icons/fa6';
import ReCAPTCHA from 'react-google-recaptcha';
import { useGoogleLogin } from '@react-oauth/google';
import { loginWithFacebook as triggerFBLogin } from '../../utils/fbSDK';
import Logo from '../../components/Logo/Logo';
import API_URL from '../../config/api';
import axios from 'axios';
import './Auth.css';

export default function Register({ onLogin }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '', role: 'customer' });
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [consent, setConsent] = useState(false);
  const [captchaToken, setCaptchaToken] = useState(null);
  const navigate = useNavigate();

  useEffect(() => { document.title = 'Create Account — Auto Stitch'; }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
  };

  const validate = () => {
    if (!form.name.trim()) return 'Full name is required';
    if (!form.email.trim()) return 'Email is required';
    
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.(com|org|net|edu|gov|mil|co|info|io|pk|uk|us|ca|au)$/i;
    if (!emailRegex.test(form.email)) return 'Please enter a valid email domain (e.g., .com, .net)';
    
    // Password Policy Check
    if (form.password.length < 8) return 'Password must be at least 8 characters';
    if (!/[A-Z]/.test(form.password)) return 'Password must contain at least one uppercase letter';
    if (!/[a-z]/.test(form.password)) return 'Password must contain at least one lowercase letter';
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(form.password)) return 'Password must contain at least one special character';
    
    if (form.password !== form.confirmPassword) return 'Passwords do not match';
    if (!consent) return 'Please accept the terms and privacy policy';
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validate();
    if (err) { setError(err); return; }
    if (!captchaToken) { setError('Please verify that you are not a robot.'); return; }
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/api/auth/register`, 
        { name: form.name, email: form.email, password: form.password, role: form.role, captchaToken },
        { withCredentials: true }
      );
      const data = res.data;
      if (!data.success) throw new Error(data.message);
      localStorage.setItem('user', JSON.stringify(data.user));
      onLogin && onLogin(data.user);
      navigate(data.user.role === 'boutique_owner' ? '/boutique/dashboard' : '/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const passwordStrength = (pass) => {
    if (!pass) return 0;
    let score = 0;
    if (pass.length >= 8) score++;
    if (pass.length >= 12) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[a-z]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;
    return score;
  };
  const strength = passwordStrength(form.password);
  const strengthLabels = ['', 'Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'];
  const strengthColors = ['', '#EF4444', '#F97316', '#F59E0B', '#10B981', '#6366F1'];

  const loginWithGoogle = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setLoading(true);
      try {
        const res = await axios.post(`${API_URL}/api/auth/google`, 
          { accessToken: tokenResponse.access_token },
          { withCredentials: true }
        );
        const data = res.data;
        if (!data.success) throw new Error(data.message);
        localStorage.setItem('user', JSON.stringify(data.user));
        onLogin && onLogin(data.user);
        navigate('/dashboard');
      } catch (err) {
        setError(err.message || 'Google signup failed.');
      } finally {
        setLoading(false);
      }
    },
    onError: () => setError('Google Login Failed')
  });

  const handleFacebookLogin = async (fbAccessToken) => {
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/api/auth/facebook`, 
        { accessToken: fbAccessToken },
        { withCredentials: true }
      );
      const data = res.data;
      if (!data.success) throw new Error(data.message);
      localStorage.setItem('user', JSON.stringify(data.user));
      onLogin && onLogin(data.user);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Facebook signup failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page-v2 page-enter">
      <div className="login-container-v2">
        <div className="login-form-card">
          <h1 className="login-title-serif">Create an Account</h1>

          {/* Minimalist Role Selector */}
          <div className="minimal-role-selector">
            <button 
              type="button" 
              className={form.role === 'customer' ? 'active' : ''} 
              onClick={() => setForm({...form, role: 'customer'})}
            >
              Customer
            </button>
            <span className="sep">|</span>
            <button 
              type="button" 
              className={form.role === 'boutique_owner' ? 'active' : ''} 
              onClick={() => setForm({...form, role: 'boutique_owner'})}
            >
              Boutique Owner
            </button>
          </div>

          {error && <div className="login-error-msg">{error}</div>}

          <form onSubmit={handleSubmit} className="login-form-v2">
            <div className="form-group-v2">
              <label htmlFor="name">Full Name</label>
              <input
                id="name"
                type="text"
                name="name"
                className="minimal-input"
                value={form.name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group-v2">
              <label htmlFor="reg-email">Email*</label>
              <input
                id="reg-email"
                type="email"
                name="email"
                className="minimal-input"
                value={form.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group-v2">
              <label htmlFor="reg-password">Password*</label>
              <div className="password-input-wrapper" style={{ position: 'relative' }}>
                <input
                  id="reg-password"
                  type={showPass ? 'text' : 'password'}
                  name="password"
                  className="minimal-input"
                  value={form.password}
                  onChange={handleChange}
                  required
                  style={{ paddingRight: '45px' }}
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPass(!showPass)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#666',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="form-group-v2">
              <label htmlFor="confirmPassword">Confirm Password*</label>
              <div className="password-input-wrapper" style={{ position: 'relative' }}>
                <input
                  id="confirmPassword"
                  type={showConfirmPass ? 'text' : 'password'}
                  name="confirmPassword"
                  className="minimal-input"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  required
                  style={{ paddingRight: '45px' }}
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowConfirmPass(!showConfirmPass)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#666',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  {showConfirmPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="minimal-consent">
              <label>
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                />
                <span>I agree to the Terms and Privacy Policy</span>
              </label>
            </div>

            <div className="form-group-v2" style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
              <ReCAPTCHA
                sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY}
                onChange={(token) => setCaptchaToken(token)}
                onExpired={() => setCaptchaToken(null)}
              />
            </div>

            <button type="submit" className="login-submit-btn" disabled={loading}>
              {loading ? 'Creating...' : 'Create'}
            </button>
            
            <Link to="/login" className="cancel-reg-link">Cancel</Link>
          </form>

          <div className="auth-separator-v2">Or</div>

          <div className="social-login-group-v2">
            <button type="button" className="social-btn-v2" onClick={() => loginWithGoogle()}>
              <FaGoogle />
              <span>Sign up with Google</span>
            </button>
            <button 
              type="button" 
              className="social-btn-v2"
              onClick={async () => {
                try {
                  const token = await triggerFBLogin();
                  handleFacebookLogin(token);
                } catch (err) {
                  setError(err.message);
                }
              }}
            >
              <FaFacebookF />
              <span>Sign up with Facebook</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
