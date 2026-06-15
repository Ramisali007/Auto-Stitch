import { useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import ProductCard from '../../components/ProductCard/ProductCard';
import './Recommendations.css';

const RECO_PRODUCTS = [
  { _id: 'r1', name: 'Printed Lawn Suit', price: 3500, discountPrice: 0, images: ['https://picsum.photos/seed/rec1/400/500'], category: 'Luxury Pret', boutique: { name: 'Spring Studio' }, tryOnEnabled: true, avgRating: 4.6, numReviews: 54 },
  { _id: 'r2', name: 'Net Gharara', price: 12000, discountPrice: 9500, images: ['https://picsum.photos/seed/rec2/400/500'], category: 'Formal', boutique: { name: 'Bridal Dreams' }, tryOnEnabled: true, avgRating: 4.8, numReviews: 23 },
  { _id: 'r3', name: 'Velvet Kurta', price: 5800, discountPrice: 0, images: ['https://picsum.photos/seed/rec3/400/500'], category: 'Casual', boutique: { name: 'Style Hub' }, tryOnEnabled: true, avgRating: 4.3, numReviews: 87 },
  { _id: 'r4', name: 'Organza Set', price: 9200, discountPrice: 7500, images: ['https://picsum.photos/seed/rec4/400/500'], category: 'Luxury Pret', boutique: { name: 'Elegance PK' }, tryOnEnabled: true, avgRating: 4.9, numReviews: 12 },
  { _id: 'r5', name: 'Silk Chiffon Suit', price: 15000, discountPrice: 0, images: ['https://picsum.photos/seed/rec5/400/500'], category: 'Formal', boutique: { name: 'Royal Threads' }, tryOnEnabled: true, avgRating: 4.7, numReviews: 31 },
  { _id: 'r6', name: 'Embroidered Lawn', price: 6800, discountPrice: 5500, images: ['https://picsum.photos/seed/rec6/400/500'], category: 'Luxury Pret', boutique: { name: 'Khaadi' }, tryOnEnabled: true, avgRating: 4.5, numReviews: 67 },
  { _id: 'r7', name: 'Bridal Lehenga', price: 85000, discountPrice: 0, images: ['https://picsum.photos/seed/rec7/400/500'], category: 'Bridal', boutique: { name: 'Suffuse' }, tryOnEnabled: true, avgRating: 5.0, numReviews: 8 },
  { _id: 'r8', name: 'Cotton Daily Wear', price: 2800, discountPrice: 0, images: ['https://picsum.photos/seed/rec8/400/500'], category: 'Casual', boutique: { name: 'Ideas' }, tryOnEnabled: false, avgRating: 4.1, numReviews: 156 },
];

export default function Recommendations() {
  useEffect(() => { document.title = 'For You — Auto Stitch'; }, []);

  return (
    <div className="recommendations-page page-enter">
      <div className="container">
        <div className="reco-header">
          <div className="hero-badge"><Sparkles size={14} /><span>Powered by FashionCLIP AI</span></div>
          <h1>Curated <span className="text-gradient">For You</span></h1>
          <p className="text-muted">AI-powered recommendations based on your browsing history, style preferences, and what's trending.</p>
        </div>

        <div className="reco-sections">
          <section className="reco-section">
            <h2 className="reco-section-title">Based on Your Style</h2>
            <div className="reco-grid">{RECO_PRODUCTS.slice(0, 4).map(p => <ProductCard key={p._id} product={p} />)}</div>
          </section>
          <section className="reco-section">
            <h2 className="reco-section-title">Trending This Week</h2>
            <div className="reco-grid">{RECO_PRODUCTS.slice(4, 8).map(p => <ProductCard key={p._id} product={p} />)}</div>
          </section>
        </div>
      </div>
    </div>
  );
}
