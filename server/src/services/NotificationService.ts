import { IMeterAlert } from '../models/MeterAlert';
import { ISmartMeter } from '../models/SmartMeter';
import { getSocketInstance } from '../socket/socketInstance';

const twilioClient = require('twilio')(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

export class NotificationService {

  async sendAlertNotification(alert: IMeterAlert, meter: any): Promise<void> {
    try {
      const socio = meter.socioId;

      if (!socio) {
        console.log('⚠️ No socio data found for notification');
        return;
      }

      await Promise.allSettled([
        this.sendEmailNotification(alert, meter, socio),
        this.sendSMSNotification(alert, meter, socio),
        this.sendSocketNotification(alert, meter, socio)
      ]);

    } catch (error) {
      console.error('❌ Error sending alert notifications:', error);
    }
  }

  private async sendEmailNotification(alert: IMeterAlert, meter: any, socio: any): Promise<void> {
    try {
      if (!socio.email) return;

      const subject = `🚨 Alerta de Medidor - ${alert.title}`;
      const emailBody = this.generateEmailBody(alert, meter, socio);

      await transporter.sendMail({
        from: process.env.SMTP_FROM || 'noreply@apr-portal.com',
        to: socio.email,
        subject,
        html: emailBody
      });

      await alert.updateOne({
        'notificationsSent.email': true
      });

      console.log(`📧 Email notification sent for alert ${alert._id}`);

    } catch (error) {
      console.error('❌ Error sending email notification:', error);
    }
  }

  private async sendSMSNotification(alert: IMeterAlert, meter: any, socio: any): Promise<void> {
    try {
      if (!socio.telefono || !process.env.TWILIO_ACCOUNT_SID) return;

      let message = this.generateSMSMessage(alert, meter, socio);

      if (message.length > 160) {
        message = message.substring(0, 157) + '...';
      }

      await twilioClient.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: `+56${socio.telefono}`
      });

      await alert.updateOne({
        'notificationsSent.sms': true
      });

      console.log(`📱 SMS notification sent for alert ${alert._id}`);

    } catch (error) {
      console.error('❌ Error sending SMS notification:', error);
    }
  }

  private async sendSocketNotification(alert: IMeterAlert, meter: any, socio: any): Promise<void> {
    try {
      const notification = {
        id: alert._id,
        type: 'meter_alert',
        title: alert.title,
        message: alert.description,
        severity: alert.severity,
        alertType: alert.alertType,
        meterId: meter.meterId,
        meterLocation: meter.location?.description,
        timestamp: alert.triggeredAt,
        metadata: alert.metadata
      };

      const io = getSocketInstance();
      if (io) {
        io.to(`user_${socio._id}`).emit('notification', notification);

        io.emit('admin_alert', {
          ...notification,
          socioName: `${socio.nombres} ${socio.apellidos}`,
          socioCode: socio.codigoSocio
        });
      }

      await alert.updateOne({
        'notificationsSent.push': true
      });

      console.log(`🔔 Socket notification sent for alert ${alert._id}`);

    } catch (error) {
      console.error('❌ Error sending socket notification:', error);
    }
  }

  private generateEmailBody(alert: IMeterAlert, meter: any, socio: any): string {
    const severityColor = {
      low: '#4CAF50',
      medium: '#FF9800',
      high: '#F44336',
      critical: '#D32F2F'
    }[alert.severity] || '#757575';

    const severityText = {
      low: 'Baja',
      medium: 'Media',
      high: 'Alta',
      critical: 'Crítica'
    }[alert.severity] || 'Desconocida';

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Alerta de Medidor Inteligente</title>
        </head>
        <body style="font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5;">
          <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">

            <div style="background: ${severityColor}; color: white; padding: 20px; text-align: center;">
              <h1 style="margin: 0; font-size: 24px;">🚨 Alerta de Medidor</h1>
              <p style="margin: 5px 0 0 0; font-size: 16px;">Severidad: ${severityText}</p>
            </div>

            <div style="padding: 30px;">
              <h2 style="color: #333; margin-top: 0;">${alert.title}</h2>
              <p style="color: #666; font-size: 16px; line-height: 1.5;">${alert.description}</p>

              <div style="background: #f8f9fa; border-radius: 6px; padding: 20px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #333;">Detalles del Medidor</h3>
                <p style="margin: 5px 0;"><strong>ID Medidor:</strong> ${meter.meterId}</p>
                <p style="margin: 5px 0;"><strong>Número de Serie:</strong> ${meter.serialNumber}</p>
                <p style="margin: 5px 0;"><strong>Ubicación:</strong> ${meter.location?.description || 'No especificada'}</p>
                <p style="margin: 5px 0;"><strong>Fecha y Hora:</strong> ${alert.triggeredAt.toLocaleString('es-CL')}</p>
              </div>

              <div style="background: #e3f2fd; border-radius: 6px; padding: 20px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #1976d2;">Información del Socio</h3>
                <p style="margin: 5px 0;"><strong>Nombre:</strong> ${socio.nombres} ${socio.apellidos}</p>
                <p style="margin: 5px 0;"><strong>Código de Socio:</strong> ${socio.codigoSocio}</p>
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.FRONTEND_URL}/dashboard"
                   style="background: #2196F3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                  Ver en Portal APR
                </a>
              </div>

              <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px;">
                <p style="color: #999; font-size: 14px; text-align: center; margin: 0;">
                  Este es un mensaje automático del Sistema de Monitoreo de Medidores Inteligentes APR.
                  <br>Para más información, contacte a su administrador del sistema.
                </p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  private generateSMSMessage(alert: IMeterAlert, meter: any, socio: any): string {
    const severityEmoji = {
      low: 'ℹ️',
      medium: '⚠️',
      high: '🚨',
      critical: '🆘'
    }[alert.severity] || '⚠️';

    return `${severityEmoji} ALERTA MEDIDOR APR

${alert.title}
Medidor: ${meter.meterId}
Ubicación: ${meter.location?.description || 'No especificada'}

${alert.description}

Ingrese al portal para más detalles: ${process.env.FRONTEND_URL}/dashboard

Fecha: ${alert.triggeredAt.toLocaleString('es-CL')}`;
  }

  async sendMaintenanceNotification(
    socioId: string,
    meterInfo: any,
    maintenanceDetails: any
  ): Promise<void> {
    try {
      const notification = {
        type: 'maintenance',
        title: 'Mantenimiento de Medidor Programado',
        message: `Se ha programado mantenimiento para su medidor ${meterInfo.meterId}`,
        data: {
          meterId: meterInfo.meterId,
          scheduledDate: maintenanceDetails.scheduledDate,
          maintenanceType: maintenanceDetails.type
        }
      };

      const io = getSocketInstance();
      if (io) {
        io.to(`user_${socioId}`).emit('notification', notification);
      }

      console.log(`🔧 Maintenance notification sent to user ${socioId}`);

    } catch (error) {
      console.error('❌ Error sending maintenance notification:', error);
    }
  }

  async sendConsumptionReport(
    socioId: string,
    meterData: any,
    consumptionData: any
  ): Promise<void> {
    try {
      const notification = {
        type: 'consumption_report',
        title: 'Reporte Mensual de Consumo',
        message: `Su consumo del mes: ${consumptionData.totalConsumption}L`,
        data: {
          meterId: meterData.meterId,
          period: consumptionData.period,
          totalConsumption: consumptionData.totalConsumption,
          averageDaily: consumptionData.averageDaily
        }
      };

      const io = getSocketInstance();
      if (io) {
        io.to(`user_${socioId}`).emit('notification', notification);
      }

      console.log(`📊 Consumption report sent to user ${socioId}`);

    } catch (error) {
      console.error('❌ Error sending consumption report:', error);
    }
  }
}