import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Star, ShoppingCart, Sparkles, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import './ProductCard.css';

export default function ProductCard({ product, onAddToCart, onWishlist, isWishlisted }) {
  const [hovered, setHovered] = useState(false);
  const [wishActive, setWishActive] = useState(isWishlisted || false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const nextImage = (e) => {
    e.preventDefault();
    setCurrentImageIndex((prev) => (prev === product.images.length - 1 ? 0 : prev + 1));
  };

  const prevImage = (e) => {
    e.preventDefault();
    setCurrentImageIndex((prev) => (prev === 0 ? product.images.length - 1 : prev - 1));
  };

  const handleWishlist = (e) => {
    e.preventDefault();
    setWishActive(!wishActive);
    onWishlist && onWishlist(product._id);
  };

  const handleAddCart = (e) => {
    e.preventDefault();
    onAddToCart && onAddToCart(product);
  };

  const formatPrice = (price) => `PKR ${price?.toLocaleString()}`;

  const renderStars = (rating) =>
    Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        size={12}
        fill={i < Math.round(rating) ? 'currentColor' : 'none'}
        className={i < Math.round(rating) ? 'star-filled' : 'star-empty'}
      />
    ));

  return (
    <Link
      to={`/products/${product._id}`}
      className="product-card"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Image */}
      <div className="product-image-wrap">
        <img
          src={product.images?.[currentImageIndex] || `https://picsum.photos/seed/${product._id || 'default'}/400/500`}
          alt={product.name}
          className="product-image"
        />

        {/* Image Slider Nav */}
        {product.images?.length > 1 && (
          <>
            <button className="product-image-nav left" onClick={prevImage}><ChevronLeft size={16} /></button>
            <button className="product-image-nav right" onClick={nextImage}><ChevronRight size={16} /></button>
            <div className="product-image-dots">
              {product.images.map((_, i) => (
                <span key={i} className={`product-dot ${i === currentImageIndex ? 'active' : ''}`} />
              ))}
            </div>
          </>
        )}

        {/* Overlay Actions */}
        <div className={`product-overlay ${hovered ? 'product-overlay-visible' : ''}`}>
          <button className="product-action-btn" onClick={handleAddCart} title="Add to Cart">
            <ShoppingCart size={18} />
          </button>
          <button className="product-action-btn" title="Quick View">
            <Eye size={18} />
          </button>
        </div>

        {/* Wishlist */}
        <button
          className={`product-wishlist ${wishActive ? 'product-wishlist-active' : ''}`}
          onClick={handleWishlist}
          title="Add to Wishlist"
        >
          <Heart size={16} fill={wishActive ? 'currentColor' : 'none'} />
        </button>

        {/* Badges */}
        <div className="product-badges">
          {product.tryOnEnabled && (
            <span className="product-badge product-badge-tryon">
              <Sparkles size={10} /> Try-On
            </span>
          )}
          {product.discountPrice > 0 && (
            <span className="product-badge product-badge-sale">
              {Math.round(((product.price - product.discountPrice) / product.price) * 100)}% OFF
            </span>
          )}
          {product.stock === 0 && (
            <span className="product-badge product-badge-oos">Out of Stock</span>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="product-info">
        {/* Boutique - Moved to Top */}
        {product.boutique && (
          <p className="product-boutique">{product.boutique.name}</p>
        )}

        {/* Name */}
        <h3 className="product-name">{product.name}</h3>

        {/* Rating */}
        {product.numReviews > 0 && (
          <div className="product-rating">
            <div className="stars">{renderStars(product.avgRating)}</div>
            <span className="product-rating-count">({product.numReviews})</span>
          </div>
        )}

        {/* Price */}
        <div className="product-price-row">
          <span className="product-price">
            {formatPrice(product.discountPrice > 0 ? product.discountPrice : product.price)}
          </span>
          {product.discountPrice > 0 && (
            <span className="product-price-original">{formatPrice(product.price)}</span>
          )}
        </div>

        {/* Sizes preview */}
        {product.sizes?.length > 0 && (
          <div className="product-sizes">
            {product.sizes.slice(0, 5).map((s) => (
              <span key={s} className="product-size-chip">{s}</span>
            ))}
            {product.sizes.length > 5 && <span className="product-size-more">+{product.sizes.length - 5}</span>}
          </div>
        )}
      </div>
    </Link>
  );
}
