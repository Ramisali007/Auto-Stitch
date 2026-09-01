import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Star, Heart, ShoppingCart, Sparkles, Scissors, Share2, Shield, Truck,
  RotateCcw, ChevronLeft, ChevronRight, ZoomIn, CheckCircle, Store, ArrowRight,
  MapPin, MessageSquarePlus, X, MessageSquare, Camera, Download
} from 'lucide-react';
import ProductCard from '../../components/ProductCard/ProductCard';
import './ProductDetail.css';
import TextType from '../../components/TextType/TextType';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import { ProductDetailSkeleton } from '../../components/SkeletonLoader/SkeletonLoader';
import API_URL from '../../config/api';
import toast from 'react-hot-toast';

// Import Elan Editorial Photos for fallback/curated display
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
  const [relatedProducts, setRelatedProducts] = useState([]);
  
  // Reviews State
  const [reviews, setReviews] = useState([]);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '', fitFeedback: 'True to Size' });
  const [submittingReview, setSubmittingReview] = useState(false);

  // Virtual Try-On State (Privacy-First In-Page Modal)
  const [showTryOnModal, setShowTryOnModal] = useState(false);
  const [tryOnPhoto, setTryOnPhoto] = useState(null);
  const [tryOnLoading, setTryOnLoading] = useState(false);
  const [tryOnStage, setTryOnStage] = useState('');
  const [tryOnResult, setTryOnResult] = useState(null);
  const [tryOnJobId, setTryOnJobId] = useState(null);
  const [tryOnSessionToken, setTryOnSessionToken] = useState('');
  const [showOriginal, setShowOriginal] = useState(false);
  const tryOnFileRef = useRef(null);

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

  const fetchReviews = async (productId) => {
    try {
      const { data } = await axios.get(`${API_URL}/api/products/${productId}/reviews`);
      if (data.success) {
        setReviews(data.reviews || []);
      }
    } catch (err) {
      // Fallback
    }
  };

  const fetchRelatedProducts = async (category, currentId) => {
    try {
      const { data } = await axios.get(`${API_URL}/api/products?category=${encodeURIComponent(category)}&limit=8`);
      if (data.success && data.products?.length > 0) {
        const filtered = data.products.filter(p => p._id !== currentId);
        setRelatedProducts(filtered);
      }
    } catch (err) {
      // Fallback
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
        
        // Record in viewed history for AI recommendations engine
        try {
          const viewed = JSON.parse(localStorage.getItem('viewedProducts') || '[]');
          const updated = [
            { _id: data.product._id, category: data.product.category, name: data.product.name },
            ...viewed.filter(p => p._id !== data.product._id)
          ].slice(0, 15);
          localStorage.setItem('viewedProducts', JSON.stringify(updated));
        } catch (e) {}

        // Fetch reviews and related products
        fetchReviews(data.product._id);
        if (data.product.category) {
          fetchRelatedProducts(data.product.category, data.product._id);
        }
      } catch (err) {
        setError('Failed to fetch product details.');
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
    window.scrollTo(0, 0);
  }, [id]);

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload a valid image file (JPEG, PNG, WebP)');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image size exceeds 10MB limit. Please upload a smaller photo.');
      return;
    }

    // Client-side image resize & orientation normalization on HTML5 Canvas
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        const maxDim = 1200;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const resizedDataUrl = canvas.toDataURL('image/webp', 0.92);
        setTryOnPhoto(resizedDataUrl);
        setTryOnResult(null);
        toast.success('Photo ready for Virtual Try-On');
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleRunTryOn = async () => {
    if (!tryOnPhoto || !product || tryOnLoading) return;

    setTryOnLoading(true);
    setTryOnStage('Initializing secure session...');
    setTryOnResult(null);

    try {
      // 1. Create Session
      const sessionRes = await axios.post(`${API_URL}/api/vto/session`, {
        productId: product._id,
        boutiqueId: product.boutique?._id || product.boutique,
      }, { withCredentials: true });

      const currentJobId = sessionRes.data.jobId;
      const currentToken = sessionRes.data.sessionToken;
      setTryOnJobId(currentJobId);
      setTryOnSessionToken(currentToken);

      setTryOnStage('Analyzing photo & validating posture...');

      // 2. Submit Job
      await axios.post(`${API_URL}/api/vto/jobs`, {
        jobId: currentJobId,
        userPhoto: tryOnPhoto,
        fitStyle: 'Tailored',
      }, {
        headers: { 'x-vto-session': currentToken },
        withCredentials: true,
      });

      setTryOnStage('Fitting garment to silhouette...');

      // 3. Poll for result
      let attempts = 0;
      const maxAttempts = 30;
      const pollInterval = setInterval(async () => {
        attempts++;
        try {
          const statusRes = await axios.get(`${API_URL}/api/vto/jobs/${currentJobId}`, {
            headers: { 'x-vto-session': currentToken },
            withCredentials: true,
          });

          if (statusRes.data.status === 'completed' && statusRes.data.resultUrl) {
            clearInterval(pollInterval);
            setTryOnResult(statusRes.data.resultUrl);
            setTryOnLoading(false);
            setTryOnStage('');
            toast.success('Virtual Try-On generated! Source photo purged from server.');
          } else if (statusRes.data.status === 'failed') {
            clearInterval(pollInterval);
            setTryOnLoading(false);
            setTryOnStage('');
            toast.error(statusRes.data.errorDescription || 'Try-on could not be generated for this photo.');
          } else {
            if (attempts > 5) setTryOnStage('Refining cloth drape and realistic lighting...');
          }
        } catch (_) {
          // Poll continue
        }

        if (attempts >= maxAttempts) {
          clearInterval(pollInterval);
          setTryOnLoading(false);
          setTryOnStage('');
          toast.error('Try-on processing timed out. Please try again.');
        }
      }, 1500);
    } catch (err) {
      console.warn('VTO Asynchronous flow notice, attempting direct generation:', err.message);
      // Fallback direct endpoint
      try {
        setTryOnStage('Generating virtual try-on...');
        const directRes = await axios.post(`${API_URL}/api/try-on/process`, {
          userPhoto: tryOnPhoto,
          garmentImage: product.images?.[0] || '',
          garmentName: product.name,
          category: product.category,
          fitStyle: 'Tailored',
        });
        if (directRes.data.success && directRes.data.resultImage) {
          setTryOnResult(directRes.data.resultImage);
          toast.success('Virtual Try-On preview generated!');
        } else {
          toast.error('Failed to generate try-on preview.');
        }
      } catch (directErr) {
        toast.error('Could not complete virtual try-on. Please try a different photo.');
      } finally {
        setTryOnLoading(false);
        setTryOnStage('');
      }
    }
  };

  const handleCancelTryOn = async () => {
    if (tryOnJobId) {
      try {
        await axios.delete(`${API_URL}/api/vto/jobs/${tryOnJobId}`, {
          headers: { 'x-vto-session': tryOnSessionToken },
          withCredentials: true,
        });
      } catch (_) {}
    }
    setTryOnPhoto(null);
    setTryOnResult(null);
    setTryOnJobId(null);
    setTryOnLoading(false);
    toast.success('Temporary photo and preview deleted from server.');
  };

  const handleDownloadResult = () => {
    if (!tryOnResult) return;
    const link = document.createElement('a');
    link.href = tryOnResult;
    link.download = `auto-stitch-tryon-${product?.name?.toLowerCase().replace(/\s+/g, '-') || 'garment'}.webp`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Try-on image saved to your device!');
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      toast.error('Please sign in to leave a review.');
      navigate('/login');
      return;
    }

    setSubmittingReview(true);
    try {
      const { data } = await axios.post(`${API_URL}/api/products/${product._id}/reviews`, reviewForm, {
        withCredentials: true
      });
      if (data.success) {
        toast.success('Thank you! Your review has been published.');
        setShowReviewModal(false);
        setReviewForm({ rating: 5, comment: '', fitFeedback: 'True to Size' });
        fetchReviews(product._id);
        if (data.avgRating !== undefined) {
          setProduct(prev => ({ ...prev, avgRating: data.avgRating, numReviews: data.numReviews }));
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit review.');
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <div className="editorial-product-page" style={{ paddingTop: '100px' }}>
        <ProductDetailSkeleton />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="editorial-product-page" style={{ paddingTop: '140px', paddingBottom: '100px', textAlign: 'center' }}>
        <div className="container" style={{ maxWidth: '600px', margin: '0 auto' }}>
          <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '2rem', marginBottom: '1rem' }}>
            Garment Design Not Found
          </h2>
          <p style={{ color: '#666', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '2rem' }}>
            The requested design piece is currently unavailable or has been archived from boutique ateliers.
          </p>
          <Link 
            to="/catalogue" 
            style={{
              display: 'inline-block',
              background: '#1a1a2e',
              color: '#fff',
              padding: '12px 28px',
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: '0.85rem',
              letterSpacing: '0.08em',
              textTransform: 'uppercase'
            }}
          >
            Explore Collections
          </Link>
        </div>
      </div>
    );
  }

  const displayCurated = relatedProducts.length > 0 ? relatedProducts : MOCK_PRODUCTS.filter(p => p._id !== product?._id);
  const productImages = (product?.images && Array.isArray(product.images) && product.images.length > 0) ? product.images : [elan1];

  return (
    <div className="editorial-product-page">
      {/* 0. Editorial Breadcrumbs */}
      <div className="container" style={{ paddingTop: '90px', paddingBottom: '0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', color: '#888', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          <Link to="/" style={{ color: '#888', textDecoration: 'none' }}>Home</Link>
          <ChevronRight size={12} />
          <Link to="/catalogue" style={{ color: '#888', textDecoration: 'none' }}>Collections</Link>
          <ChevronRight size={12} />
          <Link to={`/catalogue?category=${encodeURIComponent(product.category || 'Ready To Wear')}`} style={{ color: '#888', textDecoration: 'none' }}>
            {product.category || 'Collection'}
          </Link>
          <ChevronRight size={12} />
          <span style={{ color: '#1a1a2e', fontWeight: 600 }}>{product.name}</span>
        </div>
      </div>

      {/* 1. Brand Identity Header */}
      <header className="brand-editorial-header" style={{ paddingTop: '16px' }}>
        <div className="brand-header-top" style={{ justifyContent: 'center' }}>
          <div className="brand-main-identity">
            {product.boutique?._id ? (
              <Link to={`/boutiques/${product.boutique._id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'inline-block' }}>
                <TextType
                  text={product.boutique.name || 'Boutique Collection'}
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
                text={product.boutique?.name || 'Auto Stitch'}
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
              <img src={productImages[currentImageIndex] || productImages[0]} alt={product.name} className="main-editorial-image" />
              {productImages.length > 1 && (
                <>
                  <button className="pd-image-nav left" onClick={prevImage}><ChevronLeft size={24} /></button>
                  <button className="pd-image-nav right" onClick={nextImage}><ChevronRight size={24} /></button>
                  <div className="pd-image-dots">
                    {productImages.map((_, i) => (
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
                <p className="pi-price">Rs.{product.price?.toLocaleString()}</p>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                <p className="pi-category" style={{ margin: 0 }}>{product.category}</p>
                {product.avgRating > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem', color: '#1a1a2e', fontWeight: 600 }}>
                    <Star size={14} fill="#1a1a2e" />
                    <span>{product.avgRating.toFixed(1)}</span>
                    <span style={{ color: '#888', fontWeight: 400 }}>({product.numReviews || reviews.length})</span>
                  </div>
                )}
              </div>
            </div>

            <div className="pi-description">
              <p>{product.description}</p>
              <p className="pi-sku">SKU: {product._id?.slice(-8).toUpperCase()}</p>
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

              {/* Direct Boutique In-Chat Inquiry */}
              {product.boutique?._id && (
                <Link
                  to={`/chat?boutiqueId=${product.boutique._id}&boutiqueName=${encodeURIComponent(product.boutique.name)}`}
                  className="ai-editorial-btn"
                  style={{ background: '#fafafa', color: '#1a1a2e', border: '1px solid #1a1a2e' }}
                >
                  <MessageSquare size={16} /> Chat with Boutique about Custom Fit
                </Link>
              )}

              <button
                type="button"
                onClick={() => setShowTryOnModal(true)}
                className="ai-editorial-btn"
                style={{ cursor: 'pointer' }}
              >
                <Sparkles size={16} /> Virtual Try-On
              </button>

              <Link
                to={`/customize?id=${product._id}&name=${encodeURIComponent(product.name || 'Garment')}&image=${encodeURIComponent(productImages[0])}`}
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
                  <p>{product.material ? `Material: ${product.material}. ` : ''}{product.composition || 'Premium craftsmanship with signature attention to detail.'}</p>
                </div>
              </div>

              <div className={`accordion-item ${activeAccordion === 'care' ? 'open' : ''}`}>
                <button className="accordion-trigger" onClick={() => setActiveAccordion(activeAccordion === 'care' ? '' : 'care')}>
                  Material and Care <span>{activeAccordion === 'care' ? '−' : '+'}</span>
                </button>
                <div className="accordion-content">
                  <p>Dry clean only recommended. Handle delicate embellishments with care to maintain the luxury finish.</p>
                </div>
              </div>

              <div className={`accordion-item ${activeAccordion === 'shipping' ? 'open' : ''}`}>
                <button className="accordion-trigger" onClick={() => setActiveAccordion(activeAccordion === 'shipping' ? '' : 'shipping')}>
                  Shipping & Returns <span>{activeAccordion === 'shipping' ? '−' : '+'}</span>
                </button>
                <div className="accordion-content">
                  <p>Free nationwide shipping on orders over PKR 5,000. 7-day hassle-free exchange and alteration policy.</p>
                </div>
              </div>

              {/* Customer Reviews Accordion */}
              <div className={`accordion-item ${activeAccordion === 'reviews' ? 'open' : ''}`}>
                <button className="accordion-trigger" onClick={() => setActiveAccordion(activeAccordion === 'reviews' ? '' : 'reviews')}>
                  Client Reviews ({reviews.length}) <span>{activeAccordion === 'reviews' ? '−' : '+'}</span>
                </button>
                <div className="accordion-content">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div>
                      <p style={{ margin: 0, fontWeight: 600, fontSize: '0.95rem' }}>
                        {product.avgRating ? `${product.avgRating.toFixed(1)} out of 5 Stars` : 'No reviews yet'}
                      </p>
                      <p style={{ margin: 0, fontSize: '0.8rem', color: '#888' }}>Based on verified customer orders</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowReviewModal(true)}
                      style={{
                        padding: '6px 14px',
                        background: '#161925',
                        color: '#fff',
                        border: 'none',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        cursor: 'pointer'
                      }}
                    >
                      Write a Review
                    </button>
                  </div>

                  {reviews.length === 0 ? (
                    <p style={{ fontSize: '0.85rem', color: '#666' }}>Be the first to share your thoughts on this design.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      {reviews.map((rev) => (
                        <div key={rev._id} style={{ borderBottom: '1px solid #f0f0f0', paddingBottom: '12px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <div style={{ display: 'flex', gap: '2px' }}>
                                {[1, 2, 3, 4, 5].map((s) => (
                                  <Star key={s} size={12} fill={s <= rev.rating ? '#1a1a2e' : 'none'} color="#1a1a2e" />
                                ))}
                              </div>
                              <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{rev.customerName}</span>
                            </div>
                            <span style={{ fontSize: '0.72rem', background: '#f0fdf4', color: '#16a34a', padding: '2px 6px' }}>Verified</span>
                          </div>
                          <p style={{ fontSize: '0.85rem', color: '#444', margin: '4px 0' }}>{rev.comment}</p>
                          <span style={{ fontSize: '0.75rem', color: '#888' }}>Fit: {rev.fitFeedback}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* 3. Review Submission Modal */}
      {showReviewModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999999, padding: '20px'
        }}>
          <div style={{
            background: '#ffffff', border: '1px solid #e5e5e5', maxWidth: '460px', width: '100%',
            padding: '2rem', position: 'relative', color: '#1a1a2e'
          }}>
            <button
              onClick={() => setShowReviewModal(false)}
              style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', cursor: 'pointer', color: '#666' }}
            >
              <X size={18} />
            </button>

            <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.4rem', margin: '0 0 6px 0', textAlign: 'center' }}>
              Review This Design
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#666', textAlign: 'center', margin: '0 0 1.5rem 0' }}>
              Share your fit, fabric, and styling experience with other shoppers.
            </p>

            <form onSubmit={handleReviewSubmit}>
              <div style={{ marginBottom: '1.2rem', textAlign: 'center' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '8px' }}>
                  Your Rating
                </label>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                  {[1, 2, 3, 4, 5].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setReviewForm({ ...reviewForm, rating: num })}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                    >
                      <Star size={24} fill={num <= reviewForm.rating ? '#1a1a2e' : 'none'} color="#1a1a2e" />
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: '1.2rem' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Fit Feedback
                </label>
                <select
                  value={reviewForm.fitFeedback}
                  onChange={(e) => setReviewForm({ ...reviewForm, fitFeedback: e.target.value })}
                  style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '0.85rem', outline: 'none' }}
                >
                  <option value="True to Size">True to Size</option>
                  <option value="Runs Small">Runs Small</option>
                  <option value="Runs Large">Runs Large</option>
                  <option value="Custom Fitted">Custom Fitted</option>
                </select>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Your Comments
                </label>
                <textarea
                  rows={4}
                  value={reviewForm.comment}
                  onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                  placeholder="Share details about the silhouette, fabric quality, and finish..."
                  required
                  style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }}
                ></textarea>
              </div>

              <button
                type="submit"
                disabled={submittingReview}
                style={{
                  width: '100%', padding: '12px', background: '#161925', color: '#fff', border: 'none',
                  fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em',
                  cursor: submittingReview ? 'not-allowed' : 'pointer'
                }}
              >
                {submittingReview ? 'Submitting...' : 'Post Review'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Privacy-First Virtual Try-On In-Page Studio Modal */}
      {showTryOnModal && (
        <div className="vto-modal-overlay" onClick={() => !tryOnLoading && setShowTryOnModal(false)}>
          <div className="vto-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="vto-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={16} color="#ffffff" />
                <h3 className="vto-header-title">
                  VIRTUAL <span style={{ color: '#c5a059' }}>TRY-ON STUDIO</span>
                </h3>
              </div>
              <button
                type="button"
                className="vto-close-btn"
                onClick={() => !tryOnLoading && setShowTryOnModal(false)}
                disabled={tryOnLoading}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <div className="vto-modal-body">
              {/* Product Brief Banner */}
              <div className="vto-product-badge">
                <img src={productImages[0]} alt={product.name} className="vto-badge-thumb" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p className="vto-badge-name">{product.name}</p>
                  <p className="vto-badge-meta">
                    {product.boutique?.name || 'Boutique Atelier'} • Rs. {product.price?.toLocaleString()}
                  </p>
                </div>
                <Link
                  to={`/try-on?id=${product._id}&name=${encodeURIComponent(product.name || 'Garment')}&image=${encodeURIComponent(productImages[0])}&category=${encodeURIComponent(product.category || 'dresses')}&price=${product.price || 0}&boutique=${product.boutique?._id || product.boutique || ''}`}
                  className="vto-fullscreen-link"
                >
                  Full Studio <ArrowRight size={12} />
                </Link>
              </div>

              {/* Main Content Area */}
              {!tryOnResult ? (
                <div className="vto-upload-zone">
                  {!tryOnPhoto ? (
                    <div
                      className="vto-drop-area"
                      onClick={() => tryOnFileRef.current?.click()}
                    >
                      <input
                        type="file"
                        ref={tryOnFileRef}
                        accept="image/jpeg,image/png,image/webp"
                        style={{ display: 'none' }}
                        onChange={handlePhotoUpload}
                      />
                      <div className="vto-drop-icon-wrap">
                        <Camera size={22} color="#000000" />
                      </div>
                      <p className="vto-drop-heading">
                        Take or Upload Your Photograph
                      </p>
                      <p className="vto-drop-subtext">
                        Clear front-facing portrait or waist-up pose (JPEG, PNG, WebP)
                      </p>
                    </div>
                  ) : (
                    <div className="vto-preview-box">
                      <div style={{ position: 'relative', width: '100%', height: '280px', borderRadius: '2px', overflow: 'hidden', background: '#111', border: '1px solid #000' }}>
                        <img src={tryOnPhoto} alt="Your Portrait" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                        {!tryOnLoading && (
                          <button
                            type="button"
                            className="vto-change-photo-btn"
                            onClick={() => tryOnFileRef.current?.click()}
                          >
                            Change Photo
                          </button>
                        )}
                        <input
                          type="file"
                          ref={tryOnFileRef}
                          accept="image/jpeg,image/png,image/webp"
                          style={{ display: 'none' }}
                          onChange={handlePhotoUpload}
                        />
                      </div>

                      {tryOnLoading && (
                        <div className="vto-processing-overlay">
                          <div className="vto-spinner"></div>
                          <p style={{ margin: '12px 0 4px', fontWeight: 600, fontSize: '0.85rem', color: '#fff', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                            {tryOnStage || 'Generating Virtual Try-On...'}
                          </p>
                          <p style={{ margin: 0, fontSize: '0.75rem', color: '#bbb' }}>
                            100% identity and face preservation active
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Privacy Notice Card */}
                  <div className="vto-privacy-card">
                    <Shield size={16} color="#000000" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div style={{ fontSize: '0.75rem', color: '#444444', lineHeight: 1.45 }}>
                      <strong>Privacy Guarantee:</strong> Your photograph is encrypted and used solely for generating your visual garment preview. It is automatically purged from our servers immediately after processing and never stored for model training.
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                    <button
                      type="button"
                      disabled={!tryOnPhoto || tryOnLoading}
                      onClick={handleRunTryOn}
                      className="vto-primary-btn"
                    >
                      <Sparkles size={15} />
                      {tryOnLoading ? 'Processing Try-On...' : 'Generate Try-On Preview'}
                    </button>
                  </div>
                </div>
              ) : (
                /* Result View */
                <div className="vto-result-container">
                  <div className="vto-result-image-box">
                    <img
                      src={showOriginal ? tryOnPhoto : tryOnResult}
                      alt="Virtual Try-On Result"
                      style={{ width: '100%', height: '340px', objectFit: 'contain', background: '#111111', borderRadius: '2px', border: '1px solid #000' }}
                    />
                    <div className="vto-badge-floating">
                      {showOriginal ? 'ORIGINAL PHOTO' : '✨ AI TRY-ON FITTED'}
                    </div>
                  </div>

                  <div className="vto-result-controls">
                    <button
                      type="button"
                      onMouseDown={() => setShowOriginal(true)}
                      onMouseUp={() => setShowOriginal(false)}
                      onTouchStart={() => setShowOriginal(true)}
                      onTouchEnd={() => setShowOriginal(false)}
                      className="vto-compare-btn"
                    >
                      Hold to Compare Original
                    </button>

                    <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                      <button
                        type="button"
                        onClick={handleDownloadResult}
                        className="vto-download-btn"
                      >
                        <Download size={14} /> Download Image
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelTryOn}
                        className="vto-delete-btn"
                      >
                        <RotateCcw size={14} /> Delete & Try Another
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. Curated Selections (Interactive Slider with live related items) */}
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
            {displayCurated.map((p) => (
              <div key={p._id} className="editorial-product-card slider-card">
                <div className="ep-image-wrap">
                  <Link to={`/products/${p._id}`}>
                    <img src={p.images?.[0] || elan1} alt={p.name} className="ep-image" />
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
                    <p className="ep-price">Rs.{p.price?.toLocaleString()}</p>
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

