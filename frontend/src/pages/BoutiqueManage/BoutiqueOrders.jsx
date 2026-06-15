import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Package, Clock, CheckCircle, Truck, XCircle, ChevronRight, Eye, RotateCcw as Loader } from 'lucide-react';
import axios from 'axios';
import API_URL from '../../config/api';
import './BoutiqueManage.css';
import { EDITORIAL_PRODUCTS } from '../../data/mockData';

const getFallbackImage = (id) => {
  if (!id) return '';
  const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const index = hash % EDITORIAL_PRODUCTS.length;
  return EDITORIAL_PRODUCTS[index].images[0];
};

const STATUS_CONFIG = {
  placed: { label: 'New Order', color: '#3B82F6', icon: <Clock size={16} /> },
  accepted: { label: 'Accepted', color: '#10B981', icon: <CheckCircle size={16} /> },
  in_production: { label: 'In Production', color: '#F59E0B', icon: <Loader size={16} /> },
  ready_to_ship: { label: 'Ready to Ship', color: '#8B5CF6', icon: <Package size={16} /> },
  shipped: { label: 'Shipped', color: '#6366F1', icon: <Truck size={16} /> },
  delivered: { label: 'Delivered', color: '#10B981', icon: <CheckCircle size={16} /> },
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
    } catch (err) {
      alert('Failed to update status');
    }
  };

  const handleDeleteOrder = async (id) => {
    if (!window.confirm('Are you sure you want to remove this cancelled order from your registry?')) return;
    try {
      await axios.delete(`${API_URL}/api/orders/${id}`, { withCredentials: true });
      setOrders(prev => prev.filter(o => o._id !== id));
    } catch (err) {
      alert('Failed to delete order: ' + (err.response?.data?.message || err.message));
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
          <h1 className="manage-title-serif">Order <span className="text-gradient">Registry</span></h1>
          <p className="manage-subtitle">
            Manage your boutique's fulfilment pipeline. Track status, update progress, 
            and ensure timely delivery for every Auto Stitch customer.
          </p>
        </div>

        <div className="manage-toolbar-modern">
          <div className="orders-filters" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {['all', 'placed', 'accepted', 'in_production', 'shipped', 'delivered'].map(f => (
              <button 
                key={f} 
                className={`product-count-badge ${filter === f ? 'active' : ''}`} 
                onClick={() => setFilter(f)}
                style={{ 
                  cursor: 'pointer', 
                  border: filter === f ? '1px solid #000' : '1px solid #eee',
                  background: filter === f ? '#000' : 'transparent',
                  color: filter === f ? '#fff' : '#999',
                  padding: '8px 16px',
                  borderRadius: '0'
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
              return (
                <div key={o._id} className="product-card-premium">
                  <div className="pc-image-wrap">
                    <img 
                      src={o.items?.[0]?.product?.images?.[0] || o.items?.[0]?.image || getFallbackImage(o.customizationRequest || o._id)} 
                      alt="" 
                      className="pc-image" 
                      onError={(e) => { e.target.src = getFallbackImage(o.customizationRequest || o._id); }}
                    />
                  </div>
                  
                  <div className="pc-info-main">
                    <h3 className="pc-name">#{o._id.slice(-8).toUpperCase()}</h3>
                    <p className="pc-category">{o.customer?.name} · {new Date(o.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
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
                    border: `1px solid ${sc.color}20`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    {sc.icon} {sc.label}
                  </div>

                  {o.status === 'cancelled' && (
                    <button 
                      className="pc-action-btn" 
                      onClick={() => handleDeleteOrder(o._id)}
                      style={{ color: '#EF4444', marginLeft: '10px' }}
                      title="Remove from Registry"
                    >
                      <XCircle size={16} />
                    </button>
                  )}

                  <div className="pc-actions" style={{ marginLeft: '2rem' }}>
                    {next && (
                      <button 
                        className="btn-black-premium" 
                        style={{ padding: '10px 20px', fontSize: '0.7rem' }}
                        onClick={() => updateStatus(o._id, next)}
                      >
                        Mark as {STATUS_CONFIG[next]?.label}
                      </button>
                    )}
                    <Link to={`/orders/${o._id}`} className="pc-action-btn" title="View Details">
                      <Eye size={16} />
                    </Link>
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

