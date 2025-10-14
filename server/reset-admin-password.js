const mongoose = require('mongoose');
const User = require('./dist/models/User').default;
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/portal-online';

async function resetAdminPassword() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('🔗 Connected to MongoDB');

    // Find the admin user (include password field)
    const admin = await User.findOne({ email: 'admin@portal.com' }).select('+password');

    if (!admin) {
      console.log('❌ Admin user not found');
      return;
    }

    console.log('👤 Admin user found:', {
      id: admin._id,
      email: admin.email,
      rut: admin.rut,
      role: admin.role
    });

    // Hash new password
    const newPassword = 'admin123';
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update admin password
    admin.password = hashedPassword;
    await admin.save();

    console.log('🔐 Admin password updated successfully!');

    // Test the new password
    const testMatch = await admin.comparePassword(newPassword);
    console.log(`🔐 Password test: ${testMatch ? '✅ MATCH' : '❌ NO MATCH'}`);

  } catch (error) {
    console.error('❌ Error resetting admin password:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the reset function
resetAdminPassword();