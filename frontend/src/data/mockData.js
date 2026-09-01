// Shared Editorial Data for Search and Discovery
export const BOUTIQUES_STATIC = [
    { name: 'Élan', id: '1' },
    { name: 'Suffuse', id: '2' },
    { name: 'Khaadi', id: '3' },
    { name: 'Maria.B', id: '4' },
    { name: 'Sana Safinaz', id: '5' },
    { name: 'Ideas', id: '6' },
    { name: 'J.', id: '7' },
    { name: 'Nishat Linen', id: '8' },
    { name: 'Agha Noor', id: '9' },
    { name: 'Asim Jofa', id: '10' }
];
export const CATEGORIES_STATIC = ['Luxury Pret', 'Bridal', 'Formal', 'Unstitched', 'Chiffon Series', 'M.Luxe Fabrics'];

// Mock products for the Elan Editorial collection
import elan1 from '../../Photos/elan/pexels-dhanno-18862319.jpg';
import elan2 from '../../Photos/elan/pexels-dhanno-18862631.jpg';
import elan3 from '../../Photos/elan/pexels-dhanno-18976989.jpg';
import elan4 from '../../Photos/elan/pexels-dhanno-18977034.jpg';
import elan5 from '../../Photos/elan/pexels-dhanno-19221260.jpg';
import elan6 from '../../Photos/elan/pexels-dhanno-19248024.jpg';
import elan7 from '../../Photos/elan/pexels-dhanno-19281279.jpg';
import elan8 from '../../Photos/elan/pexels-dhanno-19401634.jpg';
import elan9 from '../../Photos/elan/pexels-dhanno-19733567.jpg';
import elan10 from '../../Photos/elan/pexels-dhanno-19956008.jpg';
import elan11 from '../../Photos/elan/pexels-dhanno-20420559.jpg';
import elan12 from '../../Photos/elan/pexels-dhanno-20527761.jpg';

export const EDITORIAL_PRODUCTS = [
    { _id: 'e1', name: 'Velvet Midnight Gown', price: 85000, images: [elan1], boutique: 'Élan', category: 'Luxury Pret' },
    { _id: 'e2', name: 'Silk Orchid Ensemble', price: 65000, images: [elan2], boutique: 'Élan', category: 'Formal' },
    { _id: 'e3', name: 'Crimson Heritage Suit', price: 95000, images: [elan3], boutique: 'Élan', category: 'Bridal' },
    { _id: 'e4', name: 'Pearl Essence Jora', price: 72000, images: [elan4], boutique: 'Élan', category: 'Luxury Pret' },
    { _id: 'e5', name: 'Golden Hour Lehnga', price: 120000, images: [elan5], boutique: 'Élan', category: 'Bridal' },
    { _id: 'e6', name: 'Azure Dream Kaftan', price: 45000, images: [elan6], boutique: 'Élan', category: 'Casual' },
    { _id: 'e7', name: 'Onyx Grace Saree', price: 110000, images: [elan7], boutique: 'Élan', category: 'Formal' },
    { _id: 'e8', name: 'Ivory Bloom Kurta', price: 35000, images: [elan8], boutique: 'Élan', category: 'Casual' },
    { _id: 'e9', name: 'Emerald Royale Set', price: 88000, images: [elan9], boutique: 'Élan', category: 'Luxury Pret' },
    { _id: 'e10', name: 'Rose Petal Pishwas', price: 135000, images: [elan10], boutique: 'Élan', category: 'Bridal' },
    { _id: 'e11', name: 'Sapphire Mist Wrap', price: 42000, images: [elan11], boutique: 'Élan', category: 'Formal' },
    { _id: 'e12', name: 'Moonlit Silver Gown', price: 155000, images: [elan12], boutique: 'Élan', category: 'Bridal' }
];
