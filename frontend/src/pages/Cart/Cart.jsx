import { Link } from 'react-router-dom';
import { 
  ShoppingBag, Trash2, Plus, Minus, ArrowLeft, 
  ArrowRight, ShieldCheck, Truck, RotateCcw 
} from 'lucide-react';
import { useCart } from '../../context/CartContext';
import './Cart.css';

export default function Cart() {
  const { cartItems, removeFromCart, updateQuantity, getCartTotal } = useCart();
  const subtotal = getCartTotal();
  const shipping = subtotal > 5000 ? 0 : 250;
  const total = subtotal + shipping;

  if (cartItems.length === 0) {
    return (
      <div className="cart-page empty-cart-page page-enter">
        <div className="container">
          <div className="empty-cart-card glass-card">
            <div className="empty-icon-wrap">
              <ShoppingBag size={64} strokeWidth={1} />
            </div>
            <h1>Your shopping bag is empty</h1>
            <p className="text-muted">It looks like you haven't added any premium couture to your bag yet.</p>
            <Link to="/boutiques" className="btn btn-primary btn-lg">
              Start Shopping <ArrowRight size={18} />
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
            <ArrowLeft size={16} /> Continue Shopping
          </Link>
          <h1 className="cart-title">Shopping <span className="text-gradient">Bag</span></h1>
          <p className="cart-count-label">{cartItems.length} Items in your bag</p>
        </div>

        <div className="cart-grid">
          {/* Items List */}
          <div className="cart-items-section">
            <div className="cart-items-list">
              {cartItems.map((item) => (
                <div key={`${item._id}-${item.size}-${item.color}`} className="cart-item glass-card">
                  <div className="cart-item-img">
                    <img src={item.images?.[0] || `https://picsum.photos/seed/${item._id}/80/100`} alt={item.name} />
                  </div>
                  
                  <div className="cart-item-details">
                    <div className="item-main">
                      <div>
                        <p className="item-boutique text-muted">{item.boutique?.name || 'Auto Stitch Exclusive'}</p>
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
                          onClick={() => updateQuantity(item._id, item.quantity - 1, item.size, item.color)}
                          disabled={item.quantity <= 1}
                        >
                          <Minus size={14} />
                        </button>
                        <span>{item.quantity}</span>
                        <button 
                          onClick={() => updateQuantity(item._id, item.quantity + 1, item.size, item.color)}
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                      
                      <button 
                        className="remove-btn"
                        onClick={() => removeFromCart(item._id, item.size, item.color)}
                      >
                        <Trash2 size={16} /> <span>Remove</span>
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
                  <p>100% secure payment processing</p>
                </div>
              </div>
              <div className="feature-item">
                <Truck size={20} />
                <div>
                  <h4>Fast Delivery</h4>
                  <p>Express nationwide shipping</p>
                </div>
              </div>
              <div className="feature-item">
                <RotateCcw size={20} />
                <div>
                  <h4>Easy Returns</h4>
                  <p>7-day hassle-free return policy</p>
                </div>
              </div>
            </div>
          </div>

          {/* Summary Sidebar */}
          <div className="cart-summary-section">
            <div className="summary-card glass-card">
              <h2 className="summary-title">Order Summary</h2>
              
              <div className="summary-rows">
                <div className="summary-row">
                  <span>Subtotal</span>
                  <span>PKR {subtotal.toLocaleString()}</span>
                </div>
                <div className="summary-row">
                  <span>Shipping</span>
                  <span>{shipping === 0 ? 'FREE' : `PKR ${shipping}`}</span>
                </div>
                {shipping > 0 && (
                  <p className="shipping-hint">
                    Add PKR {(5000 - subtotal).toLocaleString()} more for free shipping
                  </p>
                )}
                
                <div className="summary-divider" />
                
                <div className="summary-row total-row">
                  <span>Total</span>
                  <span className="total-amount">PKR {total.toLocaleString()}</span>
                </div>
              </div>

              <div className="promo-box">
                <input type="text" placeholder="Promo Code" className="promo-input" />
                <button className="btn btn-ghost btn-sm">Apply</button>
              </div>

              <Link to="/checkout" className="btn btn-primary btn-lg w-full checkout-btn">
                Proceed to Checkout <ArrowRight size={18} />
              </Link>
              
              <p className="tax-hint text-muted">Taxes and duties calculated at checkout</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
