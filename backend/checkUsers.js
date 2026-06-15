const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const checkUsers = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const users = await mongoose.connection.db.collection('users').find({}).toArray();
    console.log('Roles in users collection:', [...new Set(users.map(u => u.role))]);
    console.log('User counts by role:', users.reduce((acc, u) => {
      acc[u.role] = (acc[u.role] || 0) + 1;
      return acc;
    }, {}));
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

checkUsers();
