import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Minus, Plus } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import './CartDrawer.css';

export default function CartDrawer() {
  const { cartItems, isCartOpen, setIsCartOpen, removeFromCart, updateQuantity, getCartTotal } = useCart();
  const navigate = useNavigate();

  // Prevent scrolling when drawer is open
  useEffect(() => {
    if (isCartOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isCartOpen]);

  const handleCheckout = () => {
    setIsCartOpen(false);
    navigate('/checkout');
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`cart-drawer-overlay ${isCartOpen ? 'open' : ''}`} 
        onClick={() => setIsCartOpen(false)}
      />

      {/* Drawer */}
      <div className={`cart-drawer ${isCartOpen ? 'open' : ''}`}>
        <div className="cart-drawer-header">
          <h2 className="cart-drawer-title">Shopping Cart ({cartItems.length})</h2>
          <button className="cart-close-btn" onClick={() => setIsCartOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <div className="cart-drawer-items">
          {cartItems.length === 0 ? (
            <div className="empty-drawer">
              <p>Your shopping cart is empty.</p>
              <button 
                className="btn btn-outline btn-sm mt-md" 
                onClick={() => {
                  setIsCartOpen(false);
                  navigate('/boutiques');
                }}
              >
                Continue Shopping
              </button>
            </div>
          ) : (
            cartItems.map((item) => (
              <div key={`${item._id}-${item.size}-${item.color}`} className="drawer-item">
                <div className="drawer-item-img">
                  <img src={item.images?.[0] || `https://picsum.photos/seed/${item._id}/80/100`} alt={item.name} />
                </div>
                <div className="drawer-item-details">
                  <div className="drawer-item-main">
                    <h3 className="drawer-item-name">{item.name}</h3>
                    <p className="drawer-item-price">Rs. {item.price.toLocaleString()}.00</p>
                    <div className="drawer-item-variants">
                      {item.size && <span>Size (IT): {item.size}</span>}
                      {item.color && <span>Color: {item.color}</span>}
                    </div>
                  </div>
                  <div className="drawer-item-actions">
                    <div className="drawer-quantity">
                      <button onClick={() => updateQuantity(item._id, item.quantity - 1, item.size, item.color)}><Minus size={12} /></button>
                      <span>{item.quantity}</span>
                      <button onClick={() => updateQuantity(item._id, item.quantity + 1, item.size, item.color)}><Plus size={12} /></button>
                    </div>
                    <button className="drawer-remove-btn" onClick={() => removeFromCart(item._id, item.size, item.color)}>
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {cartItems.length > 0 && (
          <div className="cart-drawer-footer">
            <p className="footer-tax-hint">Tax calculated at checkout.</p>
            <div className="footer-total">
              <span>Total</span>
              <span className="total-price">Rs. {getCartTotal().toLocaleString()}.00</span>
            </div>
            <button className="drawer-checkout-btn" onClick={handleCheckout}>
              Checkout
            </button>
            <p className="footer-shipping-hint">
              Complimentary shipping on all orders <span style={{textDecoration: 'underline'}}>worldwide</span>
            </p>
          </div>
        )}
      </div>
    </>
  );
}
