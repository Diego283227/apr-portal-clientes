import { Request, Response } from 'express';
import Boleta from '../models/Boleta';
import User from '../models/User';
import { Ingreso } from '../models';
import { createAuditLog } from '../utils/audit';
import mongoose from 'mongoose';

// Admin function to change boleta status
export const updateBoletaStatus = async (req: Request, res: Response) => {
  try {
    const adminUserId = (req as any).user.userId;
    const adminRole = (req as any).user.role;

    // Verify admin permissions
    if (adminRole !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para modificar el estado de boletas'
      });
    }

    const { boletaIds, newStatus, reason } = req.body;

    // Validate input
    if (!boletaIds || !Array.isArray(boletaIds) || boletaIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Debe proporcionar al menos una boleta para actualizar'
      });
    }

    if (!newStatus || !['pendiente', 'pagada', 'vencida', 'anulada'].includes(newStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Estado de boleta inválido'
      });
    }

    // Convert string IDs to ObjectIds
    const objectIds = boletaIds.map((id: string) => {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new Error(`ID de boleta inválido: ${id}`);
      }
      return new mongoose.Types.ObjectId(id);
    });

    // Find boletas to update
    const boletas = await Boleta.find({ _id: { $in: objectIds } }).populate('socioId').exec();

    if (boletas.length !== objectIds.length) {
      return res.status(404).json({
        success: false,
        message: 'Algunas boletas no fueron encontradas'
      });
    }

    // CRITICAL: Check if any boleta was already paid
    const paidBoletas = boletas.filter(b => (b as any).pagada);
    if (paidBoletas.length > 0) {
      const paidNumbers = paidBoletas.map(b => b.numeroBoleta).join(', ');
      return res.status(403).json({
        success: false,
        message: `No se puede cambiar el estado de boletas que ya fueron pagadas: ${paidNumbers}. Las boletas pagadas son inmutables.`
      });
    }

    // Store old statuses for audit
    const oldStatuses = boletas.map(b => ({ id: b._id, status: b.estado }));

    // Update boletas status
    // If setting to 'pagada', also set the pagada flag and fechaPago
    const updateFields: any = {
      estado: newStatus,
      updatedAt: new Date()
    };

    if (newStatus === 'pagada') {
      updateFields.pagada = true;
      updateFields.fechaPago = new Date();
    }

    const updateResult = await Boleta.updateMany(
      { _id: { $in: objectIds } },
      { $set: updateFields }
    );

    // If marking as paid, also update user debt and create income records
    if (newStatus === 'pagada') {
      const totalAmount = boletas.reduce((sum, boleta) => sum + boleta.montoTotal, 0);

      // Group boletas by socio to update debt properly
      const boletasBySocio = boletas.reduce((acc, boleta) => {
        const socioId = boleta.socioId._id.toString();
        if (!acc[socioId]) {
          acc[socioId] = { socio: boleta.socioId, amount: 0, boletas: [] };
        }
        acc[socioId].amount += boleta.montoTotal;
        acc[socioId].boletas.push(boleta);
        return acc;
      }, {} as Record<string, { socio: any, amount: number, boletas: any[] }>);

      // Update debt for each socio and create income records
      for (const socioId of Object.keys(boletasBySocio)) {
        const { socio, amount, boletas: socioboletas } = boletasBySocio[socioId];

        // Update user debt
        await User.findByIdAndUpdate(
          socioId,
          { $inc: { deudaTotal: -amount } }
        );

        // Create income record for admin
        try {
          const ingresoData = {
            monto: amount,
            fecha: new Date(),
            descripcion: `Pago manual por admin - ${socioboletas.length} boleta(s)`,
            tipo: 'pago_boleta' as const,
            socioId: new mongoose.Types.ObjectId(socioId),
            metodoPago: 'efectivo' as const, // Asumiendo efectivo para pagos manuales
            boletaIds: socioboletas.map(b => b._id),
            transactionId: `admin-${Date.now()}-${socioId}`,
            metadata: {
              adminUserId,
              reason,
              numeroBoletas: socioboletas.map(b => b.numeroBoleta),
              manualPayment: true
            }
          };

          await Ingreso.create(ingresoData);
          console.log(`💸 Income record created for admin payment: Amount ${amount}`);
        } catch (ingresoError) {
          console.error('❌ Error creating income record:', ingresoError);
          // No fallar el proceso si falla el registro de ingreso
        }
      }

      console.log(`💰 Admin updated ${boletas.length} boletas to 'pagada' - Total amount: ${totalAmount}`);
    }

    // Create audit log
    await createAuditLog({
      userId: adminUserId,
      action: 'UPDATE_BOLETA_STATUS',
      entity: 'boletas',
      entityId: boletaIds.join(','),
      details: {
        boletaIds,
        oldStatus: oldStatuses,
        newStatus,
        reason,
        affectedSocios: [...new Set(boletas.map(b => ((b.socioId as any)._id || b.socioId).toString()))]
      },
      ipAddress: req.ip
    });

    res.json({
      success: true,
      data: {
        updatedCount: updateResult.modifiedCount,
        boletas: boletas.map(b => ({
          id: b._id,
          numeroBoleta: b.numeroBoleta,
          socio: {
            nombres: (b.socioId as any)?.nombres,
            apellidos: (b.socioId as any)?.apellidos,
            rut: (b.socioId as any)?.rut
          },
          montoTotal: b.montoTotal,
          oldStatus: oldStatuses.find(s => (s.id as any).toString() === (b._id as any).toString())?.status,
          newStatus
        }))
      },
      message: `${updateResult.modifiedCount} boleta(s) actualizadas a estado '${newStatus}'`
    });

  } catch (error: any) {
    console.error('Error updating boleta status:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor al actualizar estado de boletas',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};