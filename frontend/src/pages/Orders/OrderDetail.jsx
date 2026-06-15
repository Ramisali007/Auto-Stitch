import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Package, Clock, CheckCircle, Truck, ArrowLeft, MapPin, Phone, Mail, XCircle, RotateCcw, MessageSquare, Loader2, Sparkles } from 'lucide-react';
import API_URL from '../../config/api';
import './Orders.css';
import { EDITORIAL_PRODUCTS } from '../../data/mockData';

const getFallbackImage = (id) => {
  if (!id) return '';
  const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const index = hash % EDITORIAL_PRODUCTS.length;
  return EDITORIAL_PRODUCTS[index].images[0];
};

const STATUS_STEPS = [
  { key: 'placed', label: 'Registered', icon: <Package size={18} /> },
  { key: 'accepted', label: 'Confirmed', icon: <CheckCircle size={18} /> },
  { key: 'in_production', label: 'In Production', icon: <Clock size={18} /> },
  { key: 'shipped', label: 'Dispatched', icon: <Truck size={18} /> },
  { key: 'delivered', label: 'Delivered', icon: <CheckCircle size={18} /> },
];

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrder();
    window.scrollTo(0, 0);
  }, [id]);

  const fetchOrder = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/orders/${id}`, { withCredentials: true });
      if (res.data.success) {
        setOrder(res.data.order);
        document.title = `Order #AS-${res.data.order._id.slice(-6).toUpperCase()} — Auto Stitch`;
      }
    } catch (error) {
      console.error('Failed to fetch order:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="order-detail-page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <Loader2 className="animate-spin" size={48} color="#111" />
      </div>
    );
  }

  if (!order) return <div className="order-detail-page"><div className="tryon-content-v2"><h2>Dossier Not Found</h2></div></div>;

  const handleCancelOrder = async () => {
    if (!window.confirm('Are you sure you want to cancel this order? This action cannot be undone.')) return;
    try {
      const res = await axios.patch(`${API_URL}/api/orders/${id}/cancel`, {}, { withCredentials: true });
      if (res.data.success) {
        alert('Order cancelled successfully.');
        navigate('/orders');
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to cancel order.');
    }
  };

  const getStepIndex = (status) => {
    switch (status) {
      case 'placed': return 0;
      case 'accepted': return 1;
      case 'in_production': return 2;
      case 'ready_to_ship': return 2; // Still in production phase for progress UI
      case 'shipped': return 3;
      case 'delivered': return 4;
      default: return -1;
    }
  };
  const currentStepIndex = getStepIndex(order.status);
  const orderRef = `#AS-${order._id.slice(-6).toUpperCase()}`;
  const isCancellable = ['placed', 'accepted'].includes(order.status);

  return (
    <div className="order-detail-page page-enter">
      <div className="tryon-content-v2">
        <Link 
          to={JSON.parse(localStorage.getItem('user'))?.role === 'boutique_owner' ? '/boutique/orders' : '/orders'} 
          className="order-action-btn-v2" 
          style={{ display: 'inline-flex', marginBottom: '4rem', padding: '8px 20px' }}
        >
          <ArrowLeft size={14} /> 
          {JSON.parse(localStorage.getItem('user'))?.role === 'boutique_owner' ? 'Back to Registry' : 'Back to Orders'}
        </Link>

        <div className="od-header">
          <div className="result-success-badge" style={{ marginBottom: '1.5rem', display: 'inline-flex' }}>
            <Sparkles size={14} /> Order Verified
          </div>
          <h1 className="orders-title-serif">Order <span className="text-gradient">Details</span></h1>
          <p className="orders-subtitle">Order Reference {orderRef} · Placed {new Date(order.createdAt).toLocaleDateString()}</p>
        </div>

        {/* Status Tracker */}
        <div className="od-tracker-premium animate-fade-in">
          <div className="tracker-steps-editorial">
            {STATUS_STEPS.map((step, i) => {
              const isDone = i <= currentStepIndex;
              const isActive = i === currentStepIndex;
              return (
                <div key={step.key} className={`tracker-step-v3 ${isDone ? 'done' : ''} ${isActive ? 'active' : ''}`}>
                  <div className="tracker-icon-v3">{step.icon}</div>
                  <span className="tracker-label-v3">{step.label}</span>
                  {i < STATUS_STEPS.length - 1 && <div className={`tracker-line-v3 ${isDone ? 'done' : ''}`} />}
                </div>
              );
            })}
          </div>
          {order.tracking?.number && (
            <div className="tracking-info" style={{ textAlign: 'center', color: '#666', fontSize: '0.85rem' }}>
              <Truck size={16} style={{ verticalAlign: 'middle', marginRight: '8px' }} />
              Logistics Trace: <strong>{order.tracking.number}</strong> via {order.tracking.carrier}
            </div>
          )}
        </div>

        <div className="od-grid-editorial animate-fade-in">
          {/* Items */}
          <div className="od-main">
            <div className="od-card-glass">
              <h3 className="od-card-title"><Package size={18} /> Curated Selections</h3>
              <div className="od-items-editorial">
                {order.items.map((item, i) => (
                  <div key={i} className="od-item-v3">
                    <img 
                      src={item.product?.images?.[0] || item.image || getFallbackImage(order.customizationRequest || order._id)} 
                      alt={item.name} 
                      onError={(e) => { e.target.src = getFallbackImage(order.customizationRequest || order._id); }}
                    />
                    <div className="od-item-info-v2">
                      <p className="order-item-name-v2" style={{ fontSize: '1.1rem' }}>{item.name}</p>
                      <p className="order-item-meta-v2">Qty: {item.quantity} {item.size && `· Size: ${item.size}`} {item.color && `· Color: ${item.color}`}</p>
                    </div>
                    <p className="order-item-price-v2">PKR {item.price.toLocaleString()}</p>
                  </div>
                ))}
              </div>
              <div className="od-summary-v3">
                <div className="summary-row-v3"><span>Subtotal</span><span>PKR {order.itemsTotal.toLocaleString()}</span></div>
                <div className="summary-row-v3"><span>Shipping Fees</span><span>{order.shippingCost === 0 ? 'FREE' : `PKR ${order.shippingCost}`}</span></div>
                <div className="summary-row-v3 total"><span>Total Amount</span><span>PKR {order.total.toLocaleString()}</span></div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="od-sidebar">
            <div className="od-card-glass">
              <h3 className="od-card-title" style={{ fontSize: '1rem' }}>Order Information</h3>
              
              <div className="od-info-block">
                <span className="od-info-label">Shipping To</span>
                <p className="od-info-value">{order.shippingAddress.street}<br/>{order.shippingAddress.city}, {order.shippingAddress.province}</p>
              </div>

              <div className="od-info-block">
                <span className="od-info-label">Payment Method</span>
                <p className="od-info-value">{order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online Payment'}</p>
              </div>

              <div className="od-info-block">
                <span className="od-info-label">Designer</span>
                <p className="od-info-value">{order.items[0]?.boutique?.name || 'Exclusive Studio'}</p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <Link 
                to={
                  JSON.parse(localStorage.getItem('user'))?.role === 'boutique_owner' 
                    ? `/chat?customerId=${order.customer?._id || order.customer}&customerName=${encodeURIComponent(order.customer?.name || 'Customer')}`
                    : `/chat?boutiqueId=${order.boutique?._id || order.boutique}&boutiqueName=${encodeURIComponent(order.boutique?.name || 'Boutique')}&ownerId=${order.boutique?.owner?._id || order.boutique?.owner || ''}`
                }
                className="wl-cart-btn-v2" 
                style={{ background: '#000', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', textDecoration: 'none' }}
              >
                <MessageSquare size={16} /> 
                {JSON.parse(localStorage.getItem('user'))?.role === 'boutique_owner' ? 'Chat with Customer' : 'Chat with Boutique'}
              </Link>
              
              <Link to="/contact" className="wl-cart-btn-v2" style={{ background: 'transparent', color: '#111', border: '1px solid #111', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', textDecoration: 'none' }}>
                <MessageSquare size={16} /> Contact Support
              </Link>
              {isCancellable && (
                <button onClick={handleCancelOrder} className="wl-cart-btn-v2" style={{ background: 'transparent', color: '#dc2626', border: '1px solid #dc262620', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                  <XCircle size={16} /> Cancel Order
                </button>
              )}
              {order.status === 'delivered' && (
                <button className="wl-cart-btn-v2" style={{ background: '#f8f8f8', color: '#666', border: 'none' }}>
                  <RotateCcw size={16} /> Archive Return
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
