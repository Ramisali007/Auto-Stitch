const mongoose = require('mongoose');
const dns = require('dns');

try {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
} catch (_) {}

const connectDB = async (retries = 5) => {
  let targetUri = process.env.MONGO_URI;

  // Completely isolate test suite from production/development database
  if (process.env.NODE_ENV === 'test') {
    if (process.env.MONGO_TEST_URI) {
      targetUri = process.env.MONGO_TEST_URI;
    } else if (targetUri && targetUri.includes('/autostitch?')) {
      targetUri = targetUri.replace('/autostitch?', '/autostitch_test?');
    } else if (targetUri && targetUri.includes('/autostitch')) {
      targetUri = targetUri.replace('/autostitch', '/autostitch_test');
    }
  }

  for (let i = 1; i <= retries; i++) {
    try {
      const conn = await mongoose.connect(targetUri);
      console.log(`✅ MongoDB Connected (${process.env.NODE_ENV || 'development'}): ${conn.connection.host}/${conn.connection.name}`);
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
