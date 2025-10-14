/**
 * Script to synchronize user debt based only on overdue boletas
 * This script should be run when implementing the new debt calculation logic
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { syncUserDebt, getDebtStatistics, validateDebtConsistency } from '../utils/debtSync';

// Load environment variables
dotenv.config();

async function runDebtSync() {
  try {
    console.log('🚀 Starting debt synchronization script...');

    // Connect to MongoDB
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI environment variable is required');
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Get statistics before sync
    console.log('\n📊 Statistics BEFORE synchronization:');
    const statsBefore = await getDebtStatistics();
    console.log('Users:', statsBefore.users);
    console.log('Overdue Boletas:', statsBefore.overdueBoletas);

    // Validate current consistency
    console.log('\n🔍 Checking current debt consistency:');
    const inconsistenciesBefore = await validateDebtConsistency();
    console.log(`Found ${inconsistenciesBefore.length} inconsistencies`);

    if (inconsistenciesBefore.length > 0) {
      console.log('Sample inconsistencies:', inconsistenciesBefore.slice(0, 5));
    }

    // Run synchronization
    console.log('\n🔄 Running debt synchronization...');
    const syncResult = await syncUserDebt();

    // Get statistics after sync
    console.log('\n📊 Statistics AFTER synchronization:');
    const statsAfter = await getDebtStatistics();
    console.log('Users:', statsAfter.users);
    console.log('Overdue Boletas:', statsAfter.overdueBoletas);

    // Validate consistency after sync
    console.log('\n🔍 Checking debt consistency after sync:');
    const inconsistenciesAfter = await validateDebtConsistency();
    console.log(`Found ${inconsistenciesAfter.length} inconsistencies after sync`);

    // Final summary
    console.log('\n📋 SYNCHRONIZATION SUMMARY:');
    console.log('================================');
    console.log(`Users processed: ${syncResult.usersProcessed}`);
    console.log(`Users with changes: ${syncResult.usersWithChanges}`);
    console.log(`Total debt before: $${syncResult.totalDebtBefore.toLocaleString('es-CL')}`);
    console.log(`Total debt after: $${syncResult.totalDebtAfter.toLocaleString('es-CL')}`);
    console.log(`Net change: $${(syncResult.totalDebtAfter - syncResult.totalDebtBefore).toLocaleString('es-CL')}`);
    console.log(`Errors: ${syncResult.errors.length}`);

    if (syncResult.errors.length > 0) {
      console.log('\n❌ Errors encountered:');
      syncResult.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`);
      });
    }

    console.log('\n✅ Debt synchronization script completed successfully!');

  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  } finally {
    // Close MongoDB connection
    await mongoose.connection.close();
    console.log('📤 MongoDB connection closed');
  }
}

// Run the script
if (require.main === module) {
  runDebtSync();
}

export default runDebtSync;