import { useState, useEffect } from 'react';
import axios from 'axios';
import API_URL from '../../config/api';
import toast from 'react-hot-toast';
import './Contact.css';

export default function Contact() {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    orderNumber: '',
    topic: '',
    message: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'Contact Us — Auto Stitch';
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const { data } = await axios.post(`${API_URL}/api/support/contact`, form);
      if (data.success) {
        toast.success(data.message || 'Inquiry sent! Please check your email.');
        setForm({
          firstName: '',
          lastName: '',
          email: '',
          orderNumber: '',
          topic: '',
          message: ''
        });
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send inquiry. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="contact-page page-enter">
      <div className="contact-container">
        <h1 className="contact-title-serif">Contact Us</h1>

        <div className="contact-info-grid">
          <div className="contact-info-section">
            <p className="contact-info-label">For General Inquiries:</p>
            <p className="contact-info-value">Email us at <a href="mailto:autostitchsecurity@gmail.com">autostitchsecurity@gmail.com</a></p>
            <p className="contact-info-value">Chat with us via Live Chat</p>
            <p className="contact-info-value">Client Service Hours: Monday - Friday 9am - 6pm PKT</p>
          </div>

          <div className="contact-info-section">
            <p className="contact-info-label">For Virtual Styling:</p>
            <p className="contact-info-value"><a href="mailto:autostitchsecurity@gmail.com">autostitchsecurity@gmail.com</a></p>
          </div>

          <div className="contact-info-section">
            <p className="contact-info-label">For Boutique Partnerships:</p>
            <p className="contact-info-value"><a href="mailto:autostitchsecurity@gmail.com">autostitchsecurity@gmail.com</a></p>
          </div>

          <div className="contact-info-section">
            <p className="contact-info-label">For Press Inquiries:</p>
            <p className="contact-info-value"><a href="mailto:autostitchsecurity@gmail.com">autostitchsecurity@gmail.com</a></p>
          </div>

          <div className="contact-info-section">
            <p className="contact-info-label">For Employment Inquiries:</p>
            <p className="contact-info-value">Please visit our <a href="/careers">careers page</a></p>
          </div>
        </div>

        <div className="contact-form-wrapper">
          <p className="contact-form-intro">Please submit an inquiry below and a member of our team will assist you via email shortly.</p>
          
          <form onSubmit={handleSubmit} className="minimal-contact-form">
            <div className="contact-form-row">
              <div className="minimal-group">
                <label>FIRST NAME *</label>
                <input 
                  type="text" 
                  name="firstName" 
                  placeholder="First Name (Required)" 
                  value={form.firstName}
                  onChange={handleChange}
                  required 
                />
              </div>
              <div className="minimal-group">
                <label>LAST NAME *</label>
                <input 
                  type="text" 
                  name="lastName" 
                  placeholder="Last Name" 
                  value={form.lastName}
                  onChange={handleChange}
                  required 
                />
              </div>
            </div>

            <div className="minimal-group">
              <label>EMAIL ADDRESS *</label>
              <input 
                type="email" 
                name="email" 
                placeholder="Enter your email address" 
                value={form.email}
                onChange={handleChange}
                required 
              />
            </div>

            <div className="minimal-group">
              <label>ORDER NUMBER</label>
              <input 
                type="text" 
                name="orderNumber" 
                placeholder="Enter your order number" 
                value={form.orderNumber}
                onChange={handleChange}
              />
            </div>

            <div className="minimal-group">
              <label>TOPIC *</label>
              <select name="topic" value={form.topic} onChange={handleChange} required>
                <option value="">Select an option...</option>
                <option value="General Inquiry">General Inquiry</option>
                <option value="Order Status">Order Status</option>
                <option value="Returns & Exchanges">Returns & Exchanges</option>
                <option value="Virtual Try-On Help">Virtual Try-On Help</option>
                <option value="Custom Stitching">Custom Stitching</option>
              </select>
            </div>

            <div className="minimal-group">
              <label>MESSAGE *</label>
              <textarea 
                name="message" 
                placeholder="Enter your message" 
                rows="4" 
                value={form.message}
                onChange={handleChange}
                required
              ></textarea>
            </div>

            <button type="submit" className="minimal-contact-submit" disabled={loading}>
              {loading ? 'SUBMITTING...' : 'SUBMIT'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
