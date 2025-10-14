import nodemailer from 'nodemailer';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testDirectEmail() {
  console.log('🧪 Testing direct email send to Mailtrap...\n');

  const config = {
    host: process.env.EMAIL_HOST || 'sandbox.smtp.mailtrap.io',
    port: parseInt(process.env.EMAIL_PORT || '2525'),
    secure: false,
    auth: {
      user: process.env.EMAIL_USER || '',
      pass: process.env.EMAIL_PASS || ''
    },
    tls: {
      rejectUnauthorized: false
    }
  };

  console.log('📧 Configuration:');
  console.log('  Host:', config.host);
  console.log('  Port:', config.port);
  console.log('  User:', config.auth.user);
  console.log('  Pass:', config.auth.pass ? '***SET***' : 'NOT SET');
  console.log('  Secure:', config.secure);
  console.log('');

  try {
    console.log('🔌 Creating transporter...');
    const transporter = nodemailer.createTransport(config);

    console.log('✅ Testing connection...');
    await transporter.verify();
    console.log('✅ Connection verified!\n');

    console.log('📤 Sending test email...');
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'noreply@apr-portal.com',
      to: 'test@example.com',
      subject: 'Test Email from Portal APR',
      html: '<h1>Test Email</h1><p>This is a test email from Portal APR to verify Mailtrap integration.</p>',
      text: 'Test Email\n\nThis is a test email from Portal APR to verify Mailtrap integration.'
    });

    console.log('✅ Email sent successfully!');
    console.log('📧 Details:');
    console.log('  Message ID:', info.messageId);
    console.log('  Response:', info.response);
    console.log('  Accepted:', info.accepted);
    console.log('  Rejected:', info.rejected);
    console.log('\n✅ SUCCESS! Check your Mailtrap inbox.');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error('❌ Code:', error.code);
    console.error('❌ Command:', error.command);
    console.error('\nFull error:', error);
  }
}

testDirectEmail();
