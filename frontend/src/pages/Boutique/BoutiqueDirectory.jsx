import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import axios from 'axios';
import API_URL from '../../config/api';
import './BoutiqueDirectory.css';
import BoutiqueHero from '../../../Photos/boutique page/boutique landing page.jpg';
import Prod1 from '../../../Photos/boutique page catalog/pexels-dhanno-18977034.jpg';
import Prod2 from '../../../Photos/boutique page catalog/pexels-dhanno-19221260.jpg';
import Prod3 from '../../../Photos/boutique page catalog/pexels-dhanno-19248024.jpg';
import Prod4 from '../../../Photos/boutique page catalog/pexels-dhanno-19281272.jpg';
import Prod5 from '../../../Photos/boutique page catalog/pexels-dhanno-19401634.jpg';
import Prod6 from '../../../Photos/boutique page catalog/pexels-dhanno-28771733.jpg';
import Prod7 from '../../../Photos/boutique page catalog/pexels-dhanno-28771737.jpg';
import Prod8 from '../../../Photos/boutique page catalog/pexels-dhanno-28949662.jpg';
import FooterBanner from '../../../Photos/boutique page catalog/footer.png';
import BestSellerBanner from '../../../Photos/best seller.png';



export default function BoutiqueDirectory() {
  const [searchParams] = useSearchParams();
  const initialSearch = searchParams.get('search') || searchParams.get('category') || '';
  const [search, setSearch] = useState(initialSearch);
  const [searchOpen, setSearchOpen] = useState(!!initialSearch);
  const [activeLetter, setActiveLetter] = useState('All');
  const [realBoutiques, setRealBoutiques] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBoutiques = async () => {
      try {
        setLoading(true);
        const { data } = await axios.get(`${API_URL}/api/boutiques`);
        if (data.success) {
          setRealBoutiques(data.data);
        }
      } catch (err) {
        console.error('Fetch boutiques error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchBoutiques();
  }, []);

  const displayBoutiques = realBoutiques;

  const filteredBoutiques = displayBoutiques.filter(b => {
    const name = b.name || '';
    const matchesSearch = name.toLowerCase().includes(search.toLowerCase());
    const matchesLetter = activeLetter === 'All' || name.startsWith(activeLetter);
    return matchesSearch && matchesLetter;
  });

  return (
    <div className="directory-page page-enter">
      {/* Editorial Hero Banner */}
      <section className="directory-hero-v2">
        <div className="hero-banner-v2">
          <img src={BoutiqueHero} alt="Boutique Collections" className="hero-img-v2" />
          <div className="hero-overlay-v2"></div>
        </div>
      </section>

      {/* Multi Brands Section */}
      <section className="multi-brands-section container">
        <div className="section-header-centered">
          <div className="title-with-lines">
            <span className="line"></span>
            <h2 className="multi-brands-title">Multi Brands</h2>
            <span className="line"></span>
          </div>

          <nav className="brands-nav">
            {displayBoutiques.slice(0, 10).map((b, idx) => (
              <span key={b._id || b.id} style={{ display: 'contents' }}>
                <Link to={`/boutiques/${b._id || b.id}`} className="brand-nav-link">{b.name}</Link>
                <span className="nav-divider">/</span>
              </span>
            ))}

            <div className="inline-search-trigger">
              <Search
                size={16}
                className={`brand-search-icon ${searchOpen ? 'active' : ''}`}
                onClick={() => setSearchOpen(!searchOpen)}
              />
              {searchOpen && (
                <div className="brand-search-dropdown glass-card">
                  <input
                    type="text"
                    placeholder="Search Brand..."
                    autoFocus
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  {search.length > 0 && (
                    <div className="brand-results">
                      {displayBoutiques.filter(b => b.name.toLowerCase().includes(search.toLowerCase())).map(b => (
                        <Link
                          to={`/boutiques/${b._id || b.id}`}
                          key={b._id || b.id}
                          className="brand-result-item"
                          onClick={() => setSearchOpen(false)}
                        >
                          {b.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </nav>
        </div>

        <div className="editorial-product-grid">
          {[
            { img: Prod1, brand: 'Élan', name: 'Golden Bloom (Pastel Skin)', price: '19,600.00', id: '6a01ccc03354693db3827c36' },
            { img: Prod2, brand: 'Suffuse', name: 'Rouge Majesty (Maroon)', price: '18,000.00', id: '6a01ccc13354693db3827c38' },
            { img: Prod3, brand: 'Maria.B', name: 'Ivory Royale (Off-White)', price: '19,000.00', id: '6a01ccc33354693db3827c3c' },
            { img: Prod4, brand: 'Asim Jofa', name: 'Ebony Night (Black)', price: '13,795.00', id: '6a01ccc93354693db3827c48' },
            { img: Prod5, brand: 'Sana Safinaz', name: 'Velvet Noir (Midnight)', price: '22,500.00', id: '6a01ccc43354693db3827c3e' },
            { img: Prod6, brand: 'Khaadi', name: 'Azure Dream (Sky Blue)', price: '15,400.00', id: '6a01ccc23354693db3827c3a' },
            { img: Prod7, brand: 'Nishat Linen', name: 'Rose Petal (Soft Pink)', price: '12,900.00', id: '6a01ccc83354693db3827c44' },
            { img: Prod8, brand: 'J.', name: 'Regal Heritage (Gold)', price: '25,000.00', id: '6a01ccc73354693db3827c42' }
          ].map((item, idx) => (
            <Link to={`/boutiques/${item.id}`} key={idx} className="editorial-card">
              <div className="editorial-card-img-wrap">
                <img src={item.img} alt={item.name} className="editorial-img" />
              </div>
              <div className="editorial-card-info">
                <p className="editorial-brand">{item.brand}</p>
                <h3 className="editorial-name">{item.name}</h3>
                <p className="editorial-price">from <span>Rs.{item.price}</span></p>
                <span className="more-sizes">MORE SIZES AVAILABLE</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Full Width Footer Banner Section */}
      <div className="directory-footer-banner full-bleed">
        <img src={FooterBanner} alt="Studio Peek and Slay" className="footer-banner-img" />
      </div>

      {/* Full Width Best Sellers Section */}
      <div className="directory-best-sellers-section full-bleed">
        <div className="best-sellers-header container">
          <h2 className="best-sellers-title">BEST SELLERS</h2>
          <p className="best-sellers-subtitle">Our most-loved pieces, curated for your wardrobe.</p>
        </div>
        <div className="best-sellers-banner-wrap">
          <img src={BestSellerBanner} alt="Best Sellers Curated" className="best-sellers-img" />
        </div>
      </div>
    </div>
  );
}
