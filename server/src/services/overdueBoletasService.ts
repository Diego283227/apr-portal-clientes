import cron from 'node-cron';
import { Boleta, User, Notification } from '../models';
import { getIO } from '../config/socket';

/**
 * Service to check and notify users about overdue boletas
 * Runs every hour to check for boletas that have passed their due date
 */

export class OverdueBoletasService {
  private static cronJob: cron.ScheduledTask | null = null;

  /**
   * Start the cron job to check overdue boletas every hour
   */
  static start() {
    // Run every hour at minute 0
    this.cronJob = cron.schedule('0 * * * *', async () => {
      console.log('🕐 Running overdue boletas check...');
      await this.checkAndNotifyOverdueBoletas();
    });

    console.log('✅ Overdue boletas service started - Running every hour');

    // Run immediately on startup
    this.checkAndNotifyOverdueBoletas();
  }

  /**
   * Stop the cron job
   */
  static stop() {
    if (this.cronJob) {
      this.cronJob.stop();
      console.log('🛑 Overdue boletas service stopped');
    }
  }

  /**
   * Check for overdue boletas and notify users
   */
  static async checkAndNotifyOverdueBoletas() {
    try {
      const now = new Date();

      // Find all pendiente boletas that are now overdue
      const overdueBoletas = await Boleta.find({
        estado: 'pendiente',
        fechaVencimiento: { $lt: now },
        pagada: false
      }).populate('socioId', 'nombres apellidos email');

      if (overdueBoletas.length === 0) {
        console.log('✅ No overdue boletas found');
        return;
      }

      console.log(`🔴 Found ${overdueBoletas.length} overdue boletas. Updating and notifying...`);

      const io = getIO();
      let updatedCount = 0;
      let notifiedCount = 0;

      for (const boleta of overdueBoletas) {
        try {
          // Update boleta estado to 'vencida'
          boleta.estado = 'vencida';
          await boleta.save();
          updatedCount++;

          // Get user info
          const user = boleta.socioId as any;
          if (!user) {
            console.warn(`⚠️ User not found for boleta ${boleta.numeroBoleta}`);
            continue;
          }

          // Create in-app notification
          const notification = await Notification.create({
            userId: user._id,
            tipo: 'boleta_vencida',
            titulo: 'Boleta vencida',
            mensaje: `Su boleta #${boleta.numeroBoleta} del período ${boleta.periodo} ha vencido. Monto: $${boleta.montoTotal}`,
            metadata: {
              boletaId: boleta._id,
              numeroBoleta: boleta.numeroBoleta,
              periodo: boleta.periodo,
              monto: boleta.montoTotal,
              fechaVencimiento: boleta.fechaVencimiento
            }
          });

          // Emit real-time notification via Socket.IO
          io.to(`user_${user._id}`).emit('nueva-notificacion', {
            notificacion: notification,
            timestamp: new Date()
          });

          notifiedCount++;

          console.log(`✅ Boleta ${boleta.numeroBoleta} marked as vencida and user ${user.nombres} ${user.apellidos} notified`);

        } catch (error) {
          console.error(`❌ Error processing boleta ${boleta.numeroBoleta}:`, error);
        }
      }

      console.log(`✅ Overdue check complete: ${updatedCount} boletas updated, ${notifiedCount} users notified`);

    } catch (error) {
      console.error('❌ Error in overdue boletas check:', error);
    }
  }

  /**
   * Manual trigger for testing
   */
  static async manualCheck() {
    console.log('🔍 Manual overdue boletas check triggered');
    await this.checkAndNotifyOverdueBoletas();
  }
}
