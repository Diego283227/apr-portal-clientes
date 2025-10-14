import mongoose from 'mongoose';
import User from '../models/User';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/portal-online';

async function resetCalfuanPassword() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('🔗 Connected to MongoDB');

    // Hash the new password
    const newPassword = '123456';
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    
    // Update the calfuan user
    const result = await User.updateOne(
      { email: 'calfuan@gmail.com' },
      { password: hashedPassword }
    );

    if (result.modifiedCount > 0) {
      console.log('✅ Password updated successfully for calfuan@gmail.com');
      
      // Test the new password
      const user = await User.findOne({ email: 'calfuan@gmail.com' });
      if (user) {
        const isMatch = await user.comparePassword(newPassword);
        console.log(`🔐 Password test: ${isMatch ? '✅ MATCH' : '❌ NO MATCH'}`);
      }
    } else {
      console.log('❌ Password update failed - user not found');
    }

    console.log('📧 Login credentials: calfuan@gmail.com / 123456 / RUT: 12.000.000-0');

  } catch (error) {
    console.error('❌ Error resetting password:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the reset function
if (require.main === module) {
  resetCalfuanPassword();
}

export default resetCalfuanPassword;