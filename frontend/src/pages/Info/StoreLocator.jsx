import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Phone, Clock, Navigation, Search, ChevronDown, Compass } from 'lucide-react';
import axios from 'axios';
import API_URL from '../../config/api';
import toast from 'react-hot-toast';
import './StoreLocator.css';

const DEFAULT_STORES = [
  {
    _id: '1',
    id: 1,
    city: 'Faisalabad',
    name: 'Auto Stitch Experience Center',
    address: 'FAST-NU, FAST Square, 9 Km from Faisalabad Motorway Interchange towards Chiniot',
    phone: '+92 325 2204959',
    hours: 'Mon - Sat: 09 AM - 06 PM',
    latitude: 31.481525,
    longitude: 73.018659,
    mapUrl: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3402.5515128003613!2d73.018659576251!3d31.481525749005!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3922684074219a15%3A0xe54d8b68875631!2sFAST%20NUCES%20Faisalabad%20Campus!5e0!3m2!1sen!2s!4v1714270000000!5m2!1sen!2s"
  },
  {
    _id: '2',
    id: 2,
    city: 'Lahore',
    name: 'Gulberg Boutique Hub',
    address: 'M.M Alam Road, Gulberg III, Lahore',
    phone: '+92 42 111 222 333',
    hours: 'Mon - Sun: 11 AM - 10 PM',
    latitude: 31.5115,
    longitude: 74.3486,
    mapUrl: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3401.234567890123!2d74.3486!3d31.5115!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3919045a1c000001%3A0x0!2zT00gQWxhbSBSZA!5e0!3m2!1sen!2s!4v1714270000000!5m2!1sen!2s"
  },
  {
    _id: '3',
    id: 3,
    city: 'Karachi',
    name: 'Clifton Flagship Store',
    address: 'Dolmen Mall, Clifton, Karachi',
    phone: '+92 21 333 444 555',
    hours: 'Mon - Sun: 10 AM - 11 PM',
    latitude: 24.8138,
    longitude: 67.0311,
    mapUrl: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3620.123456789012!2d67.0311!3d24.8138!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3eb33d1234567890%3A0x0!2zRG9sbWVuIE1hbGwsIENsaWZ0b24!5e0!3m2!1sen!2s!4v1714270000000!5m2!1sen!2s"
  }
];

// Haversine formula to compute distance in km
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function StoreLocator() {
  const [stores, setStores] = useState(DEFAULT_STORES);
  const [activeStore, setActiveStore] = useState(DEFAULT_STORES[0]);
  const [locating, setLocating] = useState(false);
  const [distanceInfo, setDistanceInfo] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'Our Stores — Auto Stitch';
    
    // Fetch live stores from API
    const fetchStores = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/stores`);
        if (res.data?.success && res.data.stores?.length > 0) {
          const apiStores = res.data.stores.map((s, idx) => ({
            ...s,
            id: s._id || idx + 1,
            mapUrl: s.mapUrl || DEFAULT_STORES[idx % DEFAULT_STORES.length].mapUrl
          }));
          setStores(apiStores);
          setActiveStore(apiStores[0]);
        }
      } catch (err) {
        console.log('Using default local stores fallback');
      }
    };

    fetchStores();
  }, []);

  const scrollToLocator = () => {
    document.getElementById('locator-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleFindNearest = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userLat = position.coords.latitude;
        const userLon = position.coords.longitude;

        let nearest = stores[0];
        let minDistance = Infinity;

        stores.forEach((store) => {
          if (store.latitude && store.longitude) {
            const dist = calculateDistance(userLat, userLon, store.latitude, store.longitude);
            if (dist < minDistance) {
              minDistance = dist;
              nearest = store;
            }
          }
        });

        setActiveStore(nearest);
        setDistanceInfo(`~${Math.round(minDistance)} km away from your current location`);
        setLocating(false);
        toast.success(`Nearest store found: ${nearest.name} in ${nearest.city}!`);
        scrollToLocator();
      },
      (error) => {
        setLocating(false);
        toast.error('Unable to retrieve your location. Please check browser permissions.');
      }
    );
  };

  const getEmbedUrl = (store) => {
    if (store.latitude && store.longitude) {
      return `https://maps.google.com/maps?q=${store.latitude},${store.longitude}&hl=en&z=15&output=embed`;
    }
    return `https://maps.google.com/maps?q=${encodeURIComponent(store.address || store.name || store.city)}&hl=en&z=15&output=embed`;
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', maxWidth: '900px', flexWrap: 'wrap', gap: '1rem', margin: '0 auto' }}>
            <div>
              <p className="select-label">Select a Location</p>
              <div className="custom-select-wrap">
                <select 
                  className="location-dropdown"
                  value={activeStore._id || activeStore.id}
                  onChange={(e) => {
                    const selected = stores.find(s => (s._id || s.id).toString() === e.target.value);
                    if (selected) {
                      setActiveStore(selected);
                      setDistanceInfo(null);
                    }
                  }}
                >
                  {stores.map(s => (
                    <option key={s._id || s.id} value={s._id || s.id}>
                      {s.city} — {s.name.split(' ')[0]}
                    </option>
                  ))}
                </select>
                <ChevronDown size={16} className="select-icon" />
              </div>
            </div>

            <button 
              type="button"
              className="gps-locate-btn" 
              onClick={handleFindNearest}
              disabled={locating}
            >
              <Compass size={16} />
              {locating ? 'Locating...' : 'Find Nearest Store (GPS)'}
            </button>
          </div>

          {distanceInfo && (
            <p style={{ color: '#1a1a2e', fontSize: '0.85rem', marginTop: '16px', fontWeight: 500 }}>
              📍 {distanceInfo}
            </p>
          )}
        </div>

        <div className="store-detail-container">
          <div className="store-detail-info">
            <div className="info-brand">AUTO STITCH</div>
            <h2 className="info-city">{activeStore.city} — {activeStore.name}</h2>
            
            <div className="info-group">
              <span className="info-label">Address</span>
              <a 
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(activeStore.address)}`} 
                target="_blank" 
                rel="noreferrer" 
                className="info-link-underlined"
              >
                {activeStore.address} ↗
              </a>
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
              src={getEmbedUrl(activeStore)} 
              width="100%" 
              height="100%" 
              style={{ border: '1px solid #e5e5e5', borderRadius: '4px' }} 
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
