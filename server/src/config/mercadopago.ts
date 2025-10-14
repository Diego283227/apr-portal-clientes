import { MercadoPagoConfig } from 'mercadopago';

// Validar que el access token esté configurado
if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
  console.warn('⚠️ MERCADOPAGO_ACCESS_TOKEN not configured in .env file');
}

// Initialize MercadoPago client
export const mercadopagoClient = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN || '',
  options: {
    timeout: 30000, // Aumentado a 30 segundos para redes lentas
    idempotencyKey: 'your-idempotency-key' // Optional: para evitar duplicados
  }
});

// Log configuration status
console.log('💳 Mercado Pago Configuration:', {
  configured: !!process.env.MERCADOPAGO_ACCESS_TOKEN,
  publicKey: process.env.MERCADOPAGO_PUBLIC_KEY ? '✅ Set' : '❌ Not set',
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN ? '✅ Set' : '❌ Not set'
});

export default mercadopagoClient;
