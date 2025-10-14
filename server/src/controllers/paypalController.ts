import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { asyncHandler } from '../middleware/errorHandler';
import paypalService from '../services/paypalService';
import { Boleta, Pago, User, Ingreso } from '../models';
import { v4 as uuidv4 } from 'uuid';
import mongoose from 'mongoose';
import { syncBoletasByPayPalPaymentId } from '../utils/boletaSync';

/**
 * @swagger
 * components:
 *   schemas:
 *     PayPalOrderRequest:
 *       type: object
 *       required:
 *         - boletaIds
 *       properties:
 *         boletaIds:
 *           type: array
 *           items:
 *             type: string
 *           description: Array of boleta IDs to pay
 *     PayPalOrderResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         data:
 *           type: object
 *           properties:
 *             orderId:
 *               type: string
 *             approvalUrl:
 *               type: string
 *             totalAmount:
 *               type: number
 *             externalReference:
 *               type: string
 *             pagos:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Pago'
 *             boletas:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Boleta'
 *         message:
 *           type: string
 *     PayPalCaptureResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         data:
 *           type: object
 *           properties:
 *             captureId:
 *               type: string
 *             status:
 *               type: string
 *             amount:
 *               type: number
 *             currency:
 *               type: string
 *         message:
 *           type: string
 */

/**
 * @swagger
 * /api/paypal/create-payment:
 *   post:
 *     summary: Create PayPal payment order
 *     tags: [PayPal]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PayPalOrderRequest'
 *     responses:
 *       200:
 *         description: PayPal order created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PayPalOrderResponse'
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
export const createPayPalPayment = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    console.log('\n🟢 === PAYPAL CREATE ENDPOINT CALLED ===');
    console.log('Time:', new Date().toISOString());
    console.log('User:', req.user ? { id: req.user.id, email: req.user.email } : 'NOT AUTHENTICATED');
    console.log('Body:', JSON.stringify(req.body, null, 2));
    console.log('='.repeat(50));

    const { boletaIds } = req.body;

    if (!boletaIds || !Array.isArray(boletaIds) || boletaIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Debe seleccionar al menos una boleta para pagar'
      });
    }

    // Validate and convert boletaIds to ObjectIds
    const validObjectIds: mongoose.Types.ObjectId[] = [];
    for (const id of boletaIds) {
      if (mongoose.Types.ObjectId.isValid(id)) {
        validObjectIds.push(new mongoose.Types.ObjectId(id));
      } else {
        return res.status(400).json({
          success: false,
          message: `ID de boleta inválido: ${id}`
        });
      }
    }

    // Validate boletas exist and belong to the user
    const boletas = await Boleta.find({
      _id: { $in: validObjectIds },
      socioId: new mongoose.Types.ObjectId(req.user?.id),
      estado: { $in: ['pendiente', 'vencida'] }
    });

    if (boletas.length !== validObjectIds.length) {
      return res.status(400).json({
        success: false,
        message: 'Algunas boletas no existen o ya han sido pagadas'
      });
    }

    // Get user information
    const user = await User.findById(req.user?.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Calculate total amount (use fixed small amount for testing)
    const totalAmountCLP = boletas.reduce((sum, boleta) => sum + boleta.montoTotal, 0);
    const totalAmount = 10.00; // Fixed small amount for PayPal testing

    // Create external reference
    const transactionId = uuidv4();
    const externalReference = `${req.user!.id}-${transactionId}-${Date.now()}`;

    // Create payment records
    const pagos = await Pago.insertMany(
      boletas.map(boleta => ({
        boletaId: boleta._id,
        socioId: boleta.socioId,
        monto: boleta.montoTotal, // Keep original CLP amount for database
        fechaPago: new Date(),
        metodoPago: 'paypal',
        estadoPago: 'pendiente',
        transactionId: `${transactionId}-${boleta._id}`,
        metadata: {
          externalReference,
          paypalOrderId: null, // Will be updated after PayPal order creation
          boletaNumero: boleta.numeroBoleta,
          userId: req.user!.id,
          originalAmountCLP: boleta.montoTotal, // Store original amount
          paypalAmountUSD: Math.round(boleta.montoTotal / 1000) // Store converted amount
        }
      }))
    );

    try {
      // Create PayPal payment
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5174';

      const paypalPayment = await paypalService.createPayment({
        amount: totalAmount,
        currency: 'USD', // PayPal typically uses USD
        description: `Pago de ${boletas.length} boleta(s) - Portal APR`,
        invoiceNumber: externalReference,
        returnUrl: `${frontendUrl}/payment-success?provider=paypal&paymentId={paymentId}&PayerID={PayerID}`,
        cancelUrl: `${frontendUrl}/payment-failure?provider=paypal`,
        metadata: {
          userId: req.user!.id,
          transactionId,
          boletaIds: boletaIds,
          totalAmount
        }
      });

      // Update payment records with PayPal payment ID - use individual saves to trigger middlewares
      const paymentsToUpdate = await Pago.find({ transactionId: { $regex: `^${transactionId}` } });
      for (const payment of paymentsToUpdate) {
        payment.metadata = {
          ...payment.metadata,
          paypalPaymentId: paypalPayment.id,
          paypalApprovalUrl: paypalPayment.approvalUrl
        };
        await payment.save();
      }

      res.json({
        success: true,
        data: {
          paymentId: paypalPayment.id,
          approvalUrl: paypalPayment.approvalUrl,
          totalAmount,
          externalReference,
          pagos,
          boletas: boletas.map(b => ({
            id: b._id,
            numeroBoleta: b.numeroBoleta,
            periodo: b.periodo,
            montoTotal: b.montoTotal
          }))
        },
        message: 'Pago de PayPal creado exitosamente'
      });

    } catch (error: any) {
      // Cleanup payment records if PayPal order creation fails
      await Pago.deleteMany({
        transactionId: { $regex: `^${transactionId}` }
      });

      console.error('Error creating PayPal order:', error);
      res.status(500).json({
        success: false,
        message: 'Error al crear la orden de PayPal'
      });
    }
  }
);

/**
 * @swagger
 * /api/paypal/execute-payment:
 *   post:
 *     summary: Capture PayPal payment order
 *     tags: [PayPal]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *         description: PayPal order ID
 *     responses:
 *       200:
 *         description: PayPal order captured successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PayPalCaptureResponse'
 *       400:
 *         description: Bad request
 *       404:
 *         description: Order not found
 *       500:
 *         description: Internal server error
 */
export const executePayPalPayment = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    console.log('\n🚨 === PAYPAL EXECUTE ENDPOINT CALLED ===');
    console.log('Time:', new Date().toISOString());
    console.log('Method:', req.method);
    console.log('URL:', req.url);
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
    console.log('Body:', JSON.stringify(req.body, null, 2));
    console.log('User:', req.user ? { id: req.user.id, email: req.user.email } : 'NOT AUTHENTICATED');
    console.log('='.repeat(50));
    const { paymentId, PayerID } = req.body;

    console.log('🔥 EXECUTING PAYPAL PAYMENT:', {
      paymentId,
      PayerID,
      userId: req.user?.id,
      fullBody: req.body,
      headers: {
        authorization: req.headers.authorization ? 'Bearer [present]' : 'missing',
        contentType: req.headers['content-type']
      }
    });

    if (!paymentId || !PayerID) {
      console.log('❌ Missing required parameters:', { paymentId, PayerID });
      return res.status(400).json({
        success: false,
        message: 'Payment ID y Payer ID son requeridos'
      });
    }

    try {
      // Execute the payment
      console.log('💰 Executing PayPal payment...');
      const executeResult = await paypalService.executePayment(paymentId, PayerID);
      console.log('✅ PayPal execution result:', executeResult.state);

      // Find associated payment records
      console.log('🔍 Searching for payment records with:', {
        'metadata.paypalPaymentId': paymentId,
        socioId: req.user?.id
      });

      // First search without user filter to see if any records exist
      const allPaymentsWithId = await Pago.find({
        'metadata.paypalPaymentId': paymentId
      });
      console.log(`🔍 Found ${allPaymentsWithId.length} total payments with paymentId (any user)`);

      const pagos = await Pago.find({
        'metadata.paypalPaymentId': paymentId,
        socioId: new mongoose.Types.ObjectId(req.user?.id)
      }).populate('boletaId');

      console.log(`📋 Found ${pagos.length} payment records for this user`);

      // If no payments found for this user, let's debug further
      if (pagos.length === 0 && allPaymentsWithId.length > 0) {
        console.log('🚨 DEBUG: Found payments with paymentId but not for this user:');
        allPaymentsWithId.forEach(p => {
          console.log(`  Payment ${p._id}: socioId=${p.socioId}, user=${req.user?.id}`);
        });
      }

      if (pagos.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No se encontraron pagos asociados a este payment ID'
        });
      }

      // Update payment status based on execute result
      const newStatus = paypalService.mapPayPalStateToPagoStatus(executeResult.state);
      console.log(`📊 Mapped PayPal state '${executeResult.state}' to status '${newStatus}'`);

      // SOLUCIÓN: Usar .save() individual en lugar de updateMany() para activar middlewares
      const paymentsToUpdate = await Pago.find({
        'metadata.paypalPaymentId': paymentId,
        socioId: new mongoose.Types.ObjectId(req.user?.id)
      });

      console.log(`🔄 Updating ${paymentsToUpdate.length} payments individually to trigger middlewares...`);

      for (const payment of paymentsToUpdate) {
        payment.estadoPago = newStatus as any;
        payment.metadata = {
          ...payment.metadata,
          paypalExecuteResult: executeResult,
          paypalState: executeResult.state
        };
        payment.fechaPago = new Date();

        // Usar .save() individual para activar el middleware post('save')
        await payment.save();
        console.log(`✅ Payment ${payment._id} saved - middleware will auto-sync boleta`);
      }

      console.log(`💾 Updated ${paymentsToUpdate.length} payment records using .save()`);

      // Si el pago fue completado, registrar ingreso para el admin
      if (newStatus === 'completado') {
        console.log('💰 Creating income record for admin...');
        try {
          // Get the updated payments for income record
          const updatedPagos = await Pago.find({
            'metadata.paypalPaymentId': paymentId,
            socioId: new mongoose.Types.ObjectId(req.user?.id),
            estadoPago: 'completado'
          });

          const totalPaid = updatedPagos.reduce((sum: number, pago: any) => sum + pago.monto, 0);
          const boletaIds = updatedPagos.map((pago: any) => pago.boletaId);

          const ingresoData = {
            monto: totalPaid,
            fecha: new Date(),
            descripcion: `Pago de ${updatedPagos.length} boleta(s) - PayPal`,
            tipo: 'pago_boleta' as const,
            pagoId: updatedPagos[0]._id, // Usar el primer pago como referencia
            socioId: new mongoose.Types.ObjectId(req.user?.id),
            metodoPago: 'paypal' as const,
            boletaIds: boletaIds,
            transactionId: paymentId,
            metadata: {
              paypalPaymentId: paymentId,
              paypalExecuteResult: executeResult,
              numeroBoletas: updatedPagos.map((p: any) => p.metadata?.boletaNumero).filter(Boolean),
              payerID: PayerID
            }
          };

          const ingreso = await Ingreso.create(ingresoData);
          console.log(`💸 Income record created: ${ingreso._id} - Amount: ${totalPaid}`);

          // 🚀 NOTIFICACIÓN EN TIEMPO REAL para administradores
          if (global.socketManager) {
            console.log('📡 Sending real-time income notification to admins...');

            // Notificar a todos los usuarios conectados sobre el nuevo ingreso
            const notificationData = {
              type: 'new_income',
              title: '💰 Nuevo Ingreso Recibido',
              message: `Pago de ${updatedPagos.length} boleta(s) por ${new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(totalPaid)}`,
              data: {
                ingresoId: ingreso._id,
                monto: totalPaid,
                metodoPago: 'paypal',
                cantidadBoletas: updatedPagos.length,
                fecha: new Date().toISOString()
              },
              timestamp: new Date().toISOString()
            };

            // Temporal: usar método existente hasta que actualicemos el tipo
            if ('broadcastToAdmins' in global.socketManager) {
              (global.socketManager as any).broadcastToAdmins('new_income', notificationData);
              (global.socketManager as any).broadcastToAdmins('refresh_dashboard_stats', {
                reason: 'new_payment_received',
                amount: totalPaid
              });
            }

            console.log('✅ Real-time notifications sent to admins');
          } else {
            console.log('⚠️ SocketManager not available for real-time notifications');
          }
        } catch (ingresoError) {
          console.error('❌ Error creating income record:', ingresoError);
          // No fallar el pago si falla el registro de ingreso
        }
      } else {
        console.log(`⚠️ Payment not completed (status: ${newStatus}), skipping boleta updates`);
      }

      const transactionData = executeResult.transactions[0];

      res.json({
        success: true,
        data: {
          paymentId: executeResult.id,
          state: executeResult.state,
          amount: parseFloat(transactionData.amount.total),
          currency: transactionData.amount.currency
        },
        message: newStatus === 'completado'
          ? 'Pago procesado exitosamente'
          : 'Pago ejecutado, procesando...'
      });

    } catch (error: any) {
      console.error('Error executing PayPal payment:', error);
      res.status(500).json({
        success: false,
        message: 'Error al procesar el pago de PayPal'
      });
    }
  }
);

/**
 * @swagger
 * /api/paypal/order-status/{orderId}:
 *   get:
 *     summary: Get PayPal payment status
 *     tags: [PayPal]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *         description: PayPal payment ID
 *     responses:
 *       200:
 *         description: Payment status retrieved successfully
 *       404:
 *         description: Payment not found
 *       500:
 *         description: Internal server error
 */
export const getPayPalOrderStatus = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { orderId } = req.params;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: 'ID de orden de PayPal es requerido'
      });
    }

    try {
      // Get payment from PayPal
      const paypalPayment = await paypalService.getPayment(orderId);

      // Get associated payment records
      const pagos = await Pago.find({
        'metadata.paypalPaymentId': orderId,
        socioId: new mongoose.Types.ObjectId(req.user?.id)
      }).populate('boletaId');

      res.json({
        success: true,
        data: {
          paymentId: paypalPayment.id,
          state: paypalPayment.state,
          stateText: paypalService.getStateText(paypalPayment.state),
          totalAmount: pagos.reduce((sum, pago) => sum + pago.monto, 0),
          pagos: pagos,
          paypalPayment: paypalPayment
        },
        message: 'Estado de pago obtenido exitosamente'
      });

    } catch (error: any) {
      console.error('Error getting PayPal order status:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener el estado de la orden'
      });
    }
  }
);