import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Phone, Clock, Navigation, Search, ChevronDown } from 'lucide-react';
import './StoreLocator.css';

const STORES = [
  {
    id: 1,
    city: 'Faisalabad',
    name: 'Auto Stitch Experience Center',
    address: 'FAST-NU, FAST Square, 9 Km from Faisalabad Motorway Interchange towards Chiniot',
    phone: '+92 325 2204959',
    hours: 'Mon - Sat: 09 AM - 06 PM',
    mapUrl: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3402.5515128003613!2d73.018659576251!3d31.481525749005!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3922684074219a15%3A0xe54d8b68875631!2sFAST%20NUCES%20Faisalabad%20Campus!5e0!3m2!1sen!2s!4v1714270000000!5m2!1sen!2s"
  },
  {
    id: 2,
    city: 'Lahore',
    name: 'Gulberg Boutique Hub',
    address: 'M.M Alam Road, Gulberg III, Lahore',
    phone: '+92 42 111 222 333',
    hours: 'Mon - Sun: 11 AM - 10 PM',
    mapUrl: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3401.234567890123!2d74.3486!3d31.5115!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3919045a1c000001%3A0x0!2zT00gQWxhbSBSZA!5e0!3m2!1sen!2s!4v1714270000000!5m2!1sen!2s"
  },
  {
    id: 3,
    city: 'Karachi',
    name: 'Clifton Flagship Store',
    address: 'Dolmen Mall, Clifton, Karachi',
    phone: '+92 21 333 444 555',
    hours: 'Mon - Sun: 10 AM - 11 PM',
    mapUrl: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3620.123456789012!2d67.0311!3d24.8138!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3eb33d1234567890%3A0x0!2zRG9sbWVuIE1hbGwsIENsaWZ0b24!5e0!3m2!1sen!2s!4v1714270000000!5m2!1sen!2s"
  }
];

export default function StoreLocator() {
  const [activeStore, setActiveStore] = useState(STORES[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'Our Stores — Auto Stitch';
    const handleScroll = () => setScrolled(window.scrollY > 100);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const filteredStores = STORES.filter(s => 
    s.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const scrollToLocator = () => {
    document.getElementById('locator-section').scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="store-locator-container">
      {/* Hero Video Section */}
      <section className="store-hero">
        <video 
          className="hero-video"
          src="/videos/store.mp4"
          autoPlay 
          muted 
          loop 
          playsInline
        />
        <div className="hero-overlay">
          <h1 className="hero-title">Our Stores</h1>
          <button className="scroll-hint" onClick={scrollToLocator}>
            <ChevronDown size={32} strokeWidth={1} />
          </button>
        </div>
      </section>

      {/* Locator Section */}
      <section id="locator-section" className="locator-selection-view">
        <div className="locator-controls">
          <p className="select-label">Select a Location</p>
          <div className="custom-select-wrap">
            <select 
              className="location-dropdown"
              value={activeStore.id}
              onChange={(e) => setActiveStore(STORES.find(s => s.id === parseInt(e.target.value)))}
            >
              {STORES.map(s => (
                <option key={s.id} value={s.id}>{s.city} — {s.name.split(' ')[0]}</option>
              ))}
            </select>
            <ChevronDown size={16} className="select-icon" />
          </div>
        </div>

        <div className="store-detail-container">
          <div className="store-detail-info">
            <div className="info-brand">AUTO STITCH</div>
            <h2 className="info-city">{activeStore.city} — {activeStore.name.split(' ')[0]}</h2>
            
            <div className="info-group">
              <span className="info-label">Address</span>
              <a href="#" className="info-link-underlined">{activeStore.address}</a>
            </div>

            <div className="info-group">
              <span className="info-label">Store Hours</span>
              <p className="info-text">{activeStore.hours}</p>
              <p className="info-text">Sunday: 12PM - 6PM</p>
            </div>

            <div className="info-group">
              <span className="info-label">Contact</span>
              <p className="info-text">Phone: {activeStore.phone}</p>
              <p className="info-text">Email: autostitchsecurity@gmail.com</p>
            </div>

            <button 
              className="book-appointment-btn"
              onClick={() => navigate('/contact')}
            >
              Book an Appointment
            </button>

          </div>

          <div className="store-detail-map">
            <iframe 
              src={activeStore.mapUrl} 
              width="100%" 
              height="100%" 
              style={{ border: 0, filter: 'grayscale(1) invert(0.9) contrast(1.2)' }} 
              allowFullScreen="" 
              loading="lazy" 
              title={activeStore.name}
            ></iframe>
          </div>
        </div>
      </section>

    </div>
  );
}

