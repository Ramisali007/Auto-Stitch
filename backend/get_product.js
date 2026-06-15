const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

async function checkProducts() {
  await mongoose.connect(process.env.MONGO_URI);
  const Product = mongoose.model('Product', new mongoose.Schema({ name: String }));
  const p = await Product.findOne();
  console.log(`Product ID: ${p?._id}, Name: ${p?.name}`);
  process.exit();
}
checkProducts();
