import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { asyncHandler } from '../middleware/errorHandler';
import { Boleta, Pago, User, Ingreso } from '../models';
import { v4 as uuidv4 } from 'uuid';
import mongoose from 'mongoose';
import { flowClient } from '../config/flow';
import { PDFService } from '../services/pdfService';
import { emailService } from '../services/emailService';

/**
 * @swagger
 * /api/flow/create-payment:
 *   post:
 *     summary: Create Flow payment
 *     tags: [Flow]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - boletaIds
 *             properties:
 *               boletaIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Flow payment created successfully
 */
export const createFlowPayment = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
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

    // Calculate total amount
    const totalAmount = boletas.reduce((sum, boleta) => sum + boleta.montoTotal, 0);

    if (totalAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'El monto total debe ser mayor a cero'
      });
    }

    // Generate unique commerce order
    const commerceOrder = `APR-${Date.now()}-${uuidv4().substring(0, 8)}`;
    const externalReference = `flow_${commerceOrder}`;

    // Frontend URLs
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:7782';

    try {
      // Create Flow payment
      const flowPayment = await flowClient.createPayment({
        commerceOrder,
        subject: `Pago de ${boletas.length} boleta(s) - APR Portal`,
        amount: totalAmount,
        email: user.email,
        urlConfirmation: `${backendUrl}/api/flow/webhook`,
        urlReturn: `${frontendUrl}/#/payment-success`,
        optional: {
          rut: user.rut,
          socioId: user._id.toString(),
          boletaIds: boletaIds.join(',')
        }
      });

      if (!flowPayment.url || !flowPayment.token) {
        throw new Error('Flow payment creation failed - missing URL or token');
      }

      // Create pending payment record
      const newPago = new Pago({
        socioId: new mongoose.Types.ObjectId(req.user?.id),
        boletaId: boletas.map(b => b._id),
        monto: totalAmount,
        metodoPago: 'flow',
        estado: 'pendiente',
        fechaPago: new Date(),
        transactionId: flowPayment.token,
        externalReference,
        metadata: {
          flowToken: flowPayment.token,
          flowUrl: flowPayment.url,
          commerceOrder,
          boletaIds: boletas.map(b => b._id.toString()),
          userEmail: user.email,
          userRut: user.rut
        }
      });

      await newPago.save();

      console.log('✅ Flow payment created:', {
        paymentId: newPago._id,
        token: flowPayment.token,
        amount: totalAmount,
        boletas: boletas.length
      });

      res.status(200).json({
        success: true,
        message: 'Pago Flow creado exitosamente',
        data: {
          paymentUrl: flowPayment.url,
          token: flowPayment.token,
          commerceOrder,
          paymentId: newPago._id,
          amount: totalAmount
        }
      });
    } catch (error) {
      console.error('❌ Error creating Flow payment:', error);
      res.status(500).json({
        success: false,
        message: 'Error al crear el pago con Flow',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * @swagger
 * /api/flow/webhook:
 *   post:
 *     summary: Handle Flow webhook confirmation
 *     tags: [Flow]
 *     responses:
 *       200:
 *         description: Webhook processed successfully
 */
export const handleFlowWebhook = asyncHandler(
  async (req: Request, res: Response) => {
    const { token } = req.body;

    console.log('🔔 Flow webhook received:', req.body);

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Token de Flow no proporcionado'
      });
    }

    try {
      // Get payment status from Flow
      const paymentStatus = await flowClient.getPaymentStatus(token);

      console.log('📊 Flow payment status:', paymentStatus);

      // Find payment in database
      const pago = await Pago.findOne({
        transactionId: token,
        metodoPago: 'flow'
      });

      if (!pago) {
        console.error('❌ Payment not found for token:', token);
        return res.status(404).json({
          success: false,
          message: 'Pago no encontrado'
        });
      }

      // Update payment status based on Flow response
      if (paymentStatus.status === 2) { // 2 = Pago confirmado
        pago.estado = 'completado';
        pago.metadata = {
          ...pago.metadata,
          flowPaymentStatus: paymentStatus,
          flowOrderNumber: paymentStatus.flowOrder,
          confirmedAt: new Date().toISOString()
        };

        await pago.save();

        // Update boletas to "pagada"
        const boletaIds = pago.metadata?.boletaIds || [];
        if (Array.isArray(boletaIds) && boletaIds.length > 0) {
          const validBoletaIds = boletaIds
            .filter((id: any) => mongoose.Types.ObjectId.isValid(id))
            .map((id: any) => new mongoose.Types.ObjectId(id));

          await Boleta.updateMany(
            { _id: { $in: validBoletaIds } },
            { 
              $set: { 
                estado: 'pagada',
                pagoId: pago._id,
                fechaPago: new Date()
              } 
            }
          );

          // Create Ingreso record
          const ingreso = new Ingreso({
            concepto: `Pago Flow - ${boletaIds.length} boleta(s)`,
            monto: pago.monto,
            fecha: new Date(),
            categoria: 'pago_boleta',
            metodoPago: 'flow',
            referencia: pago.transactionId,
            metadata: {
              pagoId: pago._id.toString(),
              boletaIds: boletaIds,
              flowToken: token,
              flowOrder: paymentStatus.flowOrder
            }
          });

          await ingreso.save();

          // Send confirmation email with PDF receipts
          try {
            const boletas = await Boleta.find({ _id: { $in: validBoletaIds } });
            const user = await User.findById(pago.socioId);

            if (user && boletas.length > 0) {
              const pdfBuffers: Buffer[] = [];
              
              for (const boleta of boletas) {
                const pdfBuffer = await PDFService.generateBoletaPDF(boleta, user);
                pdfBuffers.push(pdfBuffer);
              }

              await emailService.sendPaymentConfirmation(
                user.email,
                user.nombre,
                boletas,
                pdfBuffers
              );

              console.log('✅ Payment confirmation email sent to:', user.email);
            }
          } catch (emailError) {
            console.error('❌ Error sending confirmation email:', emailError);
          }

          console.log(`✅ Payment completed - ${boletaIds.length} boletas updated`);
        }
      } else if (paymentStatus.status === 3) { // 3 = Pago rechazado
        pago.estado = 'rechazado';
        pago.metadata = {
          ...pago.metadata,
          flowPaymentStatus: paymentStatus,
          rejectedAt: new Date().toISOString()
        };
        await pago.save();
      } else if (paymentStatus.status === 4) { // 4 = Pago anulado
        pago.estado = 'cancelado';
        pago.metadata = {
          ...pago.metadata,
          flowPaymentStatus: paymentStatus,
          cancelledAt: new Date().toISOString()
        };
        await pago.save();
      }

      res.status(200).json({
        success: true,
        message: 'Webhook procesado exitosamente'
      });
    } catch (error) {
      console.error('❌ Error processing Flow webhook:', error);
      res.status(500).json({
        success: false,
        message: 'Error al procesar webhook de Flow'
      });
    }
  }
);

/**
 * @swagger
 * /api/flow/payment-status/{token}:
 *   get:
 *     summary: Get Flow payment status
 *     tags: [Flow]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Payment status retrieved successfully
 */
export const getFlowPaymentStatus = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Token de Flow no proporcionado'
      });
    }

    try {
      const paymentStatus = await flowClient.getPaymentStatus(token);

      res.status(200).json({
        success: true,
        data: paymentStatus
      });
    } catch (error) {
      console.error('❌ Error getting Flow payment status:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener estado del pago'
      });
    }
  }
);
