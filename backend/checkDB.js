const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const checkDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('Collections:', collections.map(c => c.name));
    
    for (const col of collections) {
      const count = await mongoose.connection.db.collection(col.name).countDocuments();
      console.log(`${col.name}: ${count} documents`);
      if (col.name === 'users' || col.name === 'customers' || col.name === 'boutique_owners') {
        const sample = await mongoose.connection.db.collection(col.name).findOne();
        console.log(`Sample from ${col.name}:`, JSON.stringify(sample, null, 2));
      }
    }
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

checkDB();
