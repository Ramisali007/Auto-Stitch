import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import {
  Package, Clock, CheckCircle, Truck, Eye, ArrowUpRight, 
  Search, XCircle, MapPin, Loader2
} from 'lucide-react';
import API_URL from '../../config/api';
import './Orders.css';
import { EDITORIAL_PRODUCTS } from '../../data/mockData';

const getFallbackImage = (id) => {
  if (!id) return '';
  const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const index = hash % EDITORIAL_PRODUCTS.length;
  return EDITORIAL_PRODUCTS[index].images[0];
};

const STATUS_CONFIG = {
  placed: { label: 'Order Placed', color: '#111', icon: <Package size={14} /> },
  accepted: { label: 'Accepted', color: '#059669', icon: <CheckCircle size={14} /> },
  in_production: { label: 'In Production', color: '#D97706', icon: <Clock size={14} /> },
  ready_to_ship: { label: 'Ready to Ship', color: '#7C3AED', icon: <Package size={14} /> },
  shipped: { label: 'En Route', color: '#4F46E5', icon: <Truck size={14} /> },
  delivered: { label: 'Delivered', color: '#059669', icon: <CheckCircle size={14} /> },
  cancelled: { label: 'Cancelled', color: '#DC2626', icon: <XCircle size={14} /> },
};

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const filters = ['all', 'in_production', 'shipped', 'delivered'];

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem('user'));
    if (storedUser?.role === 'boutique_owner') {
      navigate('/boutique/orders');
      return;
    }
    document.title = 'Order Registry — Auto Stitch';
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/orders`, { withCredentials: true });
      if (res.data.success) {
        setOrders(res.data.orders);
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = orders.filter(o => {
    // Filter logic
    const matchesFilter = activeFilter === 'all' 
      ? o.status !== 'cancelled' 
      : activeFilter === 'in_production'
        ? ['placed', 'accepted', 'in_production', 'ready_to_ship'].includes(o.status)
        : o.status === activeFilter;
      
    const orderRef = `#AS-${o._id.slice(-6).toUpperCase()}`;
    const matchesSearch = orderRef.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.items.some(i => i.name.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  if (loading) {
    return (
      <div className="orders-page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <Loader2 className="animate-spin" size={48} color="#111" />
      </div>
    );
  }

  return (
    <div className="orders-page page-enter">
      <div className="tryon-content-v2">
        <div className="orders-header-editorial">
          <div className="result-success-badge" style={{ marginBottom: '1.5rem', display: 'inline-flex' }}>
            <CheckCircle size={14} /> Tracking System Active
          </div>
          <h1 className="orders-title-serif">My Order <span className="text-gradient">History</span></h1>
          <p className="orders-subtitle">Track and manage your recent fashion purchases</p>
        </div>

        <div className="orders-toolbar-v2">
          <div className="orders-filters-v2">
            {filters.map(f => (
              <button
                key={f}
                className={`filter-pill-v2 ${activeFilter === f ? 'active' : ''}`}
                onClick={() => setActiveFilter(f)}
              >
                {f === 'all' ? 'All Orders' : STATUS_CONFIG[f]?.label || f}
              </button>
            ))}
          </div>
        </div>

        <div className="orders-list-v2">
          {filteredOrders.length === 0 ? (
            <div className="orders-empty-editorial animate-fade-in" style={{ padding: '6rem 0' }}>
              <Package size={64} strokeWidth={1} color="#ddd" style={{ marginBottom: '2rem' }} />
              <h2 className="orders-title-serif" style={{ fontSize: '1.8rem' }}>No Orders Found</h2>
              <p className="text-muted">Your order history is currently empty.</p>
            </div>
          ) : (
            filteredOrders.map(order => {
              const sc = STATUS_CONFIG[order.status] || STATUS_CONFIG.placed;
              const orderRef = `#AS-${order._id.slice(-6).toUpperCase()}`;
              return (
                <div key={order._id} className="order-card-premium animate-fade-in">
                  <div className="order-card-header-v2">
                    <div className="order-meta-v2">
                      <h3 className="order-id-v2">{orderRef}</h3>
                      <span className="order-date-v2">{new Date(order.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                      <span className="order-brand-v2">
                        Designer: {order.boutique?.name || 'Auto Stitch Exclusive'}
                      </span>
                    </div>
                    <span className="order-status-chip-v2" style={{ color: sc.color, background: `${sc.color}10`, border: `1px solid ${sc.color}20` }}>
                      {sc.label}
                    </span>
                  </div>

                  <div className="order-items-editorial">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="order-item-v2">
                        <img 
                          src={item.product?.images?.[0] || item.image || getFallbackImage(order.customizationRequest || order._id)} 
                          alt={item.name} 
                          className="order-item-img-v2" 
                          onError={(e) => { e.target.src = getFallbackImage(order.customizationRequest || order._id); }}
                        />
                        <div className="order-item-info-v2">
                          <p className="order-item-name-v2">{item.name}</p>
                          <p className="order-item-meta-v2">Qty: {item.quantity} {item.size && `· Size: ${item.size}`}</p>
                        </div>
                        <p className="order-item-price-v2">PKR {item.price.toLocaleString()}</p>
                      </div>
                    ))}
                  </div>

                  <div className="order-footer-v2">
                    <div className="order-total-v2">
                      Total Amount <strong>PKR {order.total.toLocaleString()}</strong>
                    </div>
                    <Link to={`/orders/${order._id}`} className="order-action-btn-v2">
                      View Details <ArrowUpRight size={14} />
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
