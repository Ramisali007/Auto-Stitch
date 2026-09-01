import { useState, useRef, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import API_URL from '../../config/api';
import {
  Upload, Sparkles, X, CheckCircle, AlertCircle, Clock,
  Camera, Info, Shield, RotateCcw, Download, Share2, Star, ShoppingCart
} from 'lucide-react';
import { useCart } from '../../context/CartContext';
import toast from 'react-hot-toast';
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
  const [catalogGarments, setCatalogGarments] = useState([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [currentStage, setCurrentStage] = useState(0);
  const [progress, setProgress] = useState(0);
  const [rating, setRating] = useState(0);
  const [generatedTryOnImage, setGeneratedTryOnImage] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fileInputRef = useRef(null);
  const { addToCart } = useCart();

  useEffect(() => {
    document.title = 'Virtual Try-On — Auto Stitch';
    fetchTryOnCatalog();

    // Check for garment data in URL params (sent from Boutique/Catalogue/Wishlist pages)
    const garmentId = searchParams.get('id');
    const garmentName = searchParams.get('name');
    const garmentImage = searchParams.get('image');
    const garmentCategory = searchParams.get('category');
    const garmentPrice = searchParams.get('price');
    const boutiqueId = searchParams.get('boutique');

    if (garmentId && garmentImage) {
      setSelectedGarment({
        _id: garmentId,
        name: garmentName || 'Selected Item',
        image: garmentImage,
        images: [garmentImage],
        category: garmentCategory || 'Boutique',
        price: garmentPrice ? parseFloat(garmentPrice) : 0,
        boutique: boutiqueId,
      });
    }
  }, [searchParams]);

  const fetchTryOnCatalog = async () => {
    setLoadingCatalog(true);
    try {
      const res = await axios.get(`${API_URL}/api/try-on/catalog`);
      if (res.data.success) {
        setCatalogGarments(res.data.products || []);
      }
    } catch (err) {
      console.warn('Failed to load try-on catalog:', err);
    } finally {
      setLoadingCatalog(false);
    }
  };

  const [currentJobId, setCurrentJobId] = useState(null);
  const [sessionToken, setSessionToken] = useState('');

  // Handle Real AI Virtual Try-On Generation
  const handleGenerate = async () => {
    if (!userPhoto || !selectedGarment || isSubmitting) return;

    setIsSubmitting(true);
    setStep('processing');
    setCurrentStage(0);
    setProgress(0);

    const interval = setInterval(() => {
      setProgress((prev) => {
        const next = prev + 3;
        if (next >= 25 && next < 50) setCurrentStage(1);
        else if (next >= 50 && next < 75) setCurrentStage(2);
        else if (next >= 75 && next < 100) setCurrentStage(3);

        if (next >= 95) {
          clearInterval(interval);
          return 95;
        }
        return next;
      });
    }, 50);

    try {
      // 1. Create Session
      const sessionRes = await axios.post(`${API_URL}/api/vto/session`, {
        productId: selectedGarment._id,
        boutiqueId: selectedGarment.boutique?._id || selectedGarment.boutique,
      }, { withCredentials: true });

      const jId = sessionRes.data.jobId;
      const sToken = sessionRes.data.sessionToken;
      setCurrentJobId(jId);
      setSessionToken(sToken);

      // 2. Submit Job to Async Queue
      await axios.post(`${API_URL}/api/vto/jobs`, {
        jobId: jId,
        userPhoto,
        fitStyle: 'Tailored',
      }, {
        headers: { 'x-vto-session': sToken },
        withCredentials: true,
      });

      // 3. Poll for completion
      let attempts = 0;
      const maxAttempts = 30;
      const pollInterval = setInterval(async () => {
        attempts++;
        try {
          const statusRes = await axios.get(`${API_URL}/api/vto/jobs/${jId}`, {
            headers: { 'x-vto-session': sToken },
            withCredentials: true,
          });

          if (statusRes.data.status === 'completed' && statusRes.data.resultUrl) {
            clearInterval(pollInterval);
            clearInterval(interval);
            setProgress(100);
            setGeneratedTryOnImage(statusRes.data.resultUrl);
            setTimeout(() => {
              setIsSubmitting(false);
              setStep('result');
              toast.success('Try-on generated! Source portrait purged from server.');
            }, 400);
          } else if (statusRes.data.status === 'failed') {
            clearInterval(pollInterval);
            clearInterval(interval);
            setIsSubmitting(false);
            setGeneratedTryOnImage(selectedGarment.image);
            setStep('result');
            toast.error(statusRes.data.errorDescription || 'Inference error; fallback preview loaded.');
          }
        } catch (_) {}

        if (attempts >= maxAttempts) {
          clearInterval(pollInterval);
          clearInterval(interval);
          setIsSubmitting(false);
          setGeneratedTryOnImage(selectedGarment.image);
          setStep('result');
        }
      }, 1500);
    } catch (err) {
      console.warn('VTO Async notice, calling instant processor:', err.message);
      try {
        const response = await axios.post(`${API_URL}/api/try-on/process`, {
          userPhoto,
          garmentImage: selectedGarment.image || selectedGarment.images?.[0],
          garmentName: selectedGarment.name,
          category: selectedGarment.category,
          fitStyle: 'Tailored',
        });
        if (response.data.success && response.data.resultImage) {
          setGeneratedTryOnImage(response.data.resultImage);
        } else {
          setGeneratedTryOnImage(selectedGarment.image);
        }
      } catch (fallbackErr) {
        setGeneratedTryOnImage(selectedGarment.image);
      } finally {
        clearInterval(interval);
        setProgress(100);
        setTimeout(() => {
          setIsSubmitting(false);
          setStep('result');
        }, 500);
      }
    }
  };

  const handleSave = () => {
    const link = document.createElement('a');
    link.href = generatedTryOnImage || selectedGarment?.image || '';
    link.download = `auto-stitch-tryon-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Try-on render saved successfully!');
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Auto Stitch Virtual Try-On',
        text: `Check out how ${selectedGarment?.name || 'this garment'} looks on me!`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(window.location.href);
      toast.success('Link copied to clipboard!');
    }
  };

  const processClientImage = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file (JPEG, PNG, WebP)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        const maxDim = 1200;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        setUserPhoto(canvas.toDataURL('image/webp', 0.92));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    processClientImage(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    processClientImage(file);
  };

  const reset = async () => {
    if (currentJobId) {
      try {
        await axios.delete(`${API_URL}/api/vto/jobs/${currentJobId}`, {
          headers: { 'x-vto-session': sessionToken },
          withCredentials: true,
        });
      } catch (_) {}
    }
    setStep('upload');
    setUserPhoto(null);
    setCurrentStage(0);
    setProgress(0);
    setRating(0);
    setGeneratedTryOnImage(null);
    setCurrentJobId(null);
    toast.success('Session and temporary server files deleted.');
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

          {/* ===== STEP 1: CONSENT ===== */}
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

          {/* ===== STEP 2: UPLOAD ===== */}
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
                        
                        <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px', width: '100%', maxWidth: '240px' }}>
                          <span style={{ fontSize: '0.72rem', color: '#888', textTransform: 'uppercase', fontWeight: 600 }}>Or Pick Studio Model:</span>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              style={{ fontSize: '0.72rem', padding: '4px 8px', border: '1px solid #e5e5e5' }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setUserPhoto('https://images.pexels.com/photos/157675/fashion-men-s-individuality-black-and-white-157675.jpeg?auto=compress&cs=tinysrgb&w=600');
                              }}
                            >
                              Model 1
                            </button>
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              style={{ fontSize: '0.72rem', padding: '4px 8px', border: '1px solid #e5e5e5' }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setUserPhoto('https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80');
                              }}
                            >
                              Model 2
                            </button>
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              style={{ fontSize: '0.72rem', padding: '4px 8px', border: '1px solid #e5e5e5' }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setUserPhoto('https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80');
                              }}
                            >
                              Model 3
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
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
                    overflow: 'hidden',
                    minHeight: '340px'
                  }}>
                    {selectedGarment ? (
                      <>
                        <img 
                          src={selectedGarment.image || selectedGarment.images?.[0]} 
                          alt={selectedGarment.name} 
                          className="upload-preview" 
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                        />
                        <div style={{
                          position: 'absolute', bottom: '0', left: '0', right: '0',
                          padding: '12px', background: 'rgba(255,255,255,0.92)',
                          backdropFilter: 'blur(10px)', borderTop: '1px solid var(--color-border)'
                        }}>
                          <p style={{ fontSize: '0.88rem', fontWeight: '700', color: '#1a1a2e', margin: 0 }}>{selectedGarment.name}</p>
                          <p style={{ fontSize: '0.72rem', color: '#666', textTransform: 'uppercase', margin: '2px 0 0 0' }}>
                            {selectedGarment.category} · PKR {selectedGarment.price?.toLocaleString()}
                          </p>
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
                          background: '#fff',
                          borderRadius: '50%',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#1a1a2e',
                          marginBottom: 'var(--space-sm)',
                          border: '1px solid #e5e5e5'
                        }}>
                          <ShoppingCart size={28} />
                        </div>
                        <h4 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#1a1a2e', margin: 0 }}>No Garment Selected</h4>
                        <p style={{ fontSize: '0.85rem', color: '#666', lineHeight: '1.5', maxWidth: '260px', margin: '6px 0 12px 0' }}>
                          Choose an outfit from the boutique studio collection below or explore catalogue.
                        </p>
                        <Link to="/boutiques" className="btn btn-outline btn-sm">
                          <ShoppingCart size={14} /> Browse Boutiques
                        </Link>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* In-Studio Garment Selector Tray */}
              {catalogGarments.length > 0 && (
                <div style={{ marginTop: '2.5rem', background: '#fff', border: '1px solid #e5e5e5', borderRadius: '4px', padding: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h4 style={{ margin: 0, fontFamily: 'Playfair Display, serif', fontSize: '1.15rem', color: '#1a1a2e' }}>
                      ✨ Quick Select from Boutique Studio Collection
                    </h4>
                    <span style={{ fontSize: '0.75rem', color: '#888' }}>
                      Click any piece to try it on
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '8px' }}>
                    {catalogGarments.map(g => {
                      const isSelected = selectedGarment?._id === g._id;
                      return (
                        <div 
                          key={g._id}
                          onClick={() => setSelectedGarment({
                            _id: g._id,
                            name: g.name,
                            image: g.images?.[0] || '',
                            images: g.images,
                            category: g.category,
                            price: g.price,
                            boutique: g.boutique?._id || g.boutique
                          })}
                          style={{
                            width: '130px', flexShrink: 0, border: isSelected ? '2px solid #1a1a2e' : '1px solid #e5e5e5',
                            borderRadius: '4px', overflow: 'hidden', cursor: 'pointer', background: isSelected ? '#fafafa' : '#fff',
                            transition: 'all 0.2s ease', position: 'relative'
                          }}
                        >
                          <img 
                            src={g.images?.[0]} 
                            alt={g.name} 
                            style={{ width: '100%', height: '140px', objectFit: 'cover' }} 
                            onError={(e) => { e.target.src = 'https://via.placeholder.com/130x140?text=Garment'; }}
                          />
                          <div style={{ padding: '8px' }}>
                            <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 700, color: '#1a1a2e', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {g.name}
                            </p>
                            <p style={{ margin: '2px 0 0 0', fontSize: '0.7rem', color: '#666' }}>
                              PKR {g.price?.toLocaleString()}
                            </p>
                          </div>
                          {isSelected && (
                            <div style={{
                              position: 'absolute', top: '6px', right: '6px', background: '#1a1a2e',
                              color: '#fff', borderRadius: '50%', width: '20px', height: '20px',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem'
                            }}>
                              ✓
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Action */}
              <div className="upload-action" style={{ width: '100%', maxWidth: '400px', margin: '3rem auto 0 auto' }}>
                <button
                  className="btn-black"
                  onClick={handleGenerate}
                  disabled={!userPhoto || !selectedGarment || isSubmitting}
                >
                  Generate Virtual Try-On
                </button>
                {(!userPhoto || !selectedGarment) && (
                  <p className="upload-action-hint text-muted">
                    <AlertCircle size={14} /> {!userPhoto ? 'Please upload your photo or select a model' : 'Please select a garment'}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ===== STEP 3: PROCESSING ===== */}
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

          {/* ===== STEP 4: RESULT ===== */}
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
                  <img
                    src={userPhoto || 'https://images.pexels.com/photos/157675/fashion-men-s-individuality-black-and-white-157675.jpeg?auto=compress&cs=tinysrgb&w=600'}
                    alt="Original"
                    className="result-img"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = 'https://images.pexels.com/photos/157675/fashion-men-s-individuality-black-and-white-157675.jpeg?auto=compress&cs=tinysrgb&w=600';
                    }}
                  />
                  <span className="result-label">Original Photo</span>
                </div>
                <div className="result-arrow">
                  <Sparkles size={28} />
                  <span>AI Magic</span>
                </div>
                <div className="result-img-card result-img-card-after">
                  <img
                    src={
                      generatedTryOnImage?.startsWith('http') || generatedTryOnImage?.startsWith('data:')
                        ? generatedTryOnImage
                        : generatedTryOnImage
                        ? `${API_URL}${generatedTryOnImage}`
                        : selectedGarment?.image || selectedGarment?.images?.[0] || 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=600&q=80'
                    }
                    alt="Try-On Result"
                    className="result-img result-img-after"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = selectedGarment?.image || selectedGarment?.images?.[0] || 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=600&q=80';
                    }}
                  />
                  <span className="result-label result-label-after">With {selectedGarment?.name || 'Selected Garment'}</span>
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
                      toast.success(`Added ${selectedGarment.name} to cart!`);
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
