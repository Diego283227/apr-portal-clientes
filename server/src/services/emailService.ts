import sgMail from '@sendgrid/mail';

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
  private emailEnabled: boolean = false;
  private fromEmail: string = 'noreply@apr-portal.com';

  constructor() {
    this.initialize();
  }

  private initialize() {
    this.emailEnabled = process.env.EMAIL_ENABLED === 'true';

    if (!this.emailEnabled) {
      console.log('📧 Email service disabled');
      return;
    }

    const apiKey = process.env.SENDGRID_API_KEY;

    if (!apiKey) {
      console.warn('⚠️  SendGrid API key not configured. Set SENDGRID_API_KEY in .env');
      return;
    }

    try {
      sgMail.setApiKey(apiKey);
      this.fromEmail = process.env.EMAIL_FROM || 'Portal APR <noreply@apr-portal.com>';
      console.log('📧 Email service initialized with SendGrid (Production)');
      console.log('📧 Using FROM email:', this.fromEmail);
    } catch (error) {
      console.error('❌ Failed to initialize SendGrid:', error);
    }
  }

  async sendPasswordReset(email: string, resetToken: string, userType: 'socio' | 'super_admin') {
    if (!this.emailEnabled) {
      console.warn('📧 Email service not available, password reset email not sent');
      return { success: false, message: 'Email service not configured' };
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetRoute = userType === 'super_admin' ? '#/admin-reset-password' : '#/reset-password';
    const resetUrl = `${frontendUrl}/${resetRoute}?token=${resetToken}`;

    console.log('🔗 Generated password reset URL:', resetUrl);
    console.log('🔗 User Type:', userType);

    const isAdmin = userType === 'super_admin';
    const userTypeText = isAdmin ? 'Administrador' : 'Socio';
    const systemName = 'Portal APR';

    const htmlContent = `
        <!DOCTYPE html>
        <html xmlns="http://www.w3.org/1999/xhtml">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
          <title>Recuperar Contraseña</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: Arial, Helvetica, sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f3f4f6; padding: 40px 0;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">

                  <!-- Header -->
                  <tr>
                    <td style="background: linear-gradient(135deg, ${isAdmin ? '#dc2626' : '#0ea5e9'} 0%, ${isAdmin ? '#991b1b' : '#0284c7'} 100%); padding: 40px 20px; text-align: center;">
                      <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">
                        ${isAdmin ? '🛡️' : '💧'} ${systemName}
                      </h1>
                      <p style="margin: 10px 0 0 0; color: #ffffff; font-size: 18px; font-weight: 500;">
                        Recuperar Contraseña ${userTypeText}
                      </p>
                    </td>
                  </tr>

                  <!-- Content -->
                  <tr>
                    <td style="padding: 40px 30px; background-color: #ffffff;">
                      <p style="margin: 0 0 20px 0; color: #1f2937; font-size: 16px; line-height: 1.6;">
                        <strong>Hola,</strong>
                      </p>

                      <p style="margin: 0 0 20px 0; color: #4b5563; font-size: 15px; line-height: 1.6;">
                        Hemos recibido una solicitud para restablecer la contraseña de tu cuenta <strong>${userTypeText.toLowerCase()}</strong> en ${systemName}.
                      </p>

                      <p style="margin: 0 0 30px 0; color: #4b5563; font-size: 15px; line-height: 1.6;">
                        Para crear una nueva contraseña, haz clic en el siguiente botón:
                      </p>

                      <!-- Button -->
                      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 0 0 30px 0;">
                        <tr>
                          <td align="center" style="padding: 20px 0;">
                            <table cellpadding="0" cellspacing="0" border="0" style="border-radius: 8px;">
                              <tr>
                                <td align="center" style="background-color: ${isAdmin ? '#dc2626' : '#0ea5e9'}; border-radius: 8px; padding: 0;">
                                  <a href="${resetUrl}" target="_blank" style="display: block; padding: 16px 40px; color: #ffffff !important; text-decoration: none; font-size: 16px; font-weight: bold; font-family: Arial, Helvetica, sans-serif; border-radius: 8px; mso-padding-alt: 0; text-align: center;">
                                    <!--[if mso]>
                                    <i style="letter-spacing: 25px; mso-font-width: -100%; mso-text-raise: 30pt;">&nbsp;</i>
                                    <![endif]-->
                                    <span style="mso-text-raise: 15pt;">Restablecer Contraseña</span>
                                    <!--[if mso]>
                                    <i style="letter-spacing: 25px; mso-font-width: -100%;">&nbsp;</i>
                                    <![endif]-->
                                  </a>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>

                      <!-- Warning Section -->
                      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 0 0 25px 0;">
                        <tr>
                          <td style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; border-radius: 8px;">
                            <p style="margin: 0 0 15px 0; color: #92400e; font-size: 15px; font-weight: bold;">
                              ⚠️ Información importante:
                            </p>
                            <table width="100%" cellpadding="0" cellspacing="0" border="0">
                              <tr>
                                <td style="padding: 5px 0;">
                                  <p style="margin: 0; color: #78350f; font-size: 14px; line-height: 1.6;">
                                    • Este enlace es válido por <strong>1 hora</strong>
                                  </p>
                                </td>
                              </tr>
                              <tr>
                                <td style="padding: 5px 0;">
                                  <p style="margin: 0; color: #78350f; font-size: 14px; line-height: 1.6;">
                                    • Solo puedes usar este enlace una vez
                                  </p>
                                </td>
                              </tr>
                              <tr>
                                <td style="padding: 5px 0;">
                                  <p style="margin: 0; color: #78350f; font-size: 14px; line-height: 1.6;">
                                    • Si no solicitaste este cambio, puedes ignorar este email
                                  </p>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>

                      <!-- Alternative Link Section -->
                      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 0 0 25px 0;">
                        <tr>
                          <td>
                            <p style="margin: 0 0 10px 0; color: #1f2937; font-size: 15px; font-weight: bold;">
                              ¿No funciona el botón?
                            </p>
                            <p style="margin: 0 0 10px 0; color: #4b5563; font-size: 14px; line-height: 1.6;">
                              Copia y pega este enlace en tu navegador:
                            </p>
                            <table width="100%" cellpadding="0" cellspacing="0" border="0">
                              <tr>
                                <td style="background-color: #e5e7eb; padding: 12px; border-radius: 4px;">
                                  <p style="margin: 0; word-break: break-all; font-family: 'Courier New', monospace; font-size: 12px; color: #374151; line-height: 1.5;">
                                    ${resetUrl}
                                  </p>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>

                      <!-- Help Text -->
                      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 0 0 30px 0;">
                        <tr>
                          <td>
                            <p style="margin: 0; color: #4b5563; font-size: 14px; line-height: 1.6;">
                              Si tienes problemas o no solicitaste este cambio, contacta al administrador del sistema.
                            </p>
                          </td>
                        </tr>
                      </table>

                      <!-- Signature -->
                      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 0 0 30px 0; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                        <tr>
                          <td>
                            <p style="margin: 0 0 5px 0; color: #4b5563; font-size: 15px; line-height: 1.6;">
                              Saludos,
                            </p>
                            <p style="margin: 0; color: #1f2937; font-size: 15px; font-weight: bold; line-height: 1.6;">
                              Equipo ${systemName}
                            </p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #f9fafb; padding: 30px 20px; text-align: center; border-top: 1px solid #e5e7eb;">
                      <table width="100%" cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <td style="padding: 0 0 10px 0;">
                            <p style="margin: 0; color: #6b7280; font-size: 13px; line-height: 1.5;">
                              Este es un mensaje automático, por favor no responder a este email.
                            </p>
                          </td>
                        </tr>
                        <tr>
                          <td>
                            <p style="margin: 0; color: #9ca3af; font-size: 12px; line-height: 1.5;">
                              © 2025 ${systemName}. Todos los derechos reservados.
                            </p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `;

    try {
      console.log('📤 Sending email via SendGrid to:', email);

      const msg = {
        to: email,
        from: this.fromEmail,
        subject: `${systemName} - Recuperar Contraseña ${userTypeText}`,
        html: htmlContent,
      };

      const response = await sgMail.send(msg);

      console.log('✅ Password reset email sent successfully!');
      console.log('📧 SendGrid response code:', response[0].statusCode);

      return { success: true, messageId: response[0].headers['x-message-id'] };
    } catch (error: any) {
      console.error('❌ Failed to send password reset email:', error);
      if (error.response?.body?.errors) {
        console.error('❌ SendGrid errors:', JSON.stringify(error.response.body.errors, null, 2));
      }
      return { success: false, error: error.message };
    }
  }

  async testConnection(): Promise<boolean> {
    if (!this.emailEnabled) {
      return false;
    }

    try {
      console.log('✅ SendGrid service initialized');
      return true;
    } catch (error) {
      console.error('❌ SendGrid service check failed:', error);
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
    if (!this.emailEnabled) {
      console.warn('📧 Email service not available, payment receipt not sent');
      return { success: false, message: 'Email service not configured' };
    }

    try {
      const htmlContent = `
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
        `;

      console.log('📤 Sending payment receipt email to:', email);

      const msg = {
        to: email,
        from: this.fromEmail,
        subject: `Comprobante de Pago #${data.numeroComprobante} - Portal APR`,
        html: htmlContent,
        attachments: [
          {
            filename: `Comprobante_${data.numeroComprobante}.pdf`,
            content: pdfBuffer.toString('base64'),
            type: 'application/pdf',
            disposition: 'attachment'
          }
        ]
      };

      const response = await sgMail.send(msg);

      console.log('✅ Payment receipt email sent successfully!', {
        to: email,
        comprobante: data.numeroComprobante,
        statusCode: response[0].statusCode
      });

      return { success: true, messageId: response[0].headers['x-message-id'] };
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