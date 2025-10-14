import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { asyncHandler } from '../middleware/errorHandler';
import { Boleta, Pago, User, Ingreso } from '../models';
import { v4 as uuidv4 } from 'uuid';
import mongoose from 'mongoose';
import { syncBoletasByExternalReference } from '../utils/boletaSync';
import { Preference, Payment } from 'mercadopago';
import { mercadopagoClient } from '../config/mercadopago';
import { PDFService } from '../services/pdfService';
import { emailService } from '../services/emailService';

/**
 * @swagger
 * components:
 *   schemas:
 *     MercadoPagoPaymentRequest:
 *       type: object
 *       required:
 *         - boletaIds
 *       properties:
 *         boletaIds:
 *           type: array
 *           items:
 *             type: string
 *           description: Array of boleta IDs to pay
 */

/**
 * @swagger
 * /api/mercadopago/create-preference:
 *   post:
 *     summary: Create MercadoPago payment preference
 *     tags: [MercadoPago]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MercadoPagoPaymentRequest'
 *     responses:
 *       200:
 *         description: MercadoPago preference created successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
export const createMercadoPagoPreference = asyncHandler(
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

    // Filter out boletas with zero amount (MercadoPago doesn't accept items with price 0)
    const validBoletas = boletas.filter(boleta => boleta.montoTotal > 0);

    if (validBoletas.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No hay boletas válidas para pagar (todas tienen monto 0)'
      });
    }

    // Calculate total amount
    const totalAmount = validBoletas.reduce((sum, boleta) => sum + boleta.montoTotal, 0);

    // En ambiente de prueba, limitar montos muy altos (pueden causar problemas)
    const isTestEnvironment = process.env.MERCADOPAGO_ACCESS_TOKEN?.includes('APP_USR');
    if (isTestEnvironment && totalAmount > 1000000) { // Máximo 1 millón CLP en pruebas
      return res.status(400).json({
        success: false,
        message: `El monto total (${totalAmount.toLocaleString('es-CL')} CLP) excede el límite para cuentas de prueba (1.000.000 CLP). Por favor, selecciona menos boletas o contacta al administrador.`
      });
    }

    // Create external reference
    const transactionId = uuidv4();
    const externalReference = `${req.user!.id}-${transactionId}-${Date.now()}`;

    // Create payment records (only for valid boletas)
    const pagos = await Pago.insertMany(
      validBoletas.map(boleta => ({
        boletaId: boleta._id,
        socioId: boleta.socioId,
        monto: boleta.montoTotal,
        fechaPago: new Date(),
        metodoPago: 'mercadopago',
        estadoPago: 'pendiente',
        transactionId: `${transactionId}-${boleta._id}`,
        metadata: {
          externalReference,
          mercadopagoPreferenceId: null, // Will be updated after preference creation
          boletaNumero: boleta.numeroBoleta,
          userId: req.user!.id,
          originalAmount: boleta.montoTotal
        }
      }))
    );

    try {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

      // Create MercadoPago preference using the SDK
      const preference = new Preference(mercadopagoClient);

      // Build payer object conditionally
      const payerData: any = {
        name: user.nombres,
        surname: user.apellidos,
        email: user.email
      };

      // Only add phone if user has a valid phone number
      if (user.telefono && user.telefono.length >= 8) {
        // Remove '+' and spaces from phone number
        const cleanPhone = user.telefono.replace(/[\+\s]/g, '');
        payerData.phone = {
          area_code: '56', // Código de país para Chile
          number: cleanPhone.replace(/^56/, '') // Remover el 56 del inicio si existe
        };
      }

      const preferenceData = {
        items: validBoletas.map((boleta, index) => ({
          id: `boleta-${boleta._id}`,
          title: `Boleta ${boleta.numeroBoleta} - ${boleta.periodo}`,
          quantity: 1,
          unit_price: Math.round(boleta.montoTotal), // CLP requiere enteros
          currency_id: 'CLP'
        })),
        payer: payerData,
        back_urls: {
          success: `${frontendUrl}/#payment-success`,
          failure: `${frontendUrl}/#payment-failure`,
          pending: `${frontendUrl}/#payment-pending`
        },
        external_reference: externalReference,
        notification_url: `${process.env.BACKEND_URL || 'http://localhost:7782'}/api/mercadopago/webhook`,
        // statement_descriptor: 'APR Portal', // Comentado temporalmente para debug
        // Configuración para entorno de pruebas
        binary_mode: false,
        metadata: {
          userId: req.user!.id,
          boletaIds: boletaIds.join(','),
          transactionId
        }
      };

      console.log('📋 Creating MercadoPago preference with URLs:', {
        success: preferenceData.back_urls.success,
        failure: preferenceData.back_urls.failure,
        pending: preferenceData.back_urls.pending,
        notification: preferenceData.notification_url
      });

      console.log('📦 Full preference data:', JSON.stringify(preferenceData, null, 2));

      const mpPreference = await preference.create({ body: preferenceData as any });

      console.log('✅ MercadoPago preference created:', mpPreference.id);

      // Update payment records with MercadoPago preference ID
      const paymentsToUpdate = await Pago.find({ transactionId: { $regex: `^${transactionId}` } });
      for (const payment of paymentsToUpdate) {
        payment.metadata = {
          ...payment.metadata,
          mercadopagoPreferenceId: mpPreference.id,
          mercadopagoInitPoint: mpPreference.init_point || mpPreference.sandbox_init_point
        };
        await payment.save();
      }

      res.json({
        success: true,
        data: {
          preferenceId: mpPreference.id,
          initPoint: mpPreference.init_point || mpPreference.sandbox_init_point,
          sandboxInitPoint: mpPreference.sandbox_init_point,
          totalAmount,
          externalReference,
          pagos,
          boletas: validBoletas.map(b => ({
            id: b._id,
            numeroBoleta: b.numeroBoleta,
            periodo: b.periodo,
            montoTotal: b.montoTotal
          }))
        },
        message: 'Preferencia de MercadoPago creada exitosamente'
      });

    } catch (error: any) {
      // Cleanup payment records if preference creation fails
      await Pago.deleteMany({
        transactionId: { $regex: `^${transactionId}` }
      });

      console.error('Error creating MercadoPago preference:', error);
      res.status(500).json({
        success: false,
        message: 'Error al crear la preferencia de MercadoPago'
      });
    }
  }
);

/**
 * @swagger
 * /api/mercadopago/webhook:
 *   post:
 *     summary: Handle MercadoPago payment notifications
 *     tags: [MercadoPago]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Webhook processed successfully
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal server error
 */
export const handleMercadoPagoWebhook = asyncHandler(
  async (req: Request, res: Response) => {
    const { action, data } = req.body;

    console.log('🔔 MercadoPago webhook received:', { action, data });

    if (action !== 'payment.updated' && action !== 'payment.created') {
      return res.status(200).json({ success: true, message: 'Webhook ignored' });
    }

    const paymentId = data?.id;
    if (!paymentId) {
      return res.status(400).json({
        success: false,
        message: 'Payment ID not found in webhook data'
      });
    }

    try {
      // Fetch payment details from MercadoPago API
      console.log(`💳 Processing MercadoPago payment: ${paymentId}`);

      const payment = new Payment(mercadopagoClient);
      const mpPayment = await payment.get({ id: paymentId });

      console.log('💳 MercadoPago payment details:', {
        id: mpPayment.id,
        status: mpPayment.status,
        external_reference: mpPayment.external_reference
      });

      // Find associated payment records using external_reference
      const externalReference = mpPayment.external_reference;
      if (!externalReference) {
        console.log('⚠️ No external reference found in payment data');
        return res.status(200).json({ success: true, message: 'No external reference' });
      }

      const pagos = await Pago.find({
        'metadata.externalReference': externalReference
      }).populate('boletaId');

      console.log(`📋 Found ${pagos.length} payment records for reference: ${externalReference}`);

      if (pagos.length === 0) {
        console.log('⚠️ No payment records found for external reference');
        return res.status(200).json({ success: true, message: 'No payment records found' });
      }

      // Determine payment status from MercadoPago payment data
      const paymentStatus = mpPayment.status || 'pending';
      console.log(`📊 MercadoPago payment status: ${paymentStatus}`);

      let newStatus: string;
      switch (paymentStatus) {
        case 'approved':
          newStatus = 'completado';
          break;
        case 'pending':
        case 'in_process':
          newStatus = 'pendiente';
          break;
        case 'rejected':
        case 'cancelled':
          newStatus = 'fallido';
          break;
        default:
          newStatus = 'pendiente';
      }

      console.log(`🔄 Updating payment status to: ${newStatus}`);

      // SOLUCIÓN: Usar .save() individual en lugar de updateMany() para activar middlewares
      const paymentsToUpdate = await Pago.find({
        'metadata.externalReference': externalReference
      });

      console.log(`🔄 Updating ${paymentsToUpdate.length} payments individually to trigger middlewares...`);

      for (const payment of paymentsToUpdate) {
        payment.estadoPago = newStatus as any;
        payment.metadata = {
          ...payment.metadata,
          mercadopagoPaymentId: mpPayment.id?.toString(),
          mercadopagoStatus: mpPayment.status,
          mercadopagoStatusDetail: mpPayment.status_detail,
          mercadopagoPaymentTypeId: mpPayment.payment_type_id,
          mercadopagoPaymentMethodId: mpPayment.payment_method_id
        };
        payment.fechaPago = new Date();

        // Usar .save() individual para activar el middleware post('save')
        await payment.save();
        console.log(`✅ Payment ${payment._id} saved - middleware will auto-sync boleta`);
      }

      console.log(`💾 Updated ${paymentsToUpdate.length} payment records using .save()`);

      // Si el pago fue aprobado, registrar ingreso
      if (newStatus === 'completado') {
        console.log('✅ Payment approved, processing income record...');

        // Get updated payments for income calculation
        const updatedPagos = await Pago.find({
          'metadata.externalReference': externalReference,
          estadoPago: 'completado'
        });

        const totalPaid = updatedPagos.reduce((sum, pago) => sum + pago.monto, 0);

        // Create income record for admin
        console.log('💰 Creating income record for admin...');
        try {
          const userId = updatedPagos[0]?.socioId;
          const boletaIds = updatedPagos.map(pago => pago.boletaId);

          const ingresoData = {
            monto: totalPaid,
            fecha: new Date(),
            descripcion: `Pago de ${updatedPagos.length} boleta(s) - MercadoPago`,
            tipo: 'pago_boleta' as const,
            pagoId: updatedPagos[0]._id,
            socioId: new mongoose.Types.ObjectId(userId),
            metodoPago: 'mercadopago' as const,
            boletaIds: boletaIds,
            transactionId: paymentId,
            metadata: {
              mercadopagoPaymentId: paymentId,
              mercadopagoWebhookData: data,
              numeroBoletas: updatedPagos.map(p => p.metadata?.boletaNumero).filter(Boolean),
              externalReference
            }
          };

          const ingreso = await Ingreso.create(ingresoData);
          console.log(`💸 Income record created: ${ingreso._id} - Amount: ${totalPaid}`);

          // Generar y enviar comprobante de pago
          try {
            console.log('📄 Generating payment receipt PDF...');

            const user = await User.findById(userId);
            const boletas = await Boleta.find({ _id: { $in: boletaIds } });

            if (user && boletas.length > 0) {
              const numeroComprobante = `MP-${paymentId}`;

              const pdfData = {
                numeroComprobante,
                fecha: new Date(),
                socio: {
                  nombre: user.nombres,
                  apellido: user.apellidos,
                  rut: user.rut,
                  email: user.email
                },
                pago: {
                  id: paymentId,
                  metodoPago: 'mercadopago',
                  monto: totalPaid,
                  estado: 'completado'
                },
                boletas: boletas.map(b => ({
                  numeroBoleta: b.numeroBoleta,
                  periodo: b.periodo,
                  monto: b.montoTotal
                })),
                organizacion: {
                  nombre: process.env.ORGANIZACION_NOMBRE || 'APR Agua Potable Rural',
                  rut: process.env.ORGANIZACION_RUT || '12.345.678-9',
                  direccion: process.env.ORGANIZACION_DIRECCION || 'Dirección de la organización',
                  telefono: process.env.ORGANIZACION_TELEFONO || '+56 9 1234 5678',
                  email: process.env.ORGANIZACION_EMAIL || 'contacto@apr.cl'
                }
              };

              const pdfBuffer = await PDFService.generarComprobantePago(pdfData);
              console.log('✅ PDF receipt generated successfully');

              // Enviar comprobante por email
              await emailService.sendPaymentReceipt(user.email, pdfBuffer, {
                nombre: `${user.nombres} ${user.apellidos}`,
                numeroComprobante,
                monto: totalPaid,
                metodoPago: 'mercadopago'
              });

              console.log('📧 Payment receipt sent to:', user.email);
            }
          } catch (pdfError) {
            console.error('❌ Error generating/sending payment receipt:', pdfError);
            // No fallar el webhook si falla la generación del PDF
          }
        } catch (ingresoError) {
          console.error('❌ Error creating income record:', ingresoError);
          // No fallar el pago si falla el registro de ingreso
        }
      } else {
        console.log(`⚠️ Payment not approved (status: ${newStatus}), skipping boleta updates`);
      }

      res.status(200).json({
        success: true,
        message: 'Webhook processed successfully'
      });

    } catch (error: any) {
      console.error('Error processing MercadoPago webhook:', error);
      res.status(500).json({
        success: false,
        message: 'Error processing webhook'
      });
    }
  }
);

/**
 * @swagger
 * /api/mercadopago/payment-success:
 *   post:
 *     summary: Handle successful MercadoPago payment return
 *     tags: [MercadoPago]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               collection_id:
 *                 type: string
 *               collection_status:
 *                 type: string
 *               payment_id:
 *                 type: string
 *               status:
 *                 type: string
 *               external_reference:
 *                 type: string
 *     responses:
 *       200:
 *         description: Payment processed successfully
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal server error
 */
export const handleMercadoPagoSuccess = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { collection_id, collection_status, payment_id, status, external_reference } = req.body;

    console.log('🎉 MercadoPago success callback:', {
      collection_id,
      collection_status,
      payment_id,
      status,
      external_reference,
      userId: req.user?.id
    });

    if (!external_reference) {
      return res.status(400).json({
        success: false,
        message: 'External reference is required'
      });
    }

    try {
      // Find associated payment records
      const pagos = await Pago.find({
        'metadata.externalReference': external_reference,
        socioId: new mongoose.Types.ObjectId(req.user?.id)
      }).populate('boletaId');

      console.log(`📋 Found ${pagos.length} payment records for success callback`);

      if (pagos.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No se encontraron pagos asociados'
        });
      }

      // Determine status
      const isApproved = status === 'approved' || collection_status === 'approved';
      const newStatus = isApproved ? 'completado' : 'pendiente';

      console.log(`📊 Processing success with status: ${newStatus}`);

      // SOLUCIÓN: Usar .save() individual en lugar de updateMany()
      const paymentsToUpdate = await Pago.find({
        'metadata.externalReference': external_reference,
        socioId: new mongoose.Types.ObjectId(req.user?.id)
      });

      console.log(`🔄 Updating ${paymentsToUpdate.length} payments individually...`);

      for (const payment of paymentsToUpdate) {
        payment.estadoPago = newStatus as any;
        payment.metadata = {
          ...payment.metadata,
          mercadopagoPaymentId: payment_id || collection_id,
          mercadopagoStatus: status,
          collectionId: collection_id,
          collectionStatus: collection_status
        };
        payment.fechaPago = new Date();

        // Usar .save() individual para activar el middleware post('save')
        await payment.save();
        console.log(`✅ Payment ${payment._id} saved - middleware will auto-sync boleta`);
      }

      const totalPaid = pagos.reduce((sum, pago) => sum + pago.monto, 0);
      console.log(`💰 Total processed: ${totalPaid}`);

      res.json({
        success: true,
        data: {
          status: newStatus,
          paymentId: payment_id || collection_id,
          externalReference: external_reference,
          totalAmount: pagos.reduce((sum, pago) => sum + pago.monto, 0)
        },
        message: isApproved
          ? 'Pago procesado exitosamente'
          : 'Pago procesado, pendiente de confirmación'
      });

    } catch (error: any) {
      console.error('Error processing MercadoPago success:', error);
      res.status(500).json({
        success: false,
        message: 'Error al procesar el pago exitoso'
      });
    }
  }
);