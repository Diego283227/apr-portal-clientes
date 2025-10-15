import * as paypal from 'paypal-rest-sdk';

interface CreatePaymentData {
  amount: number;
  currency: string;
  description: string;
  invoiceNumber: string;
  returnUrl: string;
  cancelUrl: string;
  metadata?: Record<string, any>;
}

interface PayPalPaymentResponse {
  id: string;
  state: string;
  approvalUrl?: string;
  links: Array<{
    href: string;
    rel: string;
    method: string;
  }>;
}

interface ExecutePaymentResponse {
  id: string;
  state: string;
  payer: any;
  transactions: Array<{
    amount: {
      total: string;
      currency: string;
    };
    related_resources: Array<{
      sale?: {
        id: string;
        state: string;
        amount: {
          total: string;
          currency: string;
        };
      };
    }>;
  }>;
}

class PayPalService {
  private environment: string;

  private isConfigured: boolean = false;

  constructor() {
    const clientId = process.env.PAYPAL_CLIENT_ID;
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
    this.environment = process.env.PAYPAL_ENVIRONMENT || 'sandbox';

    if (!clientId || !clientSecret) {
      console.warn('⚠️  PayPal not configured - PayPal payments will be disabled');
      this.isConfigured = false;
      return;
    }

    // Configure PayPal SDK
    paypal.configure({
      mode: this.environment, // 'sandbox' or 'live'
      client_id: clientId,
      client_secret: clientSecret
    });

    this.isConfigured = true;
    console.log(`🟦 PayPal initialized in ${this.environment} mode`);
  }

  async createPayment(paymentData: CreatePaymentData): Promise<PayPalPaymentResponse> {
    if (!this.isConfigured) {
      throw new Error('PayPal is not configured. Please set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET.');
    }
    return new Promise((resolve, reject) => {
      const create_payment_json = {
        intent: 'sale',
        payer: {
          payment_method: 'paypal'
        },
        redirect_urls: {
          return_url: 'http://localhost:5174/payment-success?provider=paypal',
          cancel_url: 'http://localhost:5174/payment-failure?provider=paypal'
        },
        transactions: [{
          amount: {
            total: paymentData.amount.toFixed(2),
            currency: paymentData.currency
          },
          description: paymentData.description,
          invoice_number: paymentData.invoiceNumber
        }]
      };

      console.log('📋 Creating PayPal payment:', JSON.stringify(create_payment_json, null, 2));

      paypal.payment.create(create_payment_json, (error, payment) => {
        if (error) {
          console.error('❌ Error creating PayPal payment:', error);
          console.error('❌ PayPal error details:', JSON.stringify(error, null, 2));
          console.error('❌ PayPal response:', (error as any).response);
          console.error('❌ PayPal httpStatusCode:', (error as any).httpStatusCode);
          reject(new Error(`Failed to create PayPal payment: Response Status : ${(error as any).httpStatusCode || 'Unknown'}`));
        } else {
          console.log('✅ PayPal payment created successfully:', payment.id);

          // Find approval URL
          const approvalUrl = payment.links?.find((link: any) => link.rel === 'approval_url')?.href;

          const result: PayPalPaymentResponse = {
            id: payment.id!,
            state: payment.state!,
            links: payment.links || [],
            approvalUrl
          };

          resolve(result);
        }
      });
    });
  }

  async executePayment(paymentId: string, payerId: string): Promise<ExecutePaymentResponse> {
    return new Promise((resolve, reject) => {
      const execute_payment_json = {
        payer_id: payerId
      };

      console.log(`💰 Executing PayPal payment: ${paymentId} with payer: ${payerId}`);

      paypal.payment.execute(paymentId, execute_payment_json, (error, payment) => {
        if (error) {
          console.error('❌ Error executing PayPal payment:', error);
          reject(new Error(`Failed to execute PayPal payment: ${error.message || 'Unknown error'}`));
        } else {
          console.log('✅ PayPal payment executed successfully:', payment.id);
          resolve(payment as ExecutePaymentResponse);
        }
      });
    });
  }

  async getPayment(paymentId: string): Promise<any> {
    return new Promise((resolve, reject) => {
      paypal.payment.get(paymentId, (error, payment) => {
        if (error) {
          console.error('❌ Error getting PayPal payment:', error);
          reject(new Error(`Failed to get PayPal payment: ${error.message || 'Unknown error'}`));
        } else {
          console.log(`📋 Retrieved PayPal payment: ${paymentId}`);
          resolve(payment);
        }
      });
    });
  }

  mapPayPalStateToPagoStatus(paypalState: string): 'pendiente' | 'completado' | 'fallido' | 'reembolsado' {
    switch (paypalState) {
      case 'approved':
      case 'completed':
        return 'completado';
      case 'created':
      case 'pending':
        return 'pendiente';
      case 'failed':
      case 'cancelled':
      case 'denied':
      case 'expired':
        return 'fallido';
      case 'refunded':
      case 'partially_refunded':
        return 'reembolsado';
      default:
        return 'pendiente';
    }
  }

  formatCurrency(amount: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  }

  getStateText(state: string): string {
    const stateMap: Record<string, string> = {
      'created': 'Creado',
      'approved': 'Aprobado',
      'failed': 'Fallido',
      'cancelled': 'Cancelado',
      'expired': 'Expirado',
      'pending': 'Pendiente',
      'completed': 'Completado',
      'refunded': 'Reembolsado'
    };
    return stateMap[state] || state;
  }
}

// Export singleton instance
export default new PayPalService();