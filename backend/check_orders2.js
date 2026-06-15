const mongoose = require('mongoose');
require('./models/User'); 
const Boutique = require('./models/Boutique');
const dotenv = require('dotenv');
dotenv.config({ path: './.env' });

async function checkBoutiques() {
  await mongoose.connect(process.env.MONGO_URI);
  const boutiques = await Boutique.find().populate('owner', 'email');
  console.log('All Boutiques:');
  boutiques.forEach(b => {
    console.log(`ID: ${b._id}, Name: ${b.name}, Owner: ${b.owner?.email}`);
  });
  process.exit();
}
checkBoutiques();
