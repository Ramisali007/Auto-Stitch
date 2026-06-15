const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

async function checkData() {
  await mongoose.connect(process.env.MONGO_URI);
  const Boutique = mongoose.model('Boutique', new mongoose.Schema({ owner: mongoose.Schema.Types.ObjectId, name: String }));
  const Order = mongoose.model('Order', new mongoose.Schema({ boutique: mongoose.Schema.Types.ObjectId, total: Number, status: String }));
  
  const boutiques = await Boutique.find();
  console.log('Boutiques:');
  boutiques.forEach(b => console.log(`ID: ${b._id}, Name: ${b.name}, Owner: ${b.owner}`));

  const orders = await Order.find().sort({ createdAt: -1 }).limit(5);
  console.log('\nLast 5 Orders:');
  orders.forEach(o => console.log(`ID: ${o._id}, Boutique: ${o.boutique}, Status: ${o.status}`));
  
  process.exit();
}
checkData();
