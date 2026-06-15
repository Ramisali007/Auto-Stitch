import { useState, useEffect } from 'react';
import { Search, CheckCircle, XCircle, Eye, Filter, Package, ChevronRight, RotateCcw as Loader, X, Trash2 } from 'lucide-react';
import axios from 'axios';
import API_URL from '../../config/api';
import '../BoutiqueManage/BoutiqueManage.css';
import './Admin.css';

export default function ListingModeration() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  useEffect(() => { 
    document.title = 'Listing Curation — Admin'; 
    fetchListings();
  }, [filter]);

  const fetchListings = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/admin/products?status=${filter}`, { withCredentials: true });
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
        setListings(prev => prev.map(l => l._id === id ? { ...l, status: res.data.product.status } : l));
        if (selectedProduct?._id === id) setSelectedProduct(res.data.product);
      }
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to permanently delete this product?")) {
      try {
        const res = await axios.delete(`${API_URL}/api/admin/products/${id}`, { withCredentials: true });
        if (res.data.success) {
          setListings(prev => prev.filter(l => l._id !== id));
        }
      } catch (error) {
        console.error('Failed to delete product:', error);
      }
    }
  };

  const handleViewProduct = (product) => {
    setSelectedProduct(product);
    setActiveImageIndex(0);
  };

  const getImageUrl = (url) => {
    if (!url) return 'https://via.placeholder.com/80x100?text=No+Image';
    // If it's a relative backend upload path, prepend the backend URL
    if (url.startsWith('/uploads')) return `${API_URL}${url}`;
    if (url.startsWith('uploads/')) return `${API_URL}/${url}`;
    // Otherwise return as-is (e.g., /Photos/... or http://...)
    return url;
  };

  const filtered = listings.filter(l => {
    const matchSearch = l.name?.toLowerCase().includes(search.toLowerCase()) || 
                      l.boutique?.name?.toLowerCase().includes(search.toLowerCase());
    return matchSearch;
  });

  if (loading && listings.length === 0) {
    return (
      <div className="manage-page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <Loader className="spin" size={40} />
      </div>
    );
  }

  return (
    <div className="manage-page page-enter">
      <div className="manage-container">
        <div className="manage-header-center">
          <h1 className="manage-title-serif">Catalogue <span className="text-gradient">Moderation</span></h1>
          <p className="manage-subtitle">
            Curation and quality control for the Auto Stitch marketplace. Review 
            new submissions, verify authenticity, and ensure stylistic alignment.
          </p>
        </div>

        <div className="manage-toolbar-modern">
          <div className="search-wrap-minimal">
            <Search size={16} className="search-icon-fixed" />
            <input 
              type="text" 
              placeholder="Filter by product or boutique..." 
              value={search} 
              onChange={e => setSearch(e.target.value)}
              className="search-input-minimal"
            />
          </div>
          <div className="manage-filter-group">
            {['all', 'pending', 'approved', 'rejected'].map(f => (
              <button 
                key={f} 
                className={`manage-filter-pill ${filter === f ? 'active' : ''}`} 
                onClick={() => setFilter(f)}
              >
                {f === 'all' ? 'All Items' : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="products-list-modern">
          {loading ? (
             <div style={{ textAlign: 'center', padding: '3rem' }}><Loader className="spin" /></div>
          ) : filtered.length === 0 ? (
            <div className="empty-state-editorial">
              <div className="empty-icon-wrap"><Package size={32} /></div>
              <h3 className="empty-title">Queue is Empty</h3>
              <p className="text-muted">No listings match your current filters.</p>
            </div>
          ) : (
            filtered.map(l => (
              <div key={l._id} className="product-card-premium">
                <div className="pc-image-wrap" style={{ width: '80px', height: '100px', flexShrink: 0 }}>
                  <img 
                    src={getImageUrl(l.images?.[0])} 
                    alt={l.name} 
                    className="pc-image" 
                    style={{ borderRadius: '0' }} 
                    onError={(e) => { e.target.onerror = null; e.target.src = 'https://via.placeholder.com/80x100?text=Error'; }} 
                  />
                </div>
                
                <div className="pc-info-main">
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '0.6rem', fontWeight: '700', color: '#999', textTransform: 'uppercase' }}>{l.boutique?.name || 'Unknown Boutique'}</span>
                    <span style={{ fontSize: '0.6rem', fontWeight: '700', color: '#eee' }}>|</span>
                    <span style={{ fontSize: '0.6rem', fontWeight: '700', color: '#999', textTransform: 'uppercase' }}>{l.category}</span>
                  </div>
                  <h3 className="pc-name">{l.name}</h3>
                  <p className="pc-category">Submitted on {new Date(l.createdAt).toLocaleDateString()}</p>
                </div>

                <div className="pc-stats-row">
                  <div className="pc-stat-item">
                    <p className="pc-stat-value">PKR {l.price?.toLocaleString()}</p>
                    <p className="pc-stat-label">List Price</p>
                  </div>
                </div>

                <div className="pc-status-tag" style={{ 
                  background: l.status === 'approved' ? 'rgba(46, 125, 50, 0.05)' : l.status === 'rejected' ? 'rgba(211, 47, 47, 0.05)' : 'rgba(245, 158, 11, 0.05)',
                  color: l.status === 'approved' ? '#2e7d32' : l.status === 'rejected' ? '#d32f2f' : '#f59e0b',
                  border: `1px solid ${l.status === 'approved' ? 'rgba(46, 125, 50, 0.1)' : l.status === 'rejected' ? 'rgba(211, 47, 47, 0.1)' : 'rgba(245, 158, 11, 0.1)'}`,
                  minWidth: '100px',
                  justifyContent: 'center',
                  textTransform: 'capitalize'
                }}>
                  {l.status}
                </div>

                <div className="pc-actions">
                  {l.status === 'pending' ? (
                    <>
                      <button className="btn-black-premium" style={{ padding: '8px 16px', fontSize: '0.65rem' }} onClick={() => handleAction(l._id, 'approved')}>Approve</button>
                      <button className="pc-action-btn" title="Reject" onClick={() => handleAction(l._id, 'rejected')}><XCircle size={16} /></button>
                    </>
                  ) : (
                    <button className="btn-white-outline" style={{ padding: '8px 16px', fontSize: '0.65rem' }} onClick={() => handleAction(l._id, 'pending')}>Re-evaluate</button>
                  )}
                  <button className="pc-action-btn" title="Detailed View" onClick={() => handleViewProduct(l)}><Eye size={16} /></button>
                  <button className="pc-action-btn" title="Delete Product" onClick={() => handleDelete(l._id)} style={{ color: '#ef4444' }}><Trash2 size={16} /></button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Product Detail Modal */}
      {selectedProduct && (
        <div className="modal-overlay" onClick={() => setSelectedProduct(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '800px' }}>
            <button className="modal-close" onClick={() => setSelectedProduct(null)}><X size={24} /></button>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '3rem' }}>
              <div className="product-image-side">
                <img 
                  src={getImageUrl(selectedProduct.images?.[activeImageIndex])} 
                  alt={selectedProduct.name} 
                  style={{ width: '100%', height: 'auto', border: '1px solid #eee' }} 
                  onError={(e) => { e.target.onerror = null; e.target.src = 'https://via.placeholder.com/400x500?text=Error'; }} 
                />
                <div className="upload-preview-grid" style={{ marginTop: '1rem', display: 'flex', gap: '10px', overflowX: 'auto' }}>
                  {selectedProduct.images?.map((img, i) => (
                    <img 
                      key={i} 
                      src={getImageUrl(img)} 
                      onClick={() => setActiveImageIndex(i)}
                      style={{ 
                        width: '60px', height: '75px', objectFit: 'cover', 
                        border: activeImageIndex === i ? '2px solid #000' : '1px solid #eee',
                        cursor: 'pointer',
                        opacity: activeImageIndex === i ? 1 : 0.5,
                        transition: 'all 0.2s ease'
                      }} 
                      onError={(e) => { e.target.onerror = null; e.target.src = 'https://via.placeholder.com/60x75?text=X'; }} 
                    />
                  ))}
                </div>
              </div>

              <div className="product-info-side">
                <div style={{ marginBottom: '2rem' }}>
                  <span className="pc-category" style={{ fontSize: '0.8rem' }}>{selectedProduct.boutique?.name || 'Unknown Boutique'}</span>
                  <h2 className="modal-title" style={{ textAlign: 'left', margin: '0.5rem 0', fontSize: '2.4rem' }}>{selectedProduct.name}</h2>
                  <p className="pc-stat-value" style={{ fontSize: '1.4rem' }}>PKR {selectedProduct.price?.toLocaleString()}</p>
                </div>

                <div style={{ marginBottom: '2rem' }}>
                  <p className="pc-stat-label" style={{ marginBottom: '10px' }}>Description</p>
                  <p style={{ fontSize: '0.9rem', color: '#666', lineHeight: '1.8' }}>
                    {selectedProduct.description || 'No detailed description provided for this listing.'}
                  </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2.5rem' }}>
                  <div>
                    <p className="pc-stat-label">Category</p>
                    <p style={{ fontSize: '0.9rem', color: '#111' }}>{selectedProduct.category}</p>
                  </div>
                  <div>
                    <p className="pc-stat-label">Stock Status</p>
                    <p style={{ fontSize: '0.9rem', color: '#111' }}>{selectedProduct.countInStock} items available</p>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid #eee', paddingTop: '2rem', display: 'flex', gap: '1rem' }}>
                  {selectedProduct.status === 'pending' ? (
                    <>
                      <button className="btn-premium-action" style={{ flex: 1 }} onClick={() => handleAction(selectedProduct._id, 'approved')}>Approve Product</button>
                      <button className="btn-premium-cancel" style={{ flex: 1 }} onClick={() => handleAction(selectedProduct._id, 'rejected')}>Reject Submission</button>
                    </>
                  ) : (
                    <button className="btn-premium-action" style={{ flex: 1 }} onClick={() => handleAction(selectedProduct._id, 'pending')}>Move to Pending</button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
