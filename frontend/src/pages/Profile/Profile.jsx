import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Save, Shield, Bell, Lock, Eye, EyeOff } from 'lucide-react';
import API_URL from '../../config/api';
import axios from 'axios';
import './Profile.css';

export default function Profile({ user, onLogout, onUpdate }) {
  const [activeTab, setActiveTab] = useState('personal');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '', email: '', phone: '', street: '', city: '', province: '', postalCode: '',
    currentPassword: '', newPassword: '', confirmPassword: '',
    emailNotif: true, pushNotif: false, orderUpdates: true, promotions: false,
  });

  useEffect(() => {
    if (user) {
      setForm(prev => ({
        ...prev,
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        street: user.address?.street || '',
        city: user.address?.city || '',
        province: user.address?.province || '',
        postalCode: user.address?.postalCode || '',
        emailNotif: user.notifications?.email ?? true,
        pushNotif: user.notifications?.push ?? false,
      }));
    }
  }, [user]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  const handleSave = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      if (activeTab === 'security') {
        if (!form.currentPassword || !form.newPassword) {
          throw new Error('Please fill in all password fields');
        }
        if (form.newPassword !== form.confirmPassword) {
          throw new Error('New passwords do not match');
        }
        const res = await axios.put(`${API_URL}/api/auth/updatepassword`, 
          { currentPassword: form.currentPassword, newPassword: form.newPassword },
          { withCredentials: true }
        );
        setSuccess('Password updated successfully!');
        setForm(prev => ({ ...prev, currentPassword: '', newPassword: '', confirmPassword: '' }));
      } else {
        const payload = {
          name: form.name,
          email: form.email,
          phone: form.phone,
          address: { street: form.street, city: form.city, province: form.province, postalCode: form.postalCode },
          notifications: { email: form.emailNotif, push: form.pushNotif }
        };

        const res = await axios.put(`${API_URL}/api/auth/profile`, 
          payload,
          { withCredentials: true }
        );
        const data = res.data;
        if (!data.success) throw new Error(data.message);

        setSuccess('Profile updated successfully!');
        localStorage.setItem('user', JSON.stringify(data.user));
        if (onUpdate) onUpdate(data.user);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Action failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogoutClick = () => {
    if (onLogout) {
      onLogout();
      navigate('/login');
    }
  };

  return (
    <div className="profile-page page-enter">
      <div className="container profile-container">
        {/* Sidebar */}
        <aside className="profile-sidebar">
          <Link to="/dashboard" className="profile-nav-item">Dashboard</Link>
          {[
            { key: 'personal', label: 'Personal Info' },
            { key: 'address', label: 'Address' },
            { key: 'security', label: 'Security' },
            { key: 'notifications', label: 'Notifications' },
          ].map(item => (
            <button 
              key={item.key} 
              className={`profile-nav-item ${activeTab === item.key ? 'active' : ''}`} 
              onClick={() => setActiveTab(item.key)}
            >
              {item.label}
            </button>
          ))}
          <button onClick={handleLogoutClick} className="profile-logout-btn">Log Out</button>
        </aside>



        {/* Main Content */}
        <main className="profile-main">
          <h1 className="profile-title">Account Settings</h1>
          
          {error && <div className="profile-msg error">{error}</div>}
          {success && <div className="profile-msg success">{success}</div>}

          {activeTab === 'personal' && (
            <div className="profile-section">
              <h2 className="profile-section-title">Personal Information</h2>
              <div className="profile-form">
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input name="name" value={form.name} onChange={handleChange} className="profile-input" />
                </div>
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input name="email" type="email" value={form.email} onChange={handleChange} className="profile-input" />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <input name="phone" value={form.phone} onChange={handleChange} className="profile-input" placeholder="+92 3XX XXXXXXX" />
                </div>
                <button className="profile-save-btn" onClick={handleSave} disabled={loading}>
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'address' && (
            <div className="profile-section">
              <h2 className="profile-section-title">Shipping Address</h2>
              <div className="profile-form">
                <div className="form-group">
                  <label className="form-label">Street Address</label>
                  <input name="street" value={form.street} onChange={handleChange} className="profile-input" placeholder="House #, Street, Area" />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">City</label>
                    <input name="city" value={form.city} onChange={handleChange} className="profile-input" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Province</label>
                    <select name="province" value={form.province} onChange={handleChange} className="profile-select">
                      <option value="">Select Province</option>
                      <option>Punjab</option>
                      <option>Sindh</option>
                      <option>KPK</option>
                      <option>Balochistan</option>
                      <option>ICT</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Postal Code</label>
                  <input name="postalCode" value={form.postalCode} onChange={handleChange} className="profile-input" />
                </div>
                <button className="profile-save-btn" onClick={handleSave} disabled={loading}>
                  {loading ? 'Saving...' : 'Save Address'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="profile-section">
              <h2 className="profile-section-title">Security Settings</h2>
              <div className="profile-form">
                <div className="form-group">
                  <label className="form-label">Current Password</label>
                  <div className="profile-input-wrap">
                    <input 
                      type={showCurrentPass ? 'text' : 'password'} 
                      name="currentPassword" 
                      value={form.currentPassword} 
                      onChange={handleChange} 
                      className="profile-input" 
                    />
                    <button className="pass-toggle" onClick={() => setShowCurrentPass(!showCurrentPass)}>
                      {showCurrentPass ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">New Password</label>
                    <div className="profile-input-wrap">
                      <input 
                        type={showNewPass ? 'text' : 'password'} 
                        name="newPassword" 
                        value={form.newPassword} 
                        onChange={handleChange} 
                        className="profile-input" 
                      />
                      <button className="pass-toggle" onClick={() => setShowNewPass(!showNewPass)}>
                        {showNewPass ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Confirm New Password</label>
                    <div className="profile-input-wrap">
                      <input 
                        type={showConfirmPass ? 'text' : 'password'} 
                        name="confirmPassword" 
                        value={form.confirmPassword} 
                        onChange={handleChange} 
                        className="profile-input" 
                      />
                      <button className="pass-toggle" onClick={() => setShowConfirmPass(!showConfirmPass)}>
                        {showConfirmPass ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                </div>
                <button className="profile-save-btn" onClick={handleSave} disabled={loading}>
                  {loading ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="profile-section">
              <h2 className="profile-section-title">Notification Preferences</h2>
              <div className="profile-form">
                {[
                  { name: 'emailNotif', label: 'Email Notifications', desc: 'Receive order updates via email' },
                  { name: 'pushNotif', label: 'Push Notifications', desc: 'Browser push notifications' },
                  { name: 'orderUpdates', label: 'Order Updates', desc: 'Get notified about order status changes' },
                  { name: 'promotions', label: 'Promotional Emails', desc: 'Receive deals and offers' },
                ].map(opt => (
                  <div key={opt.name} className="notif-item">
                    <div className="notif-info">
                      <h4>{opt.label}</h4>
                      <p>{opt.desc}</p>
                    </div>
                    <input 
                      type="checkbox" 
                      name={opt.name} 
                      checked={form[opt.name]} 
                      onChange={handleChange} 
                      className="notif-switch" 
                    />
                  </div>
                ))}
                <button className="profile-save-btn" onClick={handleSave} disabled={loading}>
                  {loading ? 'Saving...' : 'Save Preferences'}
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

