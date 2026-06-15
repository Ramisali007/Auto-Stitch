const mongoose = require('mongoose');
const Order = require('./models/Order');
const dotenv = require('dotenv');
dotenv.config();

async function checkOrders() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const orders = await Order.find().sort({ createdAt: -1 }).limit(10);
    console.log(`Total Orders in DB: ${await Order.countDocuments()}`);
    console.log('Last 10 Orders:');
    orders.forEach(o => {
      console.log(`ID: ${o._id}, BoutiqueID: ${o.boutique}, Total: ${o.total}, Status: ${o.status}`);
    });
  } catch (err) {
    console.error(err);
  }
  process.exit();
}
checkOrders();
