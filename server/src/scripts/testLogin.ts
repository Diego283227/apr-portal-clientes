import mongoose from 'mongoose';
import User from '../models/User';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/portal-online';

async function testLogin() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('🔗 Connected to MongoDB');

    // Find the socio user
    const user = await User.findOne({ email: 'socio@portal.com' });
    
    if (!user) {
      console.log('❌ User not found');
      return;
    }

    console.log('👤 User found:', {
      id: user._id,
      email: user.email,
      rut: user.rut,
      role: user.role,
      activo: user.activo,
      hasPassword: !!user.password,
      passwordLength: user.password?.length || 0
    });

    // Test password comparison
    const testPassword = 'socio123';
    const isMatch = await user.comparePassword(testPassword);
    console.log(`🔐 Password test for "${testPassword}": ${isMatch ? '✅ MATCH' : '❌ NO MATCH'}`);

    // Test bcrypt directly
    const directCompare = await bcrypt.compare(testPassword, user.password);
    console.log(`🔐 Direct bcrypt comparison: ${directCompare ? '✅ MATCH' : '❌ NO MATCH'}`);

    // Let's also create a fresh hash to compare
    const freshHash = await bcrypt.hash(testPassword, 12);
    const freshCompare = await bcrypt.compare(testPassword, freshHash);
    console.log(`🔐 Fresh hash comparison: ${freshCompare ? '✅ MATCH' : '❌ NO MATCH'}`);

  } catch (error) {
    console.error('❌ Error testing login:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the test function
if (require.main === module) {
  testLogin();
}

export default testLogin;