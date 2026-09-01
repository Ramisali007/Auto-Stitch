import { useState, useRef, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { 
  Scissors, Upload, X, CheckCircle, AlertCircle, Info, 
  Sparkles, Camera, ArrowRight, ChevronRight, History
} from 'lucide-react';
import API_URL from '../../config/api';
import './Customize.css';

const CUSTOM_REGIONS = [
  { id: 'neckline', name: 'Neckline', icon: '👔' },
  { id: 'sleeves', name: 'Sleeves', icon: '👘' },
  { id: 'hemline', name: 'Hemline', icon: '📏' },
  { id: 'embroidery', name: 'Embroidery', icon: '🧵' },
  { id: 'collar', name: 'Collar', icon: '👕' },
];

export default function Customize() {
  const [searchParams] = useSearchParams();
  const rawProductId = searchParams.get('id');
  const productId = rawProductId || 'custom_project';
  const productName = searchParams.get('name') || (rawProductId ? 'Selected Item' : 'New Custom Project');
  const productImage = searchParams.get('image');
  const navigate = useNavigate();
  
  const [step, setStep] = useState(1); // 1: Regions, 2: References, 3: Review
  const [selectedRegions, setSelectedRegions] = useState([]);
  const [description, setDescription] = useState('');
  const [budget, setBudget] = useState('');
  const [refImages, setRefImages] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const fileInputRef = useRef(null);

  useEffect(() => {
    const user = localStorage.getItem('user');
    if (!user) {
      navigate('/login?redirect=customize');
      return;
    }
    
    document.title = 'AI Customization — Auto Stitch';
  }, [navigate]);

  const toggleRegion = (id) => {
    setSelectedRegions(prev => 
      prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
    );
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length + refImages.length > 5) {
      return;
    }

    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setRefImages(prev => [...prev, { file, preview: reader.result }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index) => {
    setRefImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!budget || isNaN(Number(budget)) || Number(budget) <= 0) {
      alert('Please enter a valid budget.');
      return;
    }

    setLoading(true);
    try {
      // 1. Upload Images to DB/Server first
      let uploadedUrls = [];
      if (refImages.length > 0) {
        const formData = new FormData();
        refImages.forEach(img => {
          formData.append('images', img.file);
        });
        
        const uploadRes = await axios.post(`${API_URL}/api/upload/multi`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          withCredentials: true
        });
        uploadedUrls = uploadRes.data.urls;
      }

      // 2. Save Request with actual DB URLs
      const response = await axios.post(`${API_URL}/api/bids/request`, {
        productId,
        selectedRegions,
        description,
        budget: Number(budget),
        referenceImages: uploadedUrls
      }, { withCredentials: true });

      if (response.data.success) {
        navigate('/bids');
      } else {
        alert(response.data.message || 'Failed to broadcast request.');
      }
    } catch (error) {
      console.error('Submit error:', error);
      if (error.response?.status === 401) {
        alert('Your session has expired. Please log in again to continue.');
        navigate('/login?redirect=customize');
      } else {
        alert(error.response?.data?.message || 'A network error occurred. Please check your connection.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard-page page-enter">
      <div className="container dashboard-container" style={{ justifyContent: 'center' }}>
        <main className="dashboard-main" style={{ flex: 1, width: '100%', maxWidth: '1000px', margin: '0 auto' }}>
          
          <div className="dashboard-section" style={{ textAlign: 'center' }}>
            <h2 className="dashboard-section-title">AI Custom Stitching</h2>
            <p className="text-muted" style={{ marginBottom: '2rem', fontSize: '0.85rem', marginLeft: 'auto', marginRight: 'auto', maxWidth: '600px' }}>
              Modify specific garment regions and receive competitive bids from our premier boutiques. 
              Powered by structural AI modification tools.
            </p>
          </div>

          {/* Stepper (Matching VTON feel) */}
          <div className="customize-stepper-v2">
            {[1, 2, 3].map(s => (
              <div key={s} className={`step-v2 ${step === s ? 'active' : step > s ? 'done' : ''}`}>
                <div className="step-v2-num">{step > s ? <CheckCircle size={14} /> : s}</div>
                <span className="step-v2-label">
                  {s === 1 ? 'Regions' : s === 2 ? 'References' : 'Confirm'}
                </span>
                {s < 3 && <div className="step-v2-line" />}
              </div>
            ))}
          </div>

          <div className="customize-content-wrap">
            {/* STEP 1: REGIONS */}
            {step === 1 && (
              <div className="step-content-v2">
                <div className="upload-grid">
                  <div className="upload-section">
                    <h3 className="upload-section-title">
                      <Scissors size={18} /> Select Regions
                    </h3>
                    <div className="regions-selection-grid">
                      {CUSTOM_REGIONS.map(r => (
                        <button 
                          key={r.id}
                          className={`region-pill ${selectedRegions.includes(r.id) ? 'active' : ''}`}
                          onClick={() => toggleRegion(r.id)}
                        >
                          <span className="region-pill-icon">{r.icon}</span>
                          <span className="region-pill-name">{r.name}</span>
                          {selectedRegions.includes(r.id) && <CheckCircle size={12} className="check" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="upload-section">
                    <h3 className="upload-section-title">
                      <Sparkles size={18} /> Selected Garment
                    </h3>
                    <div className="upload-dropzone filled">
                      {productImage ? (
                        <img src={productImage} alt={productName} className="upload-preview" />
                      ) : (
                        <div className="upload-placeholder">
                          <p className="upload-hint">No image available</p>
                        </div>
                      )}
                      <div className="garment-overlay-label">
                        <span>{productName}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="upload-action" style={{ marginTop: '2rem' }}>
                  <button 
                    className="btn-black" 
                    disabled={selectedRegions.length === 0}
                    onClick={() => setStep(2)}
                  >
                    CONTINUE TO DETAILS
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: REFERENCES */}
            {step === 2 && (
              <div className="step-content-v2">
                <div className="details-layout">
                  <div className="details-form-side">
                    <h3 className="upload-section-title"><Info size={18} /> Modification Details</h3>
                    
                    <div className="custom-form-group">
                      <label>Describe your vision</label>
                      <textarea 
                        placeholder="E.g., I want the neckline to be V-shaped with gold embroidery..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="custom-textarea"
                        rows={5}
                      />
                    </div>

                    <div className="custom-form-group">
                      <label>Estimated Budget (PKR)</label>
                      <input 
                        type="number" 
                        placeholder="e.g. 5000"
                        value={budget}
                        onChange={(e) => setBudget(e.target.value)}
                        className="custom-input"
                        required
                      />
                    </div>
                  </div>

                  <div className="details-upload-side">
                    <h3 className="upload-section-title"><Camera size={18} /> Reference Images</h3>
                    <div 
                      className="ref-upload-dropzone"
                      onClick={() => refImages.length < 5 && fileInputRef.current?.click()}
                    >
                      {refImages.length === 0 ? (
                        <div className="ref-placeholder">
                          <Upload size={24} />
                          <p>Click to upload references (Max 5)</p>
                        </div>
                      ) : (
                        <div className="ref-previews">
                          {refImages.map((img, i) => (
                            <div key={i} className="ref-thumb">
                              <img src={img.preview} alt="" />
                              <button onClick={(e) => { e.stopPropagation(); removeImage(i); }}><X size={12} /></button>
                            </div>
                          ))}
                          {refImages.length < 5 && (
                            <div className="ref-add-more">
                              <Plus size={20} />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <input type="file" ref={fileInputRef} hidden multiple accept="image/*" onChange={handleFileChange} />
                  </div>
                </div>

                <div className="upload-action" style={{ marginTop: '3rem', flexDirection: 'row', gap: '1rem' }}>
                  <button className="btn btn-outline" style={{ flex: 1, height: '60px', borderRadius: '0' }} onClick={() => setStep(1)}>
                    BACK
                  </button>
                  <button 
                    className="btn-black" 
                    style={{ flex: 2 }}
                    disabled={!description || refImages.length === 0 || !budget}
                    onClick={() => setStep(3)}
                  >
                    PREVIEW REQUEST
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: REVIEW */}
            {step === 3 && (
              <div className="step-content-v2">
                <div className="review-v2-card">
                  <div className="review-v2-header">
                    <div className="success-badge">
                      <CheckCircle size={16} />
                      <span>Ready to Broadcast</span>
                    </div>
                    <h2>Review Your Request</h2>
                  </div>

                  <div className="review-v2-grid">
                    <div className="review-item">
                      <label>Target Regions</label>
                      <div className="review-tags">
                        {selectedRegions.map(r => <span key={r} className="review-tag">{r}</span>)}
                      </div>
                    </div>
                    <div className="review-item">
                      <label>Budget</label>
                      <span className="review-value">PKR {budget}</span>
                    </div>
                    <div className="review-item" style={{ gridColumn: 'span 2' }}>
                      <label>Description</label>
                      <p className="review-desc">{description}</p>
                    </div>
                    <div className="review-item" style={{ gridColumn: 'span 2' }}>
                      <label>References</label>
                      <div className="review-refs">
                        {refImages.map((img, i) => (
                          <img key={i} src={img.preview} alt="" className="review-img" />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="upload-action" style={{ marginTop: '3rem', flexDirection: 'row', gap: '1rem' }}>
                  <button className="btn btn-outline" style={{ flex: 1, height: '60px', borderRadius: '0' }} onClick={() => setStep(2)}>
                    BACK
                  </button>
                  <button 
                    className="btn-black" 
                    style={{ flex: 2 }}
                    disabled={loading}
                    onClick={handleSubmit}
                  >
                    {loading ? 'BROADCASTING...' : 'BROADCAST TO BOUTIQUES'}
                  </button>
                </div>
              </div>
            )}
          </div>

        </main>
      </div>
    </div>
  );
}

// Helper icons
function Plus({ size }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;
}

