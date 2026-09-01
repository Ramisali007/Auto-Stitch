import { useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { ShieldCheck, Truck, RefreshCw, HelpCircle, MapPin, Search } from 'lucide-react';
import './InfoPage.css';

const INFO_CONTENT = {
  '/terms': {
    title: 'Terms & Conditions',
    icon: <ShieldCheck size={32} />,
    content: (
      <>
        <h3>1. Agreement to Terms</h3>
        <p>By accessing and using Auto Stitch, you agree to be bound by these Terms and Conditions. Our marketplace facilitates transactions between boutique owners and customers.</p>
        <h3>2. User Accounts</h3>
        <p>Users are responsible for maintaining the confidentiality of their account credentials. Boutique owners must ensure all listed products meet our quality standards.</p>
        <h3>3. Intellectual Property</h3>
        <p>All content on this website, including text, graphics, logos, and software, is the property of Auto Stitch or its content suppliers and is protected by international copyright laws.</p>
      </>
    )
  },
  '/privacy': {
    title: 'Privacy Policy',
    icon: <ShieldCheck size={32} />,
    content: (
      <>
        <h3>Information We Collect</h3>
        <p>We collect information you provide directly to us, including name, email, shipping address, and payment details when making a purchase.</p>
        <h3>How We Use Your Information</h3>
        <p>Your information is used to process orders, personalize your shopping experience, and communicate important updates regarding your purchases.</p>
        <h3>Data Security</h3>
        <p>We implement industry-standard security measures to protect your personal data from unauthorized access or disclosure.</p>
      </>
    )
  },
  '/returns': {
    title: 'Returns & Exchange',
    icon: <RefreshCw size={32} />,
    content: (
      <>
        <h3>Return Policy</h3>
        <p>We accept returns within 14 days of delivery for unworn, unwashed, and undamaged items with all original tags attached. Custom-stitched items are non-refundable.</p>
        <h3>Exchange Process</h3>
        <p>To initiate an exchange, please visit your Orders dashboard and select the item you wish to exchange. Our courier partner will pick up the item from your location.</p>
        <h3>Refund Timeline</h3>
        <p>Refunds are processed within 5-7 business days after the returned item is received and inspected by the respective boutique.</p>
      </>
    )
  },
  '/shipping': {
    title: 'Shipping Information',
    icon: <Truck size={32} />,
    content: (
      <>
        <h3>Delivery Times</h3>
        <p>Standard delivery within Pakistan takes 3-5 business days. International shipping can take 7-14 business days depending on the destination.</p>
        <h3>Shipping Costs</h3>
        <p>We offer free nationwide shipping on orders over PKR 5,000. For orders below this amount, a standard fee of PKR 250 applies.</p>
        <h3>Order Tracking</h3>
        <p>Once your order is dispatched, you will receive a tracking link via email and SMS to monitor your delivery in real-time.</p>
      </>
    )
  },
  '/faq': {
    title: 'Frequently Asked Questions',
    icon: <HelpCircle size={32} />,
    content: (
      <>
        <h3>General Queries</h3>
        <div className="faq-list">
          <div className="faq-item">
            <h4>What is Auto Stitch?</h4>
            <p>Auto Stitch is a premium fashion marketplace connecting you directly with top boutiques, offering ready-to-wear and custom stitching services.</p>
          </div>
          <div className="faq-item">
            <h4>Are all boutiques verified?</h4>
            <p>Yes, all boutiques on our platform undergo a strict verification process to ensure authenticity and quality.</p>
          </div>
        </div>
      </>
    )
  },

  '/track': {
    title: 'Track Your Order',
    icon: <Search size={32} />,
    content: (
      <>
        <div className="help-search">
          <Search size={20} />
          <input type="text" placeholder="Enter your Order ID (e.g., ORD-12345)" className="form-input" />
          <button className="btn btn-primary" style={{ marginLeft: '10px' }}>Track</button>
        </div>
        <div style={{ marginTop: '30px' }}>
          <h3>How to find your Order ID?</h3>
          <p>Your Order ID was sent to you in the confirmation email after you completed your purchase. You can also find it in your Account Dashboard under "Order History".</p>
        </div>
        <div style={{ marginTop: '30px', padding: '20px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px' }}>
          <h4>Need help with an order?</h4>
          <p>If you haven't received a tracking update within 48 hours of dispatch, please contact our support team.</p>
          <Link to="/contact" className="btn btn-outline mt-3">Contact Support</Link>
        </div>
      </>
    )
  }
};

export default function InfoPage() {
  const location = useLocation();
  const pageData = INFO_CONTENT[location.pathname] || {
    title: 'Information',
    icon: <HelpCircle size={32} />,
    content: <p>Content coming soon.</p>
  };

  useEffect(() => {
    document.title = `${pageData.title} — Auto Stitch`;
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div className="info-page page-enter">
      <div className="info-header">
        <div className="info-icon-wrapper">{pageData.icon}</div>
        <h1 className="info-title">{pageData.title}</h1>
      </div>
      <div className="container">
        <div className="info-content-wrapper glass-card">
          <div className="info-prose">
            {pageData.content}
          </div>
        </div>
      </div>
    </div>
  );
}
