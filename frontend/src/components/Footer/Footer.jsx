import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FaYoutube, FaInstagram, FaFacebookF, FaTiktok } from 'react-icons/fa6';
import { SiVisa, SiMastercard } from 'react-icons/si';
import { Truck } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import API_URL from '../../config/api';
import './Footer.css';

export default function Footer() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const year = new Date().getFullYear();
  const location = useLocation();

  const handleSubscribe = async (e) => {
    e.preventDefault();
    if (!email) return toast.error('Please enter your email');

    try {
      setLoading(true);
      const { data } = await axios.post(`${API_URL}/api/subscribe`, { email });
      if (data.success) {
        toast.success('Check your email for confirmation!');
        setEmail('');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Subscription failed');
    } finally {
      setLoading(false);
    }
  };

  if (location.pathname === '/chat') return null;

  return (
    <footer className="footer-v2">
      <div className="container">
        {/* Newsletter Section */}
        <div className="footer-newsletter-v2">
          <div className="newsletter-text">
            <h3>Join our newsletter</h3>
            <p>We'll send you updates once per week.</p>
          </div>
          <form className="newsletter-form-v2" onSubmit={handleSubscribe}>
            <input 
              type="email" 
              placeholder="Enter your email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <button type="submit" disabled={loading}>
              {loading ? '...' : 'SUBSCRIBE'}
            </button>
          </form>
        </div>

        <div className="footer-main-v2">
          {/* Brand & Contact */}
          <div className="footer-brand-v2">
            <Link to="/" className="footer-logo-link">
              <h2 className="footer-logo-v2">AUTO STITCH.</h2>
            </Link>
            <div className="footer-contact-v2">
              <p>FAST-NU, FAST Square, 9 Km from Faisalabad Motorway Interchange towards Chiniot</p>
              <p>Faisalabad, Pakistan.</p>
              <p className="contact-detail">Call: +92 3252204959</p>
              <p className="contact-detail">WhatsApp: +92 3252204959</p>
              <p className="contact-detail">Email: ramisali.k786@gmail.com</p>
            </div>
          </div>

          {/* Links Column 1 */}
          <div className="footer-col-v2">
            <h4>Information</h4>
            <ul>
              <li><Link to="/returns">Returns and Exchange</Link></li>
              <li><Link to="/size-guide">Size Guide</Link></li>
              <li><Link to="/privacy">Privacy Policy</Link></li>
              <li><Link to="/faq">FAQs</Link></li>
              <li><Link to="/stores">Store Locator</Link></li>
              <li><Link to="/track">Track Your Order</Link></li>
            </ul>
          </div>

          {/* Links Column 2 */}
          <div className="footer-col-v2">
            <h4>Customer Care</h4>
            <ul>
              <li><Link to="/about">About Auto Stitch</Link></li>
              <li><Link to="/contact">Contact Us</Link></li>
              <li><Link to="/careers">Careers</Link></li>
              <li><Link to="/terms">Terms and Conditions</Link></li>
              <li><Link to="/size-guide">Size Guide</Link></li>
            </ul>

            <h4 style={{ marginTop: '40px' }}>Admin Portal</h4>
            <ul>
              <li><Link to="/admin-login">Admin Portal</Link></li>
            </ul>

            <h4 style={{ marginTop: '20px' }}>Boutique Portal</h4>
            <ul>
              <li><Link to="/boutique-login">Boutique Portal</Link></li>
            </ul>
          </div>
        </div>

        {/* Secure Payment Section */}
        <div className="footer-payment-v2">
          <p>Secure payment</p>
          <div className="payment-icons-v2">
            <div className="payment-badge visa"><SiVisa /></div>
            <div className="payment-badge mastercard"><SiMastercard /></div>
            <div className="payment-badge jazzcash"><span>JazzCash</span></div>
            <div className="payment-badge easypaisa"><span>easy</span>paisa</div>
            <div className="payment-badge cod"><Truck size={16} /> <span>COD</span></div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="footer-bottom-v2">
          <div className="footer-copy-v2">
            © {year}, Auto Stitch Designs (PK)
          </div>
          <div className="footer-social-v2">
            <a href="https://youtube.com" aria-label="YouTube" target="_blank" rel="noreferrer"><FaYoutube /></a>
            <a href="https://instagram.com" aria-label="Instagram" target="_blank" rel="noreferrer"><FaInstagram /></a>
            <a href="https://facebook.com" aria-label="Facebook" target="_blank" rel="noreferrer"><FaFacebookF /></a>
            <a href="https://tiktok.com" aria-label="TikTok" target="_blank" rel="noreferrer"><FaTiktok /></a>
          </div>
        </div>
      </div>
    </footer>
  );
}
