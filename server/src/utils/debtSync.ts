import mongoose from 'mongoose';
import User from '../models/User';
import Boleta from '../models/Boleta';

/**
 * Synchronizes user debt based only on overdue boletas (estado: 'vencida')
 * This utility recalculates and fixes the deudaTotal field for all users
 */

interface DebtSyncResult {
  usersProcessed: number;
  totalDebtBefore: number;
  totalDebtAfter: number;
  usersWithChanges: number;
  errors: string[];
}

export async function syncUserDebt(): Promise<DebtSyncResult> {
  const result: DebtSyncResult = {
    usersProcessed: 0,
    totalDebtBefore: 0,
    totalDebtAfter: 0,
    usersWithChanges: 0,
    errors: []
  };

  try {
    console.log('🔄 Starting debt synchronization...');

    // Get all users with their current debt
    const users = await User.find({ role: 'socio' }, '_id deudaTotal').lean();
    console.log(`👥 Found ${users.length} socios to process`);

    for (const user of users) {
      try {
        const currentDebt = user.deudaTotal || 0;
        result.totalDebtBefore += currentDebt;

        // Calculate actual debt from overdue boletas only
        const overdueBoletasAgg = await Boleta.aggregate([
          {
            $match: {
              socioId: user._id,
              estado: 'vencida' // Only consider overdue boletas
            }
          },
          {
            $group: {
              _id: null,
              totalDebt: { $sum: '$montoTotal' },
              count: { $sum: 1 }
            }
          }
        ]);

        const actualDebt = overdueBoletasAgg.length > 0 ? overdueBoletasAgg[0].totalDebt : 0;
        const overdueCount = overdueBoletasAgg.length > 0 ? overdueBoletasAgg[0].count : 0;

        result.totalDebtAfter += actualDebt;

        // Update user debt if it's different
        if (currentDebt !== actualDebt) {
          await User.findByIdAndUpdate(
            user._id,
            { deudaTotal: actualDebt },
            { new: true }
          );

          result.usersWithChanges++;

          console.log(`✅ Updated user ${user._id}:`, {
            before: currentDebt,
            after: actualDebt,
            difference: actualDebt - currentDebt,
            overdueBoletasCount: overdueCount
          });
        }

        result.usersProcessed++;

      } catch (userError) {
        const errorMsg = `Error processing user ${user._id}: ${userError}`;
        console.error('❌', errorMsg);
        result.errors.push(errorMsg);
      }
    }

    console.log('✅ Debt synchronization completed:', {
      usersProcessed: result.usersProcessed,
      usersWithChanges: result.usersWithChanges,
      totalDebtBefore: result.totalDebtBefore,
      totalDebtAfter: result.totalDebtAfter,
      difference: result.totalDebtAfter - result.totalDebtBefore,
      errors: result.errors.length
    });

    return result;

  } catch (error) {
    console.error('❌ Fatal error in debt synchronization:', error);
    result.errors.push(`Fatal error: ${error}`);
    throw error;
  }
}

/**
 * Get current debt statistics across all users
 */
export async function getDebtStatistics() {
  try {
    const stats = await User.aggregate([
      {
        $match: { role: 'socio' }
      },
      {
        $group: {
          _id: null,
          totalUsers: { $sum: 1 },
          usersWithDebt: {
            $sum: {
              $cond: [{ $gt: ['$deudaTotal', 0] }, 1, 0]
            }
          },
          totalDebt: { $sum: { $ifNull: ['$deudaTotal', 0] } },
          averageDebt: { $avg: { $ifNull: ['$deudaTotal', 0] } },
          maxDebt: { $max: { $ifNull: ['$deudaTotal', 0] } }
        }
      }
    ]);

    // Get overdue boletas statistics
    const overdueStats = await Boleta.aggregate([
      {
        $match: { estado: 'vencida' }
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          totalAmount: { $sum: '$montoTotal' },
          averageAmount: { $avg: '$montoTotal' }
        }
      }
    ]);

    return {
      users: stats[0] || {
        totalUsers: 0,
        usersWithDebt: 0,
        totalDebt: 0,
        averageDebt: 0,
        maxDebt: 0
      },
      overdueBoletas: overdueStats[0] || {
        count: 0,
        totalAmount: 0,
        averageAmount: 0
      }
    };

  } catch (error) {
    console.error('❌ Error getting debt statistics:', error);
    throw error;
  }
}

/**
 * Validate debt consistency between users and boletas
 */
export async function validateDebtConsistency() {
  try {
    console.log('🔍 Validating debt consistency...');

    const inconsistencies: Array<{
      userId: string;
      userDebt: number;
      actualDebt: number;
      difference: number;
    }> = [];

    // Get all users with debt
    const users = await User.find(
      { role: 'socio', deudaTotal: { $gt: 0 } },
      '_id deudaTotal'
    ).lean();

    for (const user of users) {
      // Calculate actual debt from overdue boletas
      const overdueTotal = await Boleta.aggregate([
        {
          $match: {
            socioId: user._id,
            estado: 'vencida'
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$montoTotal' }
          }
        }
      ]);

      const actualDebt = overdueTotal.length > 0 ? overdueTotal[0].total : 0;
      const userDebt = user.deudaTotal || 0;

      if (Math.abs(userDebt - actualDebt) > 0.01) { // Allow for small floating point differences
        inconsistencies.push({
          userId: user._id.toString(),
          userDebt,
          actualDebt,
          difference: userDebt - actualDebt
        });
      }
    }

    console.log(`🔍 Validation complete. Found ${inconsistencies.length} inconsistencies`);
    return inconsistencies;

  } catch (error) {
    console.error('❌ Error validating debt consistency:', error);
    throw error;
  }
}

export default {
  syncUserDebt,
  getDebtStatistics,
  validateDebtConsistency
};