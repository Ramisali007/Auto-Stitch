const mongoose = require('mongoose');
const dns = require('dns');

// Force Cloudflare + Google DNS (fixes SRV lookup failures on some ISPs)
dns.setServers(['1.1.1.1', '8.8.8.8']);

const connectDB = async (retries = 5) => {
  for (let i = 1; i <= retries; i++) {
    try {
      const conn = await mongoose.connect(process.env.MONGO_URI);
      console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
      return;
    } catch (error) {
      console.error(`❌ MongoDB Connection Attempt ${i}/${retries} Failed: ${error.message}`);
      if (i === retries) {
        console.error('💀 All connection attempts exhausted. Exiting.');
        process.exit(1);
      }
      console.log(`⏳ Retrying in 5 seconds...`);
      await new Promise(res => setTimeout(res, 5000));
    }
  }
};

module.exports = connectDB;
