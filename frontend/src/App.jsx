import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import API_URL from './config/api';

// Layout
import Navbar from './components/Navbar/Navbar';
import Footer from './components/Footer/Footer';
import ScrollToTop from './components/ScrollToTop';
import CartDrawer from './components/CartDrawer/CartDrawer';

// Pages
import Home from './pages/Home/Home';
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';
import AdminLogin from './pages/Auth/AdminLogin';
import BoutiqueLogin from './pages/Auth/BoutiqueLogin';
import ForgotPassword from './pages/Auth/ForgotPassword';
import ProductDetail from './pages/ProductDetail/ProductDetail';
import CustomerDashboard from './pages/Dashboard/CustomerDashboard';
import BoutiqueDashboard from './pages/Dashboard/BoutiqueDashboard';
import VirtualTryOn from './pages/VirtualTryOn/VirtualTryOn';
import BoutiqueDirectory from './pages/Boutique/BoutiqueDirectory';
import BoutiqueProfile from './pages/Boutique/BoutiqueProfile';
import SizeGuide from './pages/Info/SizeGuide';
import InfoPage from './pages/Info/InfoPage';
import Customize from './pages/Customize/Customize';
import Bids from './pages/Bids/Bids';
import Chat from './pages/Chat/Chat';
import BoutiqueBids from './pages/Boutique/BoutiqueBids';
import Cart from './pages/Cart/Cart';

// New fully-built pages
import Orders from './pages/Orders/Orders';
import OrderDetail from './pages/Orders/OrderDetail';
import Wishlist from './pages/Wishlist/Wishlist';
import Checkout from './pages/Checkout/Checkout';
import Profile from './pages/Profile/Profile';
import Recommendations from './pages/Recommendations/Recommendations';
import About from './pages/About/About';
import Careers from './pages/Careers/Careers';
import Contact from './pages/Contact/Contact';
import Terms from './pages/Info/Terms';
import Returns from './pages/Info/Returns';
import Privacy from './pages/Info/Privacy';
import FAQ from './pages/Info/FAQ';
import TrackOrder from './pages/Info/TrackOrder';
import StoreLocator from './pages/Info/StoreLocator';
import NotFound from './pages/NotFound/NotFound';
import AdminDashboard from './pages/Admin/AdminDashboard';
import UserManagement from './pages/Admin/UserManagement';
import ListingModeration from './pages/Admin/ListingModeration';
import ManageProducts from './pages/BoutiqueManage/ManageProducts';
import BoutiqueOrders from './pages/BoutiqueManage/BoutiqueOrders';
import Analytics from './pages/BoutiqueManage/Analytics';
import Catalogue from './pages/Catalogue/Catalogue';

function ProtectedRoute({ user, allowedRoles, children }) {
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

import { CartProvider } from './context/CartContext';
import { WishlistProvider } from './context/WishlistContext';
import Chatbot from './components/Chatbot/Chatbot';

import { Toaster } from 'react-hot-toast';

import { initSocket, disconnectSocket } from './utils/socket';

export default function App() {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  });

  const handleLogin = (userData) => {
    setUser(userData);
    if (userData?._id) {
      initSocket(userData._id);
    }
  };

  const handleLogout = async () => {
    try {
      await axios.post(`${API_URL}/api/auth/logout`, {}, { withCredentials: true });
    } catch (_) { }
    localStorage.removeItem('user');
    disconnectSocket();
    setUser(null);
  };

  useEffect(() => {
    if (user?._id) {
      initSocket(user._id);
    }
    
    // Global Axios interceptor for 401s (Session Expiry)
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          handleLogout();
        }
        return Promise.reject(error);
      }
    );
    return () => axios.interceptors.response.eject(interceptor);
  }, [user]);

  return (
      <WishlistProvider>
        <CartProvider>
          <Router>
            <Toaster position="top-right" />
            <ScrollToTop />
            <Navbar user={user} onLogout={handleLogout} />
            <CartDrawer />

            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Home user={user} />} />
              <Route path="/products/:id" element={<ProductDetail />} />
              <Route path="/try-on" element={<ProtectedRoute user={user}><VirtualTryOn /></ProtectedRoute>} />
              <Route path="/boutiques" element={<BoutiqueDirectory />} />
              <Route path="/boutiques/:id" element={<BoutiqueProfile />} />
              <Route path="/catalogue" element={<Catalogue />} />
              <Route path="/about" element={<About />} />
              <Route path="/careers" element={<Careers />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/size-guide" element={<SizeGuide />} />
              <Route path="/customize" element={<ProtectedRoute user={user} allowedRoles={['customer']}><Customize /></ProtectedRoute>} />
              <Route path="/chat" element={<ProtectedRoute user={user}><Chat /></ProtectedRoute>} />

              {/* Info Pages */}
              <Route path="/terms" element={<Terms />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/returns" element={<Returns />} />
              <Route path="/shipping" element={<InfoPage />} />
              <Route path="/faq" element={<FAQ />} />
              <Route path="/stores" element={<StoreLocator />} />
              <Route path="/track" element={<TrackOrder />} />

              {/* Auth Routes (redirect if logged in) */}
              <Route path="/login" element={user ? <Navigate to={user.role === 'admin' ? '/admin' : '/dashboard'} replace /> : <Login onLogin={handleLogin} />} />
              <Route path="/register" element={user ? <Navigate to="/dashboard" replace /> : <Register onLogin={handleLogin} />} />
              <Route path="/admin-login" element={user && user.role === 'admin' ? <Navigate to="/admin" replace /> : <AdminLogin onLogin={handleLogin} />} />
              <Route path="/boutique-login" element={user && user.role === 'boutique_owner' ? <Navigate to="/boutique/dashboard" replace /> : <BoutiqueLogin onLogin={handleLogin} />} />
              <Route path="/forgot-password" element={user ? <Navigate to="/dashboard" replace /> : <ForgotPassword />} />

              {/* Customer Routes */}
              <Route path="/dashboard" element={
                <ProtectedRoute user={user}>
                  <CustomerDashboard user={user} onLogout={handleLogout} />
                </ProtectedRoute>
              } />
              <Route path="/orders" element={<ProtectedRoute user={user}><Orders /></ProtectedRoute>} />
              <Route path="/orders/:id" element={<ProtectedRoute user={user}><OrderDetail /></ProtectedRoute>} />
              <Route path="/wishlist" element={<ProtectedRoute user={user}><Wishlist /></ProtectedRoute>} />
              <Route path="/bids" element={<ProtectedRoute user={user} allowedRoles={['customer']}><Bids /></ProtectedRoute>} />
              <Route path="/cart" element={<Navigate to="/" replace />} />
              <Route path="/checkout" element={<ProtectedRoute user={user}><Checkout /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute user={user}><Profile user={user} onUpdate={setUser} onLogout={handleLogout} /></ProtectedRoute>} />
              <Route path="/boutique/settings" element={<ProtectedRoute user={user}><Profile user={user} onUpdate={setUser} onLogout={handleLogout} /></ProtectedRoute>} />
              <Route path="/recommendations" element={<ProtectedRoute user={user}><Recommendations /></ProtectedRoute>} />

              {/* Boutique Owner Routes */}
              <Route path="/boutique/dashboard" element={
                <ProtectedRoute user={user} allowedRoles={['boutique_owner']}>
                  <BoutiqueDashboard user={user} />
                </ProtectedRoute>
              } />
              <Route path="/boutique/products" element={<ProtectedRoute user={user} allowedRoles={['boutique_owner']}><ManageProducts /></ProtectedRoute>} />
              <Route path="/boutique/products/new" element={<ProtectedRoute user={user} allowedRoles={['boutique_owner']}><ManageProducts /></ProtectedRoute>} />
              <Route path="/boutique/orders" element={<ProtectedRoute user={user} allowedRoles={['boutique_owner']}><BoutiqueOrders /></ProtectedRoute>} />
              <Route path="/boutique/bids" element={<ProtectedRoute user={user} allowedRoles={['boutique_owner']}><BoutiqueBids /></ProtectedRoute>} />
              <Route path="/boutique/bids/:id" element={<ProtectedRoute user={user} allowedRoles={['boutique_owner']}><BoutiqueBids /></ProtectedRoute>} />
              <Route path="/boutique/analytics" element={<ProtectedRoute user={user} allowedRoles={['boutique_owner']}><Analytics /></ProtectedRoute>} />

              {/* Admin Routes */}
              <Route path="/admin" element={<ProtectedRoute user={user} allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
              <Route path="/admin/users" element={<ProtectedRoute user={user} allowedRoles={['admin']}><UserManagement /></ProtectedRoute>} />
              <Route path="/admin/listings" element={<ProtectedRoute user={user} allowedRoles={['admin']}><ListingModeration /></ProtectedRoute>} />

              {/* 404 */}
              <Route path="*" element={<NotFound />} />
            </Routes>

            <Chatbot />
            <Footer />
          </Router>
        </CartProvider>
      </WishlistProvider>
  );
}
