import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, Sparkles, ArrowRight } from 'lucide-react';
import { FaGoogle, FaFacebookF } from 'react-icons/fa6';
import ReCAPTCHA from 'react-google-recaptcha';
import { useGoogleLogin } from '@react-oauth/google';
import { loginWithFacebook as triggerFBLogin } from '../../utils/fbSDK';
import Logo from '../../components/Logo/Logo';
import API_URL from '../../config/api';
import axios from 'axios';
import './Auth.css';

export default function Login({ onLogin }) {
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [captchaToken, setCaptchaToken] = useState(null);
  const navigate = useNavigate();

  useEffect(() => { document.title = 'Sign In — Auto Stitch'; }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      setError('Please fill in all fields.');
      return;
    }
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.(com|org|net|edu|gov|mil|co|info|io|pk|uk|us|ca|au)$/i;
    if (!emailRegex.test(form.email)) {
      setError('Please enter a valid email domain (e.g., .com, .net)');
      return;
    }
    if (!captchaToken) {
      setError('Please verify that you are not a robot.');
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/api/auth/login`, 
        { email: form.email, password: form.password, portal: 'customer', captchaToken },
        { withCredentials: true }
      );
      const data = res.data;
      if (!data.success) throw new Error(data.message);
      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.setItem('token', data.accessToken);
      onLogin && onLogin(data.user);
      navigate(data.user.role === 'admin' ? '/admin' : data.user.role === 'boutique_owner' ? '/boutique/dashboard' : '/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setLoading(true);
      try {
        // Send the access token to backend for server-side verification
        const res = await axios.post(`${API_URL}/api/auth/google`, 
          { accessToken: tokenResponse.access_token },
          { withCredentials: true }
        );
        const data = res.data;
        if (!data.success) throw new Error(data.message);
        
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('token', data.accessToken);
        onLogin && onLogin(data.user);
        navigate(data.user.role === 'admin' ? '/admin' : data.user.role === 'boutique_owner' ? '/boutique/dashboard' : '/dashboard');
      } catch (err) {
        setError(err.message || 'Google login failed.');
      } finally {
        setLoading(false);
      }
    },
    onError: () => setError('Google Login Failed')
  });

  const handleFacebookLogin = async (fbAccessToken) => {
    setLoading(true);
    try {
      // Send the access token to backend for server-side verification
      const res = await axios.post(`${API_URL}/api/auth/facebook`, 
        { accessToken: fbAccessToken },
        { withCredentials: true }
      );
      const data = res.data;
      if (!data.success) throw new Error(data.message);
      
      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.setItem('token', data.accessToken);
      onLogin && onLogin(data.user);
      navigate(data.user.role === 'admin' ? '/admin' : data.user.role === 'boutique_owner' ? '/boutique/dashboard' : '/dashboard');
    } catch (err) {
      setError(err.message || 'Facebook login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page-v2 page-enter">
      <div className="login-container-v2">
        <div className="login-form-card">
          <h1 className="login-title-serif">Log In</h1>

          {error && <div className="login-error-msg">{error}</div>}

          <form onSubmit={handleSubmit} className="login-form-v2">
            <div className="form-group-v2">
              <label htmlFor="email">Email*</label>
              <input
                id="email"
                type="email"
                name="email"
                className="minimal-input"
                value={form.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group-v2">
              <label htmlFor="password">Password*</label>
              <div className="password-input-wrapper" style={{ position: 'relative' }}>
                <input
                  id="password"
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
              <Link to="/forgot-password" name="forgot" className="forgot-pass-link">Forgot Password?</Link>
            </div>

            <div className="form-group-v2" style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
              <ReCAPTCHA
                sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY}
                onChange={(token) => setCaptchaToken(token)}
                onExpired={() => setCaptchaToken(null)}
              />
            </div>

            <button type="submit" className="login-submit-btn" disabled={loading}>
              {loading ? 'Processing...' : 'Submit'}
            </button>
          </form>

          <div className="auth-separator-v2">Or</div>

          <div className="social-login-group-v2">
            <button type="button" className="social-btn-v2" onClick={() => loginWithGoogle()}>
              <FaGoogle />
              <span>Continue with Google</span>
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
              <span>Continue with Facebook</span>
            </button>
          </div>

          <div className="create-account-section">
            <h3>CREATE AN ACCOUNT</h3>
            <p>
              Create an account to access your orders and customer information. 
              Enjoy access to special offers and first looks.
            </p>
            <Link to="/register" className="create-account-link">Create Account</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
