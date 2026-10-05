import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import API_URL from '../../config/api';
import { 
  Package, Clock, CheckCircle, Truck, ArrowLeft, 
  MapPin, Store, CreditCard, ShieldCheck, Sparkles, AlertCircle,
  Copy, Check, Scissors, Layers, ArrowRight, RefreshCw, Phone
} from 'lucide-react';
import '../Orders/Orders.css';
import '../Dashboard/Dashboard.css';
import './TrackOrder.css';

const TRACKING_STEPS = [
  { key: 'placed', label: 'Order Placed', desc: 'Assigned to atelier', icon: Package },
  { key: 'accepted', label: 'Accepted', desc: 'Fabric inspection', icon: Layers },
  { key: 'in_production', label: 'In Tailoring', desc: 'Artisanal stitching', icon: Scissors },
  { key: 'ready_to_ship', label: 'Quality Passed', desc: 'Archival packaging', icon: ShieldCheck },
  { key: 'shipped', label: 'Dispatched', desc: 'Express courier', icon: Truck },
  { key: 'delivered', label: 'Delivered', desc: 'Destination reached', icon: CheckCircle },
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

const getStatusDetails = (status, boutiqueName = 'Atelier Partner') => {
  switch (status) {
    case 'placed':
      return {
        heading: 'Order Confirmed & Staged',
        desc: `Your order has been confirmed and queued for ${boutiqueName}'s design team.`,
        badgeClass: 'status-badge-minimal bidding',
        badgeLabel: 'Order Confirmed'
      };
    case 'accepted':
      return {
        heading: 'Fabric Inspection & Staging',
        desc: `Master tailors at ${boutiqueName} have reviewed fabric and pattern specs.`,
        badgeClass: 'status-badge-minimal done',
        badgeLabel: 'Accepted by Atelier'
      };
    case 'in_production':
      return {
        heading: 'Garment In Active Tailoring',
        desc: `Artisanal cutting, custom embroidery, and precision assembly are in progress.`,
        badgeClass: 'status-badge-minimal pending',
        badgeLabel: 'In Production'
      };
    case 'ready_to_ship':
      return {
        heading: 'Quality Audit Cleared',
        desc: `Your garment has passed final inspection and is sealed in protective packaging.`,
        badgeClass: 'status-badge-minimal done',
        badgeLabel: 'Quality Passed'
      };
    case 'shipped':
      return {
        heading: 'Dispatched with Express Courier',
        desc: `Your order is in transit with our logistics partner.`,
        badgeClass: 'status-badge-minimal bidding',
        badgeLabel: 'Dispatched'
      };
    case 'delivered':
      return {
        heading: 'Couture Safely Delivered',
        desc: `Delivered to your address. Thank you for choosing Auto Stitch!`,
        badgeClass: 'status-badge-minimal done',
        badgeLabel: 'Delivered'
      };
    case 'cancelled':
      return {
        heading: 'Order Cancelled',
        desc: `This order was cancelled. Please contact concierge if you need assistance.`,
        badgeClass: 'status-badge-minimal cancelled',
        badgeLabel: 'Cancelled'
      };
    default:
      return {
        heading: 'Order In Active Fulfillment',
        desc: `Crafted by atelier ${boutiqueName} with hand-finished detailing.`,
        badgeClass: 'status-badge-minimal done',
        badgeLabel: status?.replace(/_/g, ' ').toUpperCase() || 'In Progress'
      };
  }
};

export default function TrackOrder() {
  const [searchParams] = useSearchParams();
  const [referenceId, setReferenceId] = useState(searchParams.get('ref') || '');
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'Live Order Tracking — Auto Stitch';
    
    const initialRef = searchParams.get('ref');
    if (initialRef) {
      fetchOrderByRef(initialRef.trim());
    }
  }, []);

  const fetchOrderByRef = async (ref) => {
    if (!ref) return;
    setLoading(true);
    setError('');
    
    try {
      const { data } = await axios.post(`${API_URL}/api/orders/track`, { referenceId: ref });
      if (data.success && data.order) {
        setOrder(data.order);
      } else {
        setError(data.message || 'Unable to locate order records.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to locate order. Please verify your Reference ID.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!referenceId.trim()) return;
    fetchOrderByRef(referenceId.trim().toUpperCase());
  };

  const handleCopyRef = () => {
    if (order?.referenceId) {
      navigator.clipboard.writeText(order.referenceId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const currentStep = order ? getStepIndex(order.status) : 0;
  const isCancelled = order?.status === 'cancelled';
  const statusInfo = order ? getStatusDetails(order.status, order.boutique?.name) : null;

  return (
    <div className="orders-page track-dashboard-page page-enter">
      <div className="orders-container track-dashboard-container">
        
        {!order ? (
          /* Search State: Clean, Minimalist Dashboard Style */
          <div className="track-search-layout animate-fade-in">
            <div className="orders-header-editorial" style={{ marginBottom: '3rem' }}>
              <div className="result-success-badge" style={{ marginBottom: '1.2rem', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={14} /> Live Atelier Order Tracking
              </div>
              <h1 className="orders-title-serif">Track <span className="text-gradient">Couture</span></h1>
              <p className="orders-subtitle">Enter your order reference code to track live tailoring progression</p>
            </div>

            <div className="od-card-glass track-search-card" style={{ maxWidth: '560px', margin: '0 auto', background: '#fff', border: '1px solid #e5e5e5', borderRadius: '8px', padding: '2.5rem' }}>
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#1a1a2e', marginBottom: '8px' }}>
                    Order Reference ID
                  </label>
                  <input 
                    type="text" 
                    className="track-dash-input" 
                    placeholder="e.g. 8E2178 or 5A2B9C" 
                    value={referenceId}
                    onChange={(e) => setReferenceId(e.target.value.toUpperCase())}
                    maxLength={24}
                    required 
                  />
                  <span style={{ display: 'block', fontSize: '0.78rem', color: '#888', marginTop: '6px' }}>
                    Reference ID is listed on your confirmation email and dashboard.
                  </span>
                </div>

                {error && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '10px 14px', borderRadius: '4px', fontSize: '0.85rem' }}>
                    <AlertCircle size={16} />
                    <span>{error}</span>
                  </div>
                )}

                <button 
                  type="submit" 
                  className="order-action-btn-v2" 
                  disabled={loading}
                  style={{
                    background: '#1a1a2e', color: '#fff', border: 'none',
                    padding: '14px 24px', justifyContent: 'center', fontSize: '0.8rem',
                    letterSpacing: '0.12em', cursor: loading ? 'not-allowed' : 'pointer'
                  }}
                >
                  {loading ? (
                    <>
                      <RefreshCw size={14} className="spin-icon" /> LOCATING ATELIER LOGS...
                    </>
                  ) : (
                    <>
                      TRACK ORDER IN REAL TIME <ArrowRight size={14} />
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        ) : (
          /* Result View: 100% Matches Customer Dashboard & Order Detail */
          <div className="track-order-result animate-fade-in">
            
            {/* Top Bar with Back Link & Official Reference */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <button 
                onClick={() => { setOrder(null); setError(''); }}
                className="order-action-btn-v2"
                style={{ padding: '8px 18px', background: 'transparent', color: '#1a1a2e', border: '1px solid #e5e5e5' }}
              >
                <ArrowLeft size={14} /> Track Another Order
              </button>

              <div 
                onClick={handleCopyRef}
                style={{ 
                  display: 'inline-flex', alignItems: 'center', gap: '8px',
                  background: '#f8f9fa', border: '1px solid #e5e5e5', borderRadius: '4px',
                  padding: '8px 16px', fontSize: '0.82rem', cursor: 'pointer', position: 'relative'
                }}
                title="Click to copy Reference ID"
              >
                <span style={{ fontSize: '0.7rem', color: '#888', fontWeight: 600, letterSpacing: '0.08em' }}>ORDER REF</span>
                <strong style={{ color: '#1a1a2e', fontFamily: 'monospace', fontSize: '0.95rem' }}>#AS-{order.referenceId}</strong>
                {copied ? <Check size={14} color="#16a34a" /> : <Copy size={14} color="#888" />}
                {copied && (
                  <span style={{ position: 'absolute', top: '-26px', right: '10px', background: '#1a1a2e', color: '#fff', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '2px' }}>
                    Copied!
                  </span>
                )}
              </div>
            </div>

            {/* Header: Verified Boutique Order */}
            <div className="od-header" style={{ marginBottom: '2.5rem' }}>
              <div className="result-success-badge" style={{ marginBottom: '1.2rem', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={14} /> Verified Atelier Order
              </div>
              <h1 className="orders-title-serif">Order <span className="text-gradient">Progression</span></h1>
              <p className="orders-subtitle">
                Reference #AS-{order.referenceId} · Placed on {new Date(order.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            </div>

            {/* Dashboard-Style Status Card (Clean White, crisp contrast, NO black box) */}
            <div className="od-card-glass" style={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: '4px', padding: '2rem', marginBottom: '2.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '0.8rem' }}>
                    <span className={statusInfo.badgeClass} style={{ padding: '5px 14px', borderRadius: '20px', fontSize: '0.72rem' }}>
                      {statusInfo.badgeLabel}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: '#666' }}>
                      Atelier: <strong style={{ color: '#1a1a2e' }}>{order.boutique?.name || 'Exclusive Partner'}</strong>
                    </span>
                  </div>

                  <h2 style={{ fontFamily: 'Tenor Sans, serif', fontSize: '1.7rem', color: '#1a1a2e', fontWeight: 500, margin: '0 0 6px 0', letterSpacing: '-0.01em' }}>
                    {statusInfo.heading}
                  </h2>

                  <p style={{ fontSize: '0.9rem', color: '#666', margin: 0, maxWidth: '640px', lineHeight: 1.6 }}>
                    {statusInfo.desc}
                  </p>
                </div>

                {order.trackingNumber && (
                  <div style={{ background: '#fafafa', border: '1px solid #e5e5e5', borderRadius: '4px', padding: '14px 20px', minWidth: '220px' }}>
                    <span style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#888', marginBottom: '4px' }}>
                      <Truck size={14} style={{ verticalAlign: 'middle', marginRight: '6px' }} /> Express Courier Waybill
                    </span>
                    <strong style={{ fontSize: '1rem', color: '#1a1a2e', fontFamily: 'monospace' }}>
                      {order.trackingNumber}
                    </strong>
                    {order.trackingUrl && (
                      <a href={order.trackingUrl} target="_blank" rel="noreferrer" style={{ display: 'block', marginTop: '6px', fontSize: '0.78rem', color: '#c5a059', textDecoration: 'underline' }}>
                        Track on Courier Portal →
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Dashboard-Style Stepper Progress Bar */}
            {!isCancelled && (
              <div className="od-tracker-premium" style={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: '4px', padding: '2.5rem 2rem', marginBottom: '3rem' }}>
                <div className="tracker-steps-editorial" style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', margin: 0 }}>
                  
                  {/* Background Track Line */}
                  <div style={{
                    position: 'absolute', top: '18px', left: '8%', right: '8%', height: '2px',
                    background: '#e5e5e5', zIndex: 1
                  }}>
                    <div style={{
                      height: '100%',
                      background: '#1a1a2e',
                      width: `${Math.min(100, Math.max(0, (currentStep / (TRACKING_STEPS.length - 1)) * 100))}%`,
                      transition: 'width 0.5s ease'
                    }}></div>
                  </div>

                  {TRACKING_STEPS.map((step, idx) => {
                    const isDone = idx <= currentStep;
                    const isActive = idx === currentStep;
                    const StepIcon = step.icon;

                    return (
                      <div 
                        key={step.key} 
                        className={`tracker-step-v3 ${isDone ? 'done' : ''} ${isActive ? 'active' : ''}`}
                        style={{ textAlign: 'center', flex: 1, position: 'relative', zIndex: 2 }}
                      >
                        <div 
                          className="tracker-icon-v3"
                          style={{
                            width: '38px', height: '38px', borderRadius: '50%', margin: '0 auto 10px auto',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: isDone ? '#1a1a2e' : '#f8f9fa',
                            color: isDone ? '#fff' : '#999',
                            border: isActive ? '2px solid #c5a059' : isDone ? '2px solid #1a1a2e' : '1px solid #e5e5e5',
                            boxShadow: isActive ? '0 0 0 4px rgba(197, 160, 89, 0.2)' : 'none',
                            transition: 'all 0.3s ease'
                          }}
                        >
                          <StepIcon size={16} />
                        </div>

                        <span 
                          className="tracker-label-v3"
                          style={{
                            display: 'block',
                            fontSize: '0.75rem',
                            fontWeight: isActive ? 700 : isDone ? 600 : 500,
                            textTransform: 'uppercase',
                            letterSpacing: '0.08em',
                            color: isDone ? '#1a1a2e' : '#999',
                            marginBottom: '4px'
                          }}
                        >
                          {step.label}
                        </span>

                        <span style={{ display: 'block', fontSize: '0.7rem', color: isDone ? '#666' : '#bbb', maxWidth: '120px', margin: '0 auto', lineHeight: 1.3 }}>
                          {step.desc}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Order Details & Summary Grid (Matching OrderDetail.jsx) */}
            <div className="od-grid-editorial" style={{ gap: '2.5rem' }}>
              
              {/* Left Column: Ordered Items */}
              <div className="od-main">
                <div className="od-card-glass" style={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: '4px', padding: '2rem' }}>
                  <h3 className="od-card-title" style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.2rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Package size={18} color="#c5a059" /> 
                    Ordered Items & Garments ({order.items?.length || 0})
                  </h3>
                  
                  <div className="od-items-editorial">
                    {order.items?.map((item, i) => (
                      <div key={i} className="od-item-v3" style={{ display: 'flex', gap: '20px', paddingBottom: '1.5rem', marginBottom: '1.5rem', borderBottom: '1px solid #f0f0f0' }}>
                        <img 
                          src={item.image || item.product?.images?.[0] || 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=200'} 
                          alt={item.name} 
                          style={{ width: '80px', height: '105px', objectFit: 'cover', borderRadius: '2px', border: '1px solid #eee' }}
                        />
                        <div className="od-item-info-v2" style={{ flex: 1 }}>
                          <p className="order-item-name-v2" style={{ fontSize: '1.05rem', fontWeight: 600, margin: '0 0 4px 0', color: '#1a1a2e' }}>
                            {item.name}
                          </p>
                          <p className="order-item-meta-v2" style={{ fontSize: '0.85rem', color: '#666', margin: '0 0 6px 0' }}>
                            Qty: {item.quantity} {item.size && `· Size: ${item.size}`} {item.color && `· Color: ${item.color}`}
                          </p>
                          {order.isCustomOrder && (
                            <span style={{ display: 'inline-block', fontSize: '0.72rem', background: '#f5f3ff', color: '#7c3aed', padding: '2px 8px', borderRadius: '2px', fontWeight: 600 }}>
                              Custom Tailored Piece
                            </span>
                          )}
                        </div>
                        <p className="order-item-price-v2" style={{ fontWeight: 700, fontSize: '1rem', color: '#1a1a2e' }}>
                          PKR {Number(item.price).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="od-summary-v3" style={{ marginTop: '1.5rem', borderTop: '1px solid #eee', paddingTop: '1.5rem' }}>
                    <div className="summary-row-v3" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem', color: '#555' }}>
                      <span>Items Subtotal</span>
                      <span style={{ fontWeight: 600, color: '#1a1a2e' }}>PKR {Number(order.itemsTotal || order.total).toLocaleString()}</span>
                    </div>
                    <div className="summary-row-v3" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem', color: '#555' }}>
                      <span>Courier & Packaging</span>
                      <span style={{ fontWeight: 600, color: '#1a1a2e' }}>{order.shippingCost === 0 ? 'FREE' : `PKR ${order.shippingCost || 0}`}</span>
                    </div>
                    {order.discount > 0 && (
                      <div className="summary-row-v3" style={{ display: 'flex', justifyContent: 'space-between', color: '#16a34a', marginBottom: '8px', fontSize: '0.9rem' }}>
                        <span>Discount Applied</span>
                        <span style={{ fontWeight: 600 }}>- PKR {Number(order.discount).toLocaleString()}</span>
                      </div>
                    )}
                    <div className="summary-row-v3 total" style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '1.25rem', marginTop: '12px', borderTop: '2px solid #1a1a2e', paddingTop: '14px', color: '#1a1a2e' }}>
                      <span>Grand Total</span>
                      <span>PKR {Number(order.total).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Delivery & Atelier Info */}
              <div className="od-sidebar">
                <div className="od-card-glass" style={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: '4px', padding: '2rem' }}>
                  <h3 className="od-card-title" style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.2rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <MapPin size={18} color="#c5a059" /> 
                    Delivery & Billing
                  </h3>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div>
                      <span style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#888', marginBottom: '4px' }}>
                        Shipping Destination
                      </span>
                      <p style={{ margin: 0, fontSize: '0.92rem', color: '#1a1a2e', lineHeight: 1.5, fontWeight: 500 }}>
                        {order.shippingAddress?.address ? `${order.shippingAddress.address}, ` : ''}
                        {order.shippingAddress?.city}, {order.shippingAddress?.province || 'Pakistan'}
                      </p>
                    </div>

                    <div>
                      <span style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#888', marginBottom: '4px' }}>
                        Payment Method
                      </span>
                      <p style={{ margin: '0 0 6px 0', fontSize: '0.92rem', color: '#1a1a2e', fontWeight: 600 }}>
                        {order.paymentMethod === 'cod' ? 'Cash on Delivery (COD)' : 'Stripe Online Card Payment'}
                      </p>
                      <span style={{
                        display: 'inline-block', fontSize: '0.7rem', fontWeight: 700,
                        padding: '2px 8px', borderRadius: '2px', textTransform: 'uppercase',
                        background: order.paymentStatus === 'paid' ? '#f0fdf4' : '#fffbeb',
                        color: order.paymentStatus === 'paid' ? '#16a34a' : '#d97706',
                        border: `1px solid ${order.paymentStatus === 'paid' ? '#bbf7d0' : '#fde68a'}`
                      }}>
                        {order.paymentStatus === 'paid' ? '✓ Paid Online' : 'Payment on Delivery'}
                      </span>
                    </div>

                    <div>
                      <span style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#888', marginBottom: '4px' }}>
                        Partner Boutique Atelier
                      </span>
                      <p style={{ margin: 0, fontSize: '0.92rem', color: '#1a1a2e', fontWeight: 600 }}>
                        {order.boutique?.name || 'Auto Stitch Flagship'}
                      </p>
                    </div>

                    <div style={{ paddingTop: '1rem', borderTop: '1px solid #f0f0f0' }}>
                      <Link 
                        to="/contact" 
                        style={{
                          display: 'flex', alignItems: 'center', gap: '8px',
                          fontSize: '0.85rem', color: '#1a1a2e', textDecoration: 'none',
                          fontWeight: 600
                        }}
                      >
                        <Phone size={14} color="#c5a059" /> Inquire with Concierge →
                      </Link>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* Footer Navigation */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '3.5rem', paddingTop: '1.5rem', borderTop: '1px solid #eee', flexWrap: 'wrap', gap: '1rem' }}>
              <Link 
                to="/catalogue" 
                className="order-action-btn-v2"
                style={{ background: '#1a1a2e', color: '#fff', border: 'none', padding: '12px 28px', textDecoration: 'none' }}
              >
                Continue Shopping Collections
              </Link>
              
              <Link to="/contact" style={{ fontSize: '0.85rem', color: '#666', textDecoration: 'underline' }}>
                Need Help with this Order? Contact Support
              </Link>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
