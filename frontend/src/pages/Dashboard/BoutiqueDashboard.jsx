import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import {
  Store, Package, ShoppingCart, TrendingUp, Users, User, Star,
  Plus, Settings, BarChart2, Bell, ChevronRight, ArrowUpRight,
  Clock, DollarSign, CheckCircle, AlertCircle, RotateCcw as Loader,
  Sparkles, MessageSquare
} from 'lucide-react';
import API_URL from '../../config/api';
import './Dashboard.css';

const ShieldCheck = ({ size, style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
    <path d="m9 12 2 2 4-4"></path>
  </svg>
);

export function BoutiqueDashboard({ user }) {
  const [stats, setStats] = useState({ totalRevenue: 0, totalOrders: 0, activeProducts: 0, reputation: 4.8 });
  const [boutiqueData, setBoutiqueData] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [activeBids, setActiveBids] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = 'Boutique Dashboard — Auto Stitch';
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [statsRes, ordersRes, bidsRes, productsRes] = await Promise.all([
        axios.get(`${API_URL}/api/dashboard/boutique`, { withCredentials: true }),
        axios.get(`${API_URL}/api/orders/boutique`, { withCredentials: true }),
        axios.get(`${API_URL}/api/bids/my-bids`, { withCredentials: true }),
        axios.get(`${API_URL}/api/products/my-products`, { withCredentials: true })
      ]);

      if (statsRes.data.success) {
        setStats({
          totalRevenue: statsRes.data.stats.revenue || 0,
          totalOrders: statsRes.data.stats.totalOrders || 0,
          activeProducts: statsRes.data.stats.totalProducts || 0,
          reputation: 4.8
        });
        setBoutiqueData(statsRes.data.boutique);
      }

      if (ordersRes.data.success) setRecentOrders(ordersRes.data.orders?.slice(0, 3) || []);
      if (bidsRes.data.success) setActiveBids(bidsRes.data.bids?.slice(0, 2) || []);
      if (productsRes.data.success) setProducts(productsRes.data.products?.slice(0, 5) || []);

    } catch (err) {
      console.error('Dashboard data fetch failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const BOUTIQUE_STATS_CARDS = [
    { label: 'Total Revenue', value: `PKR ${stats.totalRevenue.toLocaleString()}`, trend: '+12%', icon: <DollarSign size={20} />, color: '#2e7d32' },
    { label: 'Total Orders', value: stats.totalOrders.toString(), trend: '+5', icon: <ShoppingCart size={20} />, color: '#1976d2' },
    { label: 'Active Products', value: stats.activeProducts.toString(), trend: '0', icon: <Package size={20} />, color: '#7c3aed' },
    { label: 'Reputation', value: stats.reputation.toString(), trend: '+0.1', icon: <Star size={20} />, color: '#c5a059' },
  ];

  const isProfileComplete = boutiqueData?.address?.street && boutiqueData?.address?.city && boutiqueData?.address?.province && boutiqueData?.contact?.phone;
  const isVerified = boutiqueData?.isApproved;

  const getStatusDisplay = () => {
    if (isVerified) return { text: 'Verified & Active — Global visibility enabled.', color: '#2e7d32', icon: <CheckCircle size={16} style={{ marginRight: '8px' }} /> };
    if (isProfileComplete) return { text: 'Pending Admin Verification — You will be notified soon.', color: '#f57c00', icon: <Clock size={16} style={{ marginRight: '8px' }} /> };
    return { text: 'Profile Incomplete (100% required) — Add address & phone in Settings.', color: '#d32f2f', icon: <AlertCircle size={16} style={{ marginRight: '8px' }} /> };
  };

  const statusDisplay = getStatusDisplay();

  if (loading) {
    return (
      <div className="dashboard-page flex-center" style={{ minHeight: '80vh' }}>
        <Loader className="spinner" size={48} />
      </div>
    );
  }

  return (
    <div className="dashboard-page page-enter">
      <div className="container dashboard-container" style={{ justifyContent: 'center', display: 'block' }}>
        <main className="dashboard-main" style={{ flex: 1, width: '100%', maxWidth: '1200px', margin: '0 auto' }}>
          
          <div className="dashboard-section" style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <h2 className="dashboard-section-title">Boutique Executive Suite</h2>
            <p className="text-muted" style={{ marginBottom: '2rem', fontSize: '0.85rem', marginLeft: 'auto', marginRight: 'auto', maxWidth: '600px' }}>
              Welcome back, {user?.name || 'Partner'}. Manage your boutique's operations, track performance, and engage with customization bids in our premium management environment.
            </p>
          </div>

          {/* Top Quick Actions */}
          <div className="welcome-banner glass-card" style={{ 
            marginBottom: '3rem', 
            background: 'rgba(255, 255, 255, 0.7)', 
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            padding: '3.5rem 2.5rem',
            flexDirection: 'column',
            textAlign: 'center',
            gap: '2rem'
          }}>
            <div className="welcome-content" style={{ flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
              <div className="avatar avatar-xl" style={{ background: '#000', color: '#fff', margin: '0 auto' }}>
                <Store size={32} />
              </div>
              <div style={{ textAlign: 'center' }}>
                <p className="welcome-greeting" style={{ textTransform: 'uppercase', letterSpacing: '0.15em', fontSize: '0.75rem', fontWeight: '700', marginBottom: '1rem' }}>Official Partner</p>
                <h1 className="welcome-name" style={{ fontFamily: '"Tenor Sans", serif', fontSize: '3rem', margin: '1rem 0' }}>{user?.name}'s Boutique</h1>
                <p className="welcome-sub text-muted" style={{ fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '1.2rem', color: statusDisplay.color, fontWeight: '600' }}>
                  {statusDisplay.icon}
                  {statusDisplay.text}
                </p>
              </div>
            </div>
            <div className="welcome-actions" style={{ justifyContent: 'center', width: '100%', gap: '2rem', marginTop: '1.5rem' }}>
              <Link to="/dashboard" className="btn-white-outline" style={{ 
                background: 'transparent', color: '#666', border: 'none', padding: '0 20px', height: '50px', 
                display: 'inline-flex', alignItems: 'center', gap: '8px', borderRadius: '0',
                fontSize: '0.7rem', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase'
              }}>
                <User size={14} /> Customer View
              </Link>
              
              {isVerified ? (
                <Link to="/boutique/products/new" className="btn-white-outline" style={{ 
                  background: '#fff', color: '#000', border: '1px solid #000', padding: '0 35px', height: '50px', 
                  display: 'inline-flex', alignItems: 'center', gap: '8px', borderRadius: '0',
                  fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.1em', textTransform: 'uppercase'
                }}>
                  <Plus size={16} /> Add Product
                </Link>
              ) : (
                <div title="Profile must be 100% complete and verified by admin first" style={{ cursor: 'not-allowed', opacity: 0.5 }}>
                  <span className="btn-white-outline" style={{ 
                    background: '#f5f5f5', color: '#999', border: '1px solid #ddd', padding: '0 35px', height: '50px', 
                    display: 'inline-flex', alignItems: 'center', gap: '8px', borderRadius: '0', pointerEvents: 'none',
                    fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.1em', textTransform: 'uppercase'
                  }}>
                    <Plus size={16} /> Add Product (Locked)
                  </span>
                </div>
              )}

              <Link to="/boutique/settings" className="btn-white-outline" style={{ 
                background: '#fff', color: '#000', border: '1px solid #000', padding: '0 35px', height: '50px', 
                display: 'inline-flex', alignItems: 'center', gap: '8px', borderRadius: '0',
                fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.1em', textTransform: 'uppercase'
              }}>
                <Settings size={16} /> Settings
              </Link>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="dash-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '4rem' }}>
            {BOUTIQUE_STATS_CARDS.map((s) => (
              <div key={s.label} className="dash-stat-card glass-card" style={{ 
                background: 'rgba(255, 255, 255, 0.5)', border: '1px solid rgba(255, 255, 255, 0.2)', padding: '2rem'
              }}>
                <div className="dash-stat-icon" style={{ background: '#f8f8f8', color: '#000', borderRadius: '0', width: '40px', height: '40px' }}>{s.icon}</div>
                <div style={{ marginTop: '1rem' }}>
                  <p className="dash-stat-value" style={{ fontSize: '1.5rem', fontWeight: '400', fontFamily: '"Tenor Sans", serif' }}>{s.value}</p>
                  <p className="dash-stat-label" style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: '600', color: '#666' }}>{s.label}</p>
                  <p className="dash-stat-trend" style={{ fontSize: '0.75rem', marginTop: '0.5rem', color: s.trend.startsWith('+') ? '#2e7d32' : '#666' }}>
                    {s.trend} <span style={{ opacity: 0.6 }}>performance index</span>
                  </p>
                </div>
              </div>
            ))}
            
            {/* New Marketplace Alert Card */}
            <Link to="/boutique/bids" className="dash-stat-card glass-card" style={{ 
              background: 'linear-gradient(135deg, #000 0%, #333 100%)', color: '#fff', border: 'none', padding: '2rem', textDecoration: 'none'
            }}>
              <div className="dash-stat-icon" style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', borderRadius: '0', width: '40px', height: '40px' }}><Sparkles size={20} /></div>
              <div style={{ marginTop: '1rem' }}>
                <p className="dash-stat-value" style={{ fontSize: '1.5rem', fontWeight: '400', fontFamily: '"Tenor Sans", serif' }}>NEW</p>
                <p className="dash-stat-label" style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: '600', opacity: 0.8 }}>Marketplace Requests</p>
                <p className="dash-stat-trend" style={{ fontSize: '0.75rem', marginTop: '0.5rem', color: '#c5a059' }}>
                  View live customization bids <ArrowUpRight size={12} />
                </p>
              </div>
            </Link>

            {/* Messaging Suite Alert Card */}
            <Link to="/chat" className="dash-stat-card glass-card" style={{ 
              background: 'rgba(255, 255, 255, 0.9)', border: '1px solid #000', padding: '2rem', textDecoration: 'none', color: '#000'
            }}>
              <div className="dash-stat-icon" style={{ background: '#000', color: '#fff', borderRadius: '0', width: '40px', height: '40px' }}><MessageSquare size={20} /></div>
              <div style={{ marginTop: '1rem' }}>
                <p className="dash-stat-value" style={{ fontSize: '1.5rem', fontWeight: '400', fontFamily: '"Tenor Sans", serif' }}>CHAT</p>
                <p className="dash-stat-label" style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: '600', color: '#666' }}>Messaging Suite</p>
                <p className="dash-stat-trend" style={{ fontSize: '0.75rem', marginTop: '0.5rem', color: '#000' }}>
                  Connect with customers directly <ArrowUpRight size={12} />
                </p>
              </div>
            </Link>
          </div>

          <div className="dash-grid" style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '3rem' }}>
            {/* Recent Orders/Sales */}
            <div className="dash-section">
              <div className="dash-section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem' }}>
                <div>
                  <h2 className="dash-section-title" style={{ fontFamily: '"Tenor Sans", serif', fontSize: '1.8rem' }}>Latest Sales</h2>
                  <p className="text-muted" style={{ fontSize: '0.8rem' }}>Real-time order tracking and management</p>
                </div>
                <Link to="/boutique/orders" className="btn btn-link btn-sm" style={{ fontWeight: '600' }}>
                  View Registry <ChevronRight size={14} />
                </Link>
              </div>
              <div className="orders-list glass-card" style={{ borderRadius: '0', background: 'transparent', border: 'none' }}>
                {recentOrders.length === 0 ? (
                  <p className="text-muted" style={{ padding: '2rem', textAlign: 'center' }}>No sales recorded yet.</p>
                ) : (
                  recentOrders.map((sale, i) => (
                    <div key={sale._id} className="order-item" style={{ 
                      padding: '1.5rem 0', borderBottom: i < recentOrders.length - 1 ? '1px solid #eee' : 'none',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                    }}>
                      <div className="order-info" style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                        <div className="order-date-box" style={{ textAlign: 'center', minWidth: '60px' }}>
                          <p style={{ fontSize: '0.65rem', fontWeight: '700', textTransform: 'uppercase' }}>{new Date(sale.createdAt).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <p className="order-id" style={{ fontSize: '0.7rem', color: '#999', marginBottom: '2px' }}>{sale._id.slice(-8).toUpperCase()}</p>
                          <p className="order-name" style={{ fontWeight: '600', fontSize: '0.9rem' }}>{sale.items[0]?.name || 'Auto Stitch Order'}</p>
                          <p className="order-boutique text-muted" style={{ fontSize: '0.8rem' }}>Customer: {sale.customer?.name}</p>
                        </div>
                      </div>
                      <div className="order-meta" style={{ textAlign: 'right' }}>
                        <p className="order-amount" style={{ fontWeight: '600', fontSize: '1rem', marginBottom: '5px' }}>PKR {sale.total.toLocaleString()}</p>
                        <span className={`status-badge status-${sale.status}`} style={{ 
                          fontSize: '0.6rem', padding: '4px 10px', background: '#f0f0f0', textTransform: 'uppercase', letterSpacing: '0.1em' 
                        }}>
                          {sale.status}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Active Bids */}
            <div className="dash-quick">
              <div className="dash-section-header" style={{ marginBottom: '2rem' }}>
                <h2 className="dash-section-title" style={{ fontFamily: '"Tenor Sans", serif', fontSize: '1.8rem' }}>Active Bids</h2>
                <p className="text-muted" style={{ fontSize: '0.8rem' }}>Direct customization requests from customers</p>
              </div>
              <div className="quick-actions" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {activeBids.length === 0 ? (
                  <p className="text-muted" style={{ padding: '2rem', textAlign: 'center' }}>No active bids.</p>
                ) : (
                  activeBids.map((bid) => (
                    <div key={bid._id} className="quick-action-card glass-card" style={{ 
                      cursor: 'default', padding: '1.5rem', background: 'rgba(255,255,255,0.4)',
                      border: '1px solid rgba(0,0,0,0.05)', borderRadius: '0'
                    }}>
                      <div className="flex-between" style={{ marginBottom: '1rem' }}>
                        <span style={{ fontSize: '0.65rem', fontWeight: '700', letterSpacing: '0.1em', color: '#999' }}>{bid._id.slice(-6).toUpperCase()}</span>
                        <p style={{ fontSize: '0.7rem', color: 'var(--color-error)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={12} /> Active
                        </p>
                      </div>
                      <div style={{ flex: 1 }}>
                        <p className="quick-action-label" style={{ fontWeight: '600', fontSize: '1rem' }}>{bid.request?.product || 'Custom Request'}</p>
                        <p className="quick-action-desc text-muted" style={{ fontSize: '0.8rem', marginBottom: '1rem' }}>Customer: {bid.request?.customer?.name}</p>
                        
                        <div style={{ padding: '12px', background: 'rgba(0,0,0,0.03)', marginBottom: '1rem' }}>
                          <div className="flex-between" style={{ fontSize: '0.75rem', marginBottom: '5px' }}>
                            <span>My Bid:</span>
                            <span style={{ fontWeight: '700' }}>PKR {bid.price.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                      <Link to="/boutique/bids" className="btn-black btn-sm" style={{ width: '100%', fontSize: '0.7rem', letterSpacing: '0.1em', background: '#000', color: '#fff', textAlign: 'center', display: 'block', padding: '10px 0' }}>
                        UPDATE PROPOSAL
                      </Link>
                    </div>
                  ))
                )}
                <Link to="/boutique/bids" className="btn btn-outline btn-sm" style={{ width: '100%', height: '50px', borderRadius: '0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  VIEW ALL REQUESTS
                </Link>
              </div>
            </div>
          </div>

          {/* Digital Showroom Section (New real data section) */}
          <div className="dash-section" style={{ marginTop: '5rem', borderTop: '1px solid #eee', paddingTop: '4rem' }}>
            <div className="dash-section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '3rem' }}>
              <div>
                <h2 className="dash-section-title" style={{ fontFamily: '"Tenor Sans", serif', fontSize: '2.2rem' }}>Digital Showroom</h2>
                <p className="text-muted" style={{ fontSize: '0.85rem' }}>Manage your live product catalogue and inventory</p>
              </div>
              <Link to="/boutique/products" className="btn btn-link" style={{ fontWeight: '600' }}>Manage Entire Catalogue <ChevronRight size={14} /></Link>
            </div>
            <div className="products-registry glass-card" style={{ borderRadius: '0', padding: '1rem', background: '#fff' }}>
              {products.length === 0 ? (
                <div style={{ padding: '3rem', textAlign: 'center' }}>
                  <Package size={48} className="text-muted" style={{ marginBottom: '1rem' }} />
                  <p>Your showroom is empty.</p>
                </div>
              ) : (
                products.map((p, i) => (
                  <div key={p._id} className="product-registry-row" style={{ 
                    display: 'grid', gridTemplateColumns: '80px 1.5fr 1fr 1fr 1fr 1fr 100px', 
                    alignItems: 'center', padding: '1.5rem', gap: '1rem',
                    borderBottom: i < products.length - 1 ? '1px solid #f5f5f5' : 'none'
                  }}>
                    <img src={p.images?.[0] || 'https://via.placeholder.com/60x80'} alt={p.name} style={{ width: '60px', height: '80px', objectFit: 'cover' }} />
                    <div>
                      <p style={{ fontWeight: '600', fontSize: '0.9rem' }}>{p.name}</p>
                      <p style={{ fontSize: '0.75rem', color: '#999' }}>{p.category}</p>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <p style={{ fontWeight: '500', fontSize: '0.85rem' }}>PKR {p.price.toLocaleString()}</p>
                      <p style={{ fontSize: '0.65rem', color: '#999', textTransform: 'uppercase' }}>Price</p>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <p style={{ fontWeight: '500', fontSize: '0.85rem', color: p.stock < 5 ? '#f57c00' : 'inherit' }}>{p.stock}</p>
                      <p style={{ fontSize: '0.65rem', color: '#999', textTransform: 'uppercase' }}>Stock</p>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <p style={{ fontWeight: '500', fontSize: '0.85rem' }}>{p.views || 0}</p>
                      <p style={{ fontSize: '0.65rem', color: '#999', textTransform: 'uppercase' }}>Views</p>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <p style={{ fontWeight: '500', fontSize: '0.85rem' }}>{p.soldCount || 0}</p>
                      <p style={{ fontSize: '0.65rem', color: '#999', textTransform: 'uppercase' }}>Sold</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ 
                        fontSize: '0.6rem', padding: '4px 10px', background: p.status === 'approved' ? '#e8f5e9' : '#fff3e0', 
                        color: p.status === 'approved' ? '#2e7d32' : '#f57c00', textTransform: 'uppercase', letterSpacing: '0.1em' 
                      }}>
                        {p.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default BoutiqueDashboard;
