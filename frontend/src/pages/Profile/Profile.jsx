import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Save, Shield, Bell, Lock, Eye, EyeOff, ShieldCheck, QrCode, KeyRound, CheckCircle2, X } from 'lucide-react';
import API_URL from '../../config/api';
import axios from 'axios';
import toast from 'react-hot-toast';
import './Profile.css';

export default function Profile({ user, onLogout, onUpdate }) {
  const [activeTab, setActiveTab] = useState('personal');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  
  // 2FA Management State
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [twoFactorSetupData, setTwoFactorSetupData] = useState(null);
  const [twoFactorVerifyCode, setTwoFactorVerifyCode] = useState('');
  const [twoFactorLoading, setTwoFactorLoading] = useState(false);
  const [showDisableModal, setShowDisableModal] = useState(false);
  const [disablePassword, setDisablePassword] = useState('');

  // Boutique KYC State
  const [kycBoutique, setKycBoutique] = useState(null);
  const [kycForm, setKycForm] = useState({
    name: '',
    description: '',
    cnic: '',
    businessCertificate: '',
    notes: ''
  });
  const [kycLoading, setKycLoading] = useState(false);

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
      setTwoFactorEnabled(!!user.twoFactorEnabled);

      if (user.role === 'boutique_owner') {
        fetchBoutiqueKyc();
      }
    }
  }, [user]);

  const fetchBoutiqueKyc = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/boutiques/me`, { withCredentials: true });
      if (res.data.success && res.data.data) {
        const b = res.data.data;
        setKycBoutique(b);
        setKycForm({
          name: b.name || '',
          description: b.description || '',
          cnic: b.kyc?.cnic || '',
          businessCertificate: b.kyc?.businessCertificate || '',
          notes: b.kyc?.reviewNotes || ''
        });
      }
    } catch (_) {}
  };

  const handleKycSubmit = async (e) => {
    e?.preventDefault();
    if (!kycForm.cnic) {
      toast.error('Please enter your National CNIC number');
      return;
    }
    setKycLoading(true);
    try {
      const res = await axios.put(`${API_URL}/api/boutiques/kyc`, kycForm, { withCredentials: true });
      if (res.data.success) {
        setKycBoutique(res.data.boutique);
        toast.success(res.data.message || 'KYC documents submitted for verification');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit KYC documents');
    } finally {
      setKycLoading(false);
    }
  };

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

  const handleInitiate2FASetup = async () => {
    setTwoFactorLoading(true);
    try {
      const res = await axios.post(`${API_URL}/api/auth/2fa/setup`, {}, { withCredentials: true });
      if (res.data.success) {
        setTwoFactorSetupData(res.data);
        setShow2FAModal(true);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to initialize 2FA setup');
    } finally {
      setTwoFactorLoading(false);
    }
  };

  const handleConfirm2FA = async (e) => {
    e.preventDefault();
    if (!twoFactorVerifyCode || twoFactorVerifyCode.length < 6) {
      toast.error('Please enter the 6-digit code from your authenticator app');
      return;
    }
    setTwoFactorLoading(true);
    try {
      const res = await axios.post(`${API_URL}/api/auth/2fa/verify`, {
        secret: twoFactorSetupData.secret,
        token: twoFactorVerifyCode
      }, { withCredentials: true });

      if (res.data.success) {
        setTwoFactorEnabled(true);
        setShow2FAModal(false);
        setTwoFactorVerifyCode('');
        setTwoFactorSetupData(null);
        toast.success('Two-Factor Authentication is now active!');
        
        // Update cached user
        const updatedUser = { ...user, twoFactorEnabled: true };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        if (onUpdate) onUpdate(updatedUser);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid 2FA code. Please try again.');
    } finally {
      setTwoFactorLoading(false);
    }
  };

  const handleDisable2FA = async (e) => {
    e.preventDefault();
    if (!disablePassword) {
      toast.error('Please enter your account password to confirm');
      return;
    }
    setTwoFactorLoading(true);
    try {
      const res = await axios.post(`${API_URL}/api/auth/2fa/disable`, {
        password: disablePassword
      }, { withCredentials: true });

      if (res.data.success) {
        setTwoFactorEnabled(false);
        setShowDisableModal(false);
        setDisablePassword('');
        toast.success('Two-Factor Authentication has been disabled.');
        
        const updatedUser = { ...user, twoFactorEnabled: false };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        if (onUpdate) onUpdate(updatedUser);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Incorrect password.');
    } finally {
      setTwoFactorLoading(false);
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
          <Link to={user?.role === 'boutique_owner' ? "/boutique/dashboard" : "/dashboard"} className="profile-nav-item">Dashboard</Link>
          {[
            { id: 'personal', label: 'Personal Information' },
            ...(user?.role === 'boutique_owner' ? [{ id: 'kyc', label: 'KYC & Verification' }] : []),
            { id: 'address', label: 'Address & Logistics' },
            { id: 'security', label: 'Security & 2FA' },
            { id: 'notifications', label: 'Notifications' },
          ].map(tab => (
            <button
              key={tab.id}
              className={`profile-nav-item ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => { setActiveTab(tab.id); setError(''); setSuccess(''); }}
            >
              {tab.label}
            </button>
          ))}
          <button className="profile-logout-btn" onClick={handleLogoutClick}>Sign Out</button>
        </aside>

        {/* Content */}
        <div className="profile-content">
          {error && <div className="profile-alert profile-error">{error}</div>}
          {success && <div className="profile-alert profile-success">{success}</div>}

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
                  <input name="email" value={form.email} onChange={handleChange} className="profile-input" type="email" />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <input name="phone" value={form.phone} onChange={handleChange} className="profile-input" placeholder="+92 XXX XXXXXXX" />
                </div>
                <button className="profile-save-btn" onClick={handleSave} disabled={loading}>
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'kyc' && (
            <div className="profile-section">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
                <h2 className="profile-section-title" style={{ margin: 0, border: 'none', padding: 0 }}>Atelier KYC & Compliance</h2>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 16px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  background: kycBoutique?.kyc?.status === 'verified' ? '#000000' : '#ffffff',
                  color: kycBoutique?.kyc?.status === 'verified' ? '#ffffff' : '#000000',
                  border: '1px solid #000000'
                }}>
                  {kycBoutique?.kyc?.status === 'verified' ? '✓ VERIFIED ATELIER' : kycBoutique?.kyc?.status === 'rejected' ? '✕ REJECTED' : '⏳ PENDING REVIEW'}
                </div>
              </div>

              <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '24px', lineHeight: '1.6' }}>
                Under Pakistani Commerce Regulations & Auto Stitch Standards, all boutique ateliers must maintain verified CNIC and business registration credentials before public catalogue publishing.
              </p>

              <form onSubmit={handleKycSubmit} className="profile-form">
                <div className="form-group">
                  <label className="form-label">Atelier / Brand Name *</label>
                  <input 
                    name="name" 
                    value={kycForm.name} 
                    onChange={(e) => setKycForm({...kycForm, name: e.target.value})} 
                    className="profile-input" 
                    placeholder="e.g. Sapphire Couture Atelier" 
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">National CNIC Number (13 Digits) *</label>
                  <input 
                    name="cnic" 
                    value={kycForm.cnic} 
                    onChange={(e) => setKycForm({...kycForm, cnic: e.target.value})} 
                    className="profile-input" 
                    placeholder="35202-XXXXXXXX-X" 
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Business Registration / NTN / Trade Certificate Document URL</label>
                  <input 
                    name="businessCertificate" 
                    value={kycForm.businessCertificate} 
                    onChange={(e) => setKycForm({...kycForm, businessCertificate: e.target.value})} 
                    className="profile-input" 
                    placeholder="https://... or sample document link" 
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Brand Atelier Bio / Description</label>
                  <textarea 
                    name="description" 
                    value={kycForm.description} 
                    onChange={(e) => setKycForm({...kycForm, description: e.target.value})} 
                    className="profile-input" 
                    rows={3}
                    placeholder="Describe your design aesthetics, fabric specialties, and craftsmanship heritage..."
                  />
                </div>

                {kycBoutique?.kyc?.reviewNotes && (
                  <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px', color: '#475569' }}>
                    <strong>Admin Review Notes:</strong> {kycBoutique.kyc.reviewNotes}
                  </div>
                )}

                <button type="submit" className="profile-save-btn" disabled={kycLoading}>
                  {kycLoading ? 'Submitting Verification...' : 'Submit KYC for Verification'}
                </button>
              </form>
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
              <h2 className="profile-section-title">Security & Credentials</h2>
              
              {/* Password update form */}
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

              {/* 2FA Card Section */}
              <div className="two-factor-card">
                <div className="two-factor-card-inner">
                  <div>
                    <h3 className="two-factor-header">
                      <ShieldCheck size={20} color="var(--color-gold, #c5a059)" /> Two-Factor Authentication (TOTP)
                    </h3>
                    <p className="two-factor-desc">
                      Secure your account with an extra layer of protection using standard authenticator apps like Google Authenticator or Authy.
                    </p>
                  </div>

                  <div>
                    {twoFactorEnabled ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <span className="two-factor-badge-active">
                          ✓ Active
                        </span>
                        <button 
                          type="button"
                          className="btn-2fa-disable" 
                          onClick={() => setShowDisableModal(true)}
                        >
                          Disable 2FA
                        </button>
                      </div>
                    ) : (
                      <button 
                        type="button"
                        className="btn-2fa-match-profile" 
                        onClick={handleInitiate2FASetup}
                        disabled={twoFactorLoading}
                      >
                        {twoFactorLoading ? 'Loading...' : 'Enable 2FA'}
                      </button>
                    )}
                  </div>
                </div>
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
                  { name: 'promotions', label: 'Promotional Offers', desc: 'Hear about new arrivals and sales' },
                ].map(item => (
                  <div key={item.name} className="notif-pref-row">
                    <div>
                      <p className="notif-pref-label">{item.label}</p>
                      <p className="notif-pref-desc">{item.desc}</p>
                    </div>
                    <label className="switch">
                      <input type="checkbox" name={item.name} checked={!!form[item.name]} onChange={handleChange} />
                      <span className="slider round"></span>
                    </label>
                  </div>
                ))}
                <button className="profile-save-btn" onClick={handleSave} disabled={loading}>
                  {loading ? 'Saving...' : 'Save Preferences'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2FA Setup Modal (Z-Index Fixed & Matches Profile Theme) */}
      {show2FAModal && twoFactorSetupData && (
        <div className="modal-overlay-2fa" onClick={(e) => { if (e.target === e.currentTarget) setShow2FAModal(false); }}>
          <div className="modal-card-2fa">
            <button 
              type="button"
              className="modal-close-btn-2fa"
              onClick={() => setShow2FAModal(false)}
              aria-label="Close modal"
            >
              <X size={18} />
            </button>

            <h3 className="modal-title-2fa">
              Set Up Two-Factor Authentication
            </h3>
            <p className="modal-desc-2fa">
              Scan the QR code below using Google Authenticator, Microsoft Authenticator, or Authy.
            </p>

            <div className="qr-code-frame-2fa">
              <img src={twoFactorSetupData.qrCodeUrl} alt="2FA QR Code" />
            </div>

            <div className="manual-key-container-2fa">
              <span className="manual-key-label">Manual Setup Key</span>
              <code className="manual-key-code">{twoFactorSetupData.secret}</code>
            </div>

            <form onSubmit={handleConfirm2FA}>
              <div>
                <label style={{ fontSize: '0.8rem', color: '#64748b', display: 'block', marginBottom: '8px', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Enter the 6-digit code from your app:
                </label>
                <input 
                  type="text"
                  maxLength={6}
                  className="input-code-2fa"
                  value={twoFactorVerifyCode}
                  onChange={(e) => setTwoFactorVerifyCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  autoFocus
                  required
                />
              </div>

              <button 
                type="submit" 
                className="btn-2fa-match-profile" 
                disabled={twoFactorLoading || twoFactorVerifyCode.length < 6}
                style={{ width: '100%', padding: '14px', fontSize: '0.85rem' }}
              >
                {twoFactorLoading ? 'Activating...' : 'Verify & Activate 2FA'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 2FA Disable Modal */}
      {showDisableModal && (
        <div className="modal-overlay-2fa" onClick={(e) => { if (e.target === e.currentTarget) setShowDisableModal(false); }}>
          <div className="modal-card-2fa" style={{ maxWidth: '420px' }}>
            <button 
              type="button"
              className="modal-close-btn-2fa"
              onClick={() => setShowDisableModal(false)}
              aria-label="Close modal"
            >
              <X size={18} />
            </button>

            <h3 className="modal-title-2fa" style={{ color: '#1a1a2e' }}>
              Disable 2FA
            </h3>
            <p className="modal-desc-2fa">
              Enter your current account password to disable two-factor authentication.
            </p>

            <form onSubmit={handleDisable2FA}>
              <div style={{ marginBottom: '1.5rem' }}>
                <input 
                  type="password"
                  value={disablePassword}
                  onChange={(e) => setDisablePassword(e.target.value)}
                  placeholder="Enter your account password"
                  style={{
                    width: '100%', padding: '12px 14px', borderRadius: '0px',
                    border: '1px solid #cbd5e1', background: '#ffffff', color: '#1a1a2e',
                    outline: 'none', fontSize: '0.95rem', boxSizing: 'border-box'
                  }}
                  autoFocus
                  required
                />
              </div>

              <button 
                type="submit" 
                className="btn-2fa-disable" 
                disabled={twoFactorLoading || !disablePassword}
                style={{ width: '100%', padding: '12px', fontSize: '0.85rem' }}
              >
                {twoFactorLoading ? 'Disabling...' : 'Confirm & Disable'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
