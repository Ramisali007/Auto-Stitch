const mongoose = require('mongoose');
const Boutique = require('./models/Boutique');
const dotenv = require('dotenv');
dotenv.config();

async function checkBoutiques() {
  await mongoose.connect(process.env.MONGO_URI);
  const boutiques = await Boutique.find().populate('owner', 'name email role');
  console.log('Boutiques in DB:');
  boutiques.forEach(b => {
    console.log(`ID: ${b._id}, Name: ${b.name}, Owner: ${b.owner?.name} (${b.owner?.role})`);
  });
  process.exit();
}
checkBoutiques();
