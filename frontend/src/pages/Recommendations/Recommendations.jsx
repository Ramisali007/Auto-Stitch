import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Sparkles, TrendingUp, Star, Package, 
  Heart, ShoppingBag, ArrowRight, RotateCcw as Loader, 
  Filter, ChevronRight, Wand2 
} from 'lucide-react';
import axios from 'axios';
import API_URL from '../../config/api';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import toast from 'react-hot-toast';
import '../Dashboard/Dashboard.css';
import './Recommendations.css';

const CATEGORIES = [
  'All',
  'Luxury Pret',
  'Formal',
  'Bridal',
  'Casual',
  'Luxury Formals',
  'Semi-Formal'
];

export default function Recommendations() {
  const [data, setData] = useState({ forYou: [], trending: [], topRated: [], newArrivals: [] });
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [activeTab, setActiveTab] = useState('all');
  const { addToCart } = useCart();
  const { wishlistItems, toggleWishlist } = useWishlist();

  useEffect(() => { 
    document.title = 'Curated For You — Auto Stitch'; 
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    fetchRecommendations();
  }, [selectedCategory]);

  const fetchRecommendations = async () => {
    setLoading(true);
    try {
      // Gather client-side signals from localStorage
      const viewedProducts = JSON.parse(localStorage.getItem('viewedProducts') || '[]');
      const viewedIds = viewedProducts.map(p => p._id).join(',');
      const viewedCats = Array.from(new Set(viewedProducts.map(p => p.category).filter(Boolean))).join(',');

      const categoryParam = selectedCategory === 'All' ? 'all' : selectedCategory;
      const url = `${API_URL}/api/products/recommendations?category=${encodeURIComponent(categoryParam)}&viewedProductIds=${viewedIds}&viewedCategories=${viewedCats}&limit=8`;
      
      const res = await axios.get(url);
      if (res.data.success) {
        setData(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load AI recommendations:', err);
    } finally {
      setLoading(false);
    }
  };

  const isWishlisted = (id) => wishlistItems?.some(item => item._id === id);

  const handleAddToCart = (product, e) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(product, 1, product.sizes?.[0] || 'M', '');
    toast.success(`Added ${product.name} to bag`);
  };

  const handleToggleWish = (product, e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(product);
  };

  const getImageUrl = (img) => {
    if (!img) return '';
    if (img.startsWith('/uploads')) return `${API_URL}${img}`;
    if (img.startsWith('uploads/')) return `${API_URL}/${img}`;
    return img;
  };

  const renderProductCard = (p) => {
    const wished = isWishlisted(p._id);
    const imgSrc = getImageUrl(p.images?.[0]);

    return (
      <div key={p._id} className="reco-item-card">
        {/* Top AI Insight Tag */}
        <div className="reco-ai-badge-clean">
          <Sparkles size={11} color="#c5a059" />
          <span>{p.aiReason || 'Curated for your style'}</span>
        </div>

        <div className="reco-item-img-wrap">
          <Link to={`/products/${p._id}`}>
            <img 
              src={imgSrc} 
              alt={p.name} 
              className="reco-item-img"
              loading="lazy"
            />
          </Link>

          {/* Overlay Actions */}
          <div className="reco-overlay-actions">
            <button 
              className={`reco-btn-circle ${wished ? 'wished' : ''}`}
              onClick={(e) => handleToggleWish(p, e)}
              title={wished ? 'Remove from Wishlist' : 'Save to Wishlist'}
            >
              <Heart size={15} fill={wished ? '#ef4444' : 'none'} color={wished ? '#ef4444' : '#1a1a2e'} />
            </button>
            <button 
              className="reco-btn-circle"
              onClick={(e) => handleAddToCart(p, e)}
              title="Add to Bag"
            >
              <ShoppingBag size={15} color="#1a1a2e" />
            </button>
          </div>

          {/* Quick Virtual Try-On Pill */}
          {p.tryOnEnabled !== false && (
            <Link 
              to={`/try-on?id=${p._id}&name=${encodeURIComponent(p.name)}&image=${encodeURIComponent(p.images?.[0] || '')}&category=${encodeURIComponent(p.category || 'Luxury Pret')}&price=${p.price}&boutique=${p.boutique?._id || p.boutique}`}
              className="reco-tryon-pill-clean"
            >
              <Wand2 size={12} /> Virtual Try-On
            </Link>
          )}
        </div>

        <div className="reco-item-details">
          <div className="reco-item-brand-row">
            <span className="reco-brand-label">{p.boutique?.name || 'Exclusive Boutique'}</span>
            <span className="reco-cat-label">{p.category}</span>
          </div>

          <Link to={`/products/${p._id}`} className="reco-item-name">
            {p.name?.toUpperCase()}
          </Link>

          <div className="reco-item-price-row">
            <span className="reco-item-price">PKR {p.price?.toLocaleString()}</span>
            {p.avgRating > 0 && (
              <span className="reco-rating-clean">
                <Star size={12} fill="#c5a059" color="#c5a059" /> {p.avgRating.toFixed(1)}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="dashboard-page recommendations-page page-enter">
      <div className="container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 2rem' }}>
        
        {/* Breadcrumb Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: '#888', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '1.5rem' }}>
          <Link to="/" style={{ color: '#888', textDecoration: 'none' }}>Home</Link>
          <ChevronRight size={12} />
          <Link to="/catalogue" style={{ color: '#888', textDecoration: 'none' }}>Catalogue</Link>
          <ChevronRight size={12} />
          <span style={{ color: '#1a1a2e', fontWeight: 600 }}>AI Recommendations</span>
        </div>

        {/* Dashboard-Style Editorial Header */}
        <div className="dashboard-section" style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#888', marginBottom: '8px' }}>
            <Sparkles size={14} color="#c5a059" /> AI Style Intelligence
          </div>
          <h1 className="dashboard-welcome" style={{ fontSize: '2.4rem', margin: '0 0 10px 0' }}>
            Curated <span className="text-gradient">For You</span>
          </h1>
          <p style={{ fontSize: '0.9rem', color: '#666', maxWidth: '640px', margin: '0 auto', lineHeight: '1.6' }}>
            Personalized garment recommendations matched to your style taste, browsing history,
            and highest rated boutique craftsmanship.
          </p>
        </div>

        {/* Category Filter Pills (Dashboard / Catalogue Minimal Style) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflowX: 'auto', paddingBottom: '12px', marginBottom: '2rem', borderBottom: '1px solid #eee' }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#888', whiteSpace: 'nowrap' }}>
            Filter:
          </span>
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              className={`reco-filter-btn ${selectedCategory === cat ? 'active' : ''}`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat === 'All' ? 'All Collections' : cat}
            </button>
          ))}
        </div>

        {/* Section Tabs */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', marginBottom: '3rem' }}>
          {[
            { id: 'all', label: 'All Curations' },
            { id: 'forYou', label: '✨ For Your Style' },
            { id: 'trending', label: '🔥 Trending This Week' },
            { id: 'topRated', label: '⭐ Top Rated' },
            { id: 'newArrivals', label: '👗 New Boutique Drops' }
          ].map(tab => (
            <button
              key={tab.id}
              className={`reco-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Loading State */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '5rem 2rem' }}>
            <Loader className="spin" size={32} color="#1a1a2e" />
            <p style={{ marginTop: '12px', fontSize: '0.85rem', color: '#888' }}>
              Curating your recommendations from boutique catalogue...
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3.5rem' }}>
            
            {/* Section 1: For Your Style Profile */}
            {(activeTab === 'all' || activeTab === 'forYou') && data.forYou?.length > 0 && (
              <section className="reco-group-section">
                <div className="reco-group-header">
                  <h3 className="dashboard-section-title" style={{ margin: 0, fontSize: '0.85rem', letterSpacing: '0.14em' }}>
                    ✨ Curated For Your Style Profile
                  </h3>
                  <span style={{ fontSize: '0.78rem', color: '#888' }}>
                    Based on your browsing history & categories
                  </span>
                </div>
                <div className="reco-grid-dashboard">
                  {data.forYou.map(p => renderProductCard(p))}
                </div>
              </section>
            )}

            {/* Section 2: Trending This Week */}
            {(activeTab === 'all' || activeTab === 'trending') && data.trending?.length > 0 && (
              <section className="reco-group-section">
                <div className="reco-group-header">
                  <h3 className="dashboard-section-title" style={{ margin: 0, fontSize: '0.85rem', letterSpacing: '0.14em' }}>
                    🔥 Trending This Week
                  </h3>
                  <span style={{ fontSize: '0.78rem', color: '#888' }}>
                    Highest sales velocity across partner boutiques
                  </span>
                </div>
                <div className="reco-grid-dashboard">
                  {data.trending.map(p => renderProductCard(p))}
                </div>
              </section>
            )}

            {/* Section 3: Top Rated Craftsmanship */}
            {(activeTab === 'all' || activeTab === 'topRated') && data.topRated?.length > 0 && (
              <section className="reco-group-section">
                <div className="reco-group-header">
                  <h3 className="dashboard-section-title" style={{ margin: 0, fontSize: '0.85rem', letterSpacing: '0.14em' }}>
                    ⭐ Top Rated by Customers
                  </h3>
                  <span style={{ fontSize: '0.78rem', color: '#888' }}>
                    Verified 5-star customer reviews
                  </span>
                </div>
                <div className="reco-grid-dashboard">
                  {data.topRated.map(p => renderProductCard(p))}
                </div>
              </section>
            )}

            {/* Section 4: New Boutique Drops */}
            {(activeTab === 'all' || activeTab === 'newArrivals') && data.newArrivals?.length > 0 && (
              <section className="reco-group-section">
                <div className="reco-group-header">
                  <h3 className="dashboard-section-title" style={{ margin: 0, fontSize: '0.85rem', letterSpacing: '0.14em' }}>
                    👗 New Boutique Drops
                  </h3>
                  <span style={{ fontSize: '0.78rem', color: '#888' }}>
                    Freshly added designs
                  </span>
                </div>
                <div className="reco-grid-dashboard">
                  {data.newArrivals.map(p => renderProductCard(p))}
                </div>
              </section>
            )}

            {/* Empty State */}
            {(!data.forYou?.length && !data.trending?.length && !data.topRated?.length && !data.newArrivals?.length) && (
              <div style={{ textAlign: 'center', padding: '4rem 2rem', background: '#fafafa', border: '1px solid #eee' }}>
                <Package size={40} strokeWidth={1} style={{ opacity: 0.3, marginBottom: '1rem' }} />
                <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.3rem', margin: '0 0 6px 0' }}>No Recommendations Found</h3>
                <p style={{ color: '#888', fontSize: '0.85rem', marginBottom: '1.5rem' }}>No products match the selected filter criteria.</p>
                <button 
                  onClick={() => setSelectedCategory('All')}
                  style={{ padding: '8px 20px', background: '#1a1a2e', color: '#fff', border: 'none', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', cursor: 'pointer' }}
                >
                  View All Collections
                </button>
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
}
