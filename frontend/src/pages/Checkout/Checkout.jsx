import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CreditCard, Truck, ShieldCheck, Lock, ArrowRight, CheckCircle, MapPin, Loader2, XCircle } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import API_URL from '../../config/api';
import axios from 'axios';
import './Checkout.css';

export default function Checkout() {
  const { cartItems, getCartTotal, clearCart } = useCart();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', street: '', city: '', province: '', postalCode: '', paymentMethod: 'cod', notes: '' });
  const [placedOrderId, setPlacedOrderId] = useState(null);
  const [verifyingPayment, setVerifyingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState(null);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const success = searchParams.get('success');
    const orderId = searchParams.get('orderId');
    const sessionId = searchParams.get('session_id');
    if (success === 'true' && orderId) {
      clearCart();
      setStep(3);
      setPlacedOrderId(orderId);

      const verifyPayment = async () => {
        setVerifyingPayment(true);
        setPaymentError(null);
        try {
          const res = await axios.post(`${API_URL}/api/orders/${orderId}/verify-payment`, { sessionId }, { withCredentials: true });
          if (res.data.success) {
            setVerifyingPayment(false);
          }
        } catch (err) {
          console.error('Payment verification failed:', err);
          setPaymentError(err.response?.data?.message || 'Failed to verify payment with Stripe.');
          setVerifyingPayment(false);
        }
      };
      verifyPayment();
    }
  }, [searchParams, clearCart]);

  useEffect(() => {
    document.title = 'Checkout — Auto Stitch';
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user._id) {
      setForm(prev => ({
        ...prev,
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        street: user.address?.street || '',
        city: user.address?.city || '',
        province: user.address?.province || '',
        postalCode: user.address?.postalCode || '',
      }));
    }
  }, []);

  const subtotal = getCartTotal();
  const shipping = subtotal > 5000 ? 0 : 250;
  const total = subtotal + shipping;

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handlePlaceOrder = async () => {
    setLoading(true);
    try {
      const orderData = {
        items: cartItems.map(item => ({
          product: item._id,
          name: item.name,
          image: item.images?.[0] || '',
          price: item.price,
          quantity: item.quantity,
          size: item.size || '',
          color: item.color || '',
          boutique: item.boutique?._id || item.boutique,
        })),
        boutique: cartItems[0]?.boutique?._id || cartItems[0]?.boutique,
        shippingAddress: {
          street: form.street,
          city: form.city,
          province: form.province,
          postalCode: form.postalCode,
        },
        paymentMethod: form.paymentMethod,
        itemsTotal: subtotal,
        shippingCost: shipping,
        total,
        notes: form.notes,
      };

      const res = await axios.post(`${API_URL}/api/orders`, 
        orderData,
        { withCredentials: true }
      );
      const data = res.data;

      if (!data.success) {
        setLoading(false);
        alert(data.message || 'Order placement failed');
        return;
      }

      if (data.stripeSessionUrl) {
        window.location.href = data.stripeSessionUrl;
      } else {
        setPlacedOrderId(data.order._id);
        setStep(3);
        clearCart();
      }
    } catch (err) {
      console.error('Checkout error:', err);
      alert(err.response?.data?.message || 'A network error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (cartItems.length === 0 && step !== 3) {
    return (
      <div className="checkout-page page-enter">
        <div className="checkout-container">
          <div className="empty-state-editorial" style={{ textAlign: 'center', padding: '10rem 0' }}>
            <h2 className="checkout-title-serif">Your Bag is Empty</h2>
            <p className="checkout-subtitle">Add some couture pieces to your collection before proceeding to checkout.</p>
            <div style={{ marginTop: '3rem' }}>
              <Link to="/boutiques" className="btn-checkout-premium" style={{ display: 'inline-block', width: 'auto', padding: '1rem 3rem' }}>Explore Boutiques</Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="checkout-page page-enter">
      <div className="checkout-container">
        <div className="checkout-header">
          <h1 className="checkout-title-serif">Payment & <span className="text-gradient">Logistics</span></h1>
          <p className="checkout-subtitle">
            Secure your selections with our seamless procurement process. Your measurements 
            and preferences will be shared with the designer to ensure a perfect fit.
          </p>
        </div>

        {/* Stepper Modern */}
        <div className="checkout-stepper-modern">
          {['Registry', 'Review', 'Secured'].map((label, i) => (
            <div key={label} className={`ck-step-v2 ${step > i ? 'done' : ''} ${step === i + 1 ? 'active' : ''}`}>
              <div className="ck-step-num-v2">{step > i + 1 ? <CheckCircle size={14} /> : i + 1}</div>
              <span>{label}</span>
            </div>
          ))}
        </div>

        {step === 1 && (
          <div className="checkout-grid-editorial">
            <div className="checkout-main-flow">
              <div className="checkout-section-modern">
                <h3 className="ck-section-label"><MapPin size={20} /> Shipping Destination</h3>
                <div className="ck-row-2">
                  <div className="ck-input-group">
                    <label className="ck-input-label">Full Name</label>
                    <input name="name" value={form.name} onChange={handleChange} className="ck-input-field" placeholder="Enter your full name" />
                  </div>
                  <div className="ck-input-group">
                    <label className="ck-input-label">Email Address</label>
                    <input name="email" type="email" value={form.email} onChange={handleChange} className="ck-input-field" placeholder="email@example.com" />
                  </div>
                </div>
                <div className="ck-input-group">
                  <label className="ck-input-label">Contact Phone</label>
                  <input name="phone" value={form.phone} onChange={handleChange} className="ck-input-field" placeholder="+92 XXX XXXXXXX" />
                </div>
                <div className="ck-input-group">
                  <label className="ck-input-label">Street Address</label>
                  <input name="street" value={form.street} onChange={handleChange} className="ck-input-field" placeholder="House #, Street, Area" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '2rem' }}>
                  <div className="ck-input-group">
                    <label className="ck-input-label">City</label>
                    <input name="city" value={form.city} onChange={handleChange} className="ck-input-field" />
                  </div>
                  <div className="ck-input-group">
                    <label className="ck-input-label">Province</label>
                    <select name="province" value={form.province} onChange={handleChange} className="ck-input-field">
                      <option value="">Select</option>
                      <option>Punjab</option><option>Sindh</option><option>KPK</option><option>Balochistan</option><option>ICT</option>
                    </select>
                  </div>
                  <div className="ck-input-group">
                    <label className="ck-input-label">Postal Code</label>
                    <input name="postalCode" value={form.postalCode} onChange={handleChange} className="ck-input-field" />
                  </div>
                </div>
              </div>

              <div className="checkout-section-modern">
                <h3 className="ck-section-label"><CreditCard size={20} /> Payment Method</h3>
                <div className="payment-grid-editorial">
                  {[
                    { value: 'cod', label: 'Cash on Delivery', desc: 'Secure settlement upon arrival' },
                    { value: 'card', label: 'Credit / Debit Card', desc: 'Secure payment via Stripe' },
                    { value: 'stripe_installment', label: 'Buy Now Pay Later', desc: 'Pay in 4 interest-free installments' }
                  ].map(opt => (
                    <div 
                      key={opt.value} 
                      className={`payment-card-premium ${form.paymentMethod === opt.value ? 'active' : ''}`}
                      onClick={() => setForm({...form, paymentMethod: opt.value})}
                    >
                      <span className="payment-card-title">{opt.label}</span>
                      <span className="payment-card-desc">{opt.desc}</span>
                    </div>
                  ))}
                </div>
              </div>

              <button className="btn-checkout-premium" onClick={() => setStep(2)} disabled={!form.name || !form.phone || !form.street || !form.city}>
                Review Transaction Summary
              </button>
            </div>

            <aside className="checkout-summary-glass">
              <h3 className="ck-section-label" style={{ fontSize: '1.1rem' }}>Order Details</h3>
              <div className="summary-items-list">
                {cartItems.map(item => (
                  <div key={`${item._id}-${item.size}`} className="summary-item-v2">
                    <img src={item.images?.[0]} alt={item.name} />
                    <div className="summary-item-info">
                      <p className="summary-item-name">{item.name}</p>
                      <p className="summary-item-meta">Size: {item.size || 'STD'} · Qty: {item.quantity}</p>
                      <p className="summary-item-price">PKR {(item.price * item.quantity).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="summary-divider" />
              <div className="summary-row-v2"><span>Subtotal</span><span>PKR {subtotal.toLocaleString()}</span></div>
              <div className="summary-row-v2"><span>Logistics</span><span>{shipping === 0 ? 'COMPLIMENTARY' : `PKR ${shipping}`}</span></div>
              <div className="summary-row-v2 total"><span>Total</span><span>PKR {total.toLocaleString()}</span></div>
              
              <div style={{ marginTop: '2rem', display: 'flex', gap: '15px', color: '#999', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><Lock size={12} /> Encrypted</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><Truck size={12} /> Global Shipping</span>
              </div>
            </aside>
          </div>
        )}

        {step === 2 && (
          <div className="checkout-grid-editorial" style={{ gridTemplateColumns: '1fr' }}>
            <div className="checkout-main-flow glass-card" style={{ padding: '4rem', maxWidth: '800px', margin: '0 auto' }}>
              <h3 className="checkout-title-serif" style={{ fontSize: '2rem', textAlign: 'left' }}>Final Review</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4rem', marginTop: '3rem' }}>
                <div className="review-block">
                  <h4 className="ck-input-label">Shipment Recipient</h4>
                  <p style={{ fontWeight: '600' }}>{form.name}</p>
                  <p style={{ color: '#666' }}>{form.phone}</p>
                  <p style={{ color: '#666', fontSize: '0.9rem', marginTop: '8px' }}>{form.street}, {form.city}, {form.province} {form.postalCode}</p>
                </div>
                <div className="review-block">
                  <h4 className="ck-input-label">Payment Architecture</h4>
                  <p style={{ fontWeight: '600' }}>
                    {form.paymentMethod === 'cod' ? 'Cash on Delivery' : form.paymentMethod === 'stripe_installment' ? 'Buy Now Pay Later (Installments)' : 'Credit / Debit Card (Stripe)'}
                  </p>
                  <p style={{ color: '#666', fontSize: '0.9rem', marginTop: '8px' }}>Amount to be settled: <strong>PKR {total.toLocaleString()}</strong></p>
                </div>
              </div>
              <div style={{ marginTop: '4rem', display: 'flex', gap: '1.5rem' }}>
                <button className="btn-checkout-premium" style={{ background: '#f8f8f8', color: '#000', width: 'auto' }} onClick={() => setStep(1)}>Modify Details</button>
                <button className="btn-checkout-premium" style={{ flex: 1 }} onClick={handlePlaceOrder} disabled={loading}>
                  {loading ? 'Authenticating...' : 'Confirm Transaction'}
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="tryon-result animate-fade-in" style={{ padding: '0', maxWidth: '800px', margin: '0 auto' }}>
            {verifyingPayment ? (
              <div className="result-header" style={{ marginBottom: '4rem', textAlign: 'center' }}>
                <Loader2 className="animate-spin" size={48} style={{ color: 'var(--color-accent)', margin: '0 auto 2rem auto' }} />
                <h2 className="result-title">Verifying <span className="text-gradient">Payment</span></h2>
                <p className="checkout-subtitle" style={{ marginTop: '1.5rem' }}>
                  Please do not close this window. We are securing your transaction confirmation with Stripe...
                </p>
              </div>
            ) : paymentError ? (
              <div className="result-header" style={{ marginBottom: '4rem', textAlign: 'center' }}>
                <XCircle size={48} style={{ color: '#EF4444', margin: '0 auto 2rem auto' }} />
                <h2 className="result-title">Payment <span className="text-gradient">Verification Failed</span></h2>
                <p className="checkout-subtitle" style={{ marginTop: '1.5rem', color: '#ff4444' }}>
                  {paymentError}
                </p>
                <div style={{ marginTop: '3rem' }}>
                  <button className="btn-checkout-premium" style={{ width: 'auto', margin: '0 auto' }} onClick={() => setStep(1)}>
                    Return to Checkout
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="result-header" style={{ marginBottom: '4rem' }}>
                  <div className="result-success-badge">
                    <CheckCircle size={18} />
                    <span>Transaction Secured</span>
                  </div>
                  <h2 className="result-title">Your Order Is <span className="text-gradient">Confirmed</span></h2>
                  <p className="checkout-subtitle" style={{ marginTop: '1.5rem' }}>
                    We've received your procurement request. Our artisans are now coordinating 
                    with the boutique to prepare your editorial selections.
                  </p>
                </div>

                <div className="result-comparison glass-card" style={{ padding: '3rem', display: 'flex', flexDirection: 'column', gap: '2rem', alignItems: 'center' }}>
                  <div className="order-ref-premium" style={{ margin: '0', border: 'none', background: 'rgba(0,0,0,0.03)', borderRadius: '12px' }}>
                    REFERENCE ID: <span style={{ fontWeight: '800' }}>#AS-{placedOrderId ? placedOrderId.toString().slice(-6).toUpperCase() : 'PENDING'}</span>
                  </div>
                  
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '1rem' }}>Next Steps:</p>
                    <div style={{ display: 'flex', gap: '2rem', justifyContent: 'center' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#000', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Truck size={18} /></div>
                        <span style={{ fontSize: '0.7rem', fontWeight: '600' }}>LOGISTICS</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#f8f8f8', color: '#999', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ShieldCheck size={18} /></div>
                        <span style={{ fontSize: '0.7rem', fontWeight: '600', color: '#999' }}>QUALITY CHECK</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="result-actions" style={{ display: 'flex', flexDirection: 'column', gap: '15px', width: '100%', maxWidth: '400px', margin: '3rem auto 0 auto', position: 'relative', zIndex: '9999' }}>
                  <Link 
                    to="/orders"
                    className="btn-black" 
                    style={{ height: '60px', fontSize: '0.9rem', letterSpacing: '0.1em', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', cursor: 'pointer', pointerEvents: 'auto' }}
                  >
                    VIEW MY ORDERS
                  </Link>
                  <button 
                    onClick={() => window.location.href = '/boutiques'}
                    className="btn btn-outline" 
                    style={{ borderRadius: '30px', height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', cursor: 'pointer', pointerEvents: 'auto', width: '100%', background: 'transparent', border: '1px solid #ddd' }}
                  >
                    Continue Shopping
                  </button>
                </div>

                <div className="result-privacy" style={{ marginTop: '3rem' }}>
                  <ShieldCheck size={14} />
                  <span>Your transaction is protected by 256-bit SSL encryption</span>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
