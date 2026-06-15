import { useState, useRef, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import {
  Upload, Sparkles, X, CheckCircle, AlertCircle, Clock,
  Camera, Info, Shield, RotateCcw, Download, Share2, Star, ShoppingCart
} from 'lucide-react';
import { useCart } from '../../context/CartContext';
import '../Dashboard/Dashboard.css';
import './VirtualTryOn.css';


const PIPELINE_STAGES = [
  { id: 1, name: 'Pose Estimation', model: 'MediaPipe / HRNet', desc: 'Extracting body keypoints', icon: '🦴' },
  { id: 2, name: 'Body Parsing', model: 'SCHP', desc: 'Segmenting body regions (face masked)', icon: '🧩' },
  { id: 3, name: 'Garment Warping', model: 'PF-AFN', desc: 'Fitting garment to body shape', icon: '👗' },
  { id: 4, name: 'Final Refinement', model: 'LaDI-VTON', desc: 'Generating composite image', icon: '✨' },
];

export default function VirtualTryOn() {
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState('consent'); // consent | upload | processing | result
  const [userPhoto, setUserPhoto] = useState(null);
  const [selectedGarment, setSelectedGarment] = useState(null);
  const [currentStage, setCurrentStage] = useState(0);
  const [progress, setProgress] = useState(0);
  const [rating, setRating] = useState(0);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'Virtual Try-On — Auto Stitch';
    
    // Check for garment data in URL params (sent from Boutique/Product pages)
    const garmentId = searchParams.get('id');
    const garmentName = searchParams.get('name');
    const garmentImage = searchParams.get('image');
    const garmentCategory = searchParams.get('category');
    const garmentPrice = searchParams.get('price');

    if (garmentId && garmentImage) {
      const boutiqueId = searchParams.get('boutique');
      setSelectedGarment({
        _id: garmentId,
        name: garmentName || 'Selected Item',
        image: garmentImage,
        images: [garmentImage], // Add images array for cart compatibility
        category: garmentCategory || 'Boutique',
        price: garmentPrice ? parseFloat(garmentPrice) : 0,
        boutique: boutiqueId // Essential for Order creation
      });
    }
  }, [searchParams]);

  const { addToCart } = useCart();

  // Handle Generate Action
  const handleGenerate = () => {
    setStep('processing');
    setCurrentStage(0);
    setProgress(0);
    
    let stage = 0;
    let prog = 0;
    const interval = setInterval(() => {
      prog += 2;
      setProgress(prog);
      
      if (prog >= (stage + 1) * 25 && stage < 3) {
        stage++;
        setCurrentStage(stage);
      }
      
      if (prog >= 100) {
        clearInterval(interval);
        setTimeout(() => setStep('result'), 500);
      }
    }, 60);
  };

  const handleSave = () => {
    // Implement real download
    const link = document.createElement('a');
    link.href = selectedGarment?.image || '';
    link.download = `auto-stitch-tryon-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Auto Stitch Virtual Try-On',
        text: 'Check out how this garment looks on me!',
        url: window.location.href,
      }).catch(() => {
        // No toast
      });
    } else {
      // No toast
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setUserPhoto(reader.result);
    reader.readAsDataURL(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setUserPhoto(reader.result);
    reader.readAsDataURL(file);
  };

  const reset = () => {
    setStep('upload');
    setUserPhoto(null);
    setCurrentStage(0);
    setProgress(0);
    setRating(0);
  };

  return (
    <div className="dashboard-page page-enter">
      <div className="container dashboard-container" style={{ justifyContent: 'center' }}>
        <main className="dashboard-main" style={{ flex: 1, width: '100%', maxWidth: '1000px', margin: '0 auto' }}>
          <div className="dashboard-section" style={{ textAlign: 'center' }}>
            <h2 className="dashboard-section-title">Virtual Try-On Experience</h2>
            <p className="text-muted" style={{ marginBottom: '2rem', fontSize: '0.85rem', marginLeft: 'auto', marginRight: 'auto', maxWidth: '600px' }}>
              Powered by state-of-the-art generative AI. Upload your photo and see how any garment looks on you instantly.
            </p>
          </div>


        {/* ===== STEP: CONSENT ===== */}
        {step === 'consent' && (
          <div className="tryon-consent-wrap" style={{ flexDirection: 'column', alignItems: 'center', gap: '1rem', maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>Privacy Notice</h2>
            <p className="consent-desc" style={{ textAlign: 'center', fontSize: '1.1rem', maxWidth: '600px', marginBottom: '2rem' }}>
              Before proceeding, please review how we process your image. Your privacy and security are our highest priority.
            </p>

            <div className="consent-points" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', width: '100%', marginBottom: '3rem' }}>
              {[
                { icon: <Shield size={20} />, title: 'Face Masking', desc: 'Your face is automatically masked throughout the entire AI pipeline.' },
                { icon: <Clock size={20} />, title: '1-Hour Auto-Delete', desc: 'All uploaded images and processing artifacts are automatically deleted after 1 hour.' },
                { icon: <CheckCircle size={20} />, title: 'Encrypted Storage', desc: 'Images are stored with AWS SSE-KMS encryption during processing.' },
                { icon: <Info size={20} />, title: 'No Training Use', desc: 'Your photo will never be used to train or improve AI models.' },
              ].map((p) => (
                <div key={p.title} className="consent-point" style={{ textAlign: 'left', background: 'transparent', border: '1px solid var(--color-border)', padding: '1.5rem' }}>
                  <span className="consent-point-icon">{p.icon}</span>
                  <div>
                    <strong style={{ fontSize: '1rem' }}>{p.title}</strong>
                    <p style={{ fontSize: '0.85rem' }}>{p.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="consent-actions" style={{ width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <button className="btn-black" onClick={() => setStep('upload')}>
                I Understand & Consent
              </button>
              <Link to="/boutiques" className="btn btn-ghost btn-lg">
                No Thanks
              </Link>
            </div>
          </div>
        )}

        {/* ===== STEP: UPLOAD ===== */}
        {step === 'upload' && (
          <div className="tryon-upload-wrap">
            <div className="upload-grid">
              {/* Upload Photo */}
              <div className="upload-section">
                <h3 className="upload-section-title">
                  <Camera size={18} /> Your Photo
                </h3>
                <div
                  className={`upload-dropzone ${userPhoto ? 'upload-dropzone-filled' : ''}`}
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                  onClick={() => !userPhoto && fileInputRef.current?.click()}
                >
                  {userPhoto ? (
                    <>
                      <img src={userPhoto} alt="Your photo" className="upload-preview" />
                      <button className="upload-remove" onClick={(e) => { e.stopPropagation(); setUserPhoto(null); }}>
                        <X size={16} />
                      </button>
                    </>
                  ) : (
                    <div className="upload-placeholder">
                      <Upload size={36} className="upload-icon" />
                      <p className="upload-title">Drop your photo here</p>
                      <p className="upload-hint">or click to browse</p>
                      <p className="upload-specs">JPEG or PNG · Max 10MB · Full-body photo recommended</p>
                      <button 
                        className="btn btn-outline btn-sm" 
                        style={{ marginTop: 'var(--space-md)' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          fileInputRef.current?.click();
                        }}
                      >
                        <Camera size={14} /> Choose Photo
                      </button>
                      <button 
                        className="btn btn-link btn-sm" 
                        style={{ marginTop: '5px', fontSize: '0.75rem', opacity: 0.7 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setUserPhoto('https://images.pexels.com/photos/157675/fashion-men-s-individuality-black-and-white-157675.jpeg?auto=compress&cs=tinysrgb&w=600');
                        }}
                      >
                        Use Sample Photo
                      </button>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png"
                    className="upload-input"
                    onChange={handleFileChange}
                  />
                </div>
                <div className="upload-tips">
                  <p className="upload-tip-title"><Info size={13} /> Tips for best results:</p>
                  <ul>
                    <li>Stand against a plain background</li>
                    <li>Ensure full body is visible</li>
                    <li>Good lighting from the front</li>
                    <li>Stand straight, arms slightly away from body</li>
                  </ul>
                </div>
              </div>

              {/* Select Garment */}
              <div className="upload-section">
                <h3 className="upload-section-title">
                  <Sparkles size={18} /> Select Garment
                </h3>
                <div className="upload-dropzone garment-placeholder-box" style={{ 
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-bg-surface)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: selectedGarment ? '0' : 'var(--space-xl)',
                  textAlign: 'center',
                  gap: 'var(--space-md)',
                  cursor: 'default',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  {selectedGarment ? (
                    <>
                      <img src={selectedGarment.image} alt={selectedGarment.name} className="upload-preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <div style={{ 
                        position: 'absolute', bottom: '0', left: '0', right: '0', 
                        padding: '12px', background: 'rgba(255,255,255,0.9)', 
                        backdropFilter: 'blur(10px)', borderTop: '1px solid var(--color-border)' 
                      }}>
                        <p style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--color-text-primary)' }}>{selectedGarment.name}</p>
                        <p style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>{selectedGarment.category}</p>
                      </div>
                      <button 
                        className="upload-remove" 
                        onClick={() => setSelectedGarment(null)}
                        style={{ position: 'absolute', top: '12px', right: '12px', zIndex: 10 }}
                      >
                        <X size={16} />
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="placeholder-icon-circle" style={{ 
                        width: '64px', height: '64px', 
                        background: 'var(--color-bg-surface)', 
                        borderRadius: '50%', 
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'var(--color-text-muted)',
                        marginBottom: 'var(--space-sm)',
                        border: '1px solid var(--color-border)'
                      }}>
                        <ShoppingCart size={28} />
                      </div>
                      <h4 style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--color-text-primary)' }}>No Garment Selected</h4>
                      <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', lineHeight: '1.5', maxWidth: '240px' }}>
                        First select the photo from boutique to see how it looks on you.
                      </p>
                      <Link to="/boutiques" className="btn btn-outline btn-sm" style={{ marginTop: 'var(--space-md)' }}>
                        <ShoppingCart size={14} /> Go to Boutique
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </div>
            
            {/* Action */}
            <div className="upload-action" style={{ width: '100%', maxWidth: '400px', margin: '3rem auto 0 auto' }}>
              <button
                className="btn-black"
                onClick={handleGenerate}
                disabled={!userPhoto || !selectedGarment}
              >
                Generate Virtual Try-On
              </button>
              {(!userPhoto || !selectedGarment) && (
                <p className="upload-action-hint text-muted">
                  <AlertCircle size={14} /> {!userPhoto ? 'Please upload your photo' : 'Please select a garment'}
                </p>
              )}
          </div>
        </div>
      )}

        {/* ===== STEP: PROCESSING ===== */}
        {step === 'processing' && (
          <div className="tryon-processing">
            <div className="processing-card glass-card">
              <div className="processing-header">

                <h2>AI Pipeline Running</h2>
                <p className="text-muted">Please wait while our 4-stage AI pipeline processes your try-on</p>
              </div>



              {/* Pipeline Stages */}
              <div className="pipeline-stages">
                {PIPELINE_STAGES.map((stage, i) => {
                  const done = i < currentStage;
                  const active = i === currentStage && progress < 100;
                  return (
                    <div key={stage.id} className={`pipeline-stage ${done ? 'stage-done' : active ? 'stage-active' : 'stage-pending'}`}>
                      <div className="stage-icon">
                        {done ? <CheckCircle size={16} /> : <span>{stage.icon}</span>}
                      </div>
                      <div className="stage-info">
                        <p className="stage-name">{stage.name}</p>
                        <p className="stage-model">{stage.model}</p>
                      </div>
                      {active && <div className="stage-spinner" />}
                    </div>
                  );
                })}
              </div>

              <p className="processing-eta">
                <Clock size={14} /> Estimated time: ~60 seconds
              </p>
            </div>
          </div>
        )}



        {/* ===== STEP: RESULT ===== */}
        {step === 'result' && (
          <div className="tryon-result">
            <div className="result-header">
              <div className="result-success-badge">
                <CheckCircle size={18} />
                <span>Try-On Complete!</span>
              </div>
              <h2 className="result-title">Here's How It Looks <span className="text-gradient">On You</span></h2>
            </div>

            <div className="result-comparison">
              <div className="result-img-card">
                <img src={userPhoto || 'https://picsum.photos/seed/before/400/600'} alt="Original" className="result-img" />
                <span className="result-label">Original Photo</span>
              </div>
              <div className="result-arrow">
                <Sparkles size={28} />
                <span>AI Magic</span>
              </div>
              <div className="result-img-card result-img-card-after">
                <img src={selectedGarment?.image || 'https://picsum.photos/seed/after/400/600'} alt="Try-On Result" className="result-img result-img-after" />
                <span className="result-label result-label-after">With {selectedGarment?.name}</span>
              </div>
            </div>

            {/* Rating */}
            <div className="result-rating">
              <p>How's the result?</p>
              <div className="stars" style={{ gap: '6px' }}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <button key={s} className="rating-star-btn" onClick={() => setRating(s)}>
                    <Star size={24} fill={s <= rating ? 'currentColor' : 'none'} style={{ color: s <= rating ? 'var(--color-accent)' : 'var(--color-text-muted)' }} />
                  </button>
                ))}
              </div>
            </div>

            <div className="result-actions" style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', maxWidth: '400px', margin: '0 auto' }}>
              <button 
                className="btn-black" 
                style={{ height: '60px', fontSize: '0.9rem', letterSpacing: '0.1em' }}
                onClick={() => {
                  if (selectedGarment) {
                    addToCart(selectedGarment);
                  }
                }}
              >
                ADD TO CART
              </button>
              <button className="btn btn-outline" style={{ borderRadius: '30px', height: '50px' }} onClick={handleSave}>
                <Download size={18} /> Save Result
              </button>
              <button className="btn btn-outline" style={{ borderRadius: '30px', height: '50px' }} onClick={handleShare}>
                <Share2 size={18} /> Share
              </button>
              <button className="btn btn-link" style={{ marginTop: '10px' }} onClick={reset}>
                <RotateCcw size={16} /> Try Another
              </button>
            </div>

            <div className="result-privacy">
              <Shield size={14} />
              <span>This image will be automatically deleted from our servers in 1 hour</span>
            </div>
          </div>
        )}

        </main>
      </div>
    </div>
  );
}





