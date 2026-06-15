import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import './Returns.css';

export default function Returns() {
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'Return Policy — Auto Stitch';
  }, []);

  return (
    <div className="returns-page page-enter">
      <div className="returns-container">
        <h1 className="returns-title">Return Policy</h1>

        <div className="returns-content">
          <p>
            Items purchased on autostitch.pk and AUTO STITCH freestanding retail stores are eligible for return provided they are returned within 14 days of the item's delivery date in unused, unworn, unwashed, unaltered, and undamaged condition, with all original tags attached and all related accessories included. Custom-stitched, personalized, altered, and vintage jewelry items are final sale and are not eligible for exchange or return. Returns are accepted at the sole discretion of AUTO STITCH. Items that are deemed not to meet one or more of the eligibility criteria outlined above will be handled on a case-by-case basis.
          </p>

          <p>
            To ensure garments are eligible for return, please try them on carefully. Garments must be returned in their original packaging, with any dust bags, cards, and packaging intact. Original packaging is not to be used as shipping boxes. The original packaging should be placed within appropriate outer packaging, with contents secured within.
          </p>

          <p>
            Following inspection and acceptance of your return, you will receive confirmation via email that a refund or merchandise credit has been issued. Please allow up to 21 business days for your return to be processed.
          </p>

          <p>
            Returns are accepted at the sole discretion of autostitch.pk. Items that are deemed not to meet one or more of the eligibility criteria outlined above will be handled on a case-by-case basis, which may include 1) refusing to accept the return and sending it back to the purchaser or 2) deducting a fee from the refund or merchandise credit to cover the expense of cleaning, repair, and/or packaging replacement.
          </p>

          <div className="returns-subheading">DOMESTIC RETURNS</div>
          <p style={{ marginBottom: '10px' }}>
            To initiate a domestic return, please visit our <Link to="/contact" className="returns-link">returns portal</Link> to access and print your pre-paid courier return label.
          </p>

        </div>
      </div>
    </div>
  );
}
