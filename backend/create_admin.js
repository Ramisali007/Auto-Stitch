const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { Admin } = require('./models/User');

dotenv.config();

const createAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB Connected...');

    const email = 'autostitchsecurity@gmail.com';
    const password = 'autostitch12345';

    // Check if admin already exists
    let admin = await Admin.findOne({ email });

    if (admin) {
      console.log('Admin already exists. Updating password...');
      admin.password = password;
      admin.role = 'admin';
      await admin.save();
    } else {
      console.log('Creating new admin...');
      admin = await Admin.create({
        name: 'Auto Stitch Admin',
        email,
        password,
        role: 'admin',
        isVerified: true
      });
    }

    console.log('Admin User Ready:');
    console.log('Email:', email);
    console.log('Password:', password);
    
    process.exit();
  } catch (error) {
    console.error('Error creating admin:', error);
    process.exit(1);
  }
};

createAdmin();
