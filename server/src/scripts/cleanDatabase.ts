import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { Boleta, Notification } from '../models';

const cleanDatabase = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('✅ Connected to MongoDB');

    // Delete all boletas
    const deletedBoletas = await Boleta.deleteMany({});
    console.log(`🗑️  Deleted ${deletedBoletas.deletedCount} boletas`);

    // Delete all notifications related to boletas
    const deletedNotifications = await Notification.deleteMany({
      'referencia.tipo': 'boleta'
    });
    console.log(`🗑️  Deleted ${deletedNotifications.deletedCount} boleta notifications`);

    console.log('✅ Database cleaned successfully');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error cleaning database:', error);
    process.exit(1);
  }
};

cleanDatabase();