import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import API_URL from '../../config/api';
import ReCAPTCHA from 'react-google-recaptcha';
import axios from 'axios';
import './Auth.css';

export default function AdminLogin({ onLogin }) {
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [captchaToken, setCaptchaToken] = useState(null);
  const navigate = useNavigate();

  useEffect(() => { document.title = 'Admin Portal — Auto Stitch'; }, []);

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
        { ...form, portal: 'admin', captchaToken },
        { withCredentials: true }
      );
      const data = res.data;
      if (!data.success) throw new Error(data.message);
      
      // Ensure only admins can login here
      if (data.user.role !== 'admin') {
        throw new Error('Access denied. Administrator privileges required.');
      }

      localStorage.setItem('user', JSON.stringify(data.user));
      onLogin && onLogin(data.user);
      navigate('/admin');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page-v2 page-enter">
      <div className="login-container-v2">
        <div className="login-form-card">
          <h1 className="login-title-serif">Admin Portal</h1>
          <p className="admin-subtitle">Secure administrative access</p>

          {error && <div className="login-error-msg">{error}</div>}

          <form onSubmit={handleSubmit} className="login-form-v2">
            <div className="form-group-v2">
              <label htmlFor="email">Administrator Email*</label>
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
              <label htmlFor="password">Administrator Password*</label>
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
            </div>

            <div className="form-group-v2" style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
              <ReCAPTCHA
                sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY}
                onChange={(token) => setCaptchaToken(token)}
                onExpired={() => setCaptchaToken(null)}
              />
            </div>

            <button type="submit" className="login-submit-btn" disabled={loading}>
              {loading ? 'Verifying...' : 'Access Portal'}
            </button>
          </form>

          <div className="create-account-section">
            <Link to="/" className="create-account-link">Return to Home</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
