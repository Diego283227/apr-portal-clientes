import twilio from 'twilio';

interface SMSOptions {
  to: string;
  message: string;
  from?: string;
}

interface SMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

class SMSService {
  private client: twilio.Twilio | null = null;
  private enabled: boolean = false;
  private fromNumber: string = '';
  private initialized: boolean = false;
  private messagePrefix: string = 'Portal APR - Mensaje del administrador';

  constructor() {
    // Don't initialize immediately, wait for environment variables to be loaded
  }

  private ensureInitialized() {
    if (!this.initialized) {
      this.initialize();
      this.initialized = true;
    }
  }

  private async testConnection() {
    try {
      if (this.client) {
        // Test connection by fetching account info (doesn't send SMS)
        await this.client.api.accounts.list({ limit: 1 });
        console.log('✅ Twilio API connection test successful');
      }
    } catch (error) {
      console.error('❌ Twilio API connection test failed:', error);
      console.error('  - This might be due to:');
      console.error('    1. Network connectivity issues');
      console.error('    2. Firewall blocking api.twilio.com');
      console.error('    3. Invalid credentials');
      console.error('    4. DNS resolution problems');
    }
  }

  private initialize() {
    try {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      this.fromNumber = process.env.TWILIO_PHONE_NUMBER || '';
      const smsEnabled = process.env.SMS_ENABLED;
      
      console.log('🔧 SMS Service Configuration:');
      console.log('  - TWILIO_ACCOUNT_SID:', accountSid ? `${accountSid.substring(0, 6)}***` : 'Not set');
      console.log('  - TWILIO_AUTH_TOKEN:', authToken ? 'Set' : 'Not set');
      console.log('  - TWILIO_PHONE_NUMBER:', this.fromNumber || 'Not set');
      console.log('  - SMS_ENABLED:', smsEnabled);

      this.enabled = smsEnabled === 'true';

      if (!this.enabled) {
        console.log('📱 SMS Service disabled in environment variables (SMS_ENABLED != "true")');
        return;
      }

      if (!accountSid || !authToken || !this.fromNumber) {
        console.error('❌ SMS Service: Missing required Twilio configuration');
        console.error('  - Missing:', [
          !accountSid && 'TWILIO_ACCOUNT_SID',
          !authToken && 'TWILIO_AUTH_TOKEN', 
          !this.fromNumber && 'TWILIO_PHONE_NUMBER'
        ].filter(Boolean).join(', '));
        this.enabled = false;
        return;
      }

      // Validate phone number format
      if (!this.fromNumber.startsWith('+')) {
        console.error('❌ SMS Service: Phone number must include country code (e.g., +56912345678)');
        this.enabled = false;
        return;
      }

      this.client = twilio(accountSid, authToken);
      console.log('✅ SMS Service initialized successfully');
      console.log('  - From number:', `${this.fromNumber.substring(0, 6)}***`);
      
      // Test connectivity to Twilio API  
      setTimeout(() => this.testConnection(), 100);
    } catch (error) {
      console.error('❌ Failed to initialize SMS Service:', error);
      this.enabled = false;
    }
  }

  async sendSMS({ to, message, from }: SMSOptions): Promise<SMSResult> {
    this.ensureInitialized();
    
    if (!this.enabled || !this.client) {
      console.log('📱 SMS Service disabled or not configured');
      return { success: false, error: 'SMS service not available' };
    }

    // Check if we're in development mode and enable SMS simulator for connectivity issues
    const isDevelopment = process.env.NODE_ENV === 'development';
    const useSimulator = isDevelopment && process.env.SMS_SIMULATOR === 'true';

    if (useSimulator) {
      return this.simulateSMS({ to, message, from });
    }

    try {
      // Validate and format phone number
      const formattedPhone = this.formatPhoneNumber(to);
      if (!formattedPhone) {
        return { success: false, error: 'Invalid phone number format' };
      }

      const result = await this.client.messages.create({
        body: message,
        from: from || this.fromNumber,
        to: formattedPhone,
      });

      console.log(`✅ SMS sent successfully to ${formattedPhone}, SID: ${result.sid}`);
      return { success: true, messageId: result.sid };
    } catch (error: any) {
      console.error('❌ Failed to send SMS:', error);
      
      // Handle specific error types and fallback to simulator in development
      let errorMessage = 'Failed to send SMS';
      if (error.code === 'ENOTFOUND') {
        if (isDevelopment) {
          console.log('🔄 Connectivity issue detected, falling back to SMS simulator');
          return this.simulateSMS({ to, message, from });
        }
        errorMessage = 'No se puede conectar con el servicio SMS. Verifique la conexión a internet.';
      } else if (error.code === 'ECONNRESET' || error.code === 'ECONNREFUSED') {
        if (isDevelopment) {
          console.log('🔄 Connection rejected, falling back to SMS simulator');
          return this.simulateSMS({ to, message, from });
        }
        errorMessage = 'Conexión rechazada por el servicio SMS. Intente nuevamente.';
      } else if (error.status === 401) {
        errorMessage = 'Credenciales de SMS inválidas. Contacte al administrador.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      return { 
        success: false, 
        error: errorMessage
      };
    }
  }

  private simulateSMS({ to, message, from }: SMSOptions): SMSResult {
    // Validate phone number format
    const formattedPhone = this.formatPhoneNumber(to);
    if (!formattedPhone) {
      return { success: false, error: 'Invalid phone number format' };
    }

    // Generate fake SID for simulation
    const fakeSID = `SM${Math.random().toString(36).substring(2, 15)}${Date.now().toString(36)}`;
    
    console.log('📱 ===== SMS SIMULATOR (Development Mode) =====');
    console.log(`📱 FROM: ${from || this.fromNumber}`);
    console.log(`📱 TO: ${formattedPhone}`);
    console.log(`📱 MESSAGE: ${message}`);
    console.log(`📱 SID: ${fakeSID}`);
    console.log('📱 =============================================');
    
    return { 
      success: true, 
      messageId: fakeSID 
    };
  }

  private formatPhoneNumber(phone: string): string | null {
    // Remove all non-numeric characters
    const cleaned = phone.replace(/\D/g, '');
    
    // Chilean phone number validation and formatting
    if (cleaned.startsWith('56')) {
      // Already has country code
      return `+${cleaned}`;
    } else if (cleaned.startsWith('9') && cleaned.length === 9) {
      // Mobile number without country code
      return `+56${cleaned}`;
    } else if (cleaned.length === 8) {
      // Landline without country code
      return `+56${cleaned}`;
    }
    
    // Invalid format
    console.error(`❌ Invalid phone number format: ${phone}`);
    return null;
  }

  // Template messages for different notification types
  async sendBoletaNotification(userPhone: string, userName: string, boletaNumber: string, amount: number, dueDate: string): Promise<SMSResult> {
    this.ensureInitialized();
    
    const message = `Hola ${userName}! 📄 Nueva boleta #${boletaNumber} disponible por $${amount.toLocaleString('es-CL')}. Vence: ${dueDate}. Paga en: ${process.env.FRONTEND_URL}/boletas`;
    
    return this.sendSMS({
      to: userPhone,
      message
    });
  }

  async sendPaymentConfirmation(userPhone: string, userName: string, amount: number, transactionId: string): Promise<SMSResult> {
    this.ensureInitialized();
    
    const message = `Hola ${userName}! ✅ Pago confirmado por $${amount.toLocaleString('es-CL')}. ID: ${transactionId}. Gracias por tu pago puntual! 🚰`;
    
    return this.sendSMS({
      to: userPhone,
      message
    });
  }

  async sendPaymentReminder(userPhone: string, userName: string, boletaNumber: string, amount: number, daysOverdue: number): Promise<SMSResult> {
    this.ensureInitialized();
    
    const urgency = daysOverdue > 30 ? '🚨 URGENTE' : '⚠️ RECORDATORIO';
    const message = `${urgency} ${userName}! Boleta #${boletaNumber} por $${amount.toLocaleString('es-CL')} lleva ${daysOverdue} días vencida. Paga en: ${process.env.FRONTEND_URL}/boletas`;
    
    return this.sendSMS({
      to: userPhone,
      message
    });
  }

  async sendWelcomeMessage(userPhone: string, userName: string): Promise<SMSResult> {
    this.ensureInitialized();
    
    const message = `¡Bienvenido ${userName}! 🎉 Tu cuenta en Portal APR está activa. Consulta tus boletas y paga en línea: ${process.env.FRONTEND_URL}`;
    
    return this.sendSMS({
      to: userPhone,
      message
    });
  }

  // Check if SMS service is available
  isEnabled(): boolean {
    this.ensureInitialized();
    return this.enabled;
  }

  // Get service status
  getStatus() {
    this.ensureInitialized();
    return {
      enabled: this.enabled,
      configured: !!this.client,
      fromNumber: this.fromNumber ? `${this.fromNumber.substring(0, 6)}***` : null,
      prefix: this.messagePrefix
    };
  }

  // Update message prefix
  updatePrefix(newPrefix: string) {
    this.messagePrefix = newPrefix;
    console.log(`📱 SMS prefix updated to: "${newPrefix}"`);
  }

  // Get current prefix
  getPrefix(): string {
    return this.messagePrefix;
  }
}

// Export singleton instance
export const smsService = new SMSService();