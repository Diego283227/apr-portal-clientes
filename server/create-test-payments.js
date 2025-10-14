const mongoose = require('mongoose');
require('dotenv').config();

async function createTestPayments() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/portal-web');

    const db = mongoose.connection.db;

    // Create test payment records
    const testPaymentId = 'PAY-TEST123456789';
    const userId = '68b8f47d1362234bec2e8991';
    const boletas = ['68c4f25aa49b077545d8ae07', '68c4debd76f3204d740a96d9'];

    const testPayments = boletas.map((boletaId, index) => ({
      boletaId: new mongoose.Types.ObjectId(boletaId),
      socioId: new mongoose.Types.ObjectId(userId),
      monto: index === 0 ? 93500 : 39000,
      fechaPago: new Date(),
      metodoPago: 'paypal',
      estadoPago: 'pendiente',
      transactionId: `test-transaction-${index}`,
      metadata: {
        paypalPaymentId: testPaymentId,
        externalReference: 'test-ref-123',
        boletaNumero: `20250900${index + 1}`,
        userId: userId
      }
    }));

    await db.collection('pagos').insertMany(testPayments);
    console.log('✅ Test payment records created successfully');
    console.log('Test PayPal Payment ID:', testPaymentId);
    console.log('User ID:', userId);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

createTestPayments();