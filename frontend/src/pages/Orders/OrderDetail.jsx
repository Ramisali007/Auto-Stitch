import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { 
  Package, Clock, CheckCircle, Truck, ArrowLeft, MapPin, Phone, Mail, 
  XCircle, RotateCcw, MessageSquare, Loader2, Sparkles, Printer, Download,
  CreditCard, ShieldCheck, AlertCircle, X, Check, Scissors
} from 'lucide-react';
import API_URL from '../../config/api';
import './Orders.css';
import { EDITORIAL_PRODUCTS } from '../../data/mockData';
import toast from 'react-hot-toast';

const getFallbackImage = (id) => {
  if (!id) return '';
  const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const index = hash % EDITORIAL_PRODUCTS.length;
  return EDITORIAL_PRODUCTS[index].images[0];
};

const STATUS_STEPS = [
  { key: 'placed', label: 'Placed', icon: <Package size={16} /> },
  { key: 'accepted', label: 'Accepted', icon: <CheckCircle size={16} /> },
  { key: 'in_production', label: 'In Tailoring', icon: <Scissors size={16} /> },
  { key: 'ready_to_ship', label: 'Quality Passed', icon: <ShieldCheck size={16} /> },
  { key: 'shipped', label: 'Dispatched', icon: <Truck size={16} /> },
  { key: 'delivered', label: 'Delivered', icon: <CheckCircle size={16} /> },
];

export default function OrderDetail() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [payingInstallment, setPayingInstallment] = useState(null);
  
  // Return Form
  const [returnReason, setReturnReason] = useState('Fit Alteration Required');
  const [returnNotes, setReturnNotes] = useState('');
  const [evidenceImage, setEvidenceImage] = useState('');
  const [submittingReturn, setSubmittingReturn] = useState(false);

  const invoiceRef = useRef(null);

  useEffect(() => {
    fetchOrder();
    window.scrollTo(0, 0);

    // Check if redirected from Stripe installment payment
    if (searchParams.get('installment_paid') !== null && searchParams.get('session_id')) {
      handleVerifyInstallmentPayment(searchParams.get('installment_paid'), searchParams.get('session_id'));
    }
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

  const handleVerifyInstallmentPayment = async (instIndex, sessionId) => {
    try {
      await axios.post(`${API_URL}/api/orders/${id}/installments/${instIndex}/pay`, {}, { withCredentials: true });
      toast.success(`Installment #${parseInt(instIndex, 10) + 1} marked as paid!`);
      fetchOrder();
    } catch (err) {
      console.error('Installment verify err:', err);
    }
  };

  const handlePayInstallment = async (index) => {
    setPayingInstallment(index);
    try {
      const { data } = await axios.post(
        `${API_URL}/api/orders/${id}/installments/${index}/stripe-session`,
        {},
        { withCredentials: true }
      );
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error('Could not initialize payment session.');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Payment initialization failed');
    } finally {
      setPayingInstallment(null);
    }
  };

  const handleReturnSubmit = async (e) => {
    e.preventDefault();
    setSubmittingReturn(true);
    try {
      const { data } = await axios.post(
        `${API_URL}/api/orders/${id}/request-return`,
        { reason: returnReason, notes: returnNotes, evidenceImages: evidenceImage ? [evidenceImage] : [] },
        { withCredentials: true }
      );
      if (data.success) {
        toast.success('Alteration/Return request submitted to boutique.');
        setShowReturnModal(false);
        fetchOrder();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit request');
    } finally {
      setSubmittingReturn(false);
    }
  };

  const handlePrintInvoice = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="order-detail-page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <Loader2 className="animate-spin" size={48} color="#1a1a2e" />
      </div>
    );
  }

  if (!order) return <div className="order-detail-page"><div className="tryon-content-v2"><h2>Order Record Not Found</h2></div></div>;

  const handleCancelOrder = async () => {
    if (!window.confirm('Are you sure you want to cancel this order? This action cannot be undone.')) return;
    try {
      const res = await axios.patch(`${API_URL}/api/orders/${id}/cancel`, {}, { withCredentials: true });
      if (res.data.success) {
        toast.success('Order cancelled successfully.');
        fetchOrder();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to cancel order.');
    }
  };

  const getStepIndex = (status) => {
    switch (status) {
      case 'placed': return 0;
      case 'accepted': return 1;
      case 'in_production': return 2;
      case 'ready_to_ship': return 3;
      case 'shipped': return 4;
      case 'delivered': return 5;
      default: return -1;
    }
  };

  const currentStepIndex = getStepIndex(order.status);
  const orderRef = `#AS-${order._id.slice(-6).toUpperCase()}`;
  const isCancellable = ['placed', 'accepted'].includes(order.status);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  return (
    <div className="order-detail-page page-enter">
      <div className="tryon-content-v2">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
          <Link 
            to={user.role === 'boutique_owner' ? '/boutique/orders' : '/orders'} 
            className="order-action-btn-v2" 
            style={{ display: 'inline-flex', padding: '8px 20px', alignItems: 'center', gap: '8px' }}
          >
            <ArrowLeft size={14} /> 
            {user.role === 'boutique_owner' ? 'Back to Registry' : 'Back to Orders'}
          </Link>

          <button 
            onClick={() => setShowInvoiceModal(true)}
            className="order-action-btn-v2"
            style={{ display: 'inline-flex', padding: '8px 20px', alignItems: 'center', gap: '8px', background: '#1a1a2e', color: '#fff', border: 'none' }}
          >
            <Printer size={14} /> Download Official Invoice
          </button>
        </div>

        <div className="od-header">
          <div className="result-success-badge" style={{ marginBottom: '1.5rem', display: 'inline-flex' }}>
            <Sparkles size={14} /> Verified Boutique Order
          </div>
          <h1 className="orders-title-serif">Order <span className="text-gradient">Details</span></h1>
          <p className="orders-subtitle">Reference {orderRef} · Placed on {new Date(order.createdAt).toLocaleDateString('en-US', { dateStyle: 'long' })}</p>
        </div>

        {/* Status Tracker */}
        <div className="od-tracker-premium animate-fade-in" style={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: '4px', padding: '2rem' }}>
          <div className="tracker-steps-editorial" style={{ display: 'flex', justifyContent: 'space-between', position: 'relative' }}>
            {STATUS_STEPS.map((step, i) => {
              const isDone = i <= currentStepIndex;
              const isActive = i === currentStepIndex;
              return (
                <div key={step.key} className={`tracker-step-v3 ${isDone ? 'done' : ''} ${isActive ? 'active' : ''}`} style={{ textAlign: 'center', flex: 1, position: 'relative' }}>
                  <div className="tracker-icon-v3" style={{
                    width: '36px', height: '36px', borderRadius: '50%', margin: '0 auto 8px auto',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: isDone ? '#1a1a2e' : '#f3f4f6', color: isDone ? '#fff' : '#888',
                    border: isActive ? '2px solid #c5a059' : 'none'
                  }}>
                    {step.icon}
                  </div>
                  <span className="tracker-label-v3" style={{ fontSize: '0.75rem', fontWeight: isActive ? 700 : 500, textTransform: 'uppercase', letterSpacing: '0.08em', color: isDone ? '#1a1a2e' : '#999' }}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>

          {order.trackingNumber && (
            <div className="tracking-info" style={{ textAlign: 'center', color: '#1a1a2e', fontSize: '0.85rem', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #f0f0f0' }}>
              <Truck size={16} style={{ verticalAlign: 'middle', marginRight: '8px' }} />
              Waybill Trace: <strong>{order.trackingNumber}</strong>
              {order.trackingUrl && (
                <a href={order.trackingUrl} target="_blank" rel="noreferrer" style={{ marginLeft: '12px', color: '#c5a059', textDecoration: 'underline' }}>
                  Track Live Shipment
                </a>
              )}
            </div>
          )}
        </div>

        {/* Alteration / Return Notification Banner */}
        {order.returnRequest?.status && (
          <div style={{
            margin: '2rem 0', padding: '1.2rem', borderRadius: '4px',
            background: order.returnRequest.status === 'approved' ? '#f0fdf4' : order.returnRequest.status === 'rejected' ? '#fef2f2' : '#fffbeb',
            border: `1px solid ${order.returnRequest.status === 'approved' ? '#bbf7d0' : order.returnRequest.status === 'rejected' ? '#fecaca' : '#fde68a'}`,
            display: 'flex', alignItems: 'center', gap: '12px'
          }}>
            <AlertCircle size={20} color={order.returnRequest.status === 'approved' ? '#16a34a' : order.returnRequest.status === 'rejected' ? '#dc2626' : '#d97706'} />
            <div>
              <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem', color: '#1a1a2e' }}>
                Alteration Request: {order.returnRequest.status.toUpperCase()}
              </p>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.82rem', color: '#555' }}>
                Reason: {order.returnRequest.reason}
              </p>
            </div>
          </div>
        )}

        <div className="od-grid-editorial animate-fade-in" style={{ marginTop: '2rem' }}>
          {/* Items */}
          <div className="od-main">
            <div className="od-card-glass" style={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: '4px', padding: '2rem' }}>
              <h3 className="od-card-title" style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.2rem', marginBottom: '1.5rem' }}>
                <Package size={18} style={{ verticalAlign: 'middle', marginRight: '8px' }} /> 
                Ordered Items & Garments
              </h3>
              
              <div className="od-items-editorial">
                {order.items.map((item, i) => (
                  <div key={i} className="od-item-v3" style={{ display: 'flex', gap: '20px', paddingBottom: '1.5rem', marginBottom: '1.5rem', borderBottom: '1px solid #f0f0f0' }}>
                    <img 
                      src={item.image || item.product?.images?.[0] || getFallbackImage(order.customizationRequest || order._id)} 
                      alt={item.name} 
                      style={{ width: '80px', height: '105px', objectFit: 'cover', borderRadius: '2px' }}
                      onError={(e) => { e.target.src = getFallbackImage(order.customizationRequest || order._id); }}
                    />
                    <div className="od-item-info-v2" style={{ flex: 1 }}>
                      <p className="order-item-name-v2" style={{ fontSize: '1.05rem', fontWeight: 600, margin: '0 0 4px 0' }}>{item.name}</p>
                      <p className="order-item-meta-v2" style={{ fontSize: '0.85rem', color: '#666', margin: 0 }}>
                        Qty: {item.quantity} {item.size && `· Size: ${item.size}`} {item.color && `· Color: ${item.color}`}
                      </p>
                      {order.isCustomOrder && (
                        <span style={{ display: 'inline-block', marginTop: '6px', fontSize: '0.72rem', background: '#f5f3ff', color: '#7c3aed', padding: '2px 8px', borderRadius: '2px', fontWeight: 600 }}>
                          Custom Tailored Piece
                        </span>
                      )}
                    </div>
                    <p className="order-item-price-v2" style={{ fontWeight: 700, fontSize: '1rem', color: '#1a1a2e' }}>
                      PKR {item.price.toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>

              {/* Installments Breakdown (If Enabled) */}
              {order.installmentPlan?.enabled && (
                <div style={{ marginTop: '2rem', padding: '1.5rem', background: '#fafafa', border: '1px solid #eee', borderRadius: '4px' }}>
                  <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.95rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Installment Payment Schedule
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {(order.installmentPlan.installments || [
                      { amount: Math.round(order.total * 0.4), dueDate: new Date(Date.now() + 7 * 86400000), status: 'paid' },
                      { amount: Math.round(order.total * 0.3), dueDate: new Date(Date.now() + 14 * 86400000), status: 'pending' },
                      { amount: Math.round(order.total * 0.3), dueDate: new Date(Date.now() + 21 * 86400000), status: 'pending' },
                    ]).map((inst, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: '12px 16px', border: '1px solid #e5e5e5' }}>
                        <div>
                          <p style={{ margin: 0, fontWeight: 600, fontSize: '0.88rem' }}>Milestone #{idx + 1}</p>
                          <span style={{ fontSize: '0.78rem', color: '#666' }}>
                            Due: {new Date(inst.dueDate).toLocaleDateString()}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>PKR {inst.amount?.toLocaleString()}</span>
                          {inst.status === 'paid' ? (
                            <span style={{ fontSize: '0.75rem', background: '#f0fdf4', color: '#16a34a', padding: '4px 10px', borderRadius: '2px', fontWeight: 600 }}>
                              ✓ Paid
                            </span>
                          ) : (
                            <button
                              disabled={payingInstallment === idx}
                              onClick={() => handlePayInstallment(idx)}
                              style={{
                                padding: '6px 14px', background: '#1a1a2e', color: '#fff',
                                border: 'none', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer'
                              }}
                            >
                              {payingInstallment === idx ? 'Processing...' : 'Pay Online'}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="od-summary-v3" style={{ marginTop: '2rem', borderTop: '1px solid #eee', paddingTop: '1.5rem' }}>
                <div className="summary-row-v3" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span>Subtotal</span>
                  <span>PKR {order.itemsTotal.toLocaleString()}</span>
                </div>
                <div className="summary-row-v3" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span>Courier & Packaging</span>
                  <span>{order.shippingCost === 0 ? 'FREE' : `PKR ${order.shippingCost}`}</span>
                </div>
                {order.discount > 0 && (
                  <div className="summary-row-v3" style={{ display: 'flex', justifyContent: 'space-between', color: '#16a34a', marginBottom: '8px' }}>
                    <span>Discount</span>
                    <span>- PKR {order.discount.toLocaleString()}</span>
                  </div>
                )}
                <div className="summary-row-v3 total" style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '1.2rem', marginTop: '12px', borderTop: '2px solid #1a1a2e', paddingTop: '12px' }}>
                  <span>Grand Total</span>
                  <span>PKR {order.total.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Custom Stitching Design & Reference Photos */}
            {(order.isCustomOrder || order.customizationRequest || order.notes?.includes('Custom Stitching')) && (
              <div className="od-card-glass" style={{ background: '#fff', border: '1px solid #c5a059', borderRadius: '4px', padding: '2rem', marginTop: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', borderBottom: '1px solid #f0f0f0', paddingBottom: '1rem' }}>
                  <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.25rem', margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: '#1a1a2e' }}>
                    <Scissors size={20} color="#c5a059" /> 
                    Custom Stitching Design & Reference Photos
                  </h3>
                  <span style={{ fontSize: '0.72rem', background: '#fef3c7', color: '#b45309', padding: '4px 10px', fontWeight: 700, borderRadius: '2px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Custom Tailoring Order
                  </span>
                </div>

                {/* Reference Images Gallery */}
                {((order.customizationRequest?.referenceImages && order.customizationRequest.referenceImages.length > 0) || (order.items?.[0]?.image && order.isCustomOrder)) && (
                  <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#888', marginBottom: '10px' }}>
                      Customer Uploaded Reference Designs (What the Boutique Needs to Make)
                    </label>
                    <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                      {(order.customizationRequest?.referenceImages?.length > 0 
                        ? order.customizationRequest.referenceImages 
                        : [order.items?.[0]?.image].filter(Boolean)
                      ).map((imgUrl, imgIdx) => (
                        <div key={imgIdx} style={{ position: 'relative', border: '1px solid #e5e5e5', borderRadius: '4px', overflow: 'hidden', background: '#fafafa' }}>
                          <a href={imgUrl} target="_blank" rel="noreferrer" title="Click to view full high-res photo">
                            <img 
                              src={imgUrl} 
                              alt={`Reference Design #${imgIdx + 1}`} 
                              style={{ width: '140px', height: '180px', objectFit: 'cover', display: 'block', cursor: 'zoom-in' }} 
                            />
                          </a>
                          <span style={{ position: 'absolute', bottom: '4px', left: '4px', background: 'rgba(0,0,0,0.75)', color: '#fff', fontSize: '0.65rem', padding: '2px 6px', borderRadius: '2px' }}>
                            Design #{imgIdx + 1}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Selected Regions to Modify */}
                {order.customizationRequest?.selectedRegions?.length > 0 && (
                  <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#888', marginBottom: '8px' }}>
                      Selected Customization Areas
                    </label>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {order.customizationRequest.selectedRegions.map(reg => (
                        <span key={reg} style={{ background: '#1a1a2e', color: '#fff', padding: '6px 14px', borderRadius: '2px', fontSize: '0.78rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                          ✂️ {reg}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Vision Description & Notes */}
                {(order.customizationRequest?.description || order.notes) && (
                  <div style={{ background: '#fafafa', border: '1px solid #eee', padding: '1.2rem', borderRadius: '4px' }}>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#888', marginBottom: '6px' }}>
                      Customer Stitching Instructions & Requirements
                    </label>
                    <p style={{ margin: 0, fontSize: '0.92rem', lineHeight: '1.5', color: '#1a1a2e' }}>
                      {order.customizationRequest?.description || order.notes}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="od-sidebar">
            <div className="od-card-glass" style={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: '4px', padding: '2rem', marginBottom: '1.5rem' }}>
              <h3 className="od-card-title" style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.1rem', margin: '0 0 1.2rem 0' }}>
                Delivery & Payment
              </h3>
              
              <div className="od-info-block" style={{ marginBottom: '1.2rem' }}>
                <span className="od-info-label" style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#888', display: 'block', marginBottom: '4px' }}>
                  Delivery Address
                </span>
                <p className="od-info-value" style={{ margin: 0, fontSize: '0.9rem', lineHeight: '1.5', color: '#1a1a2e' }}>
                  {order.shippingAddress.street}<br/>
                  {order.shippingAddress.city}, {order.shippingAddress.province} {order.shippingAddress.postalCode}
                </p>
              </div>

              <div className="od-info-block" style={{ marginBottom: '1.2rem' }}>
                <span className="od-info-label" style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#888', display: 'block', marginBottom: '4px' }}>
                  Payment Method
                </span>
                <p className="od-info-value" style={{ margin: 0, fontSize: '0.9rem', color: '#1a1a2e', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CreditCard size={15} />
                  {order.paymentMethod === 'cod' ? 'Cash on Delivery' : order.paymentMethod === 'stripe_installment' ? 'Installment Plan (Card)' : 'Online Card (Stripe)'}
                </p>
              </div>

              <div className="od-info-block">
                <span className="od-info-label" style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#888', display: 'block', marginBottom: '4px' }}>
                  Boutique / Store
                </span>
                <p className="od-info-value" style={{ margin: 0, fontSize: '0.9rem', color: '#1a1a2e' }}>
                  {order.boutique?.name || 'Auto Stitch Partner Boutique'}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <Link 
                to={
                  user.role === 'boutique_owner' 
                    ? `/chat?customerId=${order.customer?._id || order.customer}&customerName=${encodeURIComponent(order.customer?.name || 'Customer')}`
                    : `/chat?boutiqueId=${order.boutique?._id || order.boutique}&boutiqueName=${encodeURIComponent(order.boutique?.name || 'Boutique')}&ownerId=${order.boutique?.owner?._id || order.boutique?.owner || ''}`
                }
                style={{
                  padding: '14px', background: '#1a1a2e', color: '#fff', textAlign: 'center',
                  textDecoration: 'none', fontWeight: 600, fontSize: '0.85rem', letterSpacing: '0.08em',
                  textTransform: 'uppercase', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                }}
              >
                <MessageSquare size={16} /> 
                {user.role === 'boutique_owner' ? 'Message Customer' : 'Live Chat with Boutique'}
              </Link>
              
              {order.status === 'delivered' && !order.returnRequest && (
                <button
                  onClick={() => setShowReturnModal(true)}
                  style={{
                    padding: '12px', background: 'transparent', color: '#1a1a2e', border: '1px solid #1a1a2e',
                    fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                  }}
                >
                  <Scissors size={15} /> Request Alteration / Return
                </button>
              )}

              {isCancellable && (
                <button 
                  onClick={handleCancelOrder} 
                  style={{
                    padding: '12px', background: 'transparent', color: '#dc2626', border: '1px solid #fecaca',
                    fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                  }}
                >
                  <XCircle size={16} /> Cancel Order
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ===== OFFICIAL PRINTABLE INVOICE MODAL ===== */}
      {showInvoiceModal && (
        <div className="invoice-modal-backdrop" style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(5px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '20px'
        }}>
          <div className="invoice-modal-card" style={{
            background: '#fff', maxWidth: '750px', width: '100%', maxHeight: '90vh', overflowY: 'auto',
            padding: '2.5rem', position: 'relative', color: '#1a1a2e', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
          }}>
            <button 
              onClick={() => setShowInvoiceModal(false)}
              style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>

            {/* Printable Invoice Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #1a1a2e', paddingBottom: '1.5rem', marginBottom: '2rem' }}>
              <div>
                <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.8rem', margin: '0 0 4px 0', letterSpacing: '0.05em' }}>AUTO STITCH.</h1>
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Custom Stitching & Tailoring</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#888' }}>Tax Invoice</span>
                <h3 style={{ margin: '4px 0', fontSize: '1.2rem', fontFamily: 'Playfair Display, serif' }}>{orderRef}</h3>
                <span style={{ fontSize: '0.8rem', color: '#666' }}>Date: {new Date(order.createdAt).toLocaleDateString()}</span>
              </div>
            </div>

            {/* Parties */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '2rem' }}>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#888', letterSpacing: '0.1em' }}>Boutique / Store</span>
                <p style={{ margin: '4px 0 0 0', fontWeight: 600, fontSize: '0.95rem' }}>{order.boutique?.name || 'Auto Stitch Partner Boutique'}</p>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.82rem', color: '#666' }}>Verified Partner Boutique · Islamabad / Lahore / Karachi</p>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#888', letterSpacing: '0.1em' }}>Billed To</span>
                <p style={{ margin: '4px 0 0 0', fontWeight: 600, fontSize: '0.95rem' }}>{order.customer?.name || user.name || 'Customer'}</p>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.82rem', color: '#666' }}>{order.shippingAddress.street}, {order.shippingAddress.city}, {order.shippingAddress.province}</p>
              </div>
            </div>

            {/* Line Items Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '2rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #1a1a2e', textAlign: 'left', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#555' }}>
                  <th style={{ padding: '8px 0' }}>Description</th>
                  <th style={{ padding: '8px 0', textAlign: 'center' }}>Qty</th>
                  <th style={{ padding: '8px 0', textAlign: 'right' }}>Unit Rate</th>
                  <th style={{ padding: '8px 0', textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #f0f0f0', fontSize: '0.88rem' }}>
                    <td style={{ padding: '12px 0' }}>
                      <strong>{item.name}</strong>
                      {item.size && <span style={{ display: 'block', fontSize: '0.78rem', color: '#777' }}>Size: {item.size} {item.color && `· Color: ${item.color}`}</span>}
                    </td>
                    <td style={{ padding: '12px 0', textAlign: 'center' }}>{item.quantity}</td>
                    <td style={{ padding: '12px 0', textAlign: 'right' }}>PKR {item.price.toLocaleString()}</td>
                    <td style={{ padding: '12px 0', textAlign: 'right', fontWeight: 600 }}>PKR {(item.price * item.quantity).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '2rem' }}>
              <div style={{ width: '250px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '0.85rem' }}>
                  <span>Subtotal</span>
                  <span>PKR {order.itemsTotal.toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '0.85rem' }}>
                  <span>Shipping</span>
                  <span>{order.shippingCost === 0 ? 'FREE' : `PKR ${order.shippingCost}`}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderTop: '2px solid #1a1a2e', fontWeight: 700, fontSize: '1.1rem' }}>
                  <span>Grand Total</span>
                  <span>PKR {order.total.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Print Action Bar */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', borderTop: '1px solid #eee', paddingTop: '1.5rem' }}>
              <button
                onClick={handlePrintInvoice}
                style={{
                  padding: '10px 24px', background: '#1a1a2e', color: '#fff', border: 'none',
                  fontSize: '0.85rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px'
                }}
              >
                <Printer size={15} /> Print / Save as PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== ALTERATION / RETURN MODAL ===== */}
      {showReturnModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999999, padding: '20px'
        }}>
          <div style={{
            background: '#fff', maxWidth: '480px', width: '100%', padding: '2rem',
            position: 'relative', color: '#1a1a2e'
          }}>
            <button onClick={() => setShowReturnModal(false)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', cursor: 'pointer' }}>
              <X size={18} />
            </button>

            <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.3rem', margin: '0 0 6px 0' }}>
              Request Alteration or Exchange
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#666', margin: '0 0 1.5rem 0' }}>
              Our partner boutiques offer free alteration on custom orders within 7 days.
            </p>

            <form onSubmit={handleReturnSubmit}>
              <div style={{ marginBottom: '1.2rem' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>
                  Adjustment Reason
                </label>
                <select
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                >
                  <option value="Fit Alteration Required">Fit Alteration Required (Tight / Loose)</option>
                  <option value="Sleeve/Hemline Adjustment">Sleeve or Hemline Length Adjustment</option>
                  <option value="Fabric Defect">Fabric / Embroidery Flaw</option>
                  <option value="Design Mismatch">Did not match requested custom design</option>
                </select>
              </div>

              <div style={{ marginBottom: '1.2rem' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>
                  Detailed Fitting Notes
                </label>
                <textarea
                  rows={3}
                  value={returnNotes}
                  onChange={(e) => setReturnNotes(e.target.value)}
                  placeholder="Describe where adjustments are needed (e.g. shorten sleeves by 1 inch)..."
                  required
                  style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                ></textarea>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>
                  Evidence / Fit Photo URL (Optional)
                </label>
                <input
                  type="text"
                  value={evidenceImage}
                  onChange={(e) => setEvidenceImage(e.target.value)}
                  placeholder="Paste image link showing fitting issue..."
                  style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                />
              </div>

              <button
                type="submit"
                disabled={submittingReturn}
                style={{
                  width: '100%', padding: '12px', background: '#1a1a2e', color: '#fff', border: 'none',
                  fontSize: '0.85rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase',
                  cursor: submittingReturn ? 'not-allowed' : 'pointer'
                }}
              >
                {submittingReturn ? 'Submitting Request...' : 'Send Request to Boutique'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

