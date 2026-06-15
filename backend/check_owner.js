const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

async function checkBoutiqueOwner() {
  await mongoose.connect(process.env.MONGO_URI);
  const User = mongoose.model('User', new mongoose.Schema({ email: String, role: String }));
  const Boutique = mongoose.model('Boutique', new mongoose.Schema({ owner: mongoose.Schema.Types.ObjectId, name: String }));
  
  // Let's check the boutique for the email we suspect
  const boutique = await Boutique.findOne().populate('owner');
  console.log('Sample Boutique:');
  console.log(boutique);
  
  process.exit();
}
checkBoutiqueOwner();
