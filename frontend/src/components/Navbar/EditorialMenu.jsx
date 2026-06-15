import React, { useState, useEffect } from 'react';
import { X, Search, Phone, Globe } from 'lucide-react';
import { Link } from 'react-router-dom';
import { gsap } from 'gsap';
import './EditorialMenu.css';

const EditorialMenu = ({ items, onSearchClick }) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => setIsOpen(!isOpen);
  const closeMenu = () => setIsOpen(false);

  useEffect(() => {
    let ctx = gsap.context(() => {
      if (isOpen) {
        document.body.style.overflow = 'hidden';
        gsap.to('.editorial-drawer', {
          x: 0,
          duration: 0.5,
          ease: 'power3.out',
          force3D: true // Hardware acceleration
        });
        gsap.fromTo('.editorial-item',
          { opacity: 0, x: -15 },
          { opacity: 1, x: 0, duration: 0.3, stagger: 0.05, ease: 'power2.out', delay: 0.15 }
        );
      } else {
        document.body.style.overflow = 'auto';
        gsap.to('.editorial-drawer', {
          x: '-100%',
          duration: 0.4,
          ease: 'power3.in',
          force3D: true
        });
      }
    });

    return () => ctx.revert(); // Proper cleanup
  }, [isOpen]);

  return (
    <div className="editorial-menu-wrapper">
      {/* Trigger Group (Matching Reference 1) */}
      <div className="editorial-trigger-group">
        <button className="editorial-trigger-btn" onClick={toggleMenu}>
          <div className="hamburger-icon">
            <span className="line"></span>
            <span className="line short"></span>
          </div>
          <span className="trigger-text">Menu</span>
        </button>

        <button className="editorial-trigger-btn" onClick={onSearchClick}>
          <Search size={20} strokeWidth={1.5} />
          <span className="trigger-text secondary">Search</span>
        </button>
      </div>

      {/* Drawer Panel (Matching Reference 2) */}
      <div className={`editorial-drawer ${isOpen ? 'is-open' : ''}`}>
        <div className="drawer-inner">
          {/* Header */}
          <div className="drawer-header">
            <button className="drawer-header-btn" onClick={closeMenu}>
              <X size={20} strokeWidth={1.5} />
              <span>Close</span>
            </button>
            <button className="drawer-header-btn" onClick={() => { closeMenu(); onSearchClick(); }}>
              <Search size={20} strokeWidth={1.5} />
              <span>Search</span>
            </button>
          </div>

          {/* Categories List */}
          <nav className="drawer-nav">
            <ul className="drawer-list">
              {items.map((item, idx) => (
                <li key={idx} className="editorial-item">
                  <Link to={item.href} onClick={closeMenu} className={`drawer-link ${item.active ? 'active' : ''}`}>
                    {item.label}
                    {item.tag && <span className="item-tag">{item.tag}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Footer */}
          <div className="drawer-footer">
            <a href="mailto:hello@autostitch.pk" onClick={closeMenu} className="footer-link" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
              <Phone size={18} strokeWidth={1.5} />
              <span>Contact us</span>
            </a>
            <button className="footer-link">
              <Globe size={18} strokeWidth={1.5} />
              <span>Rest of the World / English</span>
            </button>
          </div>
        </div>
      </div>

      {/* Backdrop */}
      {isOpen && <div className="editorial-backdrop" onClick={closeMenu} />}
    </div>
  );
};

export default EditorialMenu;
