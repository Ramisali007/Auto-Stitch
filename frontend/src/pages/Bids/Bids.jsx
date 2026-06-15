import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import {
  History, Clock, CheckCircle, XCircle, ChevronRight,
  Store, Tag, Calendar, MessageSquare, AlertCircle, Search,
  Star, Loader2
} from 'lucide-react';
import API_URL from '../../config/api';
import './Bids.css';
import { EDITORIAL_PRODUCTS } from '../../data/mockData';

const getFallbackImage = (id) => {
  if (!id) return '';
  const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const index = hash % EDITORIAL_PRODUCTS.length;
  return EDITORIAL_PRODUCTS[index].images[0];
};

export default function Bids() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [bids, setBids] = useState([]);

  // Payment Selection and Verification States
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentModalBidId, setPaymentModalBidId] = useState(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('cod');
  const [verifyingPayment, setVerifyingPayment] = useState(false);

  useEffect(() => {
    fetchMyRequests();
    document.title = 'My Customization Bids — Auto Stitch';
  }, []);

  useEffect(() => {
    const success = searchParams.get('success');
    const orderId = searchParams.get('orderId');
    const sessionId = searchParams.get('session_id');

    if (success === 'true' && orderId) {
      const verifyBidPayment = async () => {
        setVerifyingPayment(true);
        try {
          const res = await axios.post(`${API_URL}/api/orders/${orderId}/verify-payment`, { sessionId }, { withCredentials: true });
          if (res.data.success) {
            alert('Payment verified successfully! Your customization order is now confirmed.');
            navigate('/bids', { replace: true });
          }
        } catch (err) {
          console.error('Bid payment verification failed:', err);
          alert('Stripe payment verification failed: ' + (err.response?.data?.message || err.message));
          navigate('/bids', { replace: true });
        } finally {
          setVerifyingPayment(false);
        }
      };
      verifyBidPayment();
    }
  }, [searchParams, navigate]);

  const fetchMyRequests = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/bids/my-requests`, { withCredentials: true });
      if (res.data.success) {
        setRequests(res.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBids = async (requestId) => {
    try {
      const res = await axios.get(`${API_URL}/api/bids/requests/${requestId}/bids`, { withCredentials: true });
      if (res.data.success) {
        setBids(res.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch bids:', error);
    }
  };

  const handleSelectRequest = (req) => {
    setSelectedRequest(req);
    fetchBids(req._id);
  };

  const handleAcceptBid = async (bidId, paymentMethod = 'cod') => {
    try {
      const res = await axios.patch(`${API_URL}/api/bids/requests/${selectedRequest._id}/accept/${bidId}`, { paymentMethod }, { withCredentials: true });
      if (res.data.success) {
        if (res.data.data?.stripeSessionUrl) {
          window.location.href = res.data.data.stripeSessionUrl;
        } else {
          fetchMyRequests(); // Refresh data in sidebar
          fetchBids(selectedRequest._id); // Refresh bids list to show only the accepted bid
          setSelectedRequest(prev => ({ ...prev, status: 'bid_accepted', acceptedBid: bidId }));
          alert('Garment proposal accepted successfully! Cash on Delivery order registered.');
        }
      }
    } catch (error) {
      alert('Failed to accept bid: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleDeleteRequest = async (requestId) => {
    if (!window.confirm('Are you sure you want to cancel this customization request? This will also remove all received bids.')) {
      return;
    }

    try {
      const res = await axios.delete(`${API_URL}/api/bids/requests/${requestId}`, { withCredentials: true });
      if (res.data.success) {
        setSelectedRequest(null);
        fetchMyRequests();
      }
    } catch (error) {
      alert('Failed to delete request: ' + (error.response?.data?.message || error.message));
    }
  };

  return (
    <div className="dashboard-page page-enter">
      <div className="container dashboard-container" style={{ display: 'block' }}>
        <main className="dashboard-main" style={{ maxWidth: '1200px', margin: '0 auto' }}>

          <div className="dashboard-section animate-fade-in" style={{ textAlign: 'center', marginBottom: '6rem' }}>
            <h1 className="manage-title-serif" style={{ fontSize: '3.5rem', marginBottom: '1.5rem' }}>Modification <span className="text-gradient">Marketplace</span></h1>
            <p className="manage-subtitle" style={{ fontSize: '1rem', opacity: 0.7, maxWidth: '700px', margin: '0 auto' }}>
              Your curated registry of bespoke modification proposals. Connect with elite boutiques
              and select the perfect craftsmanship for your editorial garment.
            </p>
          </div>

          <div className="bids-immersive-grid">
            {/* Sidebar: Requests */}
            <aside className="bids-registry-sidebar">
              <div className="registry-header-modern">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div className="registry-dot-pulse"></div>
                  <span>ACTIVE REGISTRY</span>
                </div>
                <span className="registry-count">{requests.length} Items</span>
              </div>

              {loading ? (
                <div className="sidebar-loading-modern">
                  {[1, 2, 3].map(i => <div key={i} className="skeleton-card-minimal"></div>)}
                </div>
              ) : requests.length === 0 ? (
                <div className="registry-empty-modern">
                  <Search size={32} strokeWidth={1} style={{ marginBottom: '1.5rem', opacity: 0.3 }} />
                  <p>No active requests in your registry</p>
                  <Link to="/boutiques" className="btn-black-premium" style={{ marginTop: '1.5rem', fontSize: '0.65rem' }}>Explore Boutiques</Link>
                </div>
              ) : (
                <div className="registry-list-modern">
                  {requests.map(req => (
                    <button
                      key={req._id}
                      className={`registry-item-modern ${selectedRequest?._id === req._id ? 'active' : ''}`}
                      onClick={() => handleSelectRequest(req)}
                    >
                      <div className="reg-img-wrap">
                        <img 
                          src={req.product?.images?.[0] || req.referenceImages?.[0] || getFallbackImage(req._id)} 
                          alt="" 
                          onError={(e) => { e.target.src = getFallbackImage(req._id); }}
                        />
                      </div>
                      <div className="reg-info">
                        <h4>{req.product.name}</h4>
                        <div className="reg-status-wrap">
                          <span className={`reg-status-dot ${req.status}`}></span>
                          <span className="reg-bid-count">{req.bids?.length || 0} PROPOSALS</span>
                        </div>
                      </div>
                      <ChevronRight size={14} className="reg-chevron" />
                    </button>
                  ))}
                </div>
              )}
            </aside>

            {/* Main Content: Bids View */}
            <section className="bids-workspace-modern">
              {selectedRequest ? (
                <div className="workspace-view-modern animate-fade-in">
                  <div className="workspace-hero-premium glass-card">
                    <div className="hero-product-display">
                      <div className="hero-img-container">
                        <img 
                          src={selectedRequest.product?.images?.[0] || selectedRequest.referenceImages?.[0] || getFallbackImage(selectedRequest._id)} 
                          alt="" 
                          onError={(e) => { e.target.src = getFallbackImage(selectedRequest._id); }}
                        />
                        <div className="hero-status-pill">
                          <Clock size={12} />
                          <span>{selectedRequest.status.replace('_', ' ').toUpperCase()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="hero-content-premium">
                      <div className="flex-between" style={{ alignItems: 'flex-start', marginBottom: '2rem' }}>
                        <div>
                          <h2 className="hero-title-serif">{selectedRequest.product.name}</h2>
                          <div className="hero-meta-modern">
                            <div className="meta-tag">
                              <Tag size={12} />
                              <span>BUDGET: PKR {selectedRequest.budget}</span>
                            </div>
                            <div className="meta-tag">
                              <Calendar size={12} />
                              <span>SUBMITTED: {new Date(selectedRequest.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                        {!['bid_accepted', 'completed'].includes(selectedRequest.status) && (
                          <button
                            className="btn-cancel-minimal"
                            onClick={() => handleDeleteRequest(selectedRequest._id)}
                          >
                            <XCircle size={14} /> CANCEL REQUEST
                          </button>
                        )}
                      </div>

                      <div className="hero-description-card">
                        <h4 className="card-label-small">YOUR SPECIFICATIONS</h4>
                        <p className="hero-desc-text">"{selectedRequest.description || 'No specific notes provided.'}"</p>
                        <div className="hero-regions-modern">
                          {selectedRequest.selectedRegions.map(r => (
                            <span key={r} className="region-pill-modern">{r}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="proposals-section-modern">
                    <div className="proposals-header-modern">
                      <h3 className="section-title-serif">Boutique Proposals</h3>
                      <p className="section-subtitle-modern">Carefully curated offers for your bespoke requirements</p>
                    </div>

                    {bids.length === 0 ? (
                      <div className="proposals-empty-modern glass-card">
                        <div className="empty-pulse-ring"></div>
                        <p>Our partner boutiques are currently reviewing your request...</p>
                        <span style={{ fontSize: '0.7rem', opacity: 0.5, marginTop: '10px' }}>Typically takes 2-4 hours</span>
                      </div>
                    ) : (
                      <div className="proposals-grid-modern">
                        {bids.map(bid => (
                          <div key={bid._id} className="proposal-card-premium glass-card">
                            <div className="proposal-inner">
                              <div className="proposal-header-modern">
                                <div className="boutique-brand">
                                  <div className="brand-initials">
                                    {bid.boutique.name.charAt(0)}
                                  </div>
                                  <div>
                                    <h4 className="brand-name">{bid.boutique.name}</h4>
                                    <div className="brand-rating">
                                      <Star size={10} fill="var(--color-accent)" />
                                      <span>{(bid.boutique.reputationScore || 0).toFixed(1)} REPUTATION</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="proposal-quote">
                                  <span className="quote-label">OFFERED PRICE</span>
                                  <span className="quote-val">PKR {bid.price.toLocaleString()}</span>
                                </div>
                              </div>

                              <div className="proposal-body-modern">
                                <div className="timeline-badge-modern">
                                  <Clock size={12} />
                                  <span>{bid.timeline} DAYS COMPLETION</span>
                                </div>
                                <p className="proposal-notes">"{bid.notes}"</p>
                              </div>

                              <div className="proposal-footer-modern">
                                <button
                                  className="btn-message-minimal"
                                  onClick={() => {
                                    const ownerId = bid.boutique.owner?._id || bid.boutique.owner;
                                    navigate(`/chat?boutiqueId=${bid.boutique._id}&boutiqueName=${encodeURIComponent(bid.boutique.name)}&ownerId=${ownerId}`);
                                  }}
                                >
                                  <MessageSquare size={16} />
                                  <span>MESSAGE BRAND</span>
                                </button>
                                {['bid_accepted', 'completed'].includes(selectedRequest.status) ? (
                                  <button className="btn-accept-premium" disabled>
                                    {selectedRequest.status === 'completed' ? 'PROJECT COMPLETED' : 'PROPOSAL ACCEPTED'}
                                  </button>
                                ) : (
                                  <button
                                    className="btn-accept-premium"
                                    onClick={() => {
                                      setPaymentModalBidId(bid._id);
                                      setShowPaymentModal(true);
                                    }}
                                  >
                                    ACCEPT PROPOSAL
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="workspace-empty-modern animate-fade-in">
                  <div className="empty-state-illust">
                    <Store size={48} strokeWidth={1} />
                    <div className="illust-ring"></div>
                  </div>
                  <h3>Select a Request to Review</h3>
                  <p>Choose a garment from your registry to view incoming boutique proposals and manage your modifications.</p>
                </div>
              )}
            </section>
          </div>

        </main>
      </div>

      {/* Payment Selection Modal */}
      {showPaymentModal && (
        <div className="bids-modal-overlay animate-fade-in" style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000
        }}>
          <div className="glass-card" style={{
            padding: '3rem',
            maxWidth: '500px',
            width: '90%',
            background: '#fff',
            border: '1px solid rgba(0,0,0,0.1)',
            boxShadow: '0 30px 60px rgba(0,0,0,0.2)'
          }}>
            <h3 className="section-title-serif" style={{ fontSize: '1.8rem', marginBottom: '1rem', textAlign: 'center' }}>Secure Acceptance</h3>
            <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '2.5rem', textAlign: 'center', lineHeight: '1.6' }}>
              Select your preferred transaction mechanism for this bespoke customization garment.
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '2.5rem' }}>
              {[
                { value: 'cod', title: 'Cash on Delivery', desc: 'Settle amount when customization is delivered.' },
                { value: 'card', title: 'Credit / Debit Card (Stripe)', desc: 'Pay securely via Stripe now to initiate work.' }
              ].map(opt => (
                <div
                  key={opt.value}
                  onClick={() => setSelectedPaymentMethod(opt.value)}
                  style={{
                    padding: '1.5rem',
                    border: selectedPaymentMethod === opt.value ? '2px solid #000' : '1px solid #eee',
                    background: selectedPaymentMethod === opt.value ? '#fafafa' : '#fff',
                    cursor: 'pointer',
                    transition: 'all 0.3s'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                    <strong style={{ fontSize: '0.9rem' }}>{opt.title}</strong>
                    <div style={{
                      width: '18px', height: '18px', borderRadius: '50%',
                      border: '2px solid #000', display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      {selectedPaymentMethod === opt.value && <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#000' }} />}
                    </div>
                  </div>
                  <p style={{ fontSize: '0.75rem', color: '#888', margin: 0 }}>{opt.desc}</p>
                </div>
              ))}
            </div>
            
            <div style={{ display: 'flex', gap: '15px' }}>
              <button
                className="btn-message-minimal"
                onClick={() => setShowPaymentModal(false)}
                style={{ height: '48px' }}
              >
                CANCEL
              </button>
              <button
                className="btn-accept-premium"
                onClick={() => {
                  setShowPaymentModal(false);
                  handleAcceptBid(paymentModalBidId, selectedPaymentMethod);
                }}
                style={{ height: '48px', flex: 1 }}
              >
                CONFIRM & ACCEPT
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Verification Overlay */}
      {verifyingPayment && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(255,255,255,0.8)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10001
        }}>
          <Loader2 className="animate-spin" style={{ color: 'var(--color-accent)', marginBottom: '1.5rem' }} size={48} />
          <h3 className="section-title-serif" style={{ fontSize: '1.5rem' }}>Verifying Payment Status</h3>
          <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '10px' }}>Securing transaction signature with Stripe...</p>
        </div>
      )}
    </div>
  );
}

