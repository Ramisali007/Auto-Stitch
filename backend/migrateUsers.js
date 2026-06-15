const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { Customer, BoutiqueOwner, Admin, User } = require('./models/User');

dotenv.config();

const migrateUsers = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB for Migration...');

    const allLegacyUsers = await User.find({}).lean();
    console.log(`Found ${allLegacyUsers.length} total users in 'users' collection.`);

    let customerCount = 0;
    let ownerCount = 0;
    let adminCount = 0;

    for (const user of allLegacyUsers) {
      const userData = { ...user };
      delete userData._id; // Let Mongoose generate new ID or keep old one? 
      // It's better to keep the same _id to avoid breaking foreign key refs (like Boutique.owner)
      
      const email = user.email.toLowerCase();

      if (user.role === 'customer') {
        const exists = await Customer.findOne({ email });
        if (!exists) {
          await Customer.create(user);
          customerCount++;
        }
      } else if (user.role === 'boutique_owner') {
        const exists = await BoutiqueOwner.findOne({ email });
        if (!exists) {
          await BoutiqueOwner.create(user);
          ownerCount++;
        }
      } else if (user.role === 'admin') {
        const exists = await Admin.findOne({ email });
        if (!exists) {
          await Admin.create(user);
          adminCount++;
        }
      }
    }

    console.log('------------------------------------');
    console.log(`Migration Summary:`);
    console.log(`✅ Migrated ${customerCount} Customers to 'customers' collection.`);
    console.log(`✅ Migrated ${ownerCount} Boutique Owners to 'boutique_owners' collection.`);
    console.log(`✅ Migrated ${adminCount} Admins to 'admins' collection.`);
    console.log('------------------------------------');
    console.log('NOTE: Legacy data remains in "users" collection as a backup.');
    
    process.exit();
  } catch (error) {
    console.error('❌ Migration Error:', error);
    process.exit(1);
  }
};

migrateUsers();
