const mongoose = require('mongoose');
const dotenv = require('dotenv');
const dns = require('dns');

try {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
} catch (_) {}

dotenv.config();

const Boutique = require('./models/Boutique');
const Product = require('./models/Product');

const NEW_PHOTOS = [
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

async function run() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB successfully.');

  const boutiques = await Boutique.find({});
  console.log(`Found ${boutiques.length} boutiques in total.`);

  let createdCount = 0;
  let skippedCount = 0;

  for (const boutique of boutiques) {
    console.log(`\nProcessing boutique: ${boutique.name}...`);
    for (const item of NEW_PHOTOS) {
      const imagePath = `/Photos/elan/${item.filename}`;
      const productName = `${boutique.name} ${item.baseName}`;

      // Check if product already exists for this boutique with this image
      const existing = await Product.findOne({
        boutique: boutique._id,
        images: imagePath,
      });

      if (existing) {
        console.log(`  - Exists already: ${existing.name}`);
        skippedCount++;
        continue;
      }

      await Product.create({
        boutique: boutique._id,
        name: productName,
        description: `${item.description} Presented exclusively by ${boutique.name} for the new seasonal couture drop.`,
        price: item.price,
        discountPrice: 0,
        images: [imagePath],
        category: item.category,
        material: item.material,
        sizes: ['XS', 'S', 'M', 'L', 'XL'],
        colors: item.colors,
        stock: 30,
        tryOnEnabled: true,
        status: 'approved',
        isActive: true,
        views: Math.floor(Math.random() * 50) + 10,
        soldCount: 0,
      });

      console.log(`  + Created: ${productName} (${imagePath})`);
      createdCount++;
    }
  }

  console.log(`\n===========================================`);
  console.log(`Completed import: ${createdCount} products created, ${skippedCount} skipped.`);
  console.log(`===========================================`);

  // Update seeder.js MOCK_PRODUCTS and ELAN_IMAGES as well for consistency
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('Import failed:', err);
  process.exit(1);
});
