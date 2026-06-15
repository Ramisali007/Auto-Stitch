import { useEffect } from 'react';
import './Careers.css';

export default function Careers() {
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'Careers — Auto Stitch';
  }, []);

  return (
    <div className="careers-page page-enter">
      {/* 1. Header Section (Black Background) */}
      <section className="careers-header-section">
        <div className="careers-container">
          <h1 className="careers-title-serif">Careers</h1>
          
          <div className="careers-text-block">
            <p className="careers-para">
              AUTO STITCH is a way of looking at the world. Shaped by the vibrant heritage of Pakistan and the precision of modern technology, this point of view comes to life through a curated marketplace that finds confidence in contrast. Each role at AUTO STITCH proposes a fresh balance of opposing elements—traditional craftsmanship and digital innovation, structure and fluidity—while embodying a signature elegance and ease.
            </p>

            <p className="careers-para">
              Founded in 2026 by Ramis Ali and based in Pakistan, AUTO STITCH evolves with each season, building upon a foundation of exceptional materials, skilled boutique partners, and a commitment to redefining how we experience fashion. We are always looking for passionate individuals to join our team and help us build the future of Pakistani fashion.
            </p>
          </div>

          <div className="careers-cta">
            <a href="mailto:autostitchsecurity@gmail.com" className="careers-link-underlined">See Opportunities</a>
          </div>
        </div>
      </section>

      {/* 2. Full-Width Image Section */}
      <section className="careers-image-section">
        <img src="/about/about.jpg" alt="Careers at Auto Stitch" className="careers-full-img" />
      </section>
    </div>
  );
}
