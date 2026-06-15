const mongoose = require('mongoose');
require('./models/User'); 
const Message = require('./models/Message');
const Boutique = require('./models/Boutique');
const dotenv = require('dotenv');
dotenv.config({ path: './.env' });

async function checkChats() {
  await mongoose.connect(process.env.MONGO_URI);
  const messages = await Message.find().populate('boutique');
  console.log('All Messages:');
  messages.forEach(m => {
    console.log(`Boutique: ${m.boutique?.name}, Sender: ${m.sender}, Receiver: ${m.receiver}, Content: ${m.content}`);
  });
  process.exit();
}
checkChats();
