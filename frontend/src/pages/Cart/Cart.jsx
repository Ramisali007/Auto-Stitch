import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  ShoppingBag, Trash2, Plus, Minus, ArrowLeft, 
  ArrowRight, ShieldCheck, Truck, RotateCcw, Tag, X, CheckCircle 
} from 'lucide-react';
import { useCart } from '../../context/CartContext';
import axios from 'axios';
import API_URL from '../../config/api';
import toast from 'react-hot-toast';
import './Cart.css';

export default function Cart() {
  const { cartItems, removeFromCart, updateQuantity, getCartTotal } = useCart();
  const [promoCode, setPromoCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(() => {
    try {
      const saved = sessionStorage.getItem('appliedCoupon');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [validating, setValidating] = useState(false);

  const subtotal = getCartTotal();
  
  // Calculate discount and shipping
  let discount = 0;
  let isFreeShipping = subtotal > 5000;

  if (appliedCoupon) {
    if (appliedCoupon.discountType === 'percentage') {
      discount = Math.round((subtotal * appliedCoupon.discountValue) / 100);
      if (appliedCoupon.maxDiscountAmount && discount > appliedCoupon.maxDiscountAmount) {
        discount = appliedCoupon.maxDiscountAmount;
      }
    } else if (appliedCoupon.discountType === 'flat') {
      discount = Math.min(appliedCoupon.discountValue, subtotal);
    } else if (appliedCoupon.discountType === 'free_shipping') {
      isFreeShipping = true;
    }
  }

  const shipping = isFreeShipping ? 0 : 250;
  const grandTotal = Math.max(0, subtotal - discount + shipping);

  useEffect(() => {
    if (appliedCoupon) {
      sessionStorage.setItem('appliedCoupon', JSON.stringify({
        ...appliedCoupon,
        discountAmount: discount
      }));
    } else {
      sessionStorage.removeItem('appliedCoupon');
    }
  }, [appliedCoupon, discount]);

  const handleApplyCoupon = async (e) => {
    e?.preventDefault();
    if (!promoCode.trim()) {
      toast.error('Please enter a promo code');
      return;
    }

    setValidating(true);
    try {
      const { data } = await axios.post(`${API_URL}/api/coupons/validate`, {
        code: promoCode.trim(),
        cartTotal: subtotal
      });

      if (data.success) {
        setAppliedCoupon(data.coupon);
        toast.success(data.message || `Code ${data.coupon.code} applied!`);
        setPromoCode('');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid or expired promo code');
    } finally {
      setValidating(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    toast.success('Coupon removed');
  };

  if (cartItems.length === 0) {
    return (
      <div className="cart-page empty-cart-page page-enter">
        <div className="container cart-container">
          <div className="empty-cart-card">
            <div className="empty-icon-wrap">
              <ShoppingBag size={48} strokeWidth={1.2} />
            </div>
            <h1>Your Shopping Bag is Empty</h1>
            <p>It looks like you haven't added any designer couture or stitch items to your bag yet.</p>
            <Link to="/boutiques" className="checkout-btn" style={{ maxWidth: '240px', margin: '8px auto 0' }}>
              Explore Boutiques <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="cart-page page-enter">
      <div className="container cart-container">
        <div className="cart-header">
          <Link to="/boutiques" className="back-link">
            <ArrowLeft size={14} /> Continue Shopping
          </Link>
          <h1 className="cart-title">SHOPPING BAG</h1>
          <p className="cart-count-label">{cartItems.length} {cartItems.length === 1 ? 'item' : 'items'} currently selected</p>
        </div>

        <div className="cart-grid">
          {/* Items List */}
          <div className="cart-items-section">
            <div className="cart-items-list">
              {cartItems.map((item) => (
                <div key={`${item._id}-${item.size}-${item.color}`} className="cart-item">
                  <div className="cart-item-img">
                    <img src={item.images?.[0] || `https://picsum.photos/seed/${item._id}/120/155`} alt={item.name} />
                  </div>
                  
                  <div className="cart-item-details">
                    <div className="item-main">
                      <div>
                        <p className="item-boutique">{item.boutique?.name || 'Auto Stitch Exclusive'}</p>
                        <h3 className="item-name">{item.name}</h3>
                        <div className="item-variants">
                          {item.size && <span className="variant-tag">Size: {item.size}</span>}
                          {item.color && <span className="variant-tag">Color: {item.color}</span>}
                        </div>
                      </div>
                      <p className="item-price">PKR {item.price.toLocaleString()}</p>
                    </div>

                    <div className="item-actions">
                      <div className="quantity-control">
                        <button 
                          type="button"
                          onClick={() => updateQuantity(item._id, item.quantity - 1, item.size, item.color)}
                          disabled={item.quantity <= 1}
                          aria-label="Decrease quantity"
                        >
                          <Minus size={14} />
                        </button>
                        <span>{item.quantity}</span>
                        <button 
                          type="button"
                          onClick={() => updateQuantity(item._id, item.quantity + 1, item.size, item.color)}
                          aria-label="Increase quantity"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                      
                      <button 
                        type="button"
                        className="remove-btn"
                        onClick={() => removeFromCart(item._id, item.size, item.color)}
                      >
                        <Trash2 size={14} /> <span>Remove</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="cart-features-grid">
              <div className="feature-item">
                <ShieldCheck size={20} />
                <div>
                  <h4>Secure Payment</h4>
                  <p>Encrypted Stripe checkout & COD protection</p>
                </div>
              </div>
              <div className="feature-item">
                <Truck size={20} />
                <div>
                  <h4>Express Delivery</h4>
                  <p>Nationwide priority courier service</p>
                </div>
              </div>
              <div className="feature-item">
                <RotateCcw size={20} />
                <div>
                  <h4>Quality Guarantee</h4>
                  <p>Complimentary custom fitting & adjustments</p>
                </div>
              </div>
            </div>
          </div>

          {/* Summary Sidebar */}
          <div className="cart-summary-section">
            <div className="summary-card">
              <h2 className="summary-title">ORDER SUMMARY</h2>
              
              <div className="summary-rows">
                <div className="summary-row">
                  <span>Subtotal</span>
                  <span style={{ fontWeight: 600, color: '#1a1a2e' }}>PKR {subtotal.toLocaleString()}</span>
                </div>

                {discount > 0 && (
                  <div className="summary-row" style={{ color: '#16a34a' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <Tag size={13} /> Discount ({appliedCoupon?.code})
                    </span>
                    <span style={{ fontWeight: 600 }}>-PKR {discount.toLocaleString()}</span>
                  </div>
                )}

                <div className="summary-row">
                  <span>Standard Shipping</span>
                  <span style={{ fontWeight: 600, color: shipping === 0 ? '#16a34a' : '#1a1a2e' }}>
                    {shipping === 0 ? 'FREE' : `PKR ${shipping}`}
                  </span>
                </div>
                {shipping > 0 && (
                  <p className="shipping-hint">
                    Add PKR {(5000 - subtotal).toLocaleString()} more for free shipping
                  </p>
                )}
                
                <div className="summary-divider" />
                
                <div className="summary-row total-row">
                  <span>Total Amount</span>
                  <span className="total-amount">PKR {grandTotal.toLocaleString()}</span>
                </div>
              </div>

              {/* Coupon Box */}
              {!appliedCoupon ? (
                <form onSubmit={handleApplyCoupon} className="promo-box">
                  <input 
                    type="text" 
                    placeholder="Promo Code (e.g. EID20)" 
                    className="promo-input" 
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                  />
                  <button type="submit" className="promo-btn" disabled={validating}>
                    {validating ? '...' : 'Apply'}
                  </button>
                </form>
              ) : (
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: '#000000',
                  color: '#ffffff',
                  border: '1px solid #000000',
                  padding: '10px 14px',
                  marginBottom: '16px',
                  fontSize: '12px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  fontWeight: 600
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle size={15} />
                    <span>CODE <strong>{appliedCoupon.code}</strong> (-PKR {discount.toLocaleString()})</span>
                  </div>
                  <button 
                    type="button" 
                    onClick={handleRemoveCoupon} 
                    style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                    title="Remove coupon"
                  >
                    <X size={15} />
                  </button>
                </div>
              )}

              <Link to="/checkout" className="checkout-btn">
                PROCEED TO CHECKOUT <ArrowRight size={16} />
              </Link>
              
              <p className="tax-hint">Applicable taxes and delivery confirmed at checkout</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
