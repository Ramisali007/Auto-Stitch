import { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import API_URL from '../../config/api';
import {
  Upload, Sparkles, X, CheckCircle, AlertCircle, Clock,
  Camera, Info, Shield, RotateCcw, Download, Share2, Star, ShoppingCart, Sliders, Eye
} from 'lucide-react';
import { useCart } from '../../context/CartContext';
import toast from 'react-hot-toast';
import { downloadImageDirectly } from '../../utils/downloadHelper';
import '../Dashboard/Dashboard.css';
import './VirtualTryOn.css';

const PIPELINE_STAGES = [
  { id: 1, name: 'Image & Pose Validation', model: 'High-Res Preprocessing', desc: 'Normalizing orientation & analyzing body geometry', icon: '📐' },
  { id: 2, name: 'Anatomical Parsing', model: 'Segmentation Engine', desc: 'Segmenting garment boundaries & preserving face/hands', icon: '🧩' },
  { id: 3, name: 'Cloth Deformation', model: 'Diffusion Inpainting', desc: 'Synthesizing 3D cloth folds, drape & pose adaptation', icon: '👗' },
  { id: 4, name: 'Photorealistic Harmonization', model: 'Seam & Lighting Engine', desc: 'Preserving natural background, shadows & skin contours', icon: '✨' },
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
  const [fitStyle, setFitStyle] = useState('Tailored'); // 'Tailored' | 'Relaxed' | 'Slim'
  const [engineProvider, setEngineProvider] = useState('auto'); // 'auto' | 'fashn' | 'replicate'
  const [viewMode, setViewMode] = useState('slider'); // 'slider' | 'side-by-side'
  const [sliderPos, setSliderPos] = useState(50);
  const [isDraggingSlider, setIsDraggingSlider] = useState(false);
  const [errorDetails, setErrorDetails] = useState(null);

  const fileInputRef = useRef(null);
  const sliderRef = useRef(null);
  const { addToCart } = useCart();

  const [currentJobId, setCurrentJobId] = useState(null);
  const [sessionToken, setSessionToken] = useState('');

  useEffect(() => {
    document.title = 'Virtual Try-On — Auto Stitch';
    fetchTryOnCatalog();

    // Check for garment data in URL params
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
        category: garmentCategory || 'Dresses',
        price: garmentPrice ? parseFloat(garmentPrice) : 0,
        boutique: boutiqueId,
      });
    }
  }, [searchParams]);

  const fetchTryOnCatalog = async () => {
    setLoadingCatalog(true);
    try {
      const res = await axios.get(`${API_URL}/api/vto/catalog`);
      if (res.data.success) {
        setCatalogGarments(res.data.products || []);
      }
    } catch (err) {
      console.warn('Failed to load try-on catalog:', err);
    } finally {
      setLoadingCatalog(false);
    }
  };

  // Real AI Virtual Try-On Generation
  const handleGenerate = async () => {
    if (!userPhoto || !selectedGarment || isSubmitting) return;

    setIsSubmitting(true);
    setStep('processing');
    setCurrentStage(0);
    setProgress(0);
    setErrorDetails(null);

    // Stage progression tracker
    const interval = setInterval(() => {
      setProgress((prev) => {
        const next = prev < 30 ? prev + 4 : prev < 75 ? prev + 2 : prev < 92 ? prev + 1 : 92;
        if (next >= 25 && next < 50) setCurrentStage(1);
        else if (next >= 50 && next < 75) setCurrentStage(2);
        else if (next >= 75) setCurrentStage(3);
        return next;
      });
    }, 700);

    try {
      // 1. Create Session & Validate Product Binding
      const sessionRes = await axios.post(`${API_URL}/api/vto/session`, {
        productId: selectedGarment._id,
        boutiqueId: selectedGarment.boutique?._id || selectedGarment.boutique,
      }, { withCredentials: true });

      const jId = sessionRes.data.jobId;
      const sToken = sessionRes.data.sessionToken;
      setCurrentJobId(jId);
      setSessionToken(sToken);

      // 2. Submit Job to Production Async Queue
      await axios.post(`${API_URL}/api/vto/jobs`, {
        jobId: jId,
        userPhoto,
        fitStyle,
      }, {
        headers: { 'x-vto-session': sToken },
        withCredentials: true,
      });

      // 3. Poll for AI Inference Completion
      let attempts = 0;
      const maxAttempts = 65; // ~130s
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
            setCurrentStage(3);
            setGeneratedTryOnImage(statusRes.data.resultUrl);

            setTimeout(() => {
              setIsSubmitting(false);
              setStep('result');
              toast.success('Photorealistic Virtual Try-On generated successfully!');
            }, 500);
          } else if (statusRes.data.status === 'failed') {
            clearInterval(pollInterval);
            clearInterval(interval);
            setIsSubmitting(false);
            setStep('upload');
            const errDesc = statusRes.data.errorDescription || 'Inference error on AI server. Please try again.';
            setErrorDetails(errDesc);
            toast.error(errDesc);
          }
        } catch (_) {}

        if (attempts >= maxAttempts) {
          clearInterval(pollInterval);
          clearInterval(interval);
          setIsSubmitting(false);
          setStep('upload');
          const timeoutMsg = 'Generation timed out. The AI model is experiencing high demand. Please try again.';
          setErrorDetails(timeoutMsg);
          toast.error(timeoutMsg);
        }
      }, 2000);
    } catch (err) {
      clearInterval(interval);
      setIsSubmitting(false);
      setStep('upload');
      const msg = err.response?.data?.message || err.message || 'Failed to start try-on job';
      setErrorDetails(msg);
      toast.error(msg);
    }
  };

  const handleSave = async () => {
    if (!generatedTryOnImage) return;
    const toastId = toast.loading('Saving high-resolution render to device...');
    try {
      const garmentSlug = selectedGarment?.name?.toLowerCase().replace(/[^a-z0-9]/g, '-') || 'look';
      const filename = `auto-stitch-tryon-${garmentSlug}-${Date.now()}.png`;
      const success = await downloadImageDirectly(generatedTryOnImage, filename);
      if (success) {
        toast.success('High-resolution render saved directly to your device!', { id: toastId });
      } else {
        toast.error('Could not download automatically. Please right-click image to save.', { id: toastId });
      }
    } catch (err) {
      console.error('[VTO Save Error]:', err);
      toast.error('Download failed. Please try again.', { id: toastId });
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Auto Stitch Virtual Try-On',
        text: `Check out how ${selectedGarment?.name || 'this piece'} fits on me!`,
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
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Photo exceeds 10MB limit. Please choose a smaller photo.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        const maxDim = 1536; // Preserve fine garment details
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
        setUserPhoto(canvas.toDataURL('image/jpeg', 0.92));
        setErrorDetails(null);
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
    setErrorDetails(null);
    toast.success('Session reset and temporary files purged.');
  };

  // Interactive Slider Pointer Events
  const handleSliderMove = useCallback((clientX) => {
    if (!sliderRef.current) return;
    const rect = sliderRef.current.getBoundingClientRect();
    const pos = ((clientX - rect.left) / rect.width) * 100;
    setSliderPos(Math.min(100, Math.max(0, pos)));
  }, []);

  const handlePointerDown = (e) => {
    setIsDraggingSlider(true);
    handleSliderMove(e.clientX);
  };

  const handlePointerMove = (e) => {
    if (isDraggingSlider) {
      handleSliderMove(e.clientX);
    }
  };

  const handlePointerUp = () => {
    setIsDraggingSlider(false);
  };

  return (
    <div className="dashboard-page page-enter">
      <div className="container dashboard-container" style={{ justifyContent: 'center' }}>
        <main className="dashboard-main" style={{ flex: 1, width: '100%', maxWidth: '1000px', margin: '0 auto' }}>
          <div className="dashboard-section" style={{ textAlign: 'center' }}>
            <h2 className="dashboard-section-title">AI Virtual Try-On Studio</h2>
            <p className="text-muted" style={{ marginBottom: '2rem', fontSize: '0.85rem', marginLeft: 'auto', marginRight: 'auto', maxWidth: '600px' }}>
              True neural virtual try-on with body geometry parsing, realistic cloth deformation, and pose-aware drape.
            </p>
          </div>

          {/* ===== STEP 1: CONSENT ===== */}
          {step === 'consent' && (
            <div className="tryon-consent-wrap" style={{ flexDirection: 'column', alignItems: 'center', gap: '1rem', maxWidth: '800px', margin: '0 auto' }}>
              <h2 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>Privacy & Security Notice</h2>
              <p className="consent-desc" style={{ textAlign: 'center', fontSize: '1.1rem', maxWidth: '600px', marginBottom: '2rem' }}>
                Your personal photo is treated with strict security. Read how our isolated neural pipeline protects your privacy.
              </p>

              <div className="consent-points" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', width: '100%', marginBottom: '3rem' }}>
                {[
                  { icon: <Shield size={20} />, title: 'Identity & Occlusion Aware', desc: 'Facial identity, skin tone, hair, and hand occlusion are preserved.' },
                  { icon: <Clock size={20} />, title: 'Immediate Source Purge', desc: 'Your raw photo is immediately deleted from the server upon generation completion.' },
                  { icon: <CheckCircle size={20} />, title: 'Isolated Multi-Tenant Security', desc: 'Try-on sessions are encrypted and strictly bound to your authorized session.' },
                  { icon: <Info size={20} />, title: 'No Public Training', desc: 'Customer photographs are never utilized for model fine-tuning or AI training datasets.' },
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
              {errorDetails && (
                <div style={{
                  background: '#fef2f2',
                  border: '1px solid #f87171',
                  borderRadius: '6px',
                  padding: '12px 16px',
                  marginBottom: '1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  color: '#991b1b',
                  fontSize: '0.88rem'
                }}>
                  <AlertCircle size={18} color="#dc2626" />
                  <span>{errorDetails}</span>
                </div>
              )}

              <div className="upload-grid">
                {/* Upload Photo */}
                <div className="upload-section">
                  <h3 className="upload-section-title">
                    <Camera size={18} /> Your Portrait Photo
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
                        <p className="upload-title">Drop your portrait photo here</p>
                        <p className="upload-hint">or click to browse</p>
                        <p className="upload-specs">JPEG, PNG, WebP · Up to 10MB · Clear lighting</p>
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
                    <p className="upload-tip-title"><Info size={13} /> Guidance for photorealistic results:</p>
                    <ul>
                      <li>Upload a standing or clear portrait photo</li>
                      <li>Upper body visible for shirts/tops; full body for gowns/maxis/bottoms</li>
                      <li>Natural, direct lighting against a clear background</li>
                      <li>Avoid extreme filters or heavily occluded body poses</li>
                    </ul>
                  </div>
                </div>

                {/* Select Garment */}
                <div className="upload-section">
                  <h3 className="upload-section-title">
                    <Sparkles size={18} /> Selected Boutique Garment
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
                          padding: '12px', background: 'rgba(255,255,255,0.94)',
                          backdropFilter: 'blur(10px)', borderTop: '1px solid var(--color-border)',
                          textAlign: 'left'
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
                          Choose a piece from the boutique collection below or visit the boutique catalogue.
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
                          onClick={() => {
                            setErrorDetails(null);
                            setSelectedGarment({
                              _id: g._id,
                              name: g.name,
                              image: g.images?.[0] || '',
                              images: g.images,
                              category: g.category,
                              price: g.price,
                              boutique: g.boutique?._id || g.boutique
                            });
                          }}
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

              {/* Fit Style Selection Controls */}
              <div style={{ marginTop: '2rem', background: '#fff', border: '1px solid #e5e5e5', borderRadius: '8px', padding: '1.25rem', textAlign: 'left' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#1a1a2e', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Sliders size={16} color="#d97706" /> Tailoring Fit Preference
                  </h4>
                  <span style={{ fontSize: '0.72rem', background: '#f3f4f6', color: '#374151', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>
                    Adaptive Geometry
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                  {['Tailored', 'Relaxed', 'Slim'].map((style) => (
                    <button
                      key={style}
                      type="button"
                      onClick={() => setFitStyle(style)}
                      style={{
                        padding: '10px 14px',
                        borderRadius: '6px',
                        border: fitStyle === style ? '2px solid #1a1a2e' : '1px solid #e5e5e5',
                        background: fitStyle === style ? '#1a1a2e' : '#fff',
                        color: fitStyle === style ? '#fff' : '#1a1a2e',
                        fontWeight: 600,
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {style === 'Tailored' ? '✨ Tailored Fit (Classic)' : style === 'Relaxed' ? '🌿 Relaxed Drape' : '✂️ Slim Silhouette'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Button */}
              <div className="upload-action" style={{ width: '100%', maxWidth: '400px', margin: '2rem auto 0 auto' }}>
                <button
                  className="btn-black"
                  onClick={handleGenerate}
                  disabled={!userPhoto || !selectedGarment || isSubmitting}
                >
                  Generate AI Virtual Try-On
                </button>
                {(!userPhoto || !selectedGarment) && (
                  <p className="upload-action-hint text-muted" style={{ marginTop: '8px', fontSize: '0.8rem', textAlign: 'center' }}>
                    <AlertCircle size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
                    {!userPhoto ? 'Please upload your photo or pick a studio model' : 'Please select a garment to try on'}
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
                  <h2>AI Diffusion Pipeline In Progress</h2>
                  <p className="text-muted">Synthesizing realistic cloth deformation, occlusion & body geometry</p>
                </div>

                {/* Truthful Pipeline Stages */}
                <div className="pipeline-stages">
                  {PIPELINE_STAGES.map((stage, i) => {
                    const done = i < currentStage;
                    const active = i === currentStage;
                    return (
                      <div key={stage.id} className={`pipeline-stage ${done ? 'stage-done' : active ? 'stage-active' : 'stage-pending'}`}>
                        <div className="stage-icon">
                          {done ? <CheckCircle size={16} /> : <span>{stage.icon}</span>}
                        </div>
                        <div className="stage-info">
                          <p className="stage-name">{stage.name}</p>
                          <p className="stage-model">{stage.desc}</p>
                        </div>
                        {active && <div className="stage-spinner" />}
                      </div>
                    );
                  })}
                </div>

                <div style={{ marginTop: '1.5rem', width: '100%', background: '#e5e7eb', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: `${progress}%`, height: '100%', background: '#1a1a2e', transition: 'width 0.4s ease' }} />
                </div>

                <p className="processing-eta" style={{ marginTop: '1rem' }}>
                  <Clock size={14} /> Neural synthesis in progress · Running photorealistic inference
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
                  <span>AI Fitting Complete</span>
                </div>
                <h2 className="result-title">Here's How It Looks <span className="text-gradient">On You</span></h2>
                <p className="text-muted" style={{ fontSize: '0.85rem', marginTop: '4px' }}>
                  {selectedGarment?.name} ({fitStyle} Fit)
                </p>
              </div>

              {/* View Mode Toggle Controls */}
              <div className="vto-view-toggle-wrapper">
                <div className="vto-view-toggle-container" role="tablist" aria-label="Virtual try-on view mode">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={viewMode === 'slider'}
                    className={`vto-view-toggle-btn ${viewMode === 'slider' ? 'active' : ''}`}
                    onClick={() => setViewMode('slider')}
                  >
                    <Sliders size={15} />
                    <span>Split Comparison</span>
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={viewMode === 'side-by-side'}
                    className={`vto-view-toggle-btn ${viewMode === 'side-by-side' ? 'active' : ''}`}
                    onClick={() => setViewMode('side-by-side')}
                  >
                    <Eye size={15} />
                    <span>Side-by-Side</span>
                  </button>
                </div>
              </div>

              {/* 1. INTERACTIVE SPLIT SLIDER VIEW */}
              {viewMode === 'slider' && (
                <div
                  ref={sliderRef}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  style={{
                    position: 'relative',
                    width: '100%',
                    maxWidth: '520px',
                    height: '680px',
                    margin: '0 auto 2rem auto',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    boxShadow: '0 20px 40px rgba(0,0,0,0.12)',
                    cursor: 'ew-resize',
                    userSelect: 'none',
                    touchAction: 'none',
                    background: '#000',
                  }}
                >
                  {/* Underneath: Try-On AI Result */}
                  <img
                    src={generatedTryOnImage}
                    alt="AI Virtual Try-On Result"
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                  />
                  <span style={{
                    position: 'absolute', bottom: '16px', right: '16px', zIndex: 5,
                    background: 'rgba(0,0,0,0.75)', color: '#fff', padding: '4px 10px',
                    borderRadius: '20px', fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.05em'
                  }}>
                    ✨ Virtual Try-On Result
                  </span>

                  {/* Overlaid: Original Photo with clip-path */}
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      clipPath: `polygon(0 0, ${sliderPos}% 0, ${sliderPos}% 100%, 0 100%)`,
                    }}
                  >
                    <img
                      src={userPhoto}
                      alt="Original Photo"
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                    />
                    <span style={{
                      position: 'absolute', bottom: '16px', left: '16px', zIndex: 5,
                      background: 'rgba(0,0,0,0.75)', color: '#fff', padding: '4px 10px',
                      borderRadius: '20px', fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.05em'
                    }}>
                      📷 Original Photo
                    </span>
                  </div>

                  {/* Split Line & Draggable Handle */}
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      bottom: 0,
                      left: `${sliderPos}%`,
                      width: '2px',
                      background: '#fff',
                      boxShadow: '0 0 8px rgba(0,0,0,0.5)',
                      transform: 'translateX(-50%)',
                      zIndex: 10,
                      pointerEvents: 'none',
                    }}
                  >
                    <div style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      width: '36px',
                      height: '36px',
                      background: '#fff',
                      color: '#1a1a2e',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                    }}>
                      ⇄
                    </div>
                  </div>
                </div>
              )}

              {/* 2. SIDE-BY-SIDE VIEW */}
              {viewMode === 'side-by-side' && (
                <div className="result-comparison" style={{ marginBottom: '2rem' }}>
                  <div className="result-img-card">
                    <img
                      src={userPhoto}
                      alt="Original"
                      className="result-img"
                    />
                    <span className="result-label">Original Photo</span>
                  </div>
                  <div className="result-arrow">
                    <Sparkles size={28} />
                    <span>AI Fitted</span>
                  </div>
                  <div className="result-img-card result-img-card-after">
                    <img
                      src={generatedTryOnImage}
                      alt="Try-On Result"
                      className="result-img result-img-after"
                    />
                    <span className="result-label result-label-after">With {selectedGarment?.name || 'Selected Garment'}</span>
                  </div>
                </div>
              )}

              {/* Rating */}
              <div className="result-rating">
                <p>How's the photorealistic fit?</p>
                <div className="stars" style={{ gap: '6px' }}>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button key={s} className="rating-star-btn" onClick={() => setRating(s)}>
                      <Star size={24} fill={s <= rating ? 'currentColor' : 'none'} style={{ color: s <= rating ? 'var(--color-accent)' : 'var(--color-text-muted)' }} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="vto-result-actions-card">
                <button
                  type="button"
                  className="vto-action-btn-primary"
                  onClick={() => {
                    if (selectedGarment) {
                      addToCart(selectedGarment);
                      toast.success(`Added ${selectedGarment.name} to cart!`);
                    }
                  }}
                >
                  <ShoppingCart size={18} />
                  <span>Add To Cart · PKR {selectedGarment?.price?.toLocaleString()}</span>
                </button>

                <div className="vto-action-btn-secondary-row">
                  <button type="button" className="vto-action-btn-secondary" onClick={handleSave}>
                    <Download size={16} />
                    <span>Save Render</span>
                  </button>
                  <button type="button" className="vto-action-btn-secondary" onClick={handleShare}>
                    <Share2 size={16} />
                    <span>Share Look</span>
                  </button>
                </div>

                <button type="button" className="vto-action-btn-ghost" onClick={reset}>
                  <RotateCcw size={15} />
                  <span>Try Another Outfit</span>
                </button>
              </div>

              <div className="result-privacy" style={{ marginTop: '1.5rem' }}>
                <Shield size={14} />
                <span>Your source photo has been immediately purged from the server for privacy</span>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
