import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Plus, Search, Edit, Trash2, X, Package, RotateCcw as Loader, AlertCircle, Upload } from 'lucide-react';
import API_URL from '../../config/api';
import './BoutiqueManage.css';

export default function ManageProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'Formal',
    price: '',
    stock: '',
    images: []
  });

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'Manage Products — Boutique';
    fetchProducts();
  }, []);

  // Sync modal with URL for "Add New"
  useEffect(() => {
    if (location.pathname === '/boutique/products/new') {
      openAddModal();
    }
  }, [location]);

  const fetchProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`${API_URL}/api/products/my-products`, { withCredentials: true });
      if (res.data.success) {
        setProducts(res.data.products);
      }
    } catch (err) {
      console.error('Fetch failed:', err);
      setError(err.response?.data?.message || 'Failed to connect to server.');
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingProduct(null);
    setFormData({ name: '', description: '', category: 'Formal', price: '', stock: '', images: [] });
    setShowModal(true);
  };

  const openEditModal = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description,
      category: product.category,
      price: product.price,
      stock: product.stock,
      images: product.images || []
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    if (location.pathname === '/boutique/products/new') {
      navigate('/boutique/products');
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (index, value) => {
    const newImages = [...formData.images];
    newImages[index] = value;
    setFormData(prev => ({ ...prev, images: newImages }));
  };

  const removeImageField = (index) => {
    const newImages = formData.images.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, images: newImages }));
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const uploadData = new FormData();
    uploadData.append('image', file);

    setUploading(true);
    try {
      const res = await axios.post(`${API_URL}/api/upload`, uploadData, {
        withCredentials: true,
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      if (res.data.success) {
        setFormData(prev => ({ ...prev, images: [...prev.images, res.data.url] }));
      }
    } catch (err) {
      alert('Upload failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        price: Number(formData.price),
        stock: Number(formData.stock),
        images: formData.images.filter(img => img.trim() !== '')
      };

      if (editingProduct) {
        await axios.put(`${API_URL}/api/products/${editingProduct._id}`, payload, { withCredentials: true });
      } else {
        await axios.post(`${API_URL}/api/products`, payload, { withCredentials: true });
      }

      closeModal();
      fetchProducts();
    } catch (err) {
      alert(err.response?.data?.message || 'Operation failed');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    try {
      await axios.delete(`${API_URL}/api/products/${id}`, { withCredentials: true });
      setProducts(prev => prev.filter(p => p._id !== id));
    } catch (err) {
      alert('Failed to delete product');
    }
  };

  const filtered = Array.isArray(products) ? products.filter(p => 
    p.name?.toLowerCase().includes(search.toLowerCase())
  ) : [];

  if (loading) {
    return (
      <div className="manage-page flex-center" style={{ minHeight: '60vh', flexDirection: 'column', gap: '1rem' }}>
        <Loader className="animate-spin" size={40} style={{ color: 'var(--color-primary)' }} />
        <p className="text-muted">Loading your catalogue...</p>
        <style>{`
          @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          .animate-spin { animation: spin 1s linear infinite; }
        `}</style>
      </div>
    );
  }

  return (
    <div className="manage-page page-enter">
      <div className="manage-container">
        {error && (
          <div className="glass-card" style={{ padding: '1rem', marginBottom: '2rem', border: '1px solid var(--color-error)', background: 'var(--color-error-bg)', color: 'var(--color-error)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertCircle size={20} />
            <p>{error}</p>
          </div>
        )}
        <div className="manage-header-center">
          <h1 className="manage-title-serif">Manage <span className="text-gradient">Catalogue</span></h1>
          <p className="manage-subtitle">
            Curate and refine your boutique's presence. Every listing here contributes to your 
            brand's editorial experience on Auto Stitch.
          </p>
          <button onClick={openAddModal} className="btn-black-premium">
            <Plus size={18} /> Add New Product
          </button>
        </div>

        <div className="manage-toolbar-modern">
          <div className="search-wrap-minimal">
            <Search size={18} className="search-icon-fixed" />
            <input 
              type="text" 
              placeholder="Filter by name..." 
              className="search-input-minimal"
              value={search} 
              onChange={e => setSearch(e.target.value)} 
            />
          </div>
          <span className="product-count-badge">{filtered.length} products found</span>
        </div>

        <div className="products-list-modern">
          {filtered.length === 0 ? (
            <div className="empty-state-editorial">
              <div className="empty-icon-wrap">
                <Package size={40} strokeWidth={1} />
              </div>
              <h3 className="empty-title">Catalogue is Empty</h3>
              <p className="text-muted" style={{ marginBottom: '2.5rem' }}>Your boutique showroom is ready but has no listings.</p>
              <button onClick={openAddModal} className="btn-black-premium">
                Create First Product
              </button>
            </div>
          ) : (
            filtered.map(p => (
              <div key={p._id} className="product-card-premium">
                <div className="pc-image-wrap">
                  <img src={p.images?.[0] || 'https://via.placeholder.com/80x100'} alt={p.name} className="pc-image" />
                </div>
                
                <div className="pc-info-main">
                  <h3 className="pc-name">{p.name}</h3>
                  <p className="pc-category">{p.category}</p>
                </div>

                <div className="pc-stats-row">
                  <div className="pc-stat-item">
                    <p className="pc-stat-value">Rs.{p.price?.toLocaleString()}</p>
                    <p className="pc-stat-label">Retail</p>
                  </div>
                  <div className="pc-stat-item">
                    <p className={`pc-stat-value ${p.stock <= 2 ? 'text-error' : ''}`}>{p.stock}</p>
                    <p className="pc-stat-label">Stock</p>
                  </div>
                </div>

                <div className={`pc-status-tag pc-status-${p.status === 'approved' ? 'approved' : 'pending'}`}>
                  {p.status || 'Pending'}
                </div>

                <div className="pc-actions">
                  <button className="pc-action-btn" title="Edit" onClick={() => openEditModal(p)}><Edit size={16} /></button>
                  <button 
                    className="pc-action-btn pc-action-delete" 
                    title="Delete" 
                    onClick={() => handleDelete(p._id)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Product Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={closeModal}><X size={24} /></button>
            <h2 className="modal-title">{editingProduct ? 'Edit Product' : 'Add New Product'}</h2>
            
            <form className="modal-form" onSubmit={handleSubmit}>
              <div className="form-group form-full">
                <label>Product Name</label>
                <input name="name" value={formData.name} onChange={handleFormChange} required placeholder="e.g. Emerald Silk Saree" />
              </div>

              <div className="form-group form-full">
                <label>Description</label>
                <textarea name="description" value={formData.description} onChange={handleFormChange} required placeholder="Describe the material, craft, and style..." />
              </div>

              <div className="form-group">
                <label>Category</label>
                <select name="category" value={formData.category} onChange={handleFormChange}>
                  <option value="Formal">Formal</option>
                  <option value="Luxury Pret">Luxury Pret</option>
                  <option value="Bridal">Bridal</option>
                  <option value="Casual">Casual</option>
                </select>
              </div>

              <div className="form-group">
                <label>Price (PKR)</label>
                <input type="number" name="price" value={formData.price} onChange={handleFormChange} required placeholder="25000" />
              </div>

              <div className="form-group">
                <label>Initial Stock</label>
                <input type="number" name="stock" value={formData.stock} onChange={handleFormChange} required placeholder="10" />
              </div>

              <div className="form-group form-full">
                <label>Product Visuals</label>
                <div className="upload-area-premium" onClick={() => fileInputRef.current?.click()}>
                  <Upload size={32} style={{ color: uploading ? '#ccc' : '#000' }} />
                  <p style={{ fontSize: '0.8rem', fontWeight: '500' }}>{uploading ? 'Uploading...' : 'Click to upload from device'}</p>
                  <p style={{ fontSize: '0.7rem', color: '#999' }}>JPG, PNG or WebP</p>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    hidden 
                    onChange={handleFileUpload} 
                    accept="image/*" 
                  />
                </div>

                <div className="upload-preview-grid">
                  {formData.images.map((img, idx) => (
                    img && (
                      <div key={idx} className="upload-preview-item">
                        <img src={img} alt={`Preview ${idx}`} />
                        <div className="upload-remove-badge" onClick={() => removeImageField(idx)}>
                          <X size={10} />
                        </div>
                      </div>
                    )
                  ))}
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-premium-cancel" onClick={closeModal}>Cancel</button>
                <button type="submit" className="btn-premium-action" disabled={uploading}>
                  {editingProduct ? 'Update Product' : 'List Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

