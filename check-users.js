require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');
const bcrypt = require('bcryptjs');

async function checkUsers() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');
    
    const users = await User.find({});
    console.log(`\nTotal users in database: ${users.length}`);
    
    if (users.length === 0) {
      console.log('\nNo users found. Creating admin user...');
      
      const hashedPassword = await bcrypt.hash('admin123', 10);
      const adminUser = await User.create({
        fullName: 'Admin User',
        email: 'admin@gharfar.com',
        password: hashedPassword,
        role: 'admin',
        isVerified: true
      });
      
      console.log('Admin user created:', {
        id: adminUser._id,
        email: adminUser.email,
        role: adminUser.role
      });
    } else {
      console.log('\nExisting users:');
      users.forEach((user, index) => {
        console.log(`${index + 1}. ${user.fullName} (${user.email}) - Role: ${user.role}`);
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkUsers();
