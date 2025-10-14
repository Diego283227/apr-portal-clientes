import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { asyncHandler } from '../middleware/errorHandler';
import { Pago, Boleta, User } from '../models';
import { PDFService } from '../services/pdfService';
import mongoose from 'mongoose';

/**
 * @swagger
 * /api/comprobantes/{pagoId}:
 *   get:
 *     summary: Descargar comprobante de pago en PDF
 *     tags: [Comprobantes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: pagoId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del pago
 *     responses:
 *       200:
 *         description: PDF del comprobante
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: Pago no encontrado
 *       500:
 *         description: Error del servidor
 */
export const descargarComprobante = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { pagoId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(pagoId)) {
      return res.status(400).json({
        success: false,
        message: 'ID de pago inválido'
      });
    }

    // Buscar el pago
    const pago = await Pago.findById(pagoId).populate('boletaId socioId');

    if (!pago) {
      return res.status(404).json({
        success: false,
        message: 'Pago no encontrado'
      });
    }

    // Verificar que el pago pertenece al usuario (a menos que sea admin)
    // socioId puede ser un ObjectId o un objeto poblado
    const socioIdString = pago.socioId?._id
      ? pago.socioId._id.toString()
      : pago.socioId?.toString();

    if (req.user?.role !== 'super_admin' && socioIdString !== req.user?.id) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para descargar este comprobante'
      });
    }

    // Solo generar comprobante para pagos completados
    if (pago.estadoPago !== 'completado') {
      return res.status(400).json({
        success: false,
        message: 'Solo se pueden generar comprobantes para pagos completados'
      });
    }

    try {
      const user = await User.findById(pago.socioId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      // Obtener todas las boletas pagadas con el mismo external reference
      const externalReference = pago.metadata?.externalReference;
      let boletas = [];

      if (externalReference) {
        const pagosRelacionados = await Pago.find({
          'metadata.externalReference': externalReference
        }).populate('boletaId');

        boletas = pagosRelacionados
          .map(p => p.boletaId)
          .filter(b => b != null);
      } else {
        boletas = [pago.boletaId].filter(b => b != null);
      }

      const totalPaid = boletas.reduce((sum: number, boleta: any) => {
        return sum + (boleta.montoTotal || 0);
      }, 0);

      const numeroComprobante = pago.metadata?.mercadopagoPaymentId
        ? `MP-${pago.metadata.mercadopagoPaymentId}`
        : `PAY-${pago._id}`;

      const pdfData = {
        numeroComprobante,
        fecha: pago.fechaPago || new Date(),
        socio: {
          nombre: user.nombres,
          apellido: user.apellidos,
          rut: user.rut,
          email: user.email
        },
        pago: {
          id: (pago._id as mongoose.Types.ObjectId).toString(),
          metodoPago: pago.metodoPago,
          monto: totalPaid,
          estado: pago.estadoPago
        },
        boletas: boletas.map((b: any) => ({
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

      await PDFService.enviarPDFResponse(
        res,
        pdfData,
        `Comprobante_${numeroComprobante}.pdf`
      );

    } catch (error: any) {
      console.error('Error generating comprobante:', error);
      res.status(500).json({
        success: false,
        message: 'Error al generar el comprobante'
      });
    }
  }
);

/**
 * @swagger
 * /api/comprobantes/mis-pagos:
 *   get:
 *     summary: Obtener lista de pagos del usuario con comprobantes disponibles
 *     tags: [Comprobantes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de pagos con comprobantes
 *       500:
 *         description: Error del servidor
 */
export const listarPagosConComprobantes = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.id;

    const pagos = await Pago.find({
      socioId: new mongoose.Types.ObjectId(userId),
      estadoPago: 'completado'
    })
      .populate('boletaId')
      .sort({ fechaPago: -1 })
      .limit(50);

    const pagosFormateados = pagos.map(pago => {
      const numeroComprobante = pago.metadata?.mercadopagoPaymentId
        ? `MP-${pago.metadata.mercadopagoPaymentId}`
        : `PAY-${pago._id}`;

      return {
        _id: pago._id,
        numeroComprobante,
        fecha: pago.fechaPago,
        monto: pago.monto,
        metodoPago: pago.metodoPago,
        estadoPago: pago.estadoPago,
        boleta: pago.boletaId ? {
          numeroBoleta: (pago.boletaId as any).numeroBoleta,
          periodo: (pago.boletaId as any).periodo
        } : null,
        tieneComprobante: true
      };
    });

    res.json({
      success: true,
      data: pagosFormateados,
      total: pagosFormateados.length
    });
  }
);
