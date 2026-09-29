const mongoose = require('mongoose');
const dotenv = require('dotenv');
const dns = require('dns');
try { dns.setServers(['8.8.8.8', '8.8.4.4']); } catch (_) {}
dotenv.config();

const Product = require('./models/Product');
const Boutique = require('./models/Boutique');

async function inspectAll6() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  const filenames = [
    'engin-akyurt-qSA-x_pTHqQ-unsplash.jpg',
    'imana-cI2zqKL-8ro-unsplash.jpg',
    'khaled-ali-1-Sk6l2lCWY-unsplash.jpg',
    'khaled-ghareeb--NyPn9up_7o-unsplash.jpg',
    'manito-silk-xnE9M8Kq-e0-unsplash.jpg',
    'max-titov-Mhktr6dFD3I-unsplash.jpg'
  ];

  for (const fn of filenames) {
    const list = await Product.find({ images: { $regex: fn } }).populate('boutique', 'name');
    console.log(`\n=== File: ${fn} (Found ${list.length} products) ===`);
    if (list.length > 0) {
      console.log(`Example: name="${list[0].name}", category="${list[0].category}", material="${list[0].material}", colors=${JSON.stringify(list[0].colors)}`);
    }
  }

  process.exit(0);
}

inspectAll6().catch(err => { console.error(err); process.exit(1); });
