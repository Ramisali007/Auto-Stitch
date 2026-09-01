import { useState, useEffect } from 'react';
import { 
  Search, CheckCircle, XCircle, Eye, Filter, Package, 
  ChevronRight, RotateCcw as Loader, X, Trash2, Store, 
  ExternalLink, Sparkles, Building2, ShieldCheck
} from 'lucide-react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import API_URL from '../../config/api';
import '../BoutiqueManage/BoutiqueManage.css';
import './Admin.css';
import toast from 'react-hot-toast';

export default function ListingModeration() {
  const [listings, setListings] = useState([]);
  const [boutiques, setBoutiques] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingBoutiques, setLoadingBoutiques] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selectedBoutiqueId, setSelectedBoutiqueId] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  useEffect(() => { 
    document.title = 'Catalogue Moderation & Store Inventory — Admin'; 
    fetchBoutiques();
  }, []);

  useEffect(() => {
    fetchListings();
  }, [filter, selectedBoutiqueId]);

  const fetchBoutiques = async () => {
    setLoadingBoutiques(true);
    try {
      const res = await axios.get(`${API_URL}/api/admin/boutiques`, { withCredentials: true });
      if (res.data.success) {
        setBoutiques(res.data.boutiques);
      }
    } catch (error) {
      console.error('Failed to fetch boutiques:', error);
    } finally {
      setLoadingBoutiques(false);
    }
  };

  const fetchListings = async () => {
    setLoading(true);
    try {
      const url = `${API_URL}/api/admin/products?status=${filter}&boutiqueId=${selectedBoutiqueId}`;
      const res = await axios.get(url, { withCredentials: true });
      if (res.data.success) {
        setListings(res.data.products);
      }
    } catch (error) {
      console.error('Failed to fetch listings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (id, status) => {
    try {
      const res = await axios.patch(`${API_URL}/api/admin/products/${id}/status`, { status }, { withCredentials: true });
      if (res.data.success) {
        toast.success(`Product ${status} successfully`);
        setListings(prev => prev.map(l => l._id === id ? { ...l, status: res.data.product.status } : l));
        if (selectedProduct?._id === id) setSelectedProduct(res.data.product);
        fetchBoutiques(); // Update badge counters
      }
    } catch (error) {
      toast.error('Failed to update product status');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to permanently delete this product?")) {
      try {
        const res = await axios.delete(`${API_URL}/api/admin/products/${id}`, { withCredentials: true });
        if (res.data.success) {
          toast.success('Product deleted from catalogue');
          setListings(prev => prev.filter(l => l._id !== id));
          if (selectedProduct?._id === id) setSelectedProduct(null);
          fetchBoutiques();
        }
      } catch (error) {
        toast.error('Failed to delete product');
      }
    }
  };

  const handleViewProduct = (product) => {
    setSelectedProduct(product);
    setActiveImageIndex(0);
  };

  const getImageUrl = (url) => {
    if (!url) return 'https://via.placeholder.com/80x100?text=No+Image';
    if (url.startsWith('/uploads')) return `${API_URL}${url}`;
    if (url.startsWith('uploads/')) return `${API_URL}/${url}`;
    return url;
  };

  const currentStore = boutiques.find(b => b._id === selectedBoutiqueId);

  const filtered = listings.filter(l => {
    const matchSearch = l.name?.toLowerCase().includes(search.toLowerCase()) || 
                        l.boutique?.name?.toLowerCase().includes(search.toLowerCase()) ||
                        l.category?.toLowerCase().includes(search.toLowerCase());
    return matchSearch;
  });

  const totalAllProducts = boutiques.reduce((sum, b) => sum + (b.productCount || 0), 0);

  return (
    <div className="manage-page page-enter" style={{ background: '#fafafa', minHeight: '100vh', paddingBottom: '4rem' }}>
      <div className="manage-container" style={{ maxWidth: '1280px', margin: '0 auto', padding: '2rem' }}>
        
        {/* Header */}
        <div className="manage-header-center" style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <h1 className="manage-title-serif" style={{ fontFamily: 'Playfair Display, serif', fontSize: '2.4rem', margin: '0 0 8px 0' }}>
            Catalogue <span className="text-gradient">Moderation</span>
          </h1>
          <p className="manage-subtitle" style={{ fontSize: '0.92rem', color: '#666', maxWidth: '650px', margin: '0 auto' }}>
            Review, curate, and filter products across all marketplace boutiques or select a specific store from the dropdown.
          </p>
        </div>

        {/* Selected Store Banner (If a specific store is selected in dropdown) */}
        {currentStore && (
          <div style={{
            background: '#fff', border: '1px solid #c5a059', borderRadius: '4px', padding: '1.2rem 1.8rem',
            marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{
                width: '48px', height: '48px', borderRadius: '4px', background: '#1a1a2e', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem',
                fontFamily: 'Playfair Display, serif', overflow: 'hidden', border: '1px solid #e5e5e5'
              }}>
                {currentStore.logo ? <img src={currentStore.logo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : currentStore.name?.charAt(0)}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h2 style={{ margin: 0, fontSize: '1.15rem', fontFamily: 'Playfair Display, serif', color: '#1a1a2e' }}>
                    {currentStore.name}
                  </h2>
                  <span style={{ fontSize: '0.7rem', background: '#f0fdf4', color: '#16a34a', padding: '2px 8px', borderRadius: '2px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <ShieldCheck size={12} /> Verified Boutique
                  </span>
                  {currentStore.pendingCount > 0 && (
                    <span style={{ fontSize: '0.7rem', background: '#fef3c7', color: '#b45309', padding: '2px 8px', borderRadius: '2px', fontWeight: 700 }}>
                      ⚠️ {currentStore.pendingCount} Pending Review
                    </span>
                  )}
                </div>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#666' }}>
                  Owner: {currentStore.owner?.name || 'Partner Designer'} ({currentStore.owner?.email}) · Total: {currentStore.productCount || 0} listings
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Link 
                to={`/boutiques/${currentStore._id}`} 
                target="_blank" 
                style={{
                  padding: '7px 12px', background: '#fafafa', color: '#1a1a2e', border: '1px solid #cbd5e1',
                  fontSize: '0.75rem', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px', borderRadius: '2px'
                }}
              >
                <ExternalLink size={13} /> View Public Store
              </Link>
              <button
                onClick={() => setSelectedBoutiqueId('all')}
                style={{
                  padding: '7px 12px', background: '#1a1a2e', color: '#fff', border: 'none',
                  fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', borderRadius: '2px'
                }}
              >
                ✕ Clear Store Filter
              </button>
            </div>
          </div>
        )}

        {/* Toolbar: Store Dropdown + Search + Status Filters */}
        <div className="manage-toolbar-modern" style={{ background: '#fff', border: '1px solid #e5e5e5', padding: '1.2rem', borderRadius: '4px', marginBottom: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
          
          {/* Store Dropdown Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '260px', flex: '1 1 260px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f8f9fa', border: '1px solid #cbd5e1', padding: '8px 12px', borderRadius: '2px', width: '100%' }}>
              <Store size={16} color="#1a1a2e" style={{ flexShrink: 0 }} />
              <select
                value={selectedBoutiqueId}
                onChange={(e) => setSelectedBoutiqueId(e.target.value)}
                style={{
                  border: 'none', background: 'transparent', outline: 'none', width: '100%',
                  fontSize: '0.85rem', fontWeight: 600, color: '#1a1a2e', cursor: 'pointer'
                }}
              >
                <option value="all">🏢 All Stores ({totalAllProducts} Total Products)</option>
                {boutiques.map(b => (
                  <option key={b._id} value={b._id}>
                    {b.name} — {b.productCount || 0} products {b.pendingCount > 0 ? `(${b.pendingCount} pending)` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Search Box */}
          <div className="search-wrap-minimal" style={{ flex: '2 1 260px', minWidth: '220px' }}>
            <Search size={16} className="search-icon-fixed" />
            <input 
              type="text" 
              placeholder={currentStore ? `Search in ${currentStore.name}...` : "Filter by product name, category..."}
              value={search} 
              onChange={e => setSearch(e.target.value)}
              className="search-input-minimal"
              style={{ width: '100%', fontSize: '0.85rem' }}
            />
          </div>

          {/* Status Tabs */}
          <div className="manage-filter-group" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {['all', 'pending', 'approved', 'rejected'].map(f => (
              <button 
                key={f} 
                className={`manage-filter-pill ${filter === f ? 'active' : ''}`} 
                onClick={() => setFilter(f)}
                style={{
                  padding: '7px 14px', fontSize: '0.75rem', fontWeight: 600,
                  textTransform: 'uppercase', letterSpacing: '0.06em',
                  background: filter === f ? '#1a1a2e' : 'transparent',
                  color: filter === f ? '#fff' : '#666',
                  border: filter === f ? '1px solid #1a1a2e' : '1px solid #e5e5e5',
                  cursor: 'pointer', borderRadius: '2px'
                }}
              >
                {f === 'all' ? 'All Statuses' : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Product Listings Queue */}
        <div className="products-list-modern">
          {loading ? (
             <div style={{ textAlign: 'center', padding: '4rem', color: '#888' }}>
               <Loader className="spin" size={32} />
               <p style={{ marginTop: '10px', fontSize: '0.85rem' }}>Loading catalogue entries...</p>
             </div>
          ) : filtered.length === 0 ? (
            <div className="empty-state-editorial" style={{ background: '#fff', padding: '4rem 2rem', textAlign: 'center', border: '1px solid #e5e5e5' }}>
              <div className="empty-icon-wrap" style={{ marginBottom: '1rem', color: '#888' }}><Package size={36} /></div>
              <h3 className="empty-title" style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.3rem', margin: '0 0 6px 0' }}>No Listings Found</h3>
              <p className="text-muted" style={{ fontSize: '0.85rem', color: '#666' }}>
                {currentStore ? `No products found for "${currentStore.name}" matching the current filter.` : 'No listings match your search or filter.'}
              </p>
            </div>
          ) : (
            filtered.map(l => (
              <div key={l._id} className="product-card-premium" style={{ background: '#fff', border: '1px solid #e5e5e5', marginBottom: '12px', padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', gap: '20px' }}>
                <div className="pc-image-wrap" style={{ width: '75px', height: '95px', flexShrink: 0, borderRadius: '2px', overflow: 'hidden', background: '#f5f5f5' }}>
                  <img 
                    src={getImageUrl(l.images?.[0])} 
                    alt={l.name} 
                    className="pc-image" 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    onError={(e) => { e.target.onerror = null; e.target.src = 'https://via.placeholder.com/80x100?text=No+Photo'; }} 
                  />
                </div>
                
                <div className="pc-info-main" style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <button
                      onClick={() => l.boutique?._id && setSelectedBoutiqueId(l.boutique._id)}
                      title="Filter products by this store"
                      style={{
                        background: '#f3f4f6', border: 'none', padding: '2px 8px', borderRadius: '2px',
                        fontSize: '0.7rem', fontWeight: '700', color: '#1a1a2e', textTransform: 'uppercase', cursor: 'pointer'
                      }}
                    >
                      🏬 {l.boutique?.name || 'Independent Atelier'}
                    </button>
                    <span style={{ fontSize: '0.65rem', color: '#ccc' }}>•</span>
                    <span style={{ fontSize: '0.7rem', fontWeight: '600', color: '#888', textTransform: 'uppercase' }}>{l.category}</span>
                  </div>
                  <h3 className="pc-name" style={{ margin: '0 0 4px 0', fontSize: '1.05rem', fontFamily: 'Playfair Display, serif' }}>{l.name}</h3>
                  <p className="pc-category" style={{ margin: 0, fontSize: '0.78rem', color: '#888' }}>
                    Submitted on {new Date(l.createdAt).toLocaleDateString()} · Stock: {l.countInStock || 0} units
                  </p>
                </div>

                <div className="pc-stats-row" style={{ textAlign: 'right', minWidth: '120px' }}>
                  <div className="pc-stat-item">
                    <p className="pc-stat-value" style={{ margin: 0, fontWeight: 700, fontSize: '1rem', color: '#1a1a2e' }}>
                      PKR {l.price?.toLocaleString()}
                    </p>
                    <p className="pc-stat-label" style={{ margin: 0, fontSize: '0.72rem', color: '#888', textTransform: 'uppercase' }}>List Price</p>
                  </div>
                </div>

                <div className="pc-status-tag" style={{ 
                  background: l.status === 'approved' ? '#f0fdf4' : l.status === 'rejected' ? '#fef2f2' : '#fffbeb',
                  color: l.status === 'approved' ? '#16a34a' : l.status === 'rejected' ? '#dc2626' : '#d97706',
                  border: `1px solid ${l.status === 'approved' ? '#bbf7d0' : l.status === 'rejected' ? '#fecaca' : '#fde68a'}`,
                  minWidth: '95px', textAlign: 'center', padding: '6px 12px', borderRadius: '2px',
                  fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase'
                }}>
                  {l.status}
                </div>

                <div className="pc-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {l.status === 'pending' ? (
                    <>
                      <button 
                        style={{ padding: '8px 14px', background: '#16a34a', color: '#fff', border: 'none', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', borderRadius: '2px' }}
                        onClick={() => handleAction(l._id, 'approved')}
                      >
                        Approve
                      </button>
                      <button 
                        style={{ padding: '8px 14px', background: '#dc2626', color: '#fff', border: 'none', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', borderRadius: '2px' }}
                        onClick={() => handleAction(l._id, 'rejected')}
                      >
                        Reject
                      </button>
                    </>
                  ) : (
                    <button 
                      style={{ padding: '8px 12px', background: 'transparent', color: '#1a1a2e', border: '1px solid #1a1a2e', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', borderRadius: '2px' }}
                      onClick={() => handleAction(l._id, 'pending')}
                    >
                      Re-evaluate
                    </button>
                  )}
                  <button 
                    className="pc-action-btn" 
                    title="Detailed View" 
                    onClick={() => handleViewProduct(l)}
                    style={{ background: '#f8f9fa', border: '1px solid #e5e5e5', padding: '8px', cursor: 'pointer', borderRadius: '2px' }}
                  >
                    <Eye size={16} />
                  </button>
                  <button 
                    className="pc-action-btn" 
                    title="Delete Product" 
                    onClick={() => handleDelete(l._id)} 
                    style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#ef4444', padding: '8px', cursor: 'pointer', borderRadius: '2px' }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Product Detail Modal */}
      {selectedProduct && (
        <div className="modal-overlay" onClick={() => setSelectedProduct(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999999, padding: '20px' }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ background: '#fff', maxWidth: '820px', width: '100%', padding: '2.5rem', position: 'relative', border: '1px solid #e5e5e5', maxHeight: '90vh', overflowY: 'auto' }}>
            <button className="modal-close" onClick={() => setSelectedProduct(null)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', cursor: 'pointer' }}>
              <X size={20} />
            </button>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '2.5rem' }}>
              <div className="product-image-side">
                <img 
                  src={getImageUrl(selectedProduct.images?.[activeImageIndex])} 
                  alt={selectedProduct.name} 
                  style={{ width: '100%', height: '380px', objectFit: 'cover', border: '1px solid #eee', borderRadius: '2px' }} 
                  onError={(e) => { e.target.onerror = null; e.target.src = 'https://via.placeholder.com/400x500?text=No+Photo'; }} 
                />
                <div className="upload-preview-grid" style={{ marginTop: '1rem', display: 'flex', gap: '10px', overflowX: 'auto' }}>
                  {selectedProduct.images?.map((img, i) => (
                    <img 
                      key={i} 
                      src={getImageUrl(img)} 
                      onClick={() => setActiveImageIndex(i)}
                      style={{ 
                        width: '60px', height: '75px', objectFit: 'cover', 
                        border: activeImageIndex === i ? '2px solid #1a1a2e' : '1px solid #eee',
                        cursor: 'pointer',
                        opacity: activeImageIndex === i ? 1 : 0.6,
                        transition: 'all 0.2s ease'
                      }} 
                      onError={(e) => { e.target.onerror = null; e.target.src = 'https://via.placeholder.com/60x75?text=X'; }} 
                    />
                  ))}
                </div>
              </div>

              <div className="product-info-side">
                <div style={{ marginBottom: '1.5rem', borderBottom: '1px solid #eee', paddingBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <span className="pc-category" style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', color: '#c5a059' }}>
                      {selectedProduct.boutique?.name || 'Boutique Item'}
                    </span>
                    <span style={{ fontSize: '0.7rem', background: '#f3f4f6', padding: '2px 8px', borderRadius: '2px' }}>
                      {selectedProduct.category}
                    </span>
                  </div>
                  <h2 className="modal-title" style={{ textAlign: 'left', margin: '0 0 8px 0', fontSize: '1.8rem', fontFamily: 'Playfair Display, serif' }}>
                    {selectedProduct.name}
                  </h2>
                  <p className="pc-stat-value" style={{ fontSize: '1.4rem', fontWeight: 700, color: '#1a1a2e', margin: 0 }}>
                    PKR {selectedProduct.price?.toLocaleString()}
                  </p>
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <p className="pc-stat-label" style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#888', marginBottom: '6px' }}>
                    Product Description
                  </p>
                  <p style={{ fontSize: '0.88rem', color: '#555', lineHeight: '1.6', margin: 0 }}>
                    {selectedProduct.description || 'No detailed description provided for this listing.'}
                  </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem', background: '#fafafa', padding: '1rem', border: '1px solid #eee' }}>
                  <div>
                    <p style={{ margin: 0, fontSize: '0.72rem', color: '#888', textTransform: 'uppercase', fontWeight: 700 }}>Current Status</p>
                    <p style={{ margin: '2px 0 0 0', fontSize: '0.9rem', fontWeight: 700, textTransform: 'capitalize', color: selectedProduct.status === 'approved' ? '#16a34a' : '#d97706' }}>
                      {selectedProduct.status}
                    </p>
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: '0.72rem', color: '#888', textTransform: 'uppercase', fontWeight: 700 }}>Inventory Quantity</p>
                    <p style={{ margin: '2px 0 0 0', fontSize: '0.9rem', fontWeight: 700 }}>{selectedProduct.countInStock} items available</p>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid #eee', paddingTop: '1.5rem', display: 'flex', gap: '10px' }}>
                  {selectedProduct.status === 'pending' ? (
                    <>
                      <button 
                        style={{ flex: 1, padding: '12px', background: '#16a34a', color: '#fff', border: 'none', fontWeight: 700, fontSize: '0.82rem', textTransform: 'uppercase', cursor: 'pointer', borderRadius: '2px' }}
                        onClick={() => handleAction(selectedProduct._id, 'approved')}
                      >
                        Approve Listing
                      </button>
                      <button 
                        style={{ flex: 1, padding: '12px', background: '#dc2626', color: '#fff', border: 'none', fontWeight: 700, fontSize: '0.82rem', textTransform: 'uppercase', cursor: 'pointer', borderRadius: '2px' }}
                        onClick={() => handleAction(selectedProduct._id, 'rejected')}
                      >
                        Reject Listing
                      </button>
                    </>
                  ) : (
                    <button 
                      style={{ flex: 1, padding: '12px', background: '#1a1a2e', color: '#fff', border: 'none', fontWeight: 700, fontSize: '0.82rem', textTransform: 'uppercase', cursor: 'pointer', borderRadius: '2px' }}
                      onClick={() => handleAction(selectedProduct._id, 'pending')}
                    >
                      Move to Pending Review
                    </button>
                  )}
                  <button 
                    style={{ padding: '12px 18px', background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', borderRadius: '2px' }}
                    onClick={() => handleDelete(selectedProduct._id)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
