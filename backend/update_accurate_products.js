const mongoose = require('mongoose');
const dotenv = require('dotenv');
const dns = require('dns');

try {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
} catch (_) {}

dotenv.config();

const Boutique = require('./models/Boutique');
const Product = require('./models/Product');

const ACCURATE_PRODUCTS = [
  {
    filename: 'manito-silk-xnE9M8Kq-e0-unsplash.jpg',
    baseName: 'Velvet Scalloped Collar Jacket',
    description: 'Tailored in rich black silk velvet, featuring an iconic scalloped ivory collar, mother-of-pearl front buttons, and a structured fit.',
    category: 'Outerwear',
    material: 'Silk Velvet',
    price: 24500,
    colors: ['Obsidian Black', 'Ivory White'],
  },
  {
    filename: 'engin-akyurt-qSA-x_pTHqQ-unsplash.jpg',
    baseName: 'Ivory Linen Tunic Dress',
    description: 'Ethereal minimalist tunic dress crafted from crisp ivory linen, featuring wide-cut cap sleeves and an adjustable braided rope tie belt.',
    category: 'Luxury Pret',
    material: 'Pure Linen',
    price: 18500,
    colors: ['Ivory White', 'Natural Flax'],
  },
  {
    filename: 'imana-cI2zqKL-8ro-unsplash.jpg',
    baseName: 'Botanical Flora Turquoise Co-Ord',
    description: 'Striking two-piece co-ord set in vivid turquoise silk, adorned with rich botanical floral prints, a pointed shirt collar, and belted waist.',
    category: 'Luxury Pret',
    material: 'Printed Silk Blend',
    price: 32000,
    colors: ['Turquoise Teal', 'Coral Red', 'Sage Green'],
  },
  {
    filename: 'khaled-ali-1-Sk6l2lCWY-unsplash.jpg',
    baseName: 'Minimalist Ivory Longline Blazer Suit',
    description: 'Architectural longline ivory blazer and tailored trouser suit, designed with sharp lapels, fluid movement, and pristine minimalist tailoring.',
    category: 'Formal',
    material: 'Tailored Crepe',
    price: 36000,
    colors: ['Pristine White', 'Ivory'],
  },
  {
    filename: 'khaled-ghareeb--NyPn9up_7o-unsplash.jpg',
    baseName: 'Burgundy Rose Tulle Couture Gown',
    description: 'Haute couture evening gown featuring a structured 3D pleated burgundy bodice and a sweeping sheer tulle skirt adorned with hand-stitched floral appliqués.',
    category: 'Bridal',
    material: 'Embroidered Tulle & Silk Organza',
    price: 85000,
    colors: ['Burgundy Wine', 'Dusty Rose', 'Deep Plum'],
  },
  {
    filename: 'max-titov-Mhktr6dFD3I-unsplash.jpg',
    baseName: 'Geometric Color-Blocked Wool Coat',
    description: 'Warm autumnal statement coat crafted in structured wool blend, featuring an eye-catching geometric color-block motif and tailored notch lapels.',
    category: 'Outerwear',
    material: 'Wool Blend',
    price: 29500,
    colors: ['Rust Orange', 'Mocha Brown', 'Slate Grey'],
  },
];

async function updateDatabase() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  const boutiques = await Boutique.find({});
  console.log(`Updating products across ${boutiques.length} boutiques...`);

  let updatedCount = 0;

  for (const item of ACCURATE_PRODUCTS) {
    const products = await Product.find({
      images: { $regex: item.filename }
    }).populate('boutique', 'name');

    for (const p of products) {
      const boutiqueName = p.boutique ? p.boutique.name : 'Haute Couture';
      p.name = `${boutiqueName} ${item.baseName}`;
      p.description = item.description;
      p.category = item.category;
      p.material = item.material;
      p.price = item.price;
      p.colors = item.colors;
      await p.save();
      updatedCount++;
    }
  }

  console.log(`✅ Successfully updated ${updatedCount} products in MongoDB with 100% accurate fashion metadata!`);
  process.exit(0);
}

updateDatabase().catch(err => {
  console.error(err);
  process.exit(1);
});
