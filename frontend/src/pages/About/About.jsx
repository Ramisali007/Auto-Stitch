import { useEffect } from 'react';
import './About.css';

export default function About() {
  useEffect(() => { 
    document.title = 'About — Auto Stitch'; 
    window.scrollTo(0, 0); 
  }, []);

  return (
    <div className="about-page page-enter">
      {/* 1. Hero Image Section */}
      <section className="about-hero-v2">
        <img src="/about/about.jpg" alt="About Auto Stitch" className="about-hero-img" />
      </section>

      {/* 2. Content Section */}
      <section className="about-content-v2">
        <div className="about-container-minimal">
          <h1 className="about-title-serif">About</h1>
          
          <div className="about-text-block">
            <p className="about-para">
              AUTO STITCH is a way of looking at the world. Shaped by the vibrant heritage of Pakistan and the precision of modern technology, this point of view comes to life through a curated marketplace that finds confidence in contrast. Each piece proposes a fresh balance of opposing elements—traditional craftsmanship and digital innovation, structure and fluidity—while embodying a signature elegance and ease.
            </p>

            <p className="about-para">
              Founded in 2026 by Ramis Ali and based in Pakistan, AUTO STITCH evolves with each season, building upon a foundation of exceptional materials, skilled boutique partners, and a commitment to redefining how we experience fashion. From our AI-powered virtual try-on pipeline to our unique custom stitching bidding system, we are dedicated to providing a seamless, luxury experience for every client.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
