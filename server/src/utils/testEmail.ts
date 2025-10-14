import emailService from '../services/emailService';

export const testEmailConfiguration = async () => {
  console.log('🧪 Testing email configuration...');
  
  // Test connection
  const isConnected = await emailService.testConnection();
  
  if (!isConnected) {
    console.log('❌ Email service not properly configured');
    console.log('📝 Make sure to set these environment variables:');
    console.log('   - EMAIL_USER: your Mailtrap username');
    console.log('   - EMAIL_PASS: your Mailtrap password');
    console.log('   - EMAIL_ENABLED=true');
    return false;
  }
  
  console.log('✅ Email service connection successful!');
  console.log('📧 Email service ready to send emails');

  // Test sending disabled - only test when explicitly requested via API
  // Uncomment the code below if you want to test email sending on server start
  /*
  try {
    console.log('🧪 Sending test email...');
    const testResult = await emailService.sendPasswordReset(
      'test@example.com',
      'test-token-123',
      'socio'
    );

    if (testResult.success) {
      console.log('✅ Test email sent successfully!');
      console.log('📧 Check your Mailtrap inbox for the test email');
      console.log('📬 Message ID:', testResult.messageId);
    } else {
      console.log('❌ Failed to send test email:', testResult.error);
    }
  } catch (error) {
    console.log('❌ Error sending test email:', error);
  }
  */

  return true;
};

export default testEmailConfiguration;