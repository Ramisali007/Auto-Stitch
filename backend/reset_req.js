const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

async function resetRequest() {
  await mongoose.connect(process.env.MONGO_URI);
  const CustomizationRequest = mongoose.model('CustomizationRequest', new mongoose.Schema({ status: String, acceptedBid: mongoose.Schema.Types.ObjectId }));
  const Bid = mongoose.model('Bid', new mongoose.Schema({ status: String, customizationRequest: mongoose.Schema.Types.ObjectId }));
  
  const lastReq = await CustomizationRequest.findOne({ status: 'bid_accepted' }).sort({ updatedAt: -1 });
  if (lastReq) {
    console.log(`Resetting request: ${lastReq._id}`);
    lastReq.status = 'bidding';
    lastReq.acceptedBid = null;
    await lastReq.save();
    
    await Bid.updateMany({ customizationRequest: lastReq._id }, { status: 'pending' });
    console.log('Request and Bids reset successfully.');
  } else {
    console.log('No accepted requests found to reset.');
  }
  process.exit();
}
resetRequest();
