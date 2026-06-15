import { useState, useEffect } from 'react';
import './FAQ.css';

const faqs = [
  {
    category: "General",
    id: "general",
    items: [
      { q: "How can I contact Auto Stitch?", a: "Our dedicated client services team is available to assist you Monday through Friday, excluding major holidays. You may write to us at autostitchsecurity@gmail.com." },
      { q: "Where are your stores located?", a: "We have partner boutiques located in Lahore, Karachi, and Islamabad. Please visit our Store Locations page for exact addresses and operating hours." }
    ]
  },
  {
    category: "Product Information",
    id: "product-information",
    items: [
      { q: "Where can I find care instructions?", a: "Care instructions are provided on the digital listing and the physical label of each garment. For delicate embroidered or formal items, we strongly recommend professional dry cleaning." },
      { q: "Where can I find size & fit details?", a: "A detailed size guide is available on every product page. If you are unsure, we recommend using our AI Virtual Try-On feature to see how the garment maps to your shape." },
      { q: "What is Auto Stitch's product care and warranty policy?", a: "We guarantee the authenticity and quality of all boutique products sold through our platform. Any manufacturing defects must be reported within 3 days of delivery." }
    ]
  },
  {
    category: "Orders",
    id: "orders",
    items: [
      { q: "Can I amend my order once it has been placed?", a: "Ready-to-wear orders can only be amended within 24 hours of placement. Custom-stitched orders cannot be amended once the boutique has begun processing." },
      { q: "What if an item is sold out?", a: "You can add sold-out items to your Wishlist. We will notify you via email as soon as the item is restocked by the boutique." }
    ]
  },
  {
    category: "Payment",
    id: "payment",
    items: [
      { q: "What payment types are accepted?", a: "We securely accept Visa, Mastercard, JazzCash, EasyPaisa, and Cash on Delivery (COD) for eligible domestic orders within Pakistan." },
      { q: "When will payment be processed?", a: "For credit cards and mobile wallets, payment is authorized and processed at the time of checkout." }
    ]
  },
  {
    category: "Shipping",
    id: "shipping",
    items: [
      { q: "When will my order be shipped?", a: "Standard ready-to-wear orders are typically dispatched within 1-3 business days. Custom orders depend on the specific timeline agreed upon in your bid." },
      { q: "Why am I receiving multiple deliveries for the same order?", a: "If you purchase items from different boutiques in a single order, they may be shipped separately directly from each boutique's location." },
      { q: "Is a signature required for delivery?", a: "Yes, a signature is required upon delivery for all orders to ensure your package arrives safely." },
      { q: "Are duties and taxes included in my order total?", a: "Yes, all applicable domestic taxes (GST) are included in your final order total." }
    ]
  },
  {
    category: "Returns",
    id: "returns",
    items: [
      { q: "What is Auto Stitch's return policy?", a: "We accept returns within 14 days of delivery for unworn, undamaged items with all original tags attached. Custom-stitched and altered items are final sale." },
      { q: "How can I process a Domestic return or exchange?", a: "Please visit our Returns Portal to initiate a return, select the item(s), and print your pre-paid courier return label." },
      { q: "When will I receive a refund?", a: "Refunds are processed within 5-7 business days after the returned item is successfully received and inspected." }
    ]
  }
];

export default function FAQ() {
  const [activeCategory, setActiveCategory] = useState('general');
  const [openItems, setOpenItems] = useState({});

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'Frequently Asked Questions — Auto Stitch';

    const handleScroll = () => {
      const sections = faqs.map(f => document.getElementById(f.id));
      let currentActive = 'general';
      
      for (const section of sections) {
        if (section) {
          const rect = section.getBoundingClientRect();
          if (rect.top <= 200) {
            currentActive = section.id;
          }
        }
      }
      setActiveCategory(currentActive);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id) => {
    setActiveCategory(id);
    const el = document.getElementById(id);
    if (el) {
      const y = el.getBoundingClientRect().top + window.pageYOffset - 140; 
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  const toggleItem = (categoryId, itemIndex) => {
    const key = `${categoryId}-${itemIndex}`;
    setOpenItems(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  return (
    <div className="faq-page page-enter">
      <div className="faq-container">
        <h1 className="faq-title">Frequently Asked Questions</h1>

        <div className="faq-nav">
          {faqs.map((faq) => (
            <button
              key={faq.id}
              className={`faq-nav-btn ${activeCategory === faq.id ? 'active' : ''}`}
              onClick={() => scrollToSection(faq.id)}
            >
              {faq.category}
            </button>
          ))}
        </div>

        <div className="faq-content">
          {faqs.map((section) => (
            <div key={section.id} id={section.id} className="faq-section">
              <h2 className="faq-section-title">{section.category}</h2>
              
              <div className="faq-list">
                {section.items.map((item, index) => {
                  const isOpen = openItems[`${section.id}-${index}`];
                  return (
                    <div key={index} className={`faq-item ${isOpen ? 'open' : ''}`}>
                      <button 
                        className="faq-question" 
                        onClick={() => toggleItem(section.id, index)}
                        aria-expanded={isOpen}
                      >
                        <span>{item.q}</span>
                        <span className="faq-icon">{isOpen ? '−' : '+'}</span>
                      </button>
                      <div className="faq-answer">
                        <p>{item.a}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
