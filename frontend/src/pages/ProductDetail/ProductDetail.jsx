import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Star, Heart, ShoppingCart, Sparkles, Scissors, Share2, Shield, Truck,
  RotateCcw, ChevronLeft, ChevronRight, ZoomIn, CheckCircle, Store, ArrowRight,
  MapPin
} from 'lucide-react';
import ProductCard from '../../components/ProductCard/ProductCard';
import './ProductDetail.css';
import TextType from '../../components/TextType/TextType';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import API_URL from '../../config/api';

// Import Elan Editorial Photos
import elan1 from '../../../Photos/elan/pexels-dhanno-18862319.jpg';
import elan2 from '../../../Photos/elan/pexels-dhanno-18862631.jpg';
import elan3 from '../../../Photos/elan/pexels-dhanno-18976989.jpg';
import elan4 from '../../../Photos/elan/pexels-dhanno-18977034.jpg';
import elan5 from '../../../Photos/elan/pexels-dhanno-19221260.jpg';
import elan6 from '../../../Photos/elan/pexels-dhanno-19248024.jpg';
import elan7 from '../../../Photos/elan/pexels-dhanno-19281279.jpg';
import elan8 from '../../../Photos/elan/pexels-dhanno-19401634.jpg';
import elan9 from '../../../Photos/elan/pexels-dhanno-19733567.jpg';
import elan10 from '../../../Photos/elan/pexels-dhanno-19956008.jpg';
import elan11 from '../../../Photos/elan/pexels-dhanno-20420559.jpg';
import elan12 from '../../../Photos/elan/pexels-dhanno-20527761.jpg';

const MOCK_PRODUCTS = [
  { _id: 'e1', name: 'ZINNIA COTTON KURTA', price: 15400, images: [elan1], description: 'A timeless silhouette in pure cotton, featuring intricate hand-guided embroidery.', category: 'Ready To Wear', boutique: { name: 'Élan' } },
  { _id: 'e2', name: 'AZURE SILK SHIRT', price: 18000, images: [elan2], description: 'Crafted from premium raw silk, this azure shirt embodies effortless luxury.', category: 'Luxury Pret', boutique: { name: 'Élan' } },
  { _id: 'e3', name: 'IVORY CHIFFON SUIT', price: 25000, images: [elan3], description: 'Floating chiffon layers in ivory, perfect for a sophisticated evening look.', category: 'Festive', boutique: { name: 'Élan' } },
  { _id: 'e4', name: 'ROUGE VELVET KAFTAN', price: 22000, images: [elan4], description: 'Deep rouge velvet with gold accents, designed for festive celebrations.', category: 'Evening Wear', boutique: { name: 'Élan' } },
  { _id: 'e5', name: 'MIDNIGHT SATIN GOWN', price: 32000, images: [elan5], description: 'Sleek midnight blue satin with a structured bodice and fluid skirt.', category: 'Couture', boutique: { name: 'Élan' } },
  { _id: 'e6', name: 'FLORAL ORGANZA WRAP', price: 12500, images: [elan6], description: 'Delicate floral prints on sheer organza, finished with hand-stitched borders.', category: 'Ready To Wear', boutique: { name: 'Élan' } },
  { _id: 'e7', name: 'EBONY EMBROIDERED SET', price: 28000, images: [elan7], description: 'Classic ebony black set with monochromatic embroidery and silk detailing.', category: 'Luxury Pret', boutique: { name: 'Élan' } },
  { _id: 'e8', name: 'PEARL BLOSSOM KURTA', price: 14500, images: [elan8], description: 'A fresh take on the classic kurta, adorned with pearl work and floral motifs.', category: 'Daily Wear', boutique: { name: 'Élan' } },
  { _id: 'e9', name: 'AMETHYST LUXE SHIRT', price: 19800, images: [elan9], description: 'Vibrant amethyst tones in a modern cut, perfect for the contemporary woman.', category: 'Luxury Pret', boutique: { name: 'Élan' } },
  { _id: 'e10', name: 'SAFFRON SILK DRAPE', price: 21000, images: [elan10], description: 'Sun-drenched saffron silk that drapes beautifully for an elegant silhouette.', category: 'Festive', boutique: { name: 'Élan' } },
  { _id: 'e11', name: 'CELESTIAL BLUE PRETS', price: 17500, images: [elan11], description: 'Celestial blue hues in a comfortable yet stylish pret ensemble.', category: 'Ready To Wear', boutique: { name: 'Élan' } },
  { _id: 'e12', name: 'EMERALD TRADITIONAL', price: 24000, images: [elan12], description: 'Deep emerald green traditional wear with classical motifs and handiwork.', category: 'Festive', boutique: { name: 'Élan' } },
];

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeAccordion, setActiveAccordion] = useState('details');
  const { addToCart } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const sliderRef = useRef(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const scrollSlider = (direction) => {
    if (sliderRef.current) {
      const scrollAmount = 400;
      sliderRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const nextImage = () => {
    if (product?.images?.length > 1) {
      setCurrentImageIndex((prev) => (prev === product.images.length - 1 ? 0 : prev + 1));
    }
  };

  const prevImage = () => {
    if (product?.images?.length > 1) {
      setCurrentImageIndex((prev) => (prev === 0 ? product.images.length - 1 : prev - 1));
    }
  };

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        if (id.startsWith('e')) {
          const mock = MOCK_PRODUCTS.find(p => p._id === id);
          if (mock) {
            setProduct(mock);
            document.title = `${mock.name} — Auto Stitch`;
            setLoading(false);
            return;
          }
        }
        const { data } = await axios.get(`${API_URL}/api/products/${id}`);
        setProduct(data.product);
        document.title = `${data.product.name} — Auto Stitch`;
      } catch (err) {
        setError('Failed to fetch product details.');
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
    window.scrollTo(0, 0);
  }, [id]);

  if (loading || !product) return <div className="loading-state">Loading...</div>;

  return (
    <div className="editorial-product-page">
      {/* 1. Brand Identity Header (Same as Boutique Profile) */}
      <header className="brand-editorial-header">
        <div className="brand-header-top" style={{ justifyContent: 'center' }}>
          <div className="brand-main-identity">
            {product.boutique?._id ? (
              <Link to={`/boutiques/${product.boutique._id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'inline-block' }}>
                <TextType
                  text={product.boutique.name}
                  as="h1"
                  className="brand-logo-serif"
                  typingSpeed={120}
                  pauseDuration={3000}
                  showCursor={true}
                  cursorCharacter="_"
                />
              </Link>
            ) : (
              <TextType
                text={product.boutique.name}
                as="h1"
                className="brand-logo-serif"
                typingSpeed={120}
                pauseDuration={3000}
                showCursor={true}
                cursorCharacter="_"
              />
            )}
          </div>
        </div>
      </header>

      {/* 2. Product Content */}
      <main className="product-editorial-container">
        <div className="product-detail-grid">
          {/* Left: Large Image */}
          <div className="product-image-section">
            <div className="main-editorial-image-wrapper">
              <img src={product.images[currentImageIndex] || product.images[0]} alt={product.name} className="main-editorial-image" />
              {product.images?.length > 1 && (
                <>
                  <button className="pd-image-nav left" onClick={prevImage}><ChevronLeft size={24} /></button>
                  <button className="pd-image-nav right" onClick={nextImage}><ChevronRight size={24} /></button>
                  <div className="pd-image-dots">
                    {product.images.map((_, i) => (
                      <span key={i} className={`pd-dot ${i === currentImageIndex ? 'active' : ''}`} />
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Right: Product Info */}
          <div className="product-info-section">
            <div className="pi-header">
              <div className="pi-title-row">
                <h2 className="pi-name">{product.name}</h2>
                <p className="pi-price">Rs.{product.price.toLocaleString()}</p>
              </div>
              <p className="pi-category">{product.category}</p>
            </div>

            <div className="pi-description">
              <p>{product.description}</p>
              <p className="pi-sku">SKU: {product._id.slice(-8).toUpperCase()}</p>
            </div>

            <div className="pi-actions">
              <button
                className="add-to-cart-btn"
                onClick={() => {
                  const storedUser = localStorage.getItem('user');
                  if (!storedUser) {
                    navigate('/login');
                    return;
                  }
                  addToCart(product);
                }}
              >
                Add To Cart
              </button>

              <Link
                to={`/try-on?id=${product._id}&name=${encodeURIComponent(product.name)}&image=${encodeURIComponent(product.images[0])}&category=${encodeURIComponent(product.category)}&price=${product.price}&boutique=${product.boutique?._id || product.boutique}`}
                className="ai-editorial-btn"
              >
                <Sparkles size={16} /> Virtual Try-On
              </Link>

              <Link
                to={`/customize?id=${product._id}&name=${encodeURIComponent(product.name)}&image=${encodeURIComponent(product.images[0])}`}
                className="ai-editorial-btn"
              >
                <Scissors size={16} /> Custom Stitching
              </Link>

              <Link to="/stores" className="find-in-store">
                <MapPin size={14} /> Find in Store
              </Link>
            </div>

            {/* Accordions */}
            <div className="pi-accordions">
              <div className={`accordion-item ${activeAccordion === 'details' ? 'open' : ''}`}>
                <button className="accordion-trigger" onClick={() => setActiveAccordion(activeAccordion === 'details' ? '' : 'details')}>
                  Product Details <span>{activeAccordion === 'details' ? '−' : '+'}</span>
                </button>
                <div className="accordion-content">
                  <p>{product.composition || 'Premium craftsmanship with attention to detail.'}</p>
                </div>
              </div>

              <div className={`accordion-item ${activeAccordion === 'care' ? 'open' : ''}`}>
                <button className="accordion-trigger" onClick={() => setActiveAccordion(activeAccordion === 'care' ? '' : 'care')}>
                  Material and Care <span>{activeAccordion === 'care' ? '−' : '+'}</span>
                </button>
                <div className="accordion-content">
                  <p>Dry clean only. Handle with care to maintain the luxury finish.</p>
                </div>
              </div>

              <div className={`accordion-item ${activeAccordion === 'shipping' ? 'open' : ''}`}>
                <button className="accordion-trigger" onClick={() => setActiveAccordion(activeAccordion === 'shipping' ? '' : 'shipping')}>
                  Shipping & Returns <span>{activeAccordion === 'shipping' ? '−' : '+'}</span>
                </button>
                <div className="accordion-content">
                  <p>Complimentary shipping on all orders worldwide. Returns accepted within 14 days.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* 3. Curated Selections (Interactive Slider) */}
      <section className="curated-selections-section">
        <div className="curated-header-row">
          <h2 className="serif-subtitle">Curated Selections</h2>
          <div className="slider-controls">
            <button className="slider-arrow" onClick={() => scrollSlider('left')}>
              <ChevronLeft size={24} strokeWidth={1} />
            </button>
            <button className="slider-arrow" onClick={() => scrollSlider('right')}>
              <ChevronRight size={24} strokeWidth={1} />
            </button>
          </div>
        </div>

        <div className="curated-slider-outer">
          <div className="curated-slider-track" ref={sliderRef}>
            {MOCK_PRODUCTS.filter(p => p._id !== product._id).map((p) => (
              <div key={p._id} className="editorial-product-card slider-card">
                <div className="ep-image-wrap">
                  <Link to={`/products/${p._id}`}>
                    <img src={p.images[0]} alt={p.name} className="ep-image" />
                  </Link>
                  <button
                    className="ep-wishlist-btn"
                    onClick={() => toggleWishlist(p)}
                  >
                    <Heart
                      size={18}
                      strokeWidth={1}
                      fill={isInWishlist(p._id) ? "#111" : "none"}
                      style={{ color: isInWishlist(p._id) ? "#111" : "inherit" }}
                    />
                  </button>
                </div>
                <div className="ep-details">
                  <div className="ep-info-main">
                    <h3 className="ep-name">{p.name}</h3>
                    <p className="ep-price">Rs.{p.price.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

