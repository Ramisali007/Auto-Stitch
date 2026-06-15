import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import API_URL from '../../config/api';
import './TrackOrder.css';

export default function TrackOrder() {
  const [referenceId, setReferenceId] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'Track Order — Auto Stitch';
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const { data } = await axios.post(`${API_URL}/api/orders/track`, { referenceId });
      if (data.success) {
        setSuccessMsg(data.message);
        setIsSubmitted(true);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to locate order. Please check your Reference ID.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="track-page page-enter">
      <div className="track-container">
        <h1 className="track-title">{isSubmitted ? "Request Received" : "Track Order"}</h1>
        
        {!isSubmitted ? (
          <>
            <p className="track-subtitle">Track your order instantly using your 6-character Reference ID.</p>

            <form className="track-form" onSubmit={handleSubmit}>
              <div className="track-form-group">
                <label className="track-label">ORDER REFERENCE ID *</label>
                <input 
                  type="text" 
                  className="track-input" 
                  placeholder="e.g. 5A2B9C" 
                  value={referenceId}
                  onChange={(e) => setReferenceId(e.target.value.toUpperCase())}
                  maxLength={6}
                  required 
                />
              </div>

              {error && <p style={{ color: 'var(--color-error)', fontSize: '0.85rem', marginTop: '-15px', marginBottom: '15px' }}>{error}</p>}

              <p className="track-note">
                Note: Your Reference ID can be found in your order confirmation dashboard or previous emails.
              </p>

              <button type="submit" className="track-button" disabled={loading}>
                {loading ? 'LOCATING ARTISAN LOGS...' : 'TRACK MY ORDER'}
              </button>
            </form>
          </>
        ) : (
          <div className="track-success-message page-enter">
            <p className="track-subtitle" style={{ marginBottom: '40px', lineHeight: '1.8' }}>
              {successMsg || "We have successfully located your order. A detailed tracking update has been sent to your registered email address."}
              <br/><br/>
              Please allow a few minutes for the email to arrive and check your spam folder if necessary.
            </p>
            
            <button className="track-button" onClick={() => setIsSubmitted(false)}>
              TRACK ANOTHER ORDER
            </button>
            <Link to="/" className="track-return-link">
              RETURN TO HOME
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
