import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import axios from 'axios';
import { SlidersHorizontal, Search, ChevronDown, X, ChevronRight } from 'lucide-react';
import API_URL from '../../config/api';
import { ProductCardSkeleton } from '../../components/SkeletonLoader/SkeletonLoader';
import './Catalogue.css';

const CATEGORIES = ['All', 'Luxury Pret', 'Bridal', 'Casual', 'Formal', 'Abayas', 'Festive', 'Ready To Wear'];

export default function Catalogue() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState({
    category: searchParams.get('category') || 'All',
    sort: 'newest',
    search: searchParams.get('search') || '',
  });

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'Collections & Ready-to-Wear — Auto Stitch';
  }, []);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (filters.category !== 'All') params.append('category', filters.category);
        if (filters.sort) params.append('sort', filters.sort);
        if (filters.search) params.append('search', filters.search);
        params.append('page', pagination.page);
        params.append('limit', 16);
        
        const { data } = await axios.get(`${API_URL}/api/products?${params.toString()}`);
        setProducts(data.products || []);
        if (data.pagination) setPagination(data.pagination);
      } catch (err) {
        setError('Failed to load collections');
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, [filters, pagination.page]);

  const handleFilter = (key, val) => {
    setFilters((f) => ({ ...f, [key]: val }));
    setPagination(p => ({ ...p, page: 1 }));
  };

  return (
    <div className="catalogue-editorial page-enter">
      {/* Editorial Breadcrumbs */}
      <div className="container" style={{ paddingTop: '100px', paddingBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: '#888', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          <Link to="/" style={{ color: '#888', textDecoration: 'none' }}>Home</Link>
          <ChevronRight size={12} />
          <Link to="/catalogue" style={{ color: '#888', textDecoration: 'none' }}>Collections</Link>
          {filters.category !== 'All' && (
            <>
              <ChevronRight size={12} />
              <span style={{ color: '#1a1a2e', fontWeight: 600 }}>{filters.category}</span>
            </>
          )}
        </div>
      </div>

      {/* Editorial Header */}
      <header className="catalogue-header" style={{ paddingTop: '10px' }}>
        <div className="header-top container">
           <h1 className="editorial-title">Clothing Collections</h1>
           <div className="header-actions">
              <button className="editorial-action-btn" onClick={() => setFiltersOpen(!filtersOpen)}>
                Filter <ChevronDown size={14} className={filtersOpen ? 'rotate-180' : ''} />
              </button>
              <div className="v-sep">|</div>
              <div className="editorial-sort">
                <span>Sort By</span>
                <select 
                  value={filters.sort} 
                  onChange={(e) => handleFilter('sort', e.target.value)}
                >
                  <option value="newest">New Arrivals</option>
                  <option value="price_asc">Price: Low-High</option>
                  <option value="price_desc">Price: High-Low</option>
                </select>
              </div>
           </div>
        </div>

        {/* Dynamic Filter Drawer */}
        <div className={`filter-drawer ${filtersOpen ? 'drawer-open' : ''}`}>
           <div className="container drawer-inner">
              <div className="drawer-group">
                 <h4>Category</h4>
                 <div className="drawer-options">
                    {CATEGORIES.map(cat => (
                      <button 
                        key={cat} 
                        className={filters.category === cat ? 'active' : ''}
                        onClick={() => handleFilter('category', cat)}
                      >
                        {cat}
                      </button>
                    ))}
                 </div>
              </div>
              <div className="drawer-group search-group">
                 <h4>Search</h4>
                 <div className="drawer-search">
                    <Search size={16} />
                    <input 
                      type="text" 
                      placeholder="Find a style..." 
                      value={filters.search}
                      onChange={(e) => handleFilter('search', e.target.value)}
                    />
                    {filters.search && <X size={16} onClick={() => handleFilter('search', '')} />}
                 </div>
              </div>
           </div>
        </div>
      </header>

      {/* Main Grid */}
      <main className="catalogue-container">
        {loading ? (
          <div className="editorial-grid" style={{ padding: '0 var(--space-2xl)' }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : error ? (
          <div className="editorial-error container">{error}</div>
        ) : products.length === 0 ? (
          <div className="editorial-empty container">
             <p>No pieces found in this selection.</p>
             <button onClick={() => handleFilter('category', 'All')}>View All Collections</button>
          </div>
        ) : (
          <div className="editorial-grid">
            {products.map((product) => (
              <Link to={`/products/${product._id}`} key={product._id} className="editorial-item">
                <div className="item-image-wrap">
                  <img 
                    src={product.images?.[0] || `https://picsum.photos/seed/${product._id}/600/800`} 
                    alt={product.name} 
                    loading="lazy"
                  />
                  {product.tryOnEnabled && <span className="exclusive-tag">Exclusive</span>}
                </div>
                <div className="item-info">
                   <div className="item-main">
                      <span className="item-name">{product.name.toUpperCase()}</span>
                      <span className="item-price">PKR {product.price?.toLocaleString()}</span>
                   </div>
                   <div className="item-colors">
                      <span className="color-dot" style={{ background: '#C4A484' }}></span>
                      <span className="color-dot" style={{ background: '#2D2D2D' }}></span>
                   </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Pagination */}
        {!loading && pagination.pages > 1 && (
          <div className="editorial-pagination">
             <button 
               disabled={pagination.page === 1} 
               onClick={() => setPagination(p => ({...p, page: p.page - 1}))}
             >
               PREVIOUS
             </button>
             <span className="page-indicator">{pagination.page} / {pagination.pages}</span>
             <button 
               disabled={pagination.page === pagination.pages} 
               onClick={() => setPagination(p => ({...p, page: p.page + 1}))}
             >
               NEXT
             </button>
          </div>
        )}
      </main>
    </div>
  );
}



