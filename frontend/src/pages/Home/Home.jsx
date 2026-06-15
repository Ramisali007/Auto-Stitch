import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight, Truck, CreditCard, ShieldCheck,
  ChevronRight, ShoppingBag, Heart, Eye,
  ChevronLeft
} from 'lucide-react';
import './Home.css';

// Restore original hero slider images
import slide1 from '../../assets/hero-slider/slide1.jpg';
import slide2 from '../../assets/hero-slider/slide2.jpg';
import slide3 from '../../assets/hero-slider/slide3.jpg';
import slide4 from '../../assets/hero-slider/slide4.jpg';
import slide5 from '../../assets/hero-slider/slide5.jpg';

// Import 10 NEW photos for Eid Edit
import eid1 from '../../../Photos/pexels-dhanno-25184995.jpg';
import eid2 from '../../../Photos/pexels-dhanno-29413563.jpg';
import eid3 from '../../../Photos/pexels-dhanno-29413566.jpg';
import eid4 from '../../../Photos/pexels-dhanno-29413661.jpg';
import eid5 from '../../../Photos/pexels-dhanno-29460608.jpg';
import eid6 from '../../../Photos/pexels-dhanno-31323212.jpg';
import eid7 from '../../../Photos/pexels-dhanno-33300910.jpg';
import eid8 from '../../../Photos/pexels-dhanno-34933739.jpg';
import eid9 from '../../../Photos/pexels-dhanno-36090359.jpg';
import eid10 from '../../../Photos/pexels-dhanno-36104914.jpg';
import bannerVideo from '../../../Photos/banner.mp4';

// Shop By Occasion Images
import occ1 from '../../../shop-by-occasion/1.png';
import occ2 from '../../../shop-by-occasion/2.png';
import occ3 from '../../../shop-by-occasion/3.png';
import occ4 from '../../../shop-by-occasion/4.png';

// Land Page Catalog Images
import cat1 from '../../../land-page-catalog/1.png';
import cat2 from '../../../land-page-catalog/2.png';
import cat3 from '../../../land-page-catalog/3.png';
import cat4 from '../../../land-page-catalog/4.png';
import cat5 from '../../../land-page-catalog/5.png';
import cat6 from '../../../land-page-catalog/6.png';
import cat7 from '../../../land-page-catalog/7.png';

const TRENDING_PRODUCTS = [
  { id: 1, img: cat1, title: '3 Piece Embroidered Dobby Jacquard Suit', price: 'Rs.27,990', badge: 'New' },
  { id: 2, img: cat2, title: '3 Piece Embroidered Lawn Suit', price: 'Rs.28,990', badge: 'New' },
  { id: 3, img: cat3, title: '3 Piece Embroidered Lawn Suit', price: 'Rs.15,990', badge: 'New' },
  { id: 4, img: cat4, title: '3 Piece Embroidered Raw Silk Suit', price: 'Rs.18,990', badge: 'New' },
  { id: 5, img: cat5, title: '3 Piece Embroidered Raw Silk Suit', price: 'Rs.48,990', badge: 'New' },
  { id: 6, img: cat6, title: '3 Piece Embroidered Organza Suit', price: 'Rs.46,990', badge: 'New' },
  { id: 7, img: cat7, title: '3 Piece Embroidered Silk Suit', price: 'Rs.23,990', badge: 'New' },
];

const TRENDING_TABS = ['NEW ARRIVALS', 'LUXURY PRET', 'LUXURY FORMALS', 'BRIDAL EDITS', 'UNSTITCHED', 'M.LUXE FABRICS', 'CHIPHON SERIES'];

const OCCASIONS = [
  { id: 0, img: occ1, title: 'EID DINNER', label: "Eid Collection '26", desc: 'Celebrate Eid in effortless elegance. Timeless designs made for moments that matter.' },
  { id: 1, img: occ2, title: 'FAMILY BRUNCH', label: "Eid Collection '26", desc: 'Fresh and vibrant looks for your daytime celebrations.' },
  { id: 2, img: occ3, title: 'EVENING SOIREE', label: "Eid Collection '26", desc: 'Sophisticated silhouettes for those special evening gatherings.' },
  { id: 3, img: occ4, title: 'FESTIVE LUNCH', label: "Eid Collection '26", desc: 'Traditional charm meets modern comfort for your festive meals.' },
];

const HERO_SLIDES = [
  {
    id: 1,
    image: slide1,
    title: 'Modern Couture',
    subtitle: 'Exquisite designs handcrafted for the contemporary silhouette.',
    cta: 'Shop New Arrivals',
    tags: ['Luxury Pret', 'Handcrafted', 'New In']
  },
  {
    id: 2,
    image: slide2,
    title: 'The Bridal Edit',
    subtitle: 'Timeless masterpieces for your most memorable moments.',
    cta: 'Explore Bridal',
    tags: ['Bridal', 'Traditional', 'Signature']
  },
  {
    id: 3,
    image: slide3,
    title: 'Festive Glamour',
    subtitle: 'Vibrant colors and intricate embroidery for every celebration.',
    cta: 'View Festive Look',
    tags: ['Festive', 'Luxe', 'Best Sellers']
  },
  {
    id: 4,
    image: slide4,
    title: 'Silk & Satin Edits',
    subtitle: 'Premium ready-to-wear suits for every formal occasion.',
    cta: 'Shop Silk Edits',
    tags: ['Silk Pret', 'Formal Wear', 'Evening Edit']
  },
  {
    id: 5,
    image: slide5,
    title: 'Signature Series',
    subtitle: 'Timeless pieces from Pakistan\'s finest boutiques.',
    cta: 'Shop Signature',
    tags: ['Exclusive', 'Boutique', 'Signature']
  }
];

const BOUTIQUES = [
  { id: '69f51557ca01a992cebe9f40', name: 'Élan', image: 'https://picsum.photos/seed/d9/200/200' },
  { id: '69f51557ca01a992cebe9f42', name: 'Suffuse', image: 'https://picsum.photos/seed/d10/200/200' },
  { id: '69f51558ca01a992cebe9f44', name: 'Khaadi', image: 'https://picsum.photos/seed/d1/200/200' },
  { id: '69f51558ca01a992cebe9f46', name: 'Maria.B', image: 'https://picsum.photos/seed/d2/200/200' },
  { id: '69f51558ca01a992cebe9f48', name: 'Sana Safinaz', image: 'https://picsum.photos/seed/d3/200/200' },
  { id: '69f51558ca01a992cebe9f4a', name: 'Ideas', image: 'https://picsum.photos/seed/d4/200/200' },
  { id: '69f51559ca01a992cebe9f4c', name: 'J.', image: 'https://picsum.photos/seed/d5/200/200' },
  { id: '69f51559ca01a992cebe9f4e', name: 'Nishat Linen', image: 'https://picsum.photos/seed/d6/200/200' },
  { id: '69f51559ca01a992cebe9f50', name: 'Agha Noor', image: 'https://picsum.photos/seed/d7/200/200' },
  { id: '69f51559ca01a992cebe9f52', name: 'Asim Jofa', image: 'https://picsum.photos/seed/d8/200/200' },
];

import { handleProtectedAction } from '../../utils/auth';

export default function Home({ user }) {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [currentOccasion, setCurrentOccasion] = useState(0);
  const [activeTrendingTab, setActiveTrendingTab] = useState('NEW ARRIVALS');
  const trendingTrackRef = useRef(null);
  const socialTrackRef = useRef(null);

  // Auto-loop for occasions
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentOccasion((prev) => (prev + 1) % OCCASIONS.length);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  // Auto-loop for hero slider
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const onProtectedClick = (e, targetPath = '/boutiques') => {
    if (e) e.preventDefault();
    handleProtectedAction(user, navigate, () => navigate(targetPath));
  };

  const scrollTrack = (ref, direction) => {
    if (ref.current) {
      const scrollAmount = direction === 'left' ? -400 : 400;
      ref.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <div className="home-page">
      {/* Dynamic Hero Slider */}
      <section className="hero-slider-wrap">
        <div className="slider-container">
          {HERO_SLIDES.map((slide, index) => (
            <div
              key={slide.id}
              className={`hero-slide ${index === currentSlide ? 'active' : ''}`}
            >
              <div
                className="hero-slide-bg"
                style={{ backgroundImage: `url(${slide.image})`, cursor: 'pointer' }}
                onClick={(e) => onProtectedClick(e, '/boutiques')}
              />
              <div className="hero-overlay" />
              <div className="hero-content-bottom-left">
                <div className="hero-text-anim">
                  <h1 className="hero-slide-title">{slide.title}</h1>
                  <p className="hero-slide-subtitle">{slide.subtitle}</p>
                  <div className="hero-cta-box">
                    <button onClick={(e) => onProtectedClick(e, '/boutiques')} className="btn-hero-main">
                      {slide.cta}
                    </button>
                  </div>
                  <div className="hero-tags-box">
                    {slide.tags.map(tag => (
                      <span key={tag} className="hero-tag-pill">{tag}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}

          <div className="hero-dash-indicators">
            {HERO_SLIDES.map((_, i) => (
              <div
                key={i}
                className={`progress-pill ${i === currentSlide ? 'active' : ''}`}
                onClick={() => setCurrentSlide(i)}
              >
                <div className="progress-fill" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Value Propositions */}
      <section className="usp-bar">
        <div className="container usp-inner">
          <div className="usp-item">
            <Truck size={18} /> <span>Express Shipping Nationwide</span>
          </div>
          <div className="usp-item">
            <CreditCard size={18} /> <span>Cash on Delivery Available</span>
          </div>
          <div className="usp-item">
            <ShieldCheck size={18} /> <span>Premium Quality Assured</span>
          </div>
        </div>
      </section>

      {/* Boutique Spotlight */}
      <section className="designer-spotlight section">
        <div className="container">
          <div className="section-header text-center">
            <h2 className="serif-title">Explore Our Boutiques</h2>
            <Link to="/boutiques" className="view-all-link">View All Boutiques <ArrowRight size={14} /></Link>
          </div>
        </div>

        <div className="designer-track-wrap">
          <div className="designer-row">
            {BOUTIQUES.concat(BOUTIQUES).map((d, idx) => (
              <div
                key={`${d.id}-${idx}`}
                className="designer-text-link"
                onClick={(e) => onProtectedClick(e, `/boutiques/${d.id}`)}
                style={{ cursor: 'pointer' }}
              >
                <span className="designer-name-loop">{d.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Eid Edit Section */}
      <section className="eid-edit-section">
        <div className="eid-header">
          <h2 className="eid-title">Eid Edit <span className="eid-emoji">🌙</span></h2>
          <p className="eid-tagline">Explore the newest festive arrivals curated especially for Eid <span className="eid-sparkle">✨</span></p>
        </div>

        <div className="eid-marquee-track">
          <div className="eid-marquee-row">
            {[
              { img: eid1, name: "New Arrivals" },
              { img: eid2, name: "Unstitched" },
              { img: eid3, name: "Luxury Formals" },
              { img: eid4, name: "Luxury Pret" },
              { img: eid5, name: "Signature" },
              { img: eid6, name: "Festive Wear" },
              { img: eid7, name: "Chiffon Edit" },
              { img: eid8, name: "Silk Series" },
              { img: eid9, name: "Embroidered" },
              { img: eid10, name: "Luxury Stitched" },
            ].concat([
              { img: eid1, name: "New Arrivals" },
              { img: eid2, name: "Unstitched" },
              { img: eid3, name: "Luxury Formals" },
              { img: eid4, name: "Luxury Pret" },
              { img: eid5, name: "Signature" },
              { img: eid6, name: "Festive Wear" },
              { img: eid7, name: "Chiffon Edit" },
              { img: eid8, name: "Silk Series" },
              { img: eid9, name: "Embroidered" },
              { img: eid10, name: "Luxury Stitched" },
            ]).map((item, idx) => (
              <div
                className="eid-card-premium"
                key={idx}
                onClick={(e) => onProtectedClick(e, '/boutiques')}
                style={{ cursor: 'pointer' }}
              >
                <img src={item.img} alt={item.name} />
                <div className="eid-label-wrap">
                  <span className="eid-label-text">{item.name}</span>
                  <ArrowRight className="eid-arrow" size={18} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Shop By Occasion Section */}
      <section className="occasion-section">
        <div className="occasion-content">
          <div className="occasion-left">
            <span className="occasion-label">{OCCASIONS[currentOccasion].label}</span>
            <h2 className="occasion-heading">Shop By Occasion</h2>
            <p className="occasion-desc">{OCCASIONS[currentOccasion].desc}</p>
            <button className="shop-look-btn" onClick={(e) => onProtectedClick(e, '/boutiques')}>
              Shop The Look <ArrowRight size={18} />
            </button>
            <div className="occasion-indicators">
              {OCCASIONS.map((_, idx) => (
                <div
                  key={idx}
                  className={`occ-indicator ${idx === currentOccasion ? 'active' : ''}`}
                  onClick={() => setCurrentOccasion(idx)}
                />
              ))}
            </div>
          </div>
          <div className="occasion-right">
            <div className="occasion-slider-viewport">
              <div
                className="occasion-slider-track"
                style={{ transform: `translateX(-${currentOccasion * 100}%)` }}
              >
                {OCCASIONS.map((occ) => (
                  <div
                    key={occ.id}
                    className="occasion-slide"
                    onClick={(e) => onProtectedClick(e, '/boutiques')}
                    style={{ cursor: 'pointer' }}
                  >
                    <img src={occ.img} alt={occ.title} className="occasion-img" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Most Trending Section */}
      <section className="trending-section">
        <div className="trending-header">
          <h2 className="trending-main-title">MOST TRENDING</h2>
          <div className="trending-nav-top">
            <div className="trending-tabs">
              {TRENDING_TABS.map(tab => (
                <button
                  key={tab}
                  className={`trending-tab ${activeTrendingTab === tab ? 'active' : ''}`}
                  onClick={() => setActiveTrendingTab(tab)}
                >
                  {tab}
                </button>
              ))}
            </div>
            <div className="trending-controls">
              <Link to="/boutiques" className="view-all-link">View all</Link>
              <div className="trending-arrows">
                <button className="trending-arrow" onClick={() => scrollTrack(trendingTrackRef, 'left')}><ChevronLeft size={20} /></button>
                <button className="trending-arrow" onClick={() => scrollTrack(trendingTrackRef, 'right')}><ChevronRight size={20} /></button>
              </div>
            </div>
          </div>
        </div>

        <div className="trending-slider-container">
          <div className="trending-track" ref={trendingTrackRef}>
            {TRENDING_PRODUCTS.map(product => (
              <div
                key={product.id}
                className="trending-card"
                onClick={(e) => onProtectedClick(e, '/boutiques')}
              >
                <div className="trending-img-box">
                  <img src={product.img} alt={product.title} />
                  <div className="trending-hover-details">
                    <div className="hover-action-bar">
                      <div className="view-details-txt">View Details <ArrowRight size={16} /></div>
                      <div className="hover-icons">
                        <div className="hover-icon"><Eye size={18} /></div>
                        <div className="hover-icon"><Heart size={18} /></div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="trending-info">
                  <h4 className="trending-card-title">{product.title}</h4>
                  <p className="trending-card-price">{product.price}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Signature Video Banner */}
      <section
        className="signature-banner"
        onClick={(e) => onProtectedClick(e, '/boutiques')}
        style={{ cursor: 'pointer' }}
      >
        <video className="signature-video" autoPlay muted loop playsInline>
          <source src={bannerVideo} type="video/mp4" />
        </video>
        <div className="signature-overlay">
          <h2 className="signature-title">Signature</h2>
        </div>
      </section>

      {/* Worn & Loved Social Section */}
      <section className="social-section">
        <div className="container">
          <div className="social-header">
            <h2 className="social-title">Worn & Loved <span className="heart-emoji">❤️</span></h2>
            <div className="social-nav">
              <button className="social-arrow-btn" onClick={() => scrollTrack(socialTrackRef, 'left')}><ChevronLeft size={20} /></button>
              <button className="social-arrow-btn" onClick={() => scrollTrack(socialTrackRef, 'right')}><ChevronRight size={20} /></button>
            </div>
          </div>

          <div className="social-track-viewport">
            <div className="social-track" ref={socialTrackRef}>
              {[
                { img: eid1, user: "amina.khan", cat: "Luxury Pret" },
                { img: eid2, user: "zara_styles", cat: "Eid Edit" },
                { img: eid3, user: "maira.official", cat: "Unstitched" },
                { img: eid4, user: "hina_boutique", cat: "Luxury Formals" },
                { img: eid5, user: "sana.pret", cat: "Silk Series" },
                { img: eid6, user: "ayesha.vogue", cat: "Festive Wear" },
                { img: eid7, user: "fatima.couture", cat: "Chiffon Edit" },
                { img: eid8, user: "maryam.jafry", cat: "Luxury Formals" },
                { img: eid9, user: "by.rooj1", cat: "Eid Collection" },
                { img: eid10, user: "qudsia.ali", cat: "Luxury Pret" }
              ].map((item, idx) => (
                <div key={idx} className="social-card">
                  <div className="social-card-header">
                    <div className="social-user-thumb">
                      <img src={`https://picsum.photos/seed/user${idx}/50/50`} alt={item.user} />
                    </div>
                    <div className="social-user-info">
                      <span className="social-username">{item.user}</span>
                      <span className="social-user-cat">{item.cat}</span>
                    </div>
                  </div>
                  <div className="social-card-img" onClick={(e) => onProtectedClick(e, '/boutiques')}>
                    <img src={item.img} alt={`Worn by ${item.user}`} />
                  </div>
                  <div className="social-card-footer">
                    <div className="social-icons-left">
                      <Heart size={18} />
                      <Eye size={18} />
                      <ArrowRight size={18} className="rotate-neg-45" />
                    </div>
                    <div className="social-shop-link" onClick={(e) => onProtectedClick(e, '/boutiques')}>
                      <span>Shop Now</span>
                      <ShoppingBag size={14} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
