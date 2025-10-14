import nodemailer from 'nodemailer';
import * as dotenv from 'dotenv';

dotenv.config();

async function testMailtrapFinal() {
  console.log('🧪 Testing Mailtrap with EXACT configuration from Mailtrap docs...\n');

  // EXACT configuration from Mailtrap
  var transport = nodemailer.createTransport({
    host: "sandbox.smtp.mailtrap.io",
    port: 2525,
    auth: {
      user: "d0513d7446f10a",
      pass: "beaefb3330fb91"
    }
  });

  console.log('📧 Configuration:');
  console.log('  Host: sandbox.smtp.mailtrap.io');
  console.log('  Port: 2525');
  console.log('  User: d0513d7446f10a');
  console.log('  Pass: beaefb3330fb91');
  console.log('');

  try {
    console.log('✅ Verifying connection...');
    await transport.verify();
    console.log('✅ Connection verified!\n');

    console.log('📤 Sending password reset email...');

    const resetUrl = 'http://localhost:5173/#/reset-password?token=abc123def456';

    const info = await transport.sendMail({
      from: 'noreply@apr-portal.com',
      to: 'usuario@example.com', // Email de prueba
      subject: 'Portal APR - Recuperar Contraseña',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Recuperar Contraseña</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #2563eb; color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1>💧 Portal APR</h1>
              <h2>Recuperar Contraseña</h2>
            </div>

            <div style="background: #f9fafb; padding: 30px 20px; border-radius: 0 0 8px 8px;">
              <p><strong>Hola,</strong></p>

              <p>Hemos recibido una solicitud para restablecer la contraseña de tu cuenta en Portal APR.</p>

              <p>Para crear una nueva contraseña, haz clic en el siguiente enlace:</p>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${resetUrl}" style="display: inline-block; padding: 12px 30px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">
                  Restablecer Contraseña
                </a>
              </div>

              <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
                <p><strong>⚠️ Información importante:</strong></p>
                <ul>
                  <li>Este enlace es válido por <strong>10 minutos</strong></li>
                  <li>Solo puedes usar este enlace una vez</li>
                  <li>Si no solicitaste este cambio, puedes ignorar este email</li>
                </ul>
              </div>

              <p><strong>¿No funciona el botón?</strong><br>
              Copia y pega este enlace en tu navegador:</p>
              <p style="word-break: break-all; background: #e5e7eb; padding: 10px; border-radius: 4px; font-family: monospace; font-size: 12px;">
                ${resetUrl}
              </p>

              <p>Saludos,<br>
              <strong>Equipo Portal APR</strong></p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
Portal APR - Recuperar Contraseña

Hola,

Hemos recibido una solicitud para restablecer la contraseña de tu cuenta en Portal APR.

Para crear una nueva contraseña, visita el siguiente enlace:
${resetUrl}

IMPORTANTE:
- Este enlace es válido por 10 minutos
- Solo puedes usar este enlace una vez
- Si no solicitaste este cambio, puedes ignorar este email

Saludos,
Equipo Portal APR
      `
    });

    console.log('✅ Email sent successfully!');
    console.log('📧 Details:');
    console.log('  Message ID:', info.messageId);
    console.log('  Response:', info.response);
    console.log('  Accepted:', info.accepted);
    console.log('  Rejected:', info.rejected);
    console.log('\n✅ SUCCESS! Check your Mailtrap inbox at: https://mailtrap.io/inboxes');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error('❌ Code:', error.code);
    console.error('\nFull error:', error);
  }
}

testMailtrapFinal();
