import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import {
  Star, Shield, MapPin, Phone, Mail, Globe, Package,
  Clock, ChevronRight, ChevronLeft, Heart, ArrowLeft, Share2, CheckCircle, Search, Sparkles, Scissors
} from 'lucide-react';
import { FaInstagram, FaFacebookF } from 'react-icons/fa6';
import { useWishlist } from '../../context/WishlistContext';
import API_URL from '../../config/api';
import './BoutiqueProfile.css';

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
import brandCatalogFooter from '../../../Photos/boutique page catalog/footer.png';


;

const EditorialProductCard = ({ product, toggleWishlist, isInWishlist }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const nextImage = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev === product.images.length - 1 ? 0 : prev + 1));
  };

  const prevImage = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev === 0 ? product.images.length - 1 : prev - 1));
  };

  return (
    <div className="editorial-product-card">
      <div className="ep-image-wrap">
        <Link to={`/products/${product._id}`}>
          <img src={product.images[currentImageIndex] || product.images[0]} alt={product.name} className="ep-image" />
        </Link>

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

        {product.status && <span className="ep-badge">{product.status}</span>}
        <button
          className="ep-wishlist-btn"
          onClick={(e) => {
            e.preventDefault();
            toggleWishlist(product);
          }}
        >
          <Heart
            size={18}
            strokeWidth={1}
            fill={isInWishlist(product._id) ? "#111" : "none"}
            style={{ color: isInWishlist(product._id) ? "#111" : "inherit" }}
          />
        </button>
      </div>

      <div className="ep-details">
        <div className="ep-info-main">
          <h3 className="ep-name">{product.name}</h3>
          <p className="ep-price">Rs.{product.price?.toLocaleString()}</p>
        </div>

        <div className="ep-actions" style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
          <Link
            to={`/try-on?id=${product._id}&name=${encodeURIComponent(product.name)}&image=${encodeURIComponent(product.images[0])}&category=${encodeURIComponent(product.category || 'Luxury Pret')}&price=${product.price}&boutique=${product.boutique?._id || product.boutique}`}
            className="btn-black"
            style={{
              fontSize: '0.7rem',
              padding: '8px 15px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              textDecoration: 'none',
              justifyContent: 'center',
              flex: 1
            }}
          >
            <Sparkles size={12} /> Virtual Try-On
          </Link>
          <Link
            to={`/customize?id=${product._id}&name=${encodeURIComponent(product.name)}&image=${encodeURIComponent(product.images[0])}`}
            className="btn-black"
            style={{
              fontSize: '0.7rem',
              padding: '8px 15px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              textDecoration: 'none',
              justifyContent: 'center',
              flex: 1,
              background: '#fff',
              color: '#000',
              border: '1px solid #000'
            }}
          >
            <Scissors size={12} /> Customize
          </Link>
        </div>
      </div>
    </div>
  );
};

export default function BoutiqueProfile() {
  const { id } = useParams();
  const [boutique, setBoutique] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toggleWishlist, isInWishlist } = useWishlist();

  useEffect(() => {
    window.scrollTo(0, 0);

    const fetchData = async () => {
      try {
        setLoading(true);
        // Try to fetch real boutique first
        const bRes = await axios.get(`${API_URL}/api/boutiques/${id}`);
        if (bRes.data.success) {
          const boutiqueData = bRes.data.data;
          setBoutique(boutiqueData);
          document.title = `${boutiqueData.name} — Auto Stitch`;
          
          // Fetch products using the real boutique ID
          const pRes = await axios.get(`${API_URL}/api/products?boutiqueId=${boutiqueData._id}&limit=100`);
          setProducts(pRes.data.products || []);
        }
      } catch (err) {
        console.error('Fetch error:', err);
        document.title = `Auto Stitch`;
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const productsToDisplay = products;

  return (
    <div className="editorial-boutique-page">
      {/* Brand Editorial Header */}
      <header className="brand-editorial-header">
        <div className="brand-header-top" style={{ justifyContent: 'center' }}>
          <div className="brand-main-identity">
            <h1 className="brand-logo-serif">{boutique?.name || 'Loading...'}</h1>
          </div>
        </div>

        <div className="brand-subheader" style={{ justifyContent: 'flex-start', marginTop: '20px' }}>
          <h2 className="serif-subtitle">New Arrivals</h2>
        </div>
      </header>

      {/* Editorial Product Grid */}
      <main className="editorial-container">
        {loading && products.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '100px' }}>Loading...</div>
        ) : (
          <div className="editorial-grid-v4">
            {productsToDisplay.map((product) => (
              <EditorialProductCard
                key={product._id}
                product={product}
                toggleWishlist={toggleWishlist}
                isInWishlist={isInWishlist}
              />
            ))}
          </div>
        )}
      </main>

      {/* Brand Catalog Footer Banner */}
      <section className="brand-catalog-footer-section">
        <img src={brandCatalogFooter} alt="Brand Catalog" className="brand-catalog-footer-img" />
      </section>

      {/* Mini Floating Actions */}
      <div className="brand-floating-actions">
        <Link to={`/chat?boutiqueId=${id}&boutiqueName=${encodeURIComponent(boutique?.name || '')}&ownerId=${boutique?.owner?._id || boutique?.owner || ''}`} className="chat-trigger">
          <div className="chat-dot"></div>
          <div className="chat-dot"></div>
          <div className="chat-dot"></div>
        </Link>
      </div>
    </div>
  );
}
