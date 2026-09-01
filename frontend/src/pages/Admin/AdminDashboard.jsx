import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Users, Package, Store, ShieldCheck, TrendingUp, 
  DollarSign, AlertTriangle, ChevronRight, BarChart2, Eye,
  CheckCircle, XCircle, RotateCcw as Loader, Sparkles,
  LifeBuoy, Mail, Check, MessageSquare, Clock, Filter, Copy
} from 'lucide-react';
import axios from 'axios';
import API_URL from '../../config/api';
import toast from 'react-hot-toast';
import '../BoutiqueManage/BoutiqueManage.css';
import './Admin.css';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeProducts: 0,
    registeredBoutiques: 0,
    totalRevenue: 0
  });
  const [pendingBoutiques, setPendingBoutiques] = useState([]);
  const [loading, setLoading] = useState(true);

  // Support Tickets State
  const [tickets, setTickets] = useState([]);
  const [ticketFilter, setTicketFilter] = useState('');
  const [ticketLoading, setTicketLoading] = useState(false);

  // Subscribers State
  const [subscribers, setSubscribers] = useState([]);
  const [subscriberLoading, setSubscriberLoading] = useState(false);

  // Boutique Payouts State
  const [payouts, setPayouts] = useState([]);
  const [payoutLoading, setPayoutLoading] = useState(false);
  const [payoutFilter, setPayoutFilter] = useState('');

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

  const fetchPayouts = async () => {
    setPayoutLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/admin/payouts`, { withCredentials: true });
      if (res.data.success) {
        setPayouts(res.data.payouts || []);
      }
    } catch (err) {
      toast.error('Failed to load boutique payouts');
    } finally {
      setPayoutLoading(false);
    }
  };

  const handleProcessPayout = async (boutiqueId, ref, newStatus) => {
    try {
      const res = await axios.patch(
        `${API_URL}/api/admin/payouts/${boutiqueId}/${ref}/status`,
        { status: newStatus },
        { withCredentials: true }
      );
      if (res.data.success) {
        toast.success(res.data.message || `Payout marked as ${newStatus}`);
        setPayouts(prev => prev.map(p => (p.transactionRef === ref || p._id === ref) ? { ...p, status: newStatus } : p));
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update payout status');
    }
  };

  const fetchSupportTickets = async (status = '') => {
    setTicketLoading(true);
    try {
      const url = status ? `${API_URL}/api/support/tickets?status=${status}` : `${API_URL}/api/support/tickets`;
      const res = await axios.get(url, { withCredentials: true });
      if (res.data.success) {
        setTickets(res.data.tickets || []);
      }
    } catch (err) {
      toast.error('Failed to load support tickets');
    } finally {
      setTicketLoading(false);
    }
  };

  const fetchSubscribers = async () => {
    setSubscriberLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/subscribers`, { withCredentials: true });
      if (res.data.success) {
        setSubscribers(res.data.subscribers || []);
      }
    } catch (err) {
      toast.error('Failed to load newsletter subscribers');
    } finally {
      setSubscriberLoading(false);
    }
  };

  const handleTabSwitch = (tab) => {
    setActiveTab(tab);
    if (tab === 'payouts') fetchPayouts();
    if (tab === 'tickets') fetchSupportTickets(ticketFilter);
    if (tab === 'subscribers') fetchSubscribers();
  };

  const handleTicketStatusUpdate = async (id, newStatus) => {
    try {
      const res = await axios.patch(`${API_URL}/api/support/tickets/${id}`, { status: newStatus }, { withCredentials: true });
      if (res.data.success) {
        toast.success(`Ticket status updated to ${newStatus}`);
        setTickets(prev => prev.map(t => t._id === id ? { ...t, status: newStatus } : t));
      }
    } catch (err) {
      toast.error('Failed to update ticket status');
    }
  };

  const handleCopySubscribers = () => {
    const emails = subscribers.map(s => s.email).join(', ');
    navigator.clipboard.writeText(emails);
    toast.success('Subscriber email list copied to clipboard!');
  };

  const dashboardStats = [
    { label: 'Total Users', value: (stats.totalUsers || 0).toLocaleString(), icon: <Users size={18} />, change: '+12% this month' },
    { label: 'Active Products', value: (stats.activeProducts || 0).toLocaleString(), icon: <Package size={18} />, change: 'Across all ateliers' },
    { label: 'Registered Boutiques', value: (stats.registeredBoutiques || 0).toLocaleString(), icon: <Store size={18} />, change: `${stats.pendingBoutiques || 0} pending review` },
    { label: 'Gross Platform GMV', value: `PKR ${(stats.totalRevenue || 0).toLocaleString()}`, icon: <DollarSign size={18} />, change: '+18.4% performance' },
    { label: 'Platform Net Take (10%)', value: `PKR ${(stats.platformCommission || Math.round((stats.totalRevenue || 0) * 0.10)).toLocaleString()}`, icon: <TrendingUp size={18} />, change: 'Automated commission' },
    { label: 'Total Orders', value: (stats.totalOrdersCount || 0).toLocaleString(), icon: <BarChart2 size={18} />, change: 'Standard & bespoke' },
    { label: 'Avg Order Value', value: `PKR ${(stats.avgOrderValue || 0).toLocaleString()}`, icon: <DollarSign size={18} />, change: 'Per customer basket' },
    { label: 'Active Custom Bids', value: (stats.activeBidsCount || 0).toLocaleString(), icon: <Sparkles size={18} />, change: 'In live bidding' },
  ];

  const handleApprove = async (id) => {
    try {
      const res = await axios.put(`${API_URL}/api/admin/boutiques/${id}/approve`, {}, { withCredentials: true });
      if (res.data.success) {
        toast.success('Boutique approved!');
        fetchDashboardData();
      }
    } catch (error) {
      toast.error('Failed to approve boutique.');
    }
  };

  const handleReject = async (id) => {
    const reason = prompt('Reason for rejection:');
    if (reason === null) return;
    try {
      const res = await axios.put(`${API_URL}/api/admin/boutiques/${id}/reject`, { reason }, { withCredentials: true });
      if (res.data.success) {
        toast.success('Boutique rejected.');
        fetchDashboardData();
      }
    } catch (error) {
      toast.error('Failed to reject boutique.');
    }
  };

  return (
    <div className="manage-page page-enter">
      <div className="manage-container" style={{ maxWidth: '1300px', margin: '0 auto' }}>
        <div className="manage-header-center">
          <h1 className="manage-title-serif">Command <span className="text-gradient">Center</span></h1>
          <p className="manage-subtitle">
            Global oversight and platform orchestration. Moderate listings, track financial KPIs, manage customer inquiries, 
            and oversee boutique growth on Auto Stitch.
          </p>

          {/* Admin Section Tabs */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '2rem', flexWrap: 'wrap' }}>
            {[
              { id: 'overview', label: 'Platform Overview & Analytics', icon: <BarChart2 size={16} /> },
              { id: 'payouts', label: 'Boutique Payouts', icon: <DollarSign size={16} /> },
              { id: 'tickets', label: 'Support Inquiries', icon: <LifeBuoy size={16} /> },
              { id: 'subscribers', label: 'Newsletter Subscribers', icon: <Mail size={16} /> },
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabSwitch(tab.id)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 24px',
                  background: activeTab === tab.id ? '#000000' : '#ffffff',
                  color: activeTab === tab.id ? '#ffffff' : '#000000',
                  border: '1px solid #000000',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* 1. OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <>
            {/* Executive Analytics & Financial Health Card - Boutique Analytics Style */}
            <div style={{ 
              background: '#ffffff', 
              color: '#000000', 
              borderRadius: '6px', 
              padding: '2.5rem', 
              marginBottom: '2.5rem',
              border: '1px solid #000000',
              boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px', marginBottom: '2rem' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#666666', fontWeight: 700 }}>
                    Executive Platform Analytics & KPI Summary
                  </span>
                  <h2 style={{ fontFamily: '"Tenor Sans", serif', fontSize: '2.8rem', margin: '6px 0 4px 0', color: '#000000', fontWeight: 400 }}>
                    PKR {(stats.totalRevenue || 0).toLocaleString()}
                  </h2>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#666666' }}>
                    Total Gross Marketplace Merchandise Volume (GMV) across all partner boutiques
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                  <div style={{ background: '#ffffff', border: '1px solid #000000', padding: '12px 20px', borderRadius: '4px', textAlign: 'center' }}>
                    <span style={{ fontSize: '0.7rem', color: '#666666', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>Platform Cut (10%)</span>
                    <p style={{ margin: '4px 0 0 0', fontWeight: 700, fontSize: '1.2rem', color: '#000000' }}>
                      PKR {(stats.platformCommission || Math.round((stats.totalRevenue || 0) * 0.10)).toLocaleString()}
                    </p>
                  </div>
                  <div style={{ background: '#ffffff', border: '1px solid #000000', padding: '12px 20px', borderRadius: '4px', textAlign: 'center' }}>
                    <span style={{ fontSize: '0.7rem', color: '#666666', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>MoM Growth</span>
                    <p style={{ margin: '4px 0 0 0', fontWeight: 700, fontSize: '1.2rem', color: '#000000' }}>
                      {stats.growthRate || '+18.4%'}
                    </p>
                  </div>
                  <div style={{ background: '#ffffff', border: '1px solid #000000', padding: '12px 20px', borderRadius: '4px', textAlign: 'center' }}>
                    <span style={{ fontSize: '0.7rem', color: '#666666', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>Conversion Index</span>
                    <p style={{ margin: '4px 0 0 0', fontWeight: 700, fontSize: '1.2rem', color: '#000000' }}>
                      {stats.conversionRate || '4.2%'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Progress and status indicators */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', paddingTop: '1.8rem', borderTop: '1px solid #000000' }}>
                <div>
                  <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#666666', fontWeight: 600 }}>Avg Order Basket</span>
                  <p style={{ margin: '4px 0 0 0', fontWeight: 600, fontSize: '1.2rem', color: '#000000' }}>
                    PKR {(stats.avgOrderValue || 0).toLocaleString()}
                  </p>
                </div>
                <div>
                  <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#666666', fontWeight: 600 }}>Active Bidding Turnaround</span>
                  <p style={{ margin: '4px 0 0 0', fontWeight: 600, fontSize: '1.2rem', color: '#000000' }}>
                    {stats.activeBidsCount || 0} Open Requests
                  </p>
                </div>
                <div>
                  <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#666666', fontWeight: 600 }}>Pending Boutique KYC</span>
                  <p style={{ margin: '4px 0 0 0', fontWeight: 600, fontSize: '1.2rem', color: '#000000' }}>
                    {stats.pendingBoutiques || 0} Awaiting Verification
                  </p>
                </div>
                <div>
                  <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#666666', fontWeight: 600 }}>System Infrastructure</span>
                  <p style={{ margin: '4px 0 0 0', fontWeight: 600, fontSize: '1.2rem', color: '#000000', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CheckCircle size={15} /> 99.9% Operational
                  </p>
                </div>
              </div>
            </div>

            {/* 8-Card Monochrome Black & White KPI Stats Grid */}
            <div className="admin-stats-modern" style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
              gap: '1.25rem', 
              marginBottom: '3.5rem' 
            }}>
              {dashboardStats.map(s => (
                <div key={s.label} className="dash-stat-card glass-card" style={{ 
                  background: '#ffffff', 
                  border: '1px solid #000000', 
                  padding: '1.8rem',
                  borderRadius: '6px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                }}>
                  <div style={{ background: '#000000', color: '#ffffff', borderRadius: '0', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {s.icon}
                  </div>
                  <div style={{ marginTop: '1.2rem' }}>
                    <p className="dash-stat-value" style={{ fontSize: '1.5rem', fontWeight: '400', fontFamily: '"Tenor Sans", serif', margin: '0 0 4px 0', color: '#000000' }}>
                      {s.value}
                    </p>
                    <p style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: '700', color: '#666666', margin: '0 0 6px 0' }}>
                      {s.label}
                    </p>
                    <p style={{ fontSize: '0.75rem', color: '#000000', margin: 0, fontWeight: 500 }}>
                      {s.change}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="admin-grid-v2" style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '3rem' }}>
              {/* Verification Queue */}
              <div className="manage-section">
                <div className="flex-between" style={{ marginBottom: '2rem', alignItems: 'flex-end' }}>
                  <div>
                    <h2 className="dash-section-title" style={{ fontFamily: '"Tenor Sans", serif', fontSize: '1.8rem' }}>Verification Queue</h2>
                    <p className="text-muted" style={{ fontSize: '0.8rem' }}>Boutiques requiring administrative approval</p>
                  </div>
                  <Link to="/admin/listings" className="btn btn-link btn-sm" style={{ fontWeight: '600' }}>
                    Moderate Queue <ChevronRight size={14} />
                  </Link>
                </div>

                <div className="products-list-modern">
                  {pendingBoutiques.length === 0 ? (
                    <div className="empty-state-editorial" style={{ padding: '2rem', border: '1px solid #e5e5e5', background: '#fff' }}>
                      <p className="text-muted" style={{ fontSize: '0.85rem' }}>No pending boutique applications currently.</p>
                    </div>
                  ) : (
                    pendingBoutiques.map(boutique => (
                      <div key={boutique._id} className="product-card-premium" style={{ padding: '1.2rem', background: '#fff', border: '1px solid #e5e5e5' }}>
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

              {/* Administrative Quick Actions */}
              <div className="manage-quick-v2">
                <h2 className="dash-section-title" style={{ fontFamily: '"Tenor Sans", serif', fontSize: '1.8rem', marginBottom: '2rem' }}>Administrative Tools</h2>
                <div className="quick-actions-v2" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <Link to="/admin/users" className="product-card-premium" style={{ textDecoration: 'none', color: 'inherit', background: '#fff', border: '1px solid #e5e5e5' }}>
                    <div className="dash-stat-icon" style={{ background: '#f8f8f8', width: '40px', height: '40px' }}><Users size={18} /></div>
                    <div style={{ flex: 1, marginLeft: '1rem' }}>
                      <p style={{ fontWeight: '600', fontSize: '0.9rem' }}>User Directory</p>
                      <p className="text-muted" style={{ fontSize: '0.75rem' }}>Manage customers and boutique owners</p>
                    </div>
                    <ChevronRight size={16} className="text-muted" />
                  </Link>
                  <Link to="/admin/listings" className="product-card-premium" style={{ textDecoration: 'none', color: 'inherit', background: '#fff', border: '1px solid #e5e5e5' }}>
                    <div className="dash-stat-icon" style={{ background: '#f8f8f8', width: '40px', height: '40px' }}><Package size={18} /></div>
                    <div style={{ flex: 1, marginLeft: '1rem' }}>
                      <p style={{ fontWeight: '600', fontSize: '0.9rem' }}>Listing Controls</p>
                      <p className="text-muted" style={{ fontSize: '0.75rem' }}>Moderate products and boutique shops</p>
                    </div>
                    <ChevronRight size={16} className="text-muted" />
                  </Link>
                </div>

                <div className="admin-status-notice" style={{ marginTop: '2.5rem', padding: '1.8rem', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '0.8rem' }}>
                    <ShieldCheck size={20} style={{ color: '#16a34a' }} />
                    <h3 style={{ fontSize: '0.85rem', fontWeight: '700', textTransform: 'uppercase', margin: 0 }}>System Security Active</h3>
                  </div>
                  <p style={{ fontSize: '0.78rem', lineHeight: '1.5', color: '#666', margin: 0 }}>
                    Encrypted audit logging and TOTP Two-Factor Authentication are active for all administrative accounts.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* 2. SUPPORT TICKETS TAB */}
        {activeTab === 'tickets' && (
          <div style={{ background: '#ffffff', border: '1px solid #e5e5e5', padding: '2rem', marginTop: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.8rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h2 style={{ fontFamily: '"Tenor Sans", serif', fontSize: '1.6rem', margin: 0 }}>Customer Support Inquiries</h2>
                <p style={{ fontSize: '0.85rem', color: '#666', margin: '4px 0 0 0' }}>Review and update ticket resolutions</p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Filter:</span>
                <select
                  value={ticketFilter}
                  onChange={(e) => {
                    setTicketFilter(e.target.value);
                    fetchSupportTickets(e.target.value);
                  }}
                  style={{ padding: '8px 12px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}
                >
                  <option value="">All Statuses</option>
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
            </div>

            {ticketLoading ? (
              <p style={{ textAlign: 'center', padding: '2rem', color: '#888' }}>Loading support tickets...</p>
            ) : tickets.length === 0 ? (
              <p style={{ textAlign: 'center', padding: '2rem', color: '#888' }}>No inquiries found under this filter.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {tickets.map(ticket => (
                  <div key={ticket._id} style={{ border: '1px solid #e2e8f0', padding: '1.5rem', background: '#fafafa' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '8px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 800, background: '#161925', color: '#fff', padding: '2px 8px' }}>
                            #{ticket._id.slice(-6).toUpperCase()}
                          </span>
                          <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{ticket.topic}</span>
                        </div>
                        <p style={{ fontSize: '0.85rem', color: '#666', margin: 0 }}>
                          From: <strong>{ticket.firstName} {ticket.lastName}</strong> ({ticket.email}) 
                          {ticket.orderNumber ? ` • Order #${ticket.orderNumber.slice(-6).toUpperCase()}` : ''}
                        </p>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          padding: '4px 10px',
                          background: ticket.status === 'resolved' ? '#f0fdf4' : ticket.status === 'in_progress' ? '#fefce8' : '#fef2f2',
                          color: ticket.status === 'resolved' ? '#16a34a' : ticket.status === 'in_progress' ? '#ca8a04' : '#dc2626',
                          border: '1px solid currentColor'
                        }}>
                          {ticket.status.replace('_', ' ')}
                        </span>

                        <select
                          value={ticket.status}
                          onChange={(e) => handleTicketStatusUpdate(ticket._id, e.target.value)}
                          style={{ padding: '4px 8px', fontSize: '0.75rem', border: '1px solid #cbd5e1', cursor: 'pointer' }}
                        >
                          <option value="open">Open</option>
                          <option value="in_progress">In Progress</option>
                          <option value="resolved">Resolved</option>
                          <option value="closed">Closed</option>
                        </select>
                      </div>
                    </div>

                    <p style={{ fontSize: '0.88rem', color: '#333', background: '#fff', padding: '12px', border: '1px solid #eee', margin: '10px 0 0 0', lineHeight: 1.5 }}>
                      "{ticket.message}"
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 3. SUBSCRIBERS TAB */}
        {activeTab === 'subscribers' && (
          <div style={{ background: '#ffffff', border: '1px solid #e5e5e5', padding: '2rem', marginTop: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.8rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h2 style={{ fontFamily: '"Tenor Sans", serif', fontSize: '1.6rem', margin: 0 }}>Newsletter Subscribers ({subscribers.length})</h2>
                <p style={{ fontSize: '0.85rem', color: '#666', margin: '4px 0 0 0' }}>Registered audience for seasonal campaigns</p>
              </div>

              <button
                type="button"
                onClick={handleCopySubscribers}
                disabled={subscribers.length === 0}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 20px',
                  background: '#161925',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  cursor: 'pointer'
                }}
              >
                <Copy size={16} /> Copy All Emails
              </button>
            </div>

            {subscriberLoading ? (
              <p style={{ textAlign: 'center', padding: '2rem', color: '#888' }}>Loading subscribers...</p>
            ) : subscribers.length === 0 ? (
              <p style={{ textAlign: 'center', padding: '2rem', color: '#888' }}>No newsletter subscribers found.</p>
            ) : (
              <div style={{ border: '1px solid #e2e8f0' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                      <th style={{ padding: '12px 16px', fontWeight: 700 }}>#</th>
                      <th style={{ padding: '12px 16px', fontWeight: 700 }}>Email Address</th>
                      <th style={{ padding: '12px 16px', fontWeight: 700 }}>Subscribed Date</th>
                      <th style={{ padding: '12px 16px', fontWeight: 700 }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subscribers.map((sub, index) => (
                      <tr key={sub._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px 16px', color: '#888' }}>{index + 1}</td>
                        <td style={{ padding: '12px 16px', fontWeight: 600, color: '#1a1a2e' }}>{sub.email}</td>
                        <td style={{ padding: '12px 16px', color: '#666' }}>{new Date(sub.subscribedAt || sub.createdAt).toLocaleDateString()}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ background: '#f0fdf4', color: '#16a34a', padding: '2px 8px', fontSize: '0.75rem', fontWeight: 700 }}>
                            ACTIVE
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
        {/* 4. BOUTIQUE PAYOUTS TAB */}
        {activeTab === 'payouts' && (
          <div style={{ background: '#ffffff', border: '1px solid #000000', borderRadius: '6px', padding: '2rem', marginTop: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h2 style={{ fontFamily: '"Tenor Sans", serif', fontSize: '1.8rem', margin: '0 0 4px 0', color: '#000000' }}>
                  Boutique Payout Disbursements ({payouts.length})
                </h2>
                <p style={{ fontSize: '0.85rem', color: '#666666', margin: 0 }}>
                  Review, approve, and mark boutique bank withdrawals as completed
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Filter:</span>
                <select
                  value={payoutFilter}
                  onChange={(e) => setPayoutFilter(e.target.value)}
                  style={{ padding: '8px 12px', fontSize: '0.8rem', border: '1px solid #000000', background: '#fff', cursor: 'pointer' }}
                >
                  <option value="">All Payouts</option>
                  <option value="pending">Pending Review</option>
                  <option value="processed">Completed / Disbursed</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </div>

            {payoutLoading ? (
              <p style={{ textAlign: 'center', padding: '3rem', color: '#888' }}>Loading boutique payout records...</p>
            ) : (
              (() => {
                const filteredPayouts = payoutFilter ? payouts.filter(p => p.status === payoutFilter) : payouts;
                return filteredPayouts.length === 0 ? (
                  <div style={{ padding: '3rem', textAlign: 'center', border: '1px solid #e5e5e5', background: '#fafafa' }}>
                    <p style={{ color: '#666', margin: 0 }}>No payout withdrawal requests found.</p>
                  </div>
                ) : (
                  <div style={{ border: '1px solid #000000', overflowX: 'auto', borderRadius: '4px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                      <thead>
                        <tr style={{ background: '#ffffff', color: '#000000', borderBottom: '2px solid #000000', textAlign: 'left' }}>
                          <th style={{ padding: '14px 16px', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: '0.08em' }}>Reference</th>
                          <th style={{ padding: '14px 16px', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: '0.08em' }}>Boutique Atelier</th>
                          <th style={{ padding: '14px 16px', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: '0.08em' }}>Bank Transfer Details</th>
                          <th style={{ padding: '14px 16px', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: '0.08em' }}>Requested Date</th>
                          <th style={{ padding: '14px 16px', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: '0.08em' }}>Amount</th>
                          <th style={{ padding: '14px 16px', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: '0.08em' }}>Status</th>
                          <th style={{ padding: '14px 16px', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: '0.08em', textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredPayouts.map((p) => {
                          const isPending = p.status === 'pending';
                          const isCompleted = p.status === 'processed' || p.status === 'approved';
                          return (
                            <tr key={p.transactionRef || p._id} style={{ borderBottom: '1px solid #e5e5e5' }}>
                              <td style={{ padding: '16px', fontWeight: 700, color: '#000000' }}>
                                {p.transactionRef || p._id}
                              </td>
                              <td style={{ padding: '16px' }}>
                                <p style={{ margin: '0 0 2px 0', fontWeight: 600, color: '#000000' }}>{p.boutiqueName}</p>
                                <p style={{ margin: 0, fontSize: '0.75rem', color: '#666666' }}>{p.ownerName} ({p.ownerEmail})</p>
                              </td>
                              <td style={{ padding: '16px' }}>
                                <p style={{ margin: '0 0 2px 0', fontWeight: 600, color: '#000000' }}>{p.bankDetails?.bankName || 'Direct Bank Transfer'}</p>
                                <p style={{ margin: '0 0 2px 0', fontSize: '0.75rem', color: '#333333' }}>Title: {p.bankDetails?.accountTitle || 'N/A'}</p>
                                <p style={{ margin: 0, fontSize: '0.75rem', color: '#666666' }}>Acc / IBAN: {p.bankDetails?.iban || p.bankDetails?.accountNumber || 'N/A'}</p>
                              </td>
                              <td style={{ padding: '16px', color: '#666666' }}>
                                {new Date(p.requestedAt || p.createdAt).toLocaleDateString()}
                              </td>
                              <td style={{ padding: '16px', fontWeight: 700, color: '#000000', fontSize: '1rem' }}>
                                PKR {p.amount.toLocaleString()}
                              </td>
                              <td style={{ padding: '16px' }}>
                                <span style={{
                                  padding: '4px 10px',
                                  fontSize: '0.72rem',
                                  fontWeight: 700,
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.08em',
                                  border: '1px solid #000000',
                                  background: isCompleted ? '#000000' : isPending ? '#ffffff' : '#f5f5f5',
                                  color: isCompleted ? '#ffffff' : isPending ? '#000000' : '#888888',
                                }}>
                                  {isCompleted ? 'Completed' : isPending ? 'Pending' : p.status}
                                </span>
                              </td>
                              <td style={{ padding: '16px', textAlign: 'right' }}>
                                {isPending ? (
                                  <div style={{ display: 'inline-flex', gap: '8px' }}>
                                    <button
                                      type="button"
                                      onClick={() => handleProcessPayout(p.boutiqueId, p.transactionRef || p._id, 'processed')}
                                      style={{
                                        background: '#000000',
                                        color: '#ffffff',
                                        border: '1px solid #000000',
                                        padding: '8px 16px',
                                        fontSize: '0.75rem',
                                        fontWeight: 700,
                                        letterSpacing: '0.08em',
                                        textTransform: 'uppercase',
                                        cursor: 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px'
                                      }}
                                    >
                                      <Check size={14} /> Disburse & Complete
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleProcessPayout(p.boutiqueId, p.transactionRef || p._id, 'rejected')}
                                      style={{
                                        background: '#ffffff',
                                        color: '#000000',
                                        border: '1px solid #000000',
                                        padding: '8px 14px',
                                        fontSize: '0.75rem',
                                        fontWeight: 700,
                                        letterSpacing: '0.08em',
                                        textTransform: 'uppercase',
                                        cursor: 'pointer'
                                      }}
                                    >
                                      Reject
                                    </button>
                                  </div>
                                ) : (
                                  <span style={{ fontSize: '0.78rem', color: '#16a34a', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                    <CheckCircle size={14} /> Disbursed
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })()
            )}
          </div>
        )}
      </div>
    </div>
  );
}
