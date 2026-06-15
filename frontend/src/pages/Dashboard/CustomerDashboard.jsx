import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import API_URL from '../../config/api';
import axios from 'axios';
import './Dashboard.css';

export default function CustomerDashboard({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('dashboard'); // dashboard | stitching | bidding
  const [stats, setStats] = useState({ totalOrders: 0, wishlistCount: 0, tryOnsUsed: 0, activeRequests: 0 });
  const [recentOrders, setRecentOrders] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'My Dashboard — Auto Stitch';
    fetchStats();
    fetchRequests();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/dashboard/customer`, {
        withCredentials: true
      });
      const data = res.data;
      if (data.success) {
        setStats(data.stats);
        if (data.recentOrders?.length > 0) {
          // Hide cancelled orders from dashboard as well
          const activeOrders = data.recentOrders.filter(o => o.status !== 'cancelled');
          setRecentOrders(activeOrders);
        }
      }
    } catch (error) {
      console.error('Failed to fetch dashboard stats');
    } finally {
      setLoading(false);
    }
  };

  const fetchRequests = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/bids/my-requests`, {
        withCredentials: true
      });
      const data = res.data;
      if (data.success) {
        setRequests(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch customization requests');
    }
  };

  const handleLogoutClick = () => {
    if (onLogout) {
      onLogout();
      navigate('/login');
    }
  };

  return (
    <div className="dashboard-page page-enter">
      <div className="container dashboard-container">
        {/* Sidebar */}
        <aside className="dashboard-sidebar">
          {user?.role === 'boutique_owner' && (
            <Link to="/boutique/dashboard" className="dashboard-nav-item" style={{ color: '#000', fontWeight: '700', borderBottom: '1px solid #eee', paddingBottom: '12px', marginBottom: '12px' }}>
              Main Dashboard
            </Link>
          )}
          {user?.role === 'admin' && (
            <Link to="/admin" className="dashboard-nav-item" style={{ color: '#000', fontWeight: '700', borderBottom: '1px solid #eee', paddingBottom: '12px', marginBottom: '12px' }}>
              Main Dashboard
            </Link>
          )}
          <button 
            className={`dashboard-nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            Dashboard
          </button>
          <button 
            className={`dashboard-nav-item ${activeTab === 'stitching' ? 'active' : ''}`}
            onClick={() => setActiveTab('stitching')}
          >
            Custom Stitching
          </button>
          <button 
            className={`dashboard-nav-item ${activeTab === 'bidding' ? 'active' : ''}`}
            onClick={() => setActiveTab('bidding')}
          >
            Bidding History
          </button>
          <Link to="/profile" className="dashboard-nav-item">Account Settings</Link>
          <button onClick={handleLogoutClick} className="dashboard-logout">Log Out</button>
        </aside>

        {/* Main Content */}
        <main className="dashboard-main">
          <h1 className="dashboard-welcome">
            {activeTab === 'dashboard' ? `Welcome, ${user?.name?.split(' ')[0] || 'Auto'}` : 
             activeTab === 'stitching' ? 'Custom Stitching History' : 'Bidding History'}
          </h1>

          {activeTab === 'dashboard' && (
            <div className="dashboard-content-grid">
              <div className="dashboard-left-col">
                <section className="dashboard-section">
                  <h2 className="dashboard-section-title">Account Information</h2>
                  <div className="info-block">
                    <p>{user?.name || 'Auto Stitch'}</p>
                    <p>{user?.email || 'autostitchsecurity@gmail.com'}</p>
                    <Link to="/profile" className="info-link">Edit Information</Link>
                  </div>
                </section>

                <section className="dashboard-section">
                  <h2 className="dashboard-section-title">Recent Orders</h2>
                  {recentOrders.length === 0 ? (
                    <p className="order-history-empty">You haven't placed any orders yet.</p>
                  ) : (
                    <div className="info-block">
                      {recentOrders.map(order => (
                        <div key={order._id} style={{ marginBottom: '1.5rem' }}>
                          <p style={{ fontWeight: 600 }}>Order #{order._id.slice(-6).toUpperCase()}</p>
                          <p className="text-muted" style={{ fontSize: '0.85rem' }}>
                            {new Date(order.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                          </p>
                          <p>PKR {order.total?.toLocaleString()}</p>
                          <Link to={`/orders/${order._id}`} className="info-link" style={{ marginTop: '4px' }}>View Order</Link>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>

              <div className="dashboard-right-col">
                <section className="dashboard-section">
                  <h2 className="dashboard-section-title">Address Book</h2>
                  <div className="info-block">
                    <Link to="/profile" className="info-link" style={{ marginTop: 0, marginBottom: '12px', display: 'block' }}>
                      View Address Book ({user?.addresses?.length || 1})
                    </Link>
                    <p>{user?.address?.city || 'Pakistan'}</p>
                  </div>
                </section>
              </div>
            </div>
          )}

          {activeTab === 'stitching' && (
            <div className="dashboard-history-view">
              {requests.length === 0 ? (
                <p className="order-history-empty">No customization requests found.</p>
              ) : (
                <div className="history-list">
                  {requests.map(req => (
                    <div key={req._id} className="history-item">
                      <div className="history-item-header">
                        <span className="dashboard-section-title" style={{ marginBottom: 0 }}>{req.product.name}</span>
                        <span className={`status-badge-minimal ${req.status}`}>{req.status.replace('_', ' ')}</span>
                      </div>
                      <div className="info-block" style={{ marginTop: '12px' }}>
                        <p className="text-muted" style={{ fontSize: '0.85rem' }}>Requested on {new Date(req.createdAt).toLocaleDateString()}</p>
                        <p>{req.description || 'No description provided'}</p>
                        <p style={{ fontWeight: 600, marginTop: '8px' }}>Budget: PKR {req.budget || 'Open'}</p>
                        <Link to="/bids" className="info-link">View Details & Bids</Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'bidding' && (
            <div className="dashboard-history-view">
              {requests.filter(r => r.status === 'bidding' || r.status === 'bid_accepted').length === 0 ? (
                <p className="order-history-empty">No active bidding records found.</p>
              ) : (
                <div className="history-list">
                  {requests.filter(r => r.status === 'bidding' || r.status === 'bid_accepted').map(req => (
                    <div key={req._id} className="history-item">
                      <div className="history-item-header">
                        <span className="dashboard-section-title" style={{ marginBottom: 0 }}>{req.product.name}</span>
                        <span className="bid-count-minimal">{req.bids?.length || 0} Bids Received</span>
                      </div>
                      <div className="info-block" style={{ marginTop: '12px' }}>
                        <p className="text-muted" style={{ fontSize: '0.85rem' }}>Status: {req.status === 'bid_accepted' ? 'Bid Accepted' : 'In Bidding'}</p>
                        <Link to="/bids" className="info-link">View Boutique Bids & Prices</Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}


