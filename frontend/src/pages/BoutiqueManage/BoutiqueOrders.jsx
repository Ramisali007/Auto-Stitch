import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Package, Clock, CheckCircle, Truck, XCircle, ChevronRight, Eye, RotateCcw as Loader, Scissors, AlertCircle, MessageSquare } from 'lucide-react';
import axios from 'axios';
import API_URL from '../../config/api';
import './BoutiqueManage.css';
import { EDITORIAL_PRODUCTS } from '../../data/mockData';
import toast from 'react-hot-toast';

const getFallbackImage = (id) => {
  if (!id) return '';
  const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const index = hash % EDITORIAL_PRODUCTS.length;
  return EDITORIAL_PRODUCTS[index].images[0];
};

const STATUS_CONFIG = {
  placed: { label: 'New Order', color: '#3B82F6', icon: <Clock size={16} /> },
  accepted: { label: 'Accepted', color: '#10B981', icon: <CheckCircle size={16} /> },
  in_production: { label: 'In Tailoring', color: '#F59E0B', icon: <Loader size={16} /> },
  ready_to_ship: { label: 'Quality Passed', color: '#8B5CF6', icon: <Package size={16} /> },
  shipped: { label: 'Dispatched', color: '#6366F1', icon: <Truck size={16} /> },
  delivered: { label: 'Delivered', color: '#10B981', icon: <CheckCircle size={16} /> },
  refund_requested: { label: 'Alteration Requested', color: '#d97706', icon: <Scissors size={16} /> },
  refunded: { label: 'Alteration Approved', color: '#10B981', icon: <CheckCircle size={16} /> },
  cancelled: { label: 'Cancelled', color: '#EF4444', icon: <XCircle size={16} /> },
};

export default function BoutiqueOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    document.title = 'Order Registry — Boutique';
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/orders/boutique?t=${Date.now()}`, { withCredentials: true });
      if (res.data.success) {
        setOrders(res.data.orders);
      }
    } catch (err) {
      console.error('Fetch failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id, newStatus) => {
    try {
      await axios.patch(`${API_URL}/api/orders/${id}/status`, { status: newStatus }, { withCredentials: true });
      setOrders(prev => prev.map(o => o._id === id ? { ...o, status: newStatus } : o));
      toast.success(`Order marked as ${STATUS_CONFIG[newStatus]?.label || newStatus}`);
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const handleReviewReturn = async (orderId, status) => {
    try {
      const res = await axios.patch(
        `${API_URL}/api/orders/${orderId}/review-return`,
        { status, note: `Alteration request ${status} by boutique` },
        { withCredentials: true }
      );
      if (res.data.success) {
        toast.success(`Alteration request has been ${status}`);
        fetchOrders();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed');
    }
  };

  const handleDeleteOrder = async (id) => {
    if (!window.confirm('Are you sure you want to delete this cancelled order?')) return;
    try {
      await axios.delete(`${API_URL}/api/orders/${id}`, { withCredentials: true });
      setOrders(prev => prev.filter(o => o._id !== id));
      toast.success('Order deleted');
    } catch (err) {
      toast.error('Failed to delete order: ' + (err.response?.data?.message || err.message));
    }
  };

  const filtered = filter === 'all' ? orders : orders.filter(o => o.status === filter);

  const nextStatusMap = { 
    placed: 'accepted', 
    accepted: 'in_production', 
    in_production: 'ready_to_ship', 
    ready_to_ship: 'shipped', 
    shipped: 'delivered' 
  };

  if (loading) {
    return (
      <div className="manage-page flex-center" style={{ minHeight: '60vh' }}>
        <Loader className="animate-spin" size={40} style={{ color: 'var(--color-primary)' }} />
      </div>
    );
  }

  return (
    <div className="manage-page page-enter">
      <div className="manage-container">
        <div className="manage-header-center">
          <h1 className="manage-title-serif">Customer <span className="text-gradient">Orders</span></h1>
          <p className="manage-subtitle">
            Manage customer orders, track custom stitching requirements, handle alteration requests,
            and ensure timely delivery for every customer.
          </p>
        </div>

        <div className="manage-toolbar-modern">
          <div className="orders-filters" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {['all', 'placed', 'accepted', 'in_production', 'shipped', 'delivered', 'refund_requested'].map(f => (
              <button 
                key={f} 
                className={`product-count-badge ${filter === f ? 'active' : ''}`} 
                onClick={() => setFilter(f)}
                style={{ 
                  cursor: 'pointer', 
                  border: filter === f ? '1px solid #1a1a2e' : '1px solid #eee',
                  background: filter === f ? '#1a1a2e' : 'transparent',
                  color: filter === f ? '#fff' : '#666',
                  padding: '6px 14px',
                  borderRadius: '20px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}
              >
                {f === 'all' ? 'All Orders' : STATUS_CONFIG[f]?.label || f}
              </button>
            ))}
          </div>
          <span className="product-count-badge">{filtered.length} entries found</span>
        </div>

        <div className="products-list-modern">
          {filtered.length === 0 ? (
            <div className="empty-state-editorial">
              <div className="empty-icon-wrap">
                <Package size={40} strokeWidth={1} />
              </div>
              <h3 className="empty-title">No Orders Found</h3>
              <p className="text-muted">Your order history for this status is currently empty.</p>
            </div>
          ) : (
            filtered.map(o => {
              const sc = STATUS_CONFIG[o.status] || { label: o.status, color: '#666' };
              const next = nextStatusMap[o.status];
              const isAlterationRequested = o.status === 'refund_requested';

              return (
                <div key={o._id} className="product-card-premium" style={{ borderLeft: isAlterationRequested ? '4px solid #d97706' : '1px solid #f0f0f0' }}>
                  <div className="pc-image-wrap">
                    <img 
                      src={o.items?.[0]?.image || o.items?.[0]?.product?.images?.[0] || getFallbackImage(o.customizationRequest || o._id)} 
                      alt="" 
                      className="pc-image" 
                      onError={(e) => { e.target.src = getFallbackImage(o.customizationRequest || o._id); }}
                    />
                  </div>
                  
                  <div className="pc-info-main">
                    <h3 className="pc-name">#AS-{o._id.slice(-6).toUpperCase()}</h3>
                    <p className="pc-category">{o.customer?.name || 'Customer'} · {new Date(o.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                    {o.returnRequest?.reason && (
                      <p style={{ fontSize: '0.8rem', color: '#d97706', margin: '4px 0 0 0', fontWeight: 600 }}>
                        ⚠ Request: {o.returnRequest.reason}
                      </p>
                    )}
                  </div>

                  <div className="pc-stats-row">
                    <div className="pc-stat-item">
                      <p className="pc-stat-value">PKR {o.total.toLocaleString()}</p>
                      <p className="pc-stat-label">Amount</p>
                    </div>
                    <div className="pc-stat-item">
                      <p className="pc-stat-value">{o.items?.length || 1}</p>
                      <p className="pc-stat-label">Items</p>
                    </div>
                  </div>

                  <div className="pc-status-tag" style={{ 
                    background: `${sc.color}10`, 
                    color: sc.color, 
                    border: `1px solid ${sc.color}30`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    {sc.icon} {sc.label}
                  </div>

                  {/* Alteration Action Buttons */}
                  {isAlterationRequested && (
                    <div style={{ display: 'flex', gap: '6px', marginLeft: '1rem' }}>
                      <button
                        onClick={() => handleReviewReturn(o._id, 'approved')}
                        style={{ padding: '6px 12px', background: '#16a34a', color: '#fff', border: 'none', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}
                      >
                        Accept Alteration
                      </button>
                      <button
                        onClick={() => handleReviewReturn(o._id, 'rejected')}
                        style={{ padding: '6px 12px', background: '#dc2626', color: '#fff', border: 'none', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}
                      >
                        Decline
                      </button>
                    </div>
                  )}

                  <div className="pc-actions" style={{ marginLeft: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {next && (
                      <button 
                        className="btn-black-premium" 
                        style={{ padding: '10px 18px', fontSize: '0.7rem' }}
                        onClick={() => updateStatus(o._id, next)}
                      >
                        Mark as {STATUS_CONFIG[next]?.label}
                      </button>
                    )}
                    
                    <Link 
                      to={`/chat?customerId=${o.customer?._id || o.customer}&customerName=${encodeURIComponent(o.customer?.name || 'Customer')}`}
                      className="pc-action-btn"
                      title="Chat with Customer"
                    >
                      <MessageSquare size={16} />
                    </Link>

                    <Link to={`/orders/${o._id}`} className="pc-action-btn" title="View Order Details">
                      <Eye size={16} />
                    </Link>

                    {o.status === 'cancelled' && (
                      <button 
                        className="pc-action-btn" 
                        onClick={() => handleDeleteOrder(o._id)}
                        style={{ color: '#EF4444' }}
                        title="Remove from Registry"
                      >
                        <XCircle size={16} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}


