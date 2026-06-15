import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import img404 from '../../../Photos/404/404.jpg';
import './NotFound.css';

export default function NotFound() {
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'Page Not Found — Auto Stitch';
  }, []);

  return (
    <div className="not-found-page page-enter">
      <div className="not-found-hero">
        <img src={img404} alt="Page Not Found" className="not-found-image" />
        <div className="not-found-overlay"></div>
        
        <div className="not-found-content">
          <h1 className="not-found-title">Apologies, the page you're looking for cannot be found.</h1>
          <Link to="/" className="not-found-link">Return to Home</Link>
        </div>
      </div>
    </div>
  );
}
