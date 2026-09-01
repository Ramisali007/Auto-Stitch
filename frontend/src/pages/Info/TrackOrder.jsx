import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import API_URL from '../../config/api';
import { 
  Package, Clock, CheckCircle, Truck, ArrowLeft, 
  MapPin, Store, CreditCard, ShieldCheck, Sparkles, AlertCircle 
} from 'lucide-react';
import '../BoutiqueManage/BoutiqueManage.css';
import './TrackOrder.css';

const TRACKING_STEPS = [
  { key: 'placed', label: 'Order Placed', desc: 'Order confirmed & assigned to atelier' },
  { key: 'accepted', label: 'Accepted', desc: 'Fabric inspection & staging' },
  { key: 'in_production', label: 'In Tailoring', desc: 'Bespoke stitching' },
  { key: 'ready_to_ship', label: 'Quality Passed', desc: 'Finishing & packaging' },
  { key: 'shipped', label: 'Dispatched', desc: 'Handed to express courier' },
  { key: 'delivered', label: 'Delivered', desc: 'Arrived at destination' },
];

const getStepIndex = (status) => {
  const map = {
    'placed': 0,
    'accepted': 1,
    'in_production': 2,
    'ready_to_ship': 3,
    'shipped': 4,
    'delivered': 5,
    'refund_requested': 4,
    'refunded': 5,
    'cancelled': -1,
  };
  return map[status] ?? 0;
};

export default function TrackOrder() {
  const [referenceId, setReferenceId] = useState('');
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'Live Order Tracking — Auto Stitch';
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!referenceId.trim()) return;
    setLoading(true);
    setError('');
    setOrder(null);
    
    try {
      const { data } = await axios.post(`${API_URL}/api/orders/track`, { referenceId: referenceId.trim() });
      if (data.success && data.order) {
        setOrder(data.order);
      } else {
        setError(data.message || 'Unable to locate order records.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to locate order. Please verify your 6-character Reference ID.');
    } finally {
      setLoading(false);
    }
  };

  const currentStep = order ? getStepIndex(order.status) : 0;
  const isCancelled = order?.status === 'cancelled';

  return (
    <div className="manage-page page-enter">
      <div className="manage-container" style={{ maxWidth: order ? '950px' : '650px' }}>
        
        {!order ? (
          <>
            <div className="manage-header-center">
              <h1 className="manage-title-serif">Track <span className="text-gradient">Couture</span></h1>
              <p className="manage-subtitle">
                Enter your 6-character Order Reference ID below to follow your garment's artisanal journey in real time.
              </p>
            </div>

            <form className="track-card-editorial" onSubmit={handleSubmit}>
              <div className="track-form-group">
                <label className="track-label">ORDER REFERENCE ID *</label>
                <input 
                  type="text" 
                  className="track-input-editorial" 
                  placeholder="e.g. 5A2B9C or Order ID" 
                  value={referenceId}
                  onChange={(e) => setReferenceId(e.target.value.toUpperCase())}
                  maxLength={24}
                  required 
                />
              </div>

              {error && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#dc2626', fontSize: '0.85rem' }}>
                  <AlertCircle size={16} />
                  <span>{error}</span>
                </div>
              )}

              <p className="track-hint-text">
                💡 Tip: Your Reference ID is displayed on your order confirmation dashboard and email receipt.
              </p>

              <button type="submit" className="track-btn-black" disabled={loading}>
                {loading ? 'LOCATING ATELIER LOGS...' : 'TRACK ORDER IN REAL TIME'}
              </button>
            </form>
          </>
        ) : (
          <div className="track-result-view page-enter">
            <div className="track-result-header">
              <button 
                type="button" 
                className="track-back-btn" 
                onClick={() => { setOrder(null); setError(''); }}
              >
                <ArrowLeft size={16} /> Track Another Order
              </button>

              <div className="track-order-tag">
                <span>ORDER REF</span>
                <strong>#AS-{order.referenceId}</strong>
              </div>
            </div>

            {/* Status Hero Card */}
            <div className="track-hero-card">
              <div className="track-hero-info">
                <div className="track-status-pill">
                  <span className="live-dot"></span>
                  {order.status?.replace(/_/g, ' ').toUpperCase()}
                </div>
                <h2 className="track-hero-heading">
                  {isCancelled 
                    ? 'Order Cancelled' 
                    : order.status === 'delivered' 
                      ? 'Package Delivered' 
                      : 'Garment In Active Production'}
                </h2>
                <p className="track-hero-sub">
                  Crafted by atelier <strong>{order.boutique?.name || 'Auto Stitch Partner Atelier'}</strong> · 
                  Placed on {new Date(order.createdAt).toLocaleDateString('en-PK', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              </div>

              {order.trackingNumber && (
                <div className="courier-badge">
                  <span>COURIER AWB</span>
                  <strong>{order.trackingNumber}</strong>
                </div>
              )}
            </div>

            {/* Stepper */}
            {!isCancelled && (
              <div className="track-stepper-card">
                <div className="track-stepper">
                  {TRACKING_STEPS.map((step, idx) => {
                    const isPassed = idx <= currentStep;
                    const isCurrent = idx === currentStep;

                    return (
                      <div 
                        key={step.key} 
                        className={`track-step-node ${isPassed ? 'completed' : ''} ${isCurrent ? 'active' : ''}`}
                      >
                        <div className="step-circle">
                          {isPassed ? <CheckCircle size={16} /> : <span>0{idx + 1}</span>}
                        </div>
                        <div className="step-text">
                          <h4>{step.label}</h4>
                          <p>{step.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Order Items Breakdown */}
            <div className="track-details-grid">
              <div className="track-box items-box">
                <h3 className="box-title">Order Items ({order.items?.length || 0})</h3>
                <div className="track-items-list">
                  {order.items?.map((item, idx) => (
                    <div key={idx} className="track-item-row">
                      <img 
                        src={item.image || item.product?.images?.[0] || 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=150'} 
                        alt={item.name} 
                        className="track-item-thumb" 
                      />
                      <div className="track-item-info">
                        <h4>{item.name}</h4>
                        <p className="item-meta">
                          {item.size && <span>Size: {item.size} · </span>}
                          {item.color && <span>Color: {item.color} · </span>}
                          Qty: {item.quantity}
                        </p>
                        <p className="item-price">PKR {Number(item.price).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="track-box summary-box">
                <h3 className="box-title">Delivery & Payment</h3>
                
                <div className="summary-info-row">
                  <span className="label"><MapPin size={14} /> Shipping To</span>
                  <span className="val">
                    {order.shippingAddress?.city}, {order.shippingAddress?.province}
                  </span>
                </div>

                <div className="summary-info-row">
                  <span className="label"><CreditCard size={14} /> Payment Method</span>
                  <span className="val">
                    {order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Stripe Card Payment'} 
                    ({order.paymentStatus?.toUpperCase()})
                  </span>
                </div>

                <div className="summary-info-row">
                  <span className="label"><Store size={14} /> Atelier Source</span>
                  <span className="val">{order.boutique?.name || 'Exclusive Atelier'}</span>
                </div>

                <div className="summary-total-bar">
                  <span>Grand Total</span>
                  <strong>PKR {Number(order.total).toLocaleString()}</strong>
                </div>
              </div>
            </div>

            <div className="track-footer-links">
              <Link to="/catalogue" className="track-continue-btn">
                Continue Shopping Collections
              </Link>
              <Link to="/contact" className="track-help-link">
                Need Assistance? Contact Concierge
              </Link>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
