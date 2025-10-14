import mongoose from 'mongoose';
import User from '../models/User';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/portal-online';

async function resetPassword() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('🔗 Connected to MongoDB');

    // Hash the new password
    const newPassword = 'socio123';
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    
    // Update the socio user
    const result = await User.updateOne(
      { email: 'socio@portal.com' },
      { password: hashedPassword }
    );

    if (result.modifiedCount > 0) {
      console.log('✅ Password updated successfully');
      
      // Test the new password
      const user = await User.findOne({ email: 'socio@portal.com' });
      if (user) {
        const isMatch = await user.comparePassword(newPassword);
        console.log(`🔐 Password test: ${isMatch ? '✅ MATCH' : '❌ NO MATCH'}`);
      }
    } else {
      console.log('❌ Password update failed');
    }

  } catch (error) {
    console.error('❌ Error resetting password:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the reset function
if (require.main === module) {
  resetPassword();
}

export default resetPassword;