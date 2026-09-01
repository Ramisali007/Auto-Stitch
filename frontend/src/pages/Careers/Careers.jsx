import { useState, useEffect } from 'react';
import { Briefcase, ArrowRight, X, CheckCircle, MapPin, Clock } from 'lucide-react';
import axios from 'axios';
import API_URL from '../../config/api';
import toast from 'react-hot-toast';
import './Careers.css';

const JOB_OPENINGS = [
  {
    id: 'job-1',
    title: 'Lead 3D Fashion & Garment Modeler',
    department: 'Digital Design & 3D Stitch',
    location: 'Lahore / Hybrid',
    type: 'Full-time',
    description: 'Lead our 3D garment simulation pipeline for luxury Pakistani silhouettes, custom cuts, and interactive digital fittings.'
  },
  {
    id: 'job-2',
    title: 'Senior Full Stack Engineer',
    department: 'Engineering & Platform',
    location: 'Remote / Faisalabad',
    type: 'Full-time',
    description: 'Scale our high-performance e-commerce engine, Stripe installments worker, real-time bidding, and customizer experiences.'
  },
  {
    id: 'job-3',
    title: 'Boutique Partnerships Director',
    department: 'Brand Relations',
    location: 'Karachi / Lahore',
    type: 'Full-time',
    description: 'Curate and onboard premier couture houses and heritage craftspeople onto the Auto Stitch verified boutique network.'
  },
  {
    id: 'job-4',
    title: 'Luxury Client Concierge & Stylist',
    department: 'Customer Experience',
    location: 'Remote (Pakistan)',
    type: 'Full-time',
    description: 'Provide bespoke virtual styling advice, measurement assistance, and VIP customer support to our global clientele.'
  }
];

export default function Careers() {
  const [selectedJob, setSelectedJob] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    portfolio: '',
    message: ''
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'Careers — Auto Stitch';
  }, []);

  const handleApplyClick = (job) => {
    setSelectedJob(job);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const payload = {
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        topic: 'Careers Application',
        message: `Position: ${selectedJob ? selectedJob.title : 'General Application'}\nPhone: ${form.phone}\nPortfolio/LinkedIn: ${form.portfolio}\n\nCover Note:\n${form.message}`
      };

      const res = await axios.post(`${API_URL}/api/support/contact`, payload);
      if (res.data.success) {
        toast.success('Application submitted successfully! Our talent team will review your profile.');
        setShowModal(false);
        setForm({ firstName: '', lastName: '', email: '', phone: '', portfolio: '', message: '' });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit application. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="careers-page page-enter">
      {/* 1. Header Section */}
      <section className="careers-header-section">
        <div className="careers-container">
          <h1 className="careers-title-serif">Careers at Auto Stitch</h1>
          
          <div className="careers-text-block">
            <p className="careers-para">
              AUTO STITCH is shaped by the vibrant heritage of Pakistan and the precision of modern digital technology. We bring together traditional craftsmanship, customized artisan tailoring, and cutting-edge digital commerce.
            </p>
            <p className="careers-para">
              We are constantly seeking ambitious designers, engineers, stylists, and operators to shape the next chapter of contemporary South Asian couture.
            </p>
          </div>

          <div className="careers-cta">
            <a href="#openings" className="careers-link-underlined">Explore Open Positions ↓</a>
          </div>
        </div>
      </section>

      {/* 2. Openings Section */}
      <section id="openings" className="careers-openings-section">
        <div className="careers-openings-container">
          <div className="openings-header">
            <span className="openings-label">JOIN OUR TEAM</span>
            <h2 className="openings-title">Open Opportunities</h2>
            <p className="openings-subtitle">Discover your next career milestone in fashion and technology.</p>
          </div>

          <div className="openings-grid">
            {JOB_OPENINGS.map((job) => (
              <div key={job.id} className="job-card">
                <div className="job-card-top">
                  <span className="job-dept">{job.department}</span>
                  <div className="job-meta">
                    <span><MapPin size={13} /> {job.location}</span>
                    <span><Clock size={13} /> {job.type}</span>
                  </div>
                </div>

                <h3 className="job-title">{job.title}</h3>
                <p className="job-desc">{job.description}</p>

                <button 
                  type="button" 
                  className="job-apply-btn"
                  onClick={() => handleApplyClick(job)}
                >
                  Apply for Role <ArrowRight size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. Full-Width Image Section */}
      <section className="careers-image-section">
        <img src="/about/about.jpg" alt="Careers at Auto Stitch" className="careers-full-img" />
      </section>

      {/* Application Modal */}
      {showModal && (
        <div className="modal-overlay-2fa" onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="modal-card-2fa" style={{ maxWidth: '520px' }}>
            <button 
              type="button" 
              className="modal-close-btn-2fa"
              onClick={() => setShowModal(false)}
            >
              <X size={18} />
            </button>

            <h3 className="modal-title-2fa">
              Apply for {selectedJob ? selectedJob.title : 'Position'}
            </h3>
            <p className="modal-desc-2fa">
              Submit your credentials below. Our talent acquisition team will review your application within 48 hours.
            </p>

            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>First Name *</label>
                  <input 
                    type="text"
                    required
                    value={form.firstName}
                    onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                    style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Last Name *</label>
                  <input 
                    type="text"
                    required
                    value={form.lastName}
                    onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                    style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Email Address *</label>
                <input 
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Phone Number</label>
                <input 
                  type="text"
                  placeholder="+92 XXX XXXXXXX"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Portfolio / LinkedIn / CV URL *</label>
                <input 
                  type="url"
                  placeholder="https://linkedin.com/in/... or drive link"
                  required
                  value={form.portfolio}
                  onChange={(e) => setForm({ ...form, portfolio: e.target.value })}
                  style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Brief Introduction / Note</label>
                <textarea 
                  rows={3}
                  placeholder="Tell us about your background and why you want to build with Auto Stitch..."
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', outline: 'none', boxSizing: 'border-box' }}
                ></textarea>
              </div>

              <button 
                type="submit"
                disabled={submitting}
                className="btn-2fa-match-profile"
                style={{ width: '100%', padding: '14px', fontSize: '0.85rem' }}
              >
                {submitting ? 'Submitting Application...' : 'Submit Application'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
