const mongoose = require('mongoose');
require('dotenv').config();

// Define schema directly
const pagoSchema = new mongoose.Schema({
  boletaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Boleta' },
  socioId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  monto: Number,
  fechaPago: { type: Date, default: Date.now },
  metodoPago: String,
  estadoPago: String,
  transactionId: String,
  detallesPago: mongoose.Schema.Types.Mixed,
  metadata: mongoose.Schema.Types.Mixed
}, { timestamps: true });

async function cleanupTestPayments() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('🔗 Connected to MongoDB');

    // Create model
    const Pago = mongoose.model('Pago', pagoSchema);

    // Find all payments to inspect
    const allPayments = await Pago.find({}).limit(10);
    console.log(`🔍 Found ${allPayments.length} total payments in database`);

    // Show sample payments
    allPayments.forEach(payment => {
      console.log(`   - Payment ${payment._id}: ${payment.transactionId} (${payment.metodoPago}) - boletaId: ${payment.boletaId}`);
    });

    // Find payments with test/development transaction IDs
    const testPayments = await Pago.find({
      $or: [
        { transactionId: { $regex: /test/i } },
        { transactionId: { $regex: /sandbox/i } },
        { transactionId: { $regex: /demo/i } },
        { transactionId: { $regex: /fake/i } },
        { 'metadata.paypalOrderId': { $regex: /test/i } },
        { boletaId: null }
      ]
    });

    console.log(`\n🔍 Found ${testPayments.length} problematic payments:`);

    if (testPayments.length > 0) {
      // Show test payments before deletion
      testPayments.forEach(payment => {
        console.log(`   - Payment ${payment._id}: ${payment.transactionId} (${payment.metodoPago}) - boletaId: ${payment.boletaId}`);
      });

      console.log('\n⚠️  Do you want to delete these payments? Waiting 5 seconds...');
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Delete problematic payments
      const result = await Pago.deleteMany({
        $or: [
          { transactionId: { $regex: /test/i } },
          { transactionId: { $regex: /sandbox/i } },
          { transactionId: { $regex: /demo/i } },
          { transactionId: { $regex: /fake/i } },
          { 'metadata.paypalOrderId': { $regex: /test/i } },
          { boletaId: null }
        ]
      });

      console.log(`✅ Deleted ${result.deletedCount} problematic payments`);
    } else {
      console.log('✅ No problematic payments found');
    }

  } catch (error) {
    console.error('❌ Error cleaning up test payments:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

cleanupTestPayments();