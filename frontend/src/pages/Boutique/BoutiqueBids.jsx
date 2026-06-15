import { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Briefcase, Search, Filter, Clock, Tag,
  MapPin, ChevronRight, Send, User, Scissors,
  CheckCircle, AlertCircle, RotateCcw as Loader, Sparkles, X
} from 'lucide-react';
import API_URL from '../../config/api';
import './BoutiqueBids.css';
import '../BoutiqueManage/BoutiqueManage.css';
import { EDITORIAL_PRODUCTS } from '../../data/mockData';

const getFallbackImage = (id) => {
  if (!id) return '';
  const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const index = hash % EDITORIAL_PRODUCTS.length;
  return EDITORIAL_PRODUCTS[index].images[0];
};

export default function BoutiqueBids() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [bidForm, setBidForm] = useState({ price: '', timeline: '', notes: '' });

  useEffect(() => {
    fetchAvailableRequests();
    document.title = 'Bidding Dashboard — Auto Stitch';
  }, []);

  const fetchAvailableRequests = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/bids/requests`, { withCredentials: true });
      if (res.data.success) {
        setRequests(res.data.data);
      }
    } catch (error) {
      console.error('Bids fetch failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitBid = async (e) => {
    e.preventDefault();
    if (!bidForm.price || !bidForm.timeline) return;

    try {
      const res = await axios.post(`${API_URL}/api/bids/requests/${selectedRequest._id}/bid`, {
        price: Number(bidForm.price),
        timeline: Number(bidForm.timeline),
        notes: bidForm.notes
      }, { withCredentials: true });

      if (res.data.success) {
        setRequests(prev => prev.filter(r => r._id !== selectedRequest._id));
        setSelectedRequest(null);
        setBidForm({ price: '', timeline: '', notes: '' });
        alert('Bid submitted successfully!');
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to submit bid');
    }
  };

  if (loading && requests.length === 0) {
    return (
      <div className="manage-page flex-center" style={{ minHeight: '60vh' }}>
        <Loader className="animate-spin" size={40} style={{ color: 'var(--color-primary)' }} />
      </div>
    );
  }

  return (
    <div className="manage-page page-enter">
      <div className="manage-container">
        <div className="manage-header-center">
          <h1 className="manage-title-serif">Bidding <span className="text-gradient">Dashboard</span></h1>
          <p className="manage-subtitle">
            Engage with premium customization requests. Offer your expert craftsmanship
            and competitive timelines to secure high-value couture orders.
          </p>
        </div>

        <div className="bids-management-layout" style={{
          display: 'grid',
          gridTemplateColumns: selectedRequest ? '350px 1fr' : '1fr',
          gap: '3rem',
          transition: 'all 0.5s ease'
        }}>
          {/* Requests Feed */}
          <div className="requests-feed-v2">
            <div className="manage-toolbar-modern" style={{ marginBottom: '2rem' }}>
              <div className="search-wrap-minimal">
                <Search size={16} className="search-icon-fixed" />
                <input type="text" placeholder="Filter requests..." className="search-input-minimal" />
              </div>
              <span className="product-count-badge">{requests.length} available</span>
            </div>

            <div className="feed-list-v2" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {requests.map(req => (
                <div
                  key={req._id}
                  className={`bid-request-card ${selectedRequest?._id === req._id ? 'active' : ''}`}
                  onClick={() => setSelectedRequest(req)}
                  style={{
                    background: selectedRequest?._id === req._id ? '#000' : '#fff',
                    color: selectedRequest?._id === req._id ? '#fff' : '#000',
                    border: '1px solid #eee',
                    padding: '1.5rem',
                    cursor: 'pointer',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    display: 'flex',
                    gap: '1.5rem',
                    alignItems: 'center'
                  }}
                >
                  <img 
                    src={req.product?.images?.[0] || req.referenceImages?.[0] || getFallbackImage(req._id)} 
                    alt="" 
                    style={{ width: '60px', height: '80px', objectFit: 'cover', filter: selectedRequest?._id === req._id ? 'brightness(0.9)' : 'none' }}
                    onError={(e) => { e.target.src = getFallbackImage(req._id); }}
                  />
                  <div style={{ flex: 1 }}>
                    <div className="flex-between" style={{ marginBottom: '8px' }}>
                      <span style={{ fontSize: '0.65rem', fontWeight: '700', textTransform: 'uppercase', opacity: 0.6 }}>{req.customer?.name}</span>
                      <span style={{ fontSize: '0.65rem', display: 'flex', alignItems: 'center', gap: '4px', opacity: 0.6 }}><Clock size={10} /> 4h</span>
                    </div>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: '600', marginBottom: '8px' }}>{req.product?.name}</h4>
                    <p style={{ fontSize: '0.85rem', fontWeight: '700' }}>Budget: PKR {req.budget?.toLocaleString()}</p>
                  </div>
                </div>
              ))}

              {requests.length === 0 && (
                <div className="empty-state-editorial">
                  <div className="empty-icon-wrap"><Sparkles size={32} /></div>
                  <h3 className="empty-title">All Caught Up</h3>
                  <p className="text-muted">There are no new customization requests at the moment.</p>
                </div>
              )}
            </div>
          </div>

          {/* Bid Workspace */}
          {selectedRequest && (
            <div className="bid-workspace-v2 animate-fade-in" style={{ animation: 'fadeIn 0.5s ease-out' }}>
              <div className="workspace-card glass-card" style={{ padding: '3rem', background: '#fff', border: '1px solid #eee' }}>
                <div className="workspace-header-v2" style={{ marginBottom: '3rem', borderBottom: '1px solid #f5f5f5', paddingBottom: '2rem' }}>
                  <div className="flex-between" style={{ alignItems: 'flex-start' }}>
                    <div>
                      <h2 style={{ fontFamily: '"Tenor Sans", serif', fontSize: '2.2rem', marginBottom: '1rem' }}>Request Details</h2>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        {selectedRequest.selectedRegions?.map(r => (
                          <span key={r} style={{ fontSize: '0.65rem', fontWeight: '700', padding: '4px 12px', background: '#f5f5f5', borderRadius: '20px', textTransform: 'uppercase' }}>{r}</span>
                        ))}
                      </div>
                    </div>
                    <button className="pc-action-btn" onClick={() => setSelectedRequest(null)}><X size={20} /></button>
                  </div>
                </div>

                <div className="request-preview-comparison" style={{ display: 'grid', gridTemplateColumns: '250px 1fr', gap: '3rem', marginBottom: '4rem' }}>
                  <div className="req-img-card">
                    <img 
                      src={selectedRequest.product?.images?.[0] || selectedRequest.referenceImages?.[0] || getFallbackImage(selectedRequest._id)} 
                      alt="" 
                      style={{ width: '100%', borderRadius: '0', border: '1px solid #eee' }} 
                      onError={(e) => { e.target.src = getFallbackImage(selectedRequest._id); }}
                    />
                    <p style={{ fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: '700', textAlign: 'center', marginTop: '1rem', letterSpacing: '0.1em' }}>Base Garment</p>
                  </div>
                  <div className="req-details-text">
                    <h4 style={{ fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1.5rem' }}>Customer Requirement</h4>
                    <p style={{ fontSize: '1.1rem', lineHeight: '1.8', color: '#444', fontStyle: 'italic' }}>"{selectedRequest.description}"</p>
                    <div style={{ marginTop: '2rem', padding: '1.5rem', background: '#fcfcfc', borderLeft: '3px solid #000' }}>
                      <p style={{ fontSize: '0.75rem', fontWeight: '700', color: '#999', marginBottom: '5px' }}>CUSTOMER BUDGET</p>
                      <p style={{ fontSize: '1.5rem', fontWeight: '400', fontFamily: '"Tenor Sans", serif' }}>PKR {selectedRequest.budget?.toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                <div className="bid-submission-area" style={{ borderTop: '1px solid #f5f5f5', paddingTop: '3rem' }}>
                  <h3 style={{ fontFamily: '"Tenor Sans", serif', fontSize: '1.8rem', marginBottom: '2rem' }}>Submit Proposal</h3>
                  <form onSubmit={handleSubmitBid} className="modal-form" style={{ background: '#f9f9f9', padding: '2.5rem' }}>
                    <div className="form-group">
                      <label>Your Quote (PKR)</label>
                      <input
                        type="number"
                        value={bidForm.price}
                        onChange={e => setBidForm({ ...bidForm, price: e.target.value })}
                        placeholder="e.g. 5500"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Timeline (Days)</label>
                      <input
                        type="number"
                        value={bidForm.timeline}
                        onChange={e => setBidForm({ ...bidForm, timeline: e.target.value })}
                        placeholder="e.g. 7"
                        required
                      />
                    </div>
                    <div className="form-group form-full">
                      <label>Expertise & Notes</label>
                      <textarea
                        value={bidForm.notes}
                        onChange={e => setBidForm({ ...bidForm, notes: e.target.value })}
                        placeholder="Detail your approach, materials, and why you're the best choice..."
                        required
                      />
                    </div>
                    <div className="modal-footer" style={{ marginTop: '1rem' }}>
                      <button type="submit" className="btn-black-premium" style={{ width: '100%', justifyContent: 'center' }}>
                        <Send size={18} /> Submit Competitive Bid
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}

          {!selectedRequest && requests.length > 0 && (
            <div className="workspace-placeholder-v2" style={{
              textAlign: 'center',
              padding: '100px 20px',
              background: '#fcfcfc',
              border: '1px dashed #eee',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Briefcase size={48} strokeWidth={1} style={{ marginBottom: '2rem', opacity: 0.3 }} />
              <h3 className="manage-title-serif" style={{ fontSize: '1.8rem' }}>Selection Required</h3>
              <p className="text-muted">Please select a request from the feed to begin your proposal.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

