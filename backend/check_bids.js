const mongoose = require('mongoose');
const Bid = require('./models/Bid');
const CustomizationRequest = require('./models/CustomizationRequest');
const dotenv = require('dotenv');
dotenv.config();

async function checkBids() {
  await mongoose.connect(process.env.MONGO_URI);
  const bids = await Bid.find().sort({ updatedAt: -1 }).limit(10).populate('boutique', 'name');
  console.log('Last 10 Bids:');
  bids.forEach(b => {
    console.log(`ID: ${b._id}, Boutique: ${b.boutique?.name}, Status: ${b.status}, Request: ${b.customizationRequest}`);
  });

  const requests = await CustomizationRequest.find({ status: 'bid_accepted' });
  console.log('\nRequests with accepted bids:');
  requests.forEach(r => {
    console.log(`Request ID: ${r._id}, Accepted Bid: ${r.acceptedBid}`);
  });
  
  process.exit();
}
checkBids();
