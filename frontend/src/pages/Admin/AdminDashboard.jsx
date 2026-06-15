import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Users, Package, Store, ShieldCheck, TrendingUp, 
  DollarSign, AlertTriangle, ChevronRight, BarChart2, Eye,
  CheckCircle, XCircle, RotateCcw as Loader, Sparkles
} from 'lucide-react';
import axios from 'axios';
import API_URL from '../../config/api';
import '../BoutiqueManage/BoutiqueManage.css';
import './Admin.css';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeProducts: 0,
    registeredBoutiques: 0,
    totalRevenue: 0
  });
  const [pendingBoutiques, setPendingBoutiques] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { 
    document.title = 'Command Center — Auto Stitch'; 
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, pendingRes] = await Promise.all([
        axios.get(`${API_URL}/api/admin/stats`, { withCredentials: true }),
        axios.get(`${API_URL}/api/admin/boutiques/pending`, { withCredentials: true })
      ]);

      if (statsRes.data.success) setStats(statsRes.data.stats);
      if (pendingRes.data.success) setPendingBoutiques(pendingRes.data.boutiques);
    } catch (error) {
      console.error('Failed to fetch admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const dashboardStats = [
    { label: 'Total Users', value: stats.totalUsers.toLocaleString(), icon: <Users size={22} />, color: '#3B82F6' },
    { label: 'Active Products', value: stats.activeProducts.toLocaleString(), icon: <Package size={22} />, color: '#10B981' },
    { label: 'Registered Boutiques', value: stats.registeredBoutiques.toLocaleString(), icon: <Store size={22} />, color: '#8B5CF6' },
    { label: 'Total Revenue', value: `PKR ${stats.totalRevenue.toLocaleString()}`, icon: <DollarSign size={22} />, color: '#F59E0B' },
  ];

  const handleApprove = async (id) => {
    try {
      const res = await axios.put(`${API_URL}/api/admin/boutiques/${id}/approve`, {}, { withCredentials: true });
      if (res.data.success) {
        fetchDashboardData();
      }
    } catch (error) {
      console.error('Approval failed:', error);
      alert('Failed to approve boutique.');
    }
  };

  const handleReject = async (id) => {
    const reason = prompt('Reason for rejection:');
    if (reason === null) return;
    try {
      const res = await axios.put(`${API_URL}/api/admin/boutiques/${id}/reject`, { reason }, { withCredentials: true });
      if (res.data.success) {
        fetchDashboardData();
      }
    } catch (error) {
      console.error('Rejection failed:', error);
      alert('Failed to reject boutique.');
    }
  };

  return (
    <div className="manage-page page-enter">
      <div className="manage-container">
        <div className="manage-header-center">
          <h1 className="manage-title-serif">Command <span className="text-gradient">Center</span></h1>
          <p className="manage-subtitle">
            Global oversight and platform orchestration. Monitor growth, moderate listings, 
            and ensure the highest standards of boutique excellence on Auto Stitch.
          </p>
        </div>

        {/* Premium Stats Grid - Forced to 1 line */}
        <div className="admin-stats-modern" style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(4, 1fr)', 
          gap: '1.5rem', 
          marginBottom: '4rem' 
        }}>
          {dashboardStats.map(s => (
            <div key={s.label} className="dash-stat-card glass-card" style={{ 
              background: 'rgba(255, 255, 255, 0.5)', border: '1px solid rgba(255, 255, 255, 0.2)', padding: '2rem'
            }}>
              <div className="dash-stat-icon" style={{ background: '#f8f8f8', color: '#000', borderRadius: '0', width: '40px', height: '40px' }}>{s.icon}</div>
              <div style={{ marginTop: '1rem' }}>
                <p className="dash-stat-value" style={{ fontSize: '1.5rem', fontWeight: '400', fontFamily: '"Tenor Sans", serif' }}>{s.value}</p>
                <p className="dash-stat-label" style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: '600', color: '#666' }}>{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="admin-grid-v2" style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '3rem' }}>
          {/* Pending Reviews */}
          <div className="manage-section">
            <div className="flex-between" style={{ marginBottom: '2rem', alignItems: 'flex-end' }}>
              <div>
                <h2 className="dash-section-title" style={{ fontFamily: '"Tenor Sans", serif', fontSize: '1.8rem' }}>Verification Queue</h2>
                <p className="text-muted" style={{ fontSize: '0.8rem' }}>Items requiring administrative approval</p>
              </div>
              <Link to="/admin/listings" className="btn btn-link btn-sm" style={{ fontWeight: '600' }}>
                Moderate Queue <ChevronRight size={14} />
              </Link>
            </div>

            <div className="products-list-modern">
              {pendingBoutiques.length === 0 ? (
                <div className="empty-state-editorial" style={{ padding: '2rem' }}>
                  <p className="text-muted" style={{ fontSize: '0.8rem' }}>No pending applications currently.</p>
                </div>
              ) : (
                pendingBoutiques.map(boutique => (
                  <div key={boutique._id} className="product-card-premium" style={{ padding: '1.2rem' }}>
                    <div className="pc-info-main">
                      <div style={{ display: 'flex', gap: '10px', marginBottom: '4px' }}>
                        <span style={{ fontSize: '0.55rem', fontWeight: '800', background: '#000', color: '#fff', padding: '2px 8px', textTransform: 'uppercase' }}>Boutique</span>
                        <span style={{ fontSize: '0.55rem', fontWeight: '700', color: '#999', textTransform: 'uppercase' }}>
                          {new Date(boutique.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <h3 className="pc-name" style={{ fontSize: '1rem' }}>{boutique.name}</h3>
                      <p className="pc-category">Owner: {boutique.owner?.name}</p>
                    </div>
                    <div className="pc-actions">
                      <button className="btn-black-premium" style={{ padding: '8px 16px', fontSize: '0.65rem' }} onClick={() => handleApprove(boutique._id)}>Approve</button>
                      <button className="pc-action-btn" title="Reject" onClick={() => handleReject(boutique._id)}><XCircle size={16} /></button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Platform Performance / Quick Actions */}
          <div className="manage-quick-v2">
            <h2 className="dash-section-title" style={{ fontFamily: '"Tenor Sans", serif', fontSize: '1.8rem', marginBottom: '2rem' }}>Administrative Tools</h2>
            <div className="quick-actions-v2" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <Link to="/admin/users" className="product-card-premium" style={{ textDecoration: 'none', color: 'inherit' }}>
                <div className="dash-stat-icon" style={{ background: '#f8f8f8', width: '40px', height: '40px' }}><Users size={18} /></div>
                <div style={{ flex: 1, marginLeft: '1rem' }}>
                  <p style={{ fontWeight: '600', fontSize: '0.9rem' }}>User Directory</p>
                  <p className="text-muted" style={{ fontSize: '0.75rem' }}>Manage customers and partners</p>
                </div>
                <ChevronRight size={16} className="text-muted" />
              </Link>
              <Link to="/admin/listings" className="product-card-premium" style={{ textDecoration: 'none', color: 'inherit' }}>
                <div className="dash-stat-icon" style={{ background: '#f8f8f8', width: '40px', height: '40px' }}><Package size={18} /></div>
                <div style={{ flex: 1, marginLeft: '1rem' }}>
                  <p style={{ fontWeight: '600', fontSize: '0.9rem' }}>Listing Controls</p>
                  <p className="text-muted" style={{ fontSize: '0.75rem' }}>Moderate products and shops</p>
                </div>
                <ChevronRight size={16} className="text-muted" />
              </Link>
              <Link to="/boutiques" className="product-card-premium" style={{ textDecoration: 'none', color: 'inherit' }}>
                <div className="dash-stat-icon" style={{ background: '#f8f8f8', width: '40px', height: '40px' }}><Store size={18} /></div>
                <div style={{ flex: 1, marginLeft: '1rem' }}>
                  <p style={{ fontWeight: '600', fontSize: '0.9rem' }}>Boutique Insights</p>
                  <p className="text-muted" style={{ fontSize: '0.75rem' }}>Public directory overview</p>
                </div>
                <ChevronRight size={16} className="text-muted" />
              </Link>
            </div>

            <div className="admin-status-notice glass-card" style={{ marginTop: '3rem', padding: '2rem', background: 'rgba(0,0,0,0.02)', border: '1px dashed #eee' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '1rem' }}>
                <ShieldCheck size={20} style={{ color: '#2e7d32' }} />
                <h3 style={{ fontSize: '0.85rem', fontWeight: '700', textTransform: 'uppercase' }}>Security Status</h3>
              </div>
              <p style={{ fontSize: '0.75rem', lineHeight: '1.6', color: '#666' }}>
                Platform security is active. All administrative actions are logged and encrypted. 
                Your session is verified with Multi-Factor Authentication.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
