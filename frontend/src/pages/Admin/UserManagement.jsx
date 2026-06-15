import { useState, useEffect } from 'react';
import { Search, Filter, Shield, XCircle, CheckCircle, ChevronDown, Eye, Lock, Unlock, RotateCcw as Loader, User, X, Trash2 } from 'lucide-react';
import axios from 'axios';
import API_URL from '../../config/api';
import '../BoutiqueManage/BoutiqueManage.css';
import './Admin.css';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState(null);

  useEffect(() => { 
    document.title = 'Identity Registry — Admin'; 
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/admin/users`, { withCredentials: true });
      if (res.data.success) {
        setUsers(res.data.users);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  const filtered = users.filter(u => {
    const nameMatch = u.name?.toLowerCase().includes(search.toLowerCase());
    const emailMatch = u.email?.toLowerCase().includes(search.toLowerCase());
    const matchSearch = nameMatch || emailMatch;
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const toggleStatus = async (id, role, source) => {
    try {
      const res = await axios.patch(`${API_URL}/api/admin/users/${id}/status`, { role, source }, { withCredentials: true });
      if (res.data.success) {
        setUsers(prev => prev.map(u => u._id === id ? { ...u, isActive: res.data.isActive } : u));
        if (selectedUser?._id === id) setSelectedUser(prev => ({ ...prev, isActive: res.data.isActive }));
      }
    } catch (error) {
      console.error('Failed to toggle status:', error);
    }
  };

  const handleDelete = async (id, role, source) => {
    if (!window.confirm('CRITICAL: This will permanently delete this identity and all associated boutique data. This action CANNOT be undone. Proceed?')) return;
    
    try {
      const res = await axios.delete(`${API_URL}/api/admin/users/${id}?role=${role}&source=${source}`, { withCredentials: true });
      if (res.data.success) {
        setUsers(prev => prev.filter(u => u._id !== id));
        setSelectedUser(null);
        alert('Identity purged successfully.');
      }
    } catch (error) {
      console.error('Deletion failed:', error);
      alert('Failed to delete user.');
    }
  };

  const handleVerify = async (id, role, source) => {
    try {
      const res = await axios.patch(`${API_URL}/api/admin/users/${id}/verify`, { role, source }, { withCredentials: true });
      if (res.data.success) {
        setUsers(prev => prev.map(u => u._id === id ? { ...u, isVerified: true } : u));
        if (selectedUser?._id === id) setSelectedUser(prev => ({ ...prev, isVerified: true }));
        alert('Identity verified successfully.');
      }
    } catch (error) {
      console.error('Verification failed:', error);
      alert('Failed to verify user.');
    }
  };

  if (loading) {
    return (
      <div className="manage-page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <Loader className="spin" size={40} />
      </div>
    );
  }

  return (
    <div className="manage-page page-enter">
      <div className="manage-container">
        <div className="manage-header-center">
          <h1 className="manage-title-serif">Identity <span className="text-gradient">Registry</span></h1>
          <p className="manage-subtitle">
            Secure directory of all Auto Stitch participants. Manage access rights, 
            monitor account health, and enforce platform security protocols.
          </p>
        </div>

        <div className="manage-toolbar-modern">
          <div className="search-wrap-minimal">
            <Search size={16} className="search-icon-fixed" />
            <input 
              type="text" 
              placeholder="Filter by name or identity..." 
              value={search} 
              onChange={e => setSearch(e.target.value)}
              className="search-input-minimal"
            />
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <select 
              className="product-count-badge" 
              style={{ border: '1px solid #eee', background: 'transparent', cursor: 'pointer', outline: 'none', padding: '0 10px' }}
              value={roleFilter} 
              onChange={e => setRoleFilter(e.target.value)}
            >
              <option value="all">All Roles</option>
              <option value="customer">Customers</option>
              <option value="boutique_owner">Boutique Partners</option>
              <option value="admin">Administrators</option>
            </select>
            <span className="product-count-badge">{filtered.length} identities found</span>
          </div>
        </div>

        <div className="products-list-modern">
          {filtered.length === 0 ? (
            <div className="empty-state-editorial">
              <div className="empty-icon-wrap"><User size={32} /></div>
              <h3 className="empty-title">No Identity Found</h3>
              <p className="text-muted">No users match your current filter criteria.</p>
            </div>
          ) : (
            filtered.map(u => (
              <div key={u._id} className="product-card-premium">
                <div className="avatar avatar-md" style={{ background: '#f8f8f8', color: '#000', fontWeight: '700' }}>
                  {u.name?.charAt(0) || '?'}
                </div>
                
                <div className="pc-info-main">
                  <h3 className="pc-name">{u.name}</h3>
                  <p className="pc-category">{u.email}</p>
                </div>

                <div className="pc-stats-row">
                  <div className="pc-stat-item">
                    <p className="pc-stat-value" style={{ fontSize: '0.8rem', textTransform: 'uppercase' }}>
                      {u.role?.replace('_', ' ')}
                    </p>
                    <p className="pc-stat-label">Role</p>
                  </div>
                  <div className="pc-stat-item">
                    <p className="pc-stat-value">{new Date(u.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</p>
                    <p className="pc-stat-label">Joined</p>
                  </div>
                </div>

                <div className="pc-status-tag" style={{ 
                  background: u.isActive ? 'rgba(46, 125, 50, 0.05)' : 'rgba(211, 47, 47, 0.05)',
                  color: u.isActive ? '#2e7d32' : '#d32f2f',
                  border: `1px solid ${u.isActive ? 'rgba(46, 125, 50, 0.1)' : 'rgba(211, 47, 47, 0.1)'}`,
                  minWidth: '100px',
                  justifyContent: 'center'
                }}>
                  {u.isActive ? <CheckCircle size={12} style={{ marginRight: '6px' }} /> : <Lock size={12} style={{ marginRight: '6px' }} />}
                  {u.isActive ? 'Active' : 'Locked'}
                </div>

                <div className="pc-actions">
                  {u.role !== 'admin' && (
                    <button 
                      className={u.isActive ? 'btn-white-outline' : 'btn-black-premium'} 
                      style={{ padding: '8px 16px', fontSize: '0.65rem' }}
                      onClick={() => toggleStatus(u._id, u.role, u.source)}
                    >
                      {u.isActive ? 'Restrict' : 'Authorize'}
                    </button>
                  )}
                  <button className="pc-action-btn" title="View Profile" onClick={() => setSelectedUser(u)}><Eye size={16} /></button>
                  {u.role !== 'admin' && (
                    <button className="pc-action-btn pc-action-delete" title="Delete Identity" onClick={() => handleDelete(u._id, u.role, u.source)}>
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* User Detail Modal */}
      {selectedUser && (
        <div className="modal-overlay" onClick={() => setSelectedUser(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <button className="modal-close" onClick={() => setSelectedUser(null)}><X size={24} /></button>
            <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
              <div className="avatar avatar-xl" style={{ margin: '0 auto 1.5rem', background: '#f8f8f8', fontSize: '2rem' }}>
                {selectedUser.name?.charAt(0)}
              </div>
              <h2 className="modal-title" style={{ marginBottom: '0.5rem' }}>{selectedUser.name}</h2>
              <p className="text-muted">{selectedUser.email}</p>
              <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'center', gap: '15px' }}>
                <span className="pc-status-tag" style={{ textTransform: 'capitalize' }}>{selectedUser.role?.replace('_', ' ')}</span>
                <span className={`pc-status-tag ${selectedUser.isActive ? 'pc-status-approved' : 'pc-status-pending'}`}>
                  {selectedUser.isActive ? 'Account Active' : 'Account Locked'}
                </span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', borderTop: '1px solid #eee', paddingTop: '2.5rem' }}>
              <div>
                <p className="pc-stat-label" style={{ marginBottom: '8px' }}>User ID</p>
                <p style={{ fontSize: '0.8rem', color: '#111', fontFamily: 'monospace' }}>{selectedUser._id}</p>
              </div>
              <div>
                <p className="pc-stat-label" style={{ marginBottom: '8px' }}>Member Since</p>
                <p style={{ fontSize: '0.9rem', color: '#111' }}>{new Date(selectedUser.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              </div>
              <div>
                <p className="pc-stat-label" style={{ marginBottom: '8px' }}>Phone Number</p>
                <p style={{ fontSize: '0.9rem', color: '#111' }}>{selectedUser.phone || 'Not provided'}</p>
              </div>
              <div>
                <p className="pc-stat-label" style={{ marginBottom: '8px' }}>Verified Status</p>
                <p style={{ fontSize: '0.9rem', color: selectedUser.isVerified ? '#2e7d32' : '#d32f2f' }}>
                  {selectedUser.isVerified ? 'Email Verified' : 'Pending Verification'}
                </p>
              </div>
              {selectedUser.address && (
                <div style={{ gridColumn: 'span 2' }}>
                  <p className="pc-stat-label" style={{ marginBottom: '8px' }}>Primary Address</p>
                  <p style={{ fontSize: '0.9rem', color: '#111' }}>
                    {selectedUser.address.street}, {selectedUser.address.city}, {selectedUser.address.province}
                  </p>
                </div>
              )}
            </div>

            <div style={{ marginTop: '3rem', display: 'flex', gap: '1rem' }}>
              {selectedUser.role !== 'admin' && (
                <>
                  {!selectedUser.isVerified && (
                    <button 
                      className="btn-premium-action" 
                      style={{ flex: 1 }}
                      onClick={() => handleVerify(selectedUser._id, selectedUser.role, selectedUser.source)}
                    >
                      Verify Identity
                    </button>
                  )}
                  <button 
                    className={selectedUser.isActive ? 'btn-premium-cancel' : 'btn-premium-action'} 
                    style={{ flex: 1 }}
                    onClick={() => toggleStatus(selectedUser._id, selectedUser.role, selectedUser.source)}
                  >
                    {selectedUser.isActive ? 'Lock Account' : 'Unlock Account'}
                  </button>
                  <button 
                    className="btn-premium-cancel" 
                    style={{ flex: 1, borderColor: '#d32f2f', color: '#d32f2f' }}
                    onClick={() => handleDelete(selectedUser._id, selectedUser.role, selectedUser.source)}
                  >
                    Delete Identity
                  </button>
                </>
              )}
              <button className="btn-premium-cancel" style={{ flex: 1 }} onClick={() => setSelectedUser(null)}>Close Registry</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
