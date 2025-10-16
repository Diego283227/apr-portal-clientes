import nodemailer from 'nodemailer';

interface EmailConfig {
  host: string;
  port: number;
  auth: {
    user: string;
    pass: string;
  };
}

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer;
    contentType?: string;
  }>;
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    const emailEnabled = process.env.EMAIL_ENABLED === 'true';

    if (!emailEnabled) {
      console.log('📧 Email service disabled');
      return;
    }

    const port = parseInt(process.env.EMAIL_PORT || '2525');

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.warn('⚠️  Email credentials not configured. Set EMAIL_USER and EMAIL_PASS in .env');
      return;
    }

    const isSecure = process.env.EMAIL_SECURE === 'true' || port === 465;

    const config: any = {
      host: process.env.EMAIL_HOST || 'sandbox.smtp.mailtrap.io',
      port: port,
      secure: isSecure, // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    };

    // Solo agregar TLS settings para desarrollo/testing
    if (!isSecure) {
      config.tls = {
        rejectUnauthorized: false
      };
    }

    console.log('📧 Email config:', {
      host: config.host,
      port: config.port,
      secure: config.secure,
      user: config.auth.user ? `${config.auth.user.substring(0, 6)}...` : 'NOT SET',
      pass: config.auth.pass ? '***configured***' : 'NOT SET'
    });

    try {
      this.transporter = nodemailer.createTransport(config);
      const serviceName = config.host.includes('mailtrap') ? 'Mailtrap (Testing)' :
                         config.host.includes('resend') ? 'Resend (Production)' :
                         config.host.includes('sendgrid') ? 'SendGrid (Production)' :
                         config.host.includes('gmail') ? 'Gmail SMTP' :
                         'Custom SMTP';
      console.log(`📧 Email service initialized with ${serviceName}`);
    } catch (error) {
      console.error('❌ Failed to initialize email service:', error);
    }
  }

  async sendPasswordReset(email: string, resetToken: string, userType: 'socio' | 'super_admin') {
    if (!this.transporter) {
      console.warn('📧 Email service not available, password reset email not sent');
      return { success: false, message: 'Email service not configured' };
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetRoute = userType === 'super_admin' ? '#/admin-reset-password' : '#/reset-password';
    const resetUrl = `${frontendUrl}/${resetRoute}?token=${resetToken}`;

    // Debug: Log the generated URL
    console.log('🔗 Generated password reset URL:', resetUrl);
    console.log('🔗 Route:', resetRoute);
    console.log('🔗 Token:', resetToken.substring(0, 10) + '...');
    console.log('🔗 Frontend URL:', frontendUrl);
    console.log('🔗 User Type:', userType);

    const isAdmin = userType === 'super_admin';
    const userTypeText = isAdmin ? 'Administrador' : 'Socio';
    const systemName = 'Portal APR';

    const emailOptions: EmailOptions = {
      to: email,
      subject: `${systemName} - Recuperar Contraseña ${userTypeText}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Recuperar Contraseña</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: ${isAdmin ? '#dc2626' : '#2563eb'}; color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 30px 20px; border-radius: 0 0 8px 8px; }
            .button { 
              display: inline-block; 
              padding: 12px 30px; 
              background: ${isAdmin ? '#dc2626' : '#2563eb'}; 
              color: white; 
              text-decoration: none; 
              border-radius: 6px; 
              font-weight: bold;
              margin: 20px 0;
            }
            .warning { background: #fef3c7; border-l: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
            .footer { text-align: center; color: #6b7280; font-size: 14px; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${isAdmin ? '🛡️' : '💧'} ${systemName}</h1>
              <h2>Recuperar Contraseña ${userTypeText}</h2>
            </div>
            
            <div class="content">
              <p><strong>Hola,</strong></p>
              
              <p>Hemos recibido una solicitud para restablecer la contraseña de tu cuenta ${userTypeText.toLowerCase()} en ${systemName}.</p>
              
              <p>Para crear una nueva contraseña, haz clic en el siguiente enlace:</p>
              
              <div style="text-align: center;">
                <a href="${resetUrl}" class="button">Restablecer Contraseña</a>
              </div>
              
              <div class="warning">
                <p><strong>⚠️ Información importante:</strong></p>
                <ul>
                  <li>Este enlace es válido por <strong>1 hora</strong></li>
                  <li>Solo puedes usar este enlace una vez</li>
                  <li>Si no solicitaste este cambio, puedes ignorar este email</li>
                </ul>
              </div>
              
              <p><strong>¿No funciona el botón?</strong><br>
              Copia y pega este enlace en tu navegador:</p>
              <p style="word-break: break-all; background: #e5e7eb; padding: 10px; border-radius: 4px; font-family: monospace; font-size: 12px;">
                ${resetUrl}
              </p>
              
              <p>Si tienes problemas o no solicitaste este cambio, contacta al administrador del sistema.</p>
              
              <p>Saludos,<br>
              <strong>Equipo ${systemName}</strong></p>
            </div>
            
            <div class="footer">
              <p>Este es un mensaje automático, por favor no responder a este email.</p>
              <p>© 2025 ${systemName}. Todos los derechos reservados.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
${systemName} - Recuperar Contraseña ${userTypeText}

Hola,

Hemos recibido una solicitud para restablecer la contraseña de tu cuenta ${userTypeText.toLowerCase()} en ${systemName}.

Para crear una nueva contraseña, visita el siguiente enlace:
${resetUrl}

IMPORTANTE:
- Este enlace es válido por 1 hora
- Solo puedes usar este enlace una vez
- Si no solicitaste este cambio, puedes ignorar este email

Si tienes problemas, contacta al administrador del sistema.

Saludos,
Equipo ${systemName}

---
Este es un mensaje automático, por favor no responder a este email.
© 2025 ${systemName}. Todos los derechos reservados.
      `
    };

    try {
      console.log('📤 Attempting to send email to:', email);
      console.log('📤 Using transporter:', this.transporter ? 'Available' : 'NOT AVAILABLE');

      const mailOptions = {
        from: process.env.EMAIL_FROM || 'noreply@apr-portal.com',
        ...emailOptions
      };

      console.log('📤 Mail options:', {
        from: mailOptions.from,
        to: mailOptions.to,
        subject: mailOptions.subject
      });

      const info = await this.transporter.sendMail(mailOptions);

      console.log('✅ Password reset email sent successfully!');
      console.log('📧 Email details:', {
        to: email,
        userType,
        messageId: info.messageId,
        response: info.response
      });

      return { success: true, messageId: info.messageId };
    } catch (error: any) {
      console.error('❌ Failed to send password reset email');
      console.error('❌ Error details:', {
        message: error.message,
        code: error.code,
        command: error.command,
        stack: error.stack
      });
      return { success: false, error: error.message };
    }
  }

  async testConnection(): Promise<boolean> {
    if (!this.transporter) {
      return false;
    }

    try {
      await this.transporter.verify();
      console.log('✅ Email service connection verified');
      return true;
    } catch (error) {
      console.error('❌ Email service connection failed:', error);
      return false;
    }
  }

  /**
   * Envía un comprobante de pago por email
   */
  async sendPaymentReceipt(
    email: string,
    pdfBuffer: Buffer,
    data: {
      nombre: string;
      numeroComprobante: string;
      monto: number;
      metodoPago: string;
    }
  ) {
    if (!this.transporter) {
      console.warn('📧 Email service not available, payment receipt not sent');
      return { success: false, message: 'Email service not configured' };
    }

    try {
      const emailOptions: EmailOptions = {
        to: email,
        subject: `Comprobante de Pago #${data.numeroComprobante} - Portal APR`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Comprobante de Pago</title>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #059669; color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background: #f9fafb; padding: 30px 20px; border-radius: 0 0 8px 8px; }
              .payment-box { background: white; padding: 20px; border-radius: 8px; border: 2px solid #059669; margin: 20px 0; }
              .amount { font-size: 32px; color: #059669; font-weight: bold; text-align: center; }
              .info-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
              .footer { text-align: center; color: #6b7280; font-size: 14px; margin-top: 30px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>✅ Pago Recibido</h1>
                <p>Portal APR - Agua Potable Rural</p>
              </div>

              <div class="content">
                <p><strong>Hola ${data.nombre},</strong></p>

                <p>Hemos recibido tu pago exitosamente. Adjunto encontrarás tu comprobante de pago en formato PDF.</p>

                <div class="payment-box">
                  <div class="info-row">
                    <span><strong>N° Comprobante:</strong></span>
                    <span>${data.numeroComprobante}</span>
                  </div>
                  <div class="info-row">
                    <span><strong>Método de Pago:</strong></span>
                    <span>${this.formatMetodoPago(data.metodoPago)}</span>
                  </div>
                  <div class="info-row" style="border-bottom: none;">
                    <span><strong>Monto Total:</strong></span>
                    <span></span>
                  </div>
                  <div class="amount">
                    $${data.monto.toLocaleString('es-CL')}
                  </div>
                </div>

                <p>📄 <strong>Tu comprobante de pago está adjunto en este correo</strong> en formato PDF. Puedes descargarlo, imprimirlo o guardarlo para tus registros.</p>

                <p>También puedes acceder a todos tus comprobantes desde tu cuenta en el portal, en la sección "Mis Pagos".</p>

                <p>Gracias por tu pago.</p>

                <div class="footer">
                  <p>Este es un correo automático, por favor no respondas a este mensaje.</p>
                  <p>Si tienes alguna consulta, contáctanos a través de nuestro portal.</p>
                </div>
              </div>
            </div>
          </body>
          </html>
        `,
        text: `
          Portal APR - Comprobante de Pago

          Hola ${data.nombre},

          Hemos recibido tu pago exitosamente.

          N° Comprobante: ${data.numeroComprobante}
          Método de Pago: ${this.formatMetodoPago(data.metodoPago)}
          Monto Total: $${data.monto.toLocaleString('es-CL')}

          Tu comprobante de pago está adjunto en este correo en formato PDF.

          Gracias por tu pago.
        `,
        attachments: [
          {
            filename: `Comprobante_${data.numeroComprobante}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf'
          }
        ]
      };

      console.log('📤 Sending payment receipt email to:', email);

      const mailOptions = {
        from: process.env.EMAIL_FROM || 'noreply@apr-portal.com',
        ...emailOptions
      };

      const info = await this.transporter.sendMail(mailOptions);

      console.log('✅ Payment receipt email sent successfully!', {
        to: email,
        comprobante: data.numeroComprobante,
        messageId: info.messageId
      });

      return { success: true, messageId: info.messageId };
    } catch (error: any) {
      console.error('❌ Failed to send payment receipt email:', error);
      return { success: false, error: error.message };
    }
  }

  private formatMetodoPago(metodo: string): string {
    const metodos: Record<string, string> = {
      'mercadopago': 'Mercado Pago',
      'paypal': 'PayPal',
      'tarjeta_credito': 'Tarjeta de Crédito',
      'tarjeta_debito': 'Tarjeta de Débito',
      'transferencia': 'Transferencia Bancaria'
    };
    return metodos[metodo] || metodo;
  }
}

export const emailService = new EmailService();
export default emailService;