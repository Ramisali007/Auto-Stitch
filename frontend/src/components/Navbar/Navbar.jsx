import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Search, ShoppingBag, Heart, User, X, Bell, Info, CheckCircle } from 'lucide-react';
import axios from 'axios';
import API_URL from '../../config/api';
import EditorialMenu from './EditorialMenu';
import './Navbar.css';
import { useCart } from '../../context/CartContext';
import { BOUTIQUES_STATIC, CATEGORIES_STATIC, EDITORIAL_PRODUCTS } from '../../data/mockData';
import { getSocket } from '../../utils/socket';
import { toast } from 'react-hot-toast';

export default function Navbar({ user, wishlistCount = 0, onLogout }) {
  const { cartCount, setIsCartOpen } = useCart();
  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [announcementIndex, setAnnouncementIndex] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  
  const isHome = location.pathname === '/' || location.pathname === '/boutiques' || location.pathname === '/about' || location.pathname === '/careers' || location.pathname === '/stores';

  const announcements = [
    "Free Delivery across Pakistan on Orders Over PKR 5,000",
    "New Eid Collection: Shop the Latest Pakistani Couture",
    "Cash on Delivery Available Nationwide"
  ];

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    const interval = setInterval(() => {
      setAnnouncementIndex((prev) => (prev + 1) % announcements.length);
    }, 4000);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (searchQuery.trim().length > 1) {
        try {
          const q = searchQuery.toLowerCase();
          
          // 1. Fetch real boutiques
          const { data: bData } = await axios.get(`${API_URL}/api/boutiques`);
          const filteredBoutiques = bData.data.filter(b => b.name.toLowerCase().includes(q));

          // 2. Fetch real products
          const { data: pData } = await axios.get(`${API_URL}/api/products?search=${encodeURIComponent(q)}&limit=5`);
          
          const boutiqueSuggestions = filteredBoutiques.map(b => ({ 
            type: 'brand', 
            label: b.name, 
            id: b._id 
          }));

          const productSuggestions = (pData.products || []).map(p => ({ 
            type: 'product', 
            label: p.name, 
            id: p._id 
          }));

          const categorySuggestions = CATEGORIES_STATIC
            .filter(c => c.toLowerCase().includes(q))
            .map(c => ({ type: 'category', label: c }));

          setSuggestions([
            ...boutiqueSuggestions,
            ...categorySuggestions,
            ...productSuggestions
          ]);
        } catch (err) {
          console.error('Search suggestions error:', err);
        }
      } else {
        setSuggestions([]);
      }
    };

    const debounceTimer = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  const handleSuggestionClick = (s) => {
    if (s.type === 'brand') navigate(`/boutiques/${s.id}`);
    else if (s.type === 'category') navigate(`/boutiques?category=${encodeURIComponent(s.label)}`);
    else if (s.type === 'product') navigate(`/products/${s.id}`);
    setSearchOpen(false);
    setSearchQuery('');
  };

  const [notifOpen, setNotifOpen] = useState(false);
  const [notifs, setNotifs] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifs = async () => {
    if (!user) return;
    try {
      const { data } = await axios.get(`${API_URL}/api/notifications`, { withCredentials: true });
      setNotifs(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (err) { console.error(err); }
  };

  const socket = getSocket();

  useEffect(() => {
    fetchNotifs();
    
    if (socket) {
      socket.on('new_notification', (notif) => {
        setNotifs(prev => [notif, ...prev]);
        setUnreadCount(prev => prev + 1);
        toast.success(`New Notification: ${notif.title}`, {
          icon: '🔔',
          duration: 4000
        });
      });
    }

    return () => {
      if (socket) socket.off('new_notification');
    };
  }, [user, socket]);

  return (
    <>
      {/* 1. Slim Top Bar (Black) */}
      <div className="top-bar-v2">
        <div className="top-bar-inner">
          <div className="top-bar-left">
            <Link to="/track" className="top-utility-link">ORDER TRACKING</Link>
            <span className="top-separator">|</span>
            <Link to="/stores" className="top-utility-link">STORE LOCATIONS</Link>
          </div>
          <div className="announcement-slider">
             {announcements[announcementIndex]}
          </div>
          <div className="top-bar-right">
            <a href="https://instagram.com" target="_blank" rel="noreferrer" className="top-utility-link">INSTAGRAM</a>
            <span className="top-separator">|</span>
            <a href="https://facebook.com" target="_blank" rel="noreferrer" className="top-utility-link">FACEBOOK</a>
          </div>
        </div>
      </div>

      <nav className={`navbar-v2 ${scrolled || !isHome || searchOpen ? 'scrolled' : 'transparent'}`}>
        <div className="navbar-inner-v2">
          {/* Left: EditorialMenu */}
          <div className="nav-group-left-v2">
            <EditorialMenu
              items={[
                { label: 'Shop All', href: '/catalogue' },
                { label: 'Boutiques', href: '/boutiques' },
                { label: 'Virtual Try-On', href: '/try-on', tag: 'AI' },
                { 
                  label: 'Custom Stitching', 
                  href: user?.role === 'boutique_owner' ? '/boutique/bids' : '/customize' 
                },
                { 
                  label: 'Live Bidding', 
                  href: user?.role === 'boutique_owner' ? '/boutique/bids' : '/bids' 
                }
              ]}
              onSearchClick={() => setSearchOpen(true)}
            />
          </div>

          {/* Center: Logo */}
          <div className="nav-group-center-v2">
            <Link to="/" className="navbar-logo-v2">
              AUTO STITCH.
            </Link>
          </div>

          {/* Right: Actions */}
          <div className="nav-group-right-v2">
            {user && (
              <div className="nav-notif-area">
                <button className="nav-icon-btn-v2" onClick={() => setNotifOpen(!notifOpen)}>
                  <Bell size={22} strokeWidth={1.5} />
                  {unreadCount > 0 && <span className="nav-badge-v2">{unreadCount}</span>}
                </button>
                
                {notifOpen && (
                  <div className="notif-dropdown glass-card">
                    <div className="notif-header">
                      <span>Notifications</span>
                      <button className="mark-all-btn" onClick={async () => {
                        await axios.patch(`${API_URL}/api/notifications/read-all`, {}, { withCredentials: true });
                        fetchNotifs();
                      }}>Mark all as read</button>
                    </div>
                    <div className="notif-list">
                      {notifs.length === 0 ? (
                        <div className="notif-empty">No new updates</div>
                      ) : (
                        notifs.map(n => (
                          <Link 
                            key={n._id} 
                            to={n.link || '#'} 
                            className={`notif-item ${!n.isRead ? 'unread' : ''}`}
                            onClick={() => setNotifOpen(false)}
                          >
                            <div className="notif-icon">
                              {n.type === 'bid_accepted' ? <CheckCircle size={16} /> : <Info size={16} />}
                            </div>
                            <div className="notif-content">
                              <p>{n.message}</p>
                              <span>{new Date(n.createdAt).toLocaleDateString()}</span>
                            </div>
                            {!n.isRead && <div className="notif-unread-dot"></div>}
                          </Link>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            <Link to="/wishlist" className="nav-icon-btn-v2">
              <Heart size={22} strokeWidth={1.5} />
            </Link>

            <div className="nav-user-area-v2">
              {user ? (
                <div className="user-dropdown-trigger-v2">
                  <User size={22} strokeWidth={1.5} className="nav-icon-btn-v2" />
                  <div className="user-dropdown-menu-v2">
                    <Link to="/dashboard">Dashboard</Link>
                    <Link to="/profile">My Profile</Link>
                    <Link to="/chat">Messages</Link>
                    <button onClick={onLogout} className="logout-btn-v2">Sign Out</button>
                  </div>
                </div>
              ) : (
                <Link to="/login" className="nav-icon-btn-v2">
                  <User size={22} strokeWidth={1.5} />
                </Link>
              )}
            </div>

            <button onClick={() => setIsCartOpen(true)} className="nav-icon-btn-v2 cart-btn-v2">
              <ShoppingBag size={22} strokeWidth={1.5} />
              {cartCount > 0 && <span className="nav-badge-v2">{cartCount}</span>}
            </button>
          </div>
        </div>

        {/* Inline Search Panel */}
        {searchOpen && (
          <div className="search-panel-inline">
            <div className="search-panel-inner container">
              <form className="search-form-minimal" onSubmit={(e) => { 
                e.preventDefault(); 
                if (searchQuery.trim()) { 
                  navigate(`/catalogue?search=${encodeURIComponent(searchQuery.trim())}`); 
                  setSearchOpen(false); 
                  setSearchQuery(''); 
                } 
              }}>
                <input 
                  type="text" 
                  placeholder="Search for boutiques, styles, or products..." 
                  autoFocus 
                  value={searchQuery} 
                  onChange={(e) => setSearchQuery(e.target.value)} 
                />
                <button type="submit">
                  <Search size={18} strokeWidth={1.5} />
                </button>
              </form>

              {suggestions.length > 0 && (
                <div className="search-suggestions-dropdown">
                  <div className="suggestions-header">Quick Results</div>
                  {suggestions.map((s, idx) => (
                    <div key={idx} className="suggestion-item" onClick={() => handleSuggestionClick(s)}>
                      <span className={`suggestion-type type-${s.type}`}>{s.type}</span>
                      <span className="suggestion-label">{s.label}</span>
                    </div>
                  ))}
                </div>
              )}

              <button className="search-close-btn" onClick={() => { setSearchOpen(false); setSearchQuery(''); }}>
                <X size={18} strokeWidth={1.5} />
              </button>
            </div>
          </div>
        )}
      </nav>
    </>
  );
}
