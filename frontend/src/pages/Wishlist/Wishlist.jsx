import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Heart, ShoppingCart, Trash2, Sparkles, X } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import './Wishlist.css';

export default function Wishlist() {
  const { wishlistItems, removeFromWishlist } = useWishlist();
  const { addToCart } = useCart();

  useEffect(() => { document.title = 'My Wishlist — Auto Stitch'; }, []);

  const handleAddToCart = (item) => {
    addToCart(item, 1, item.sizes ? item.sizes[0] : '', '');
  };

  return (
    <div className="wishlist-page page-enter">
      <div className="wishlist-container">
        <div className="wishlist-header-v2">
          <h1 className="wishlist-title-serif">Curated <span className="text-gradient">Collections</span></h1>
          <p className="wishlist-subtitle">{wishlistItems.length} Masterpieces Saved</p>
        </div>

        {wishlistItems.length === 0 ? (
          <div className="wl-empty-editorial animate-fade-in">
            <div className="wl-empty-icon"><Heart size={64} strokeWidth={1} /></div>
            <h2 className="wishlist-title-serif" style={{ fontSize: '2rem' }}>A Canvas Awaiting Inspiration</h2>
            <p className="text-muted" style={{ marginBottom: '3rem' }}>Your wishlist is currently a blank slate. Explore our boutiques to find pieces that resonate with your style.</p>
            <Link to="/boutiques" className="wl-cart-btn-v2" style={{ display: 'inline-block', width: 'auto', padding: '1rem 3rem' }}>Discover Designers</Link>
          </div>
        ) : (
          <div className="wishlist-grid-editorial">
            {wishlistItems.map(item => (
              <div key={item._id} className="wishlist-card-premium animate-fade-in">
                <div className="wl-img-container">
                  <Link to={`/products/${item._id}`}>
                    <img src={item.images[0]} alt={item.name} />
                  </Link>
                  <div className="wl-overlay-actions">
                    <button className="wl-action-btn-v2" title="Remove from Curations" onClick={() => removeFromWishlist(item._id)}>
                      <X size={18} />
                    </button>
                  </div>
                  {item.tryOnEnabled && (
                    <Link 
                      to={`/try-on?id=${item._id}&name=${encodeURIComponent(item.name)}&image=${encodeURIComponent(item.images[0])}&category=${encodeURIComponent(item.category || 'Luxury Pret')}&price=${item.price}`} 
                      className="wl-tryon-pill-v2"
                    >
                      <Sparkles size={14} /> Virtual Couture Try-On
                    </Link>
                  )}
                </div>
                <div className="wl-content-v2">
                  <span className="wl-brand-v2">{item.boutique ? item.boutique.name : 'Exclusive Designer'}</span>
                  <Link to={`/products/${item._id}`} className="wl-item-name-v2">{item.name}</Link>
                  <p className="wl-item-price-v2">PKR {(item.discountPrice || item.price).toLocaleString()}</p>
                  
                  <button
                    className="wl-cart-btn-v2"
                    onClick={() => handleAddToCart(item)}
                    disabled={item.stock === 0}
                  >
                    {item.stock === 0 ? 'Currently Unavailable' : 'Add to Shopping Bag'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
