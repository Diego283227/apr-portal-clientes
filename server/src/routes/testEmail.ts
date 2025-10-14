import express from 'express';
import emailService from '../services/emailService';

const router = express.Router();

// Test email endpoint
router.post('/send-test', async (req, res) => {
  try {
    console.log('🧪 Test email endpoint called');
    
    // Test connection first
    const isConnected = await emailService.testConnection();
    if (!isConnected) {
      return res.status(500).json({
        success: false,
        error: 'Email service not connected'
      });
    }
    
    // Send test email
    const result = await emailService.sendPasswordReset(
      'test@example.com',
      'test-token-123',
      'socio'
    );
    
    console.log('📧 Test email result:', result);
    
    res.json({
      success: result.success,
      message: result.success ? 'Test email sent successfully' : 'Failed to send test email',
      messageId: result.messageId,
      error: result.error
    });
    
  } catch (error) {
    console.error('❌ Test email endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get email configuration
router.get('/config', (req, res) => {
  res.json({
    enabled: process.env.EMAIL_ENABLED,
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    user: process.env.EMAIL_USER ? `${process.env.EMAIL_USER.substring(0, 6)}...` : 'NOT SET',
    from: process.env.EMAIL_FROM
  });
});

export default router;