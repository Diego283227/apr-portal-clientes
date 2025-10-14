import mongoose from 'mongoose';
import User from '../models/User';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/portal-online';

async function activateUsers() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('🔗 Connected to MongoDB');

    // Update all users to be active
    const result = await User.updateMany({}, { activo: true });
    console.log(`✅ Updated ${result.modifiedCount} users to active status`);

    // Show user statuses
    const users = await User.find({}, 'rut email role activo');
    console.log('👥 Current users:');
    users.forEach(user => {
      console.log(`   - ${user.email} (${user.rut}) - ${user.role} - Active: ${user.activo}`);
    });

  } catch (error) {
    console.error('❌ Error activating users:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the activation function
if (require.main === module) {
  activateUsers();
}

export default activateUsers;