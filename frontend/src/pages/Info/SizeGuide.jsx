import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import sizeBanner from '../../../Photos/size/size.png';
import './SizeGuide.css';

const SIZE_DATA = [
  { france: '34', europe: 'XS', us: '0 - 4', chest: '78 - 82 cm', waist: '58 - 62 cm', hip: '84 - 88 cm', height: '106 cm' },
  { france: '36', europe: 'S', us: '4 - 6', chest: '82 - 86 cm', waist: '62 - 66 cm', hip: '88 - 92 cm', height: '108 cm' },
  { france: '38', europe: 'M', us: '6 - 8', chest: '86 - 90 cm', waist: '66 - 70 cm', hip: '92 - 96 cm', height: '109 cm' },
  { france: '40', europe: 'L', us: '8', chest: '90 - 94 cm', waist: '70 - 74 cm', hip: '96 - 100 cm', height: '110 cm' },
  { france: '42', europe: 'XL', us: '10', chest: '94 - 98 cm', waist: '74 - 78 cm', hip: '100 - 104 cm', height: '112 cm' },
];

export default function SizeGuide() {
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'Size Guide — Auto Stitch';
  }, []);

  return (
    <div className="size-guide-page">
      {/* Editorial Banner - Linked to Boutiques */}
      <Link to="/boutiques" className="size-banner-link">
        <div className="size-banner-container">
          <img src={sizeBanner} alt="Size Guide Banner" className="size-banner-img" />
        </div>
      </Link>

      <div className="container">
        <div className="size-content-wrap">
          <h2 className="size-table-title">Woman Clothes</h2>
          
          <div className="size-table-responsive">
            <table className="size-table">
              <thead>
                <tr>
                  <th>France</th>
                  <th>Europe</th>
                  <th>US</th>
                  <th>Chest Size</th>
                  <th>Waist Size</th>
                  <th>Hip Size</th>
                  <th>Leg Height</th>
                </tr>
              </thead>
              <tbody>
                {SIZE_DATA.map((row, index) => (
                  <tr key={index}>
                    <td>{row.france}</td>
                    <td>{row.europe}</td>
                    <td>{row.us}</td>
                    <td>{row.chest}</td>
                    <td>{row.waist}</td>
                    <td>{row.hip}</td>
                    <td>{row.height}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="size-breadcrumbs">
            <Link to="/">Home</Link>
            <span className="sep">|</span>
            <Link to="/size-guide" className="active">Size Guide</Link>
            <span className="sep">|</span>
            <span>Woman</span>
          </div>
        </div>
      </div>
    </div>
  );
}
