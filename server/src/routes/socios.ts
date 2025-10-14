import express, { Response } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../types';
import { User, Boleta } from '../models';

const router = express.Router();

// Get socio profile
router.get('/profile', authenticate, authorize('socio'), asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    res.json({
      success: true,
      data: req.user,
      message: 'Perfil obtenido exitosamente',
    });
  }
));

// Update socio profile
router.put('/profile', authenticate, authorize('socio'), asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { nombres, apellidos, email, telefono, direccion } = req.body;
    
    const updatedUser = await User.findByIdAndUpdate(
      req.user?.id,
      {
        nombres: nombres || req.user?.nombres,
        apellidos: apellidos || req.user?.apellidos,
        email: email || req.user?.email,
        telefono,
        direccion,
      },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado',
      });
    }

    res.json({
      success: true,
      data: {
        id: (updatedUser._id as any).toString(),
        rut: updatedUser.rut,
        nombres: updatedUser.nombres,
        apellidos: updatedUser.apellidos,
        email: updatedUser.email,
        role: updatedUser.role,
        telefono: updatedUser.telefono,
        direccion: updatedUser.direccion,
        fechaIngreso: updatedUser.fechaIngreso.toISOString(),
        codigoSocio: updatedUser.codigoSocio,
        saldoActual: updatedUser.saldoActual,
        deudaTotal: updatedUser.deudaTotal
      },
      message: 'Perfil actualizado exitosamente',
    });
  }
));

// Get dashboard stats for socio
router.get('/dashboard', authenticate, authorize('socio'), asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const socioId = req.user?.id;

    // Get boletas stats
    const [boletasPendientes, boletasVencidas, ultimaBoleta] = await Promise.all([
      Boleta.countDocuments({ socioId, estado: 'pendiente' }),
      Boleta.countDocuments({ socioId, estado: 'vencida' }),
      Boleta.findOne({ socioId }).sort({ fechaEmision: -1 })
    ]);

    // Get user info
    const user = await User.findById(socioId);
    
    const dashboardData = {
      boletasPendientes,
      boletasVencidas,
      ultimoPago: ultimaBoleta?.fechaEmision || null,
      proximoVencimiento: ultimaBoleta?.fechaVencimiento || null,
      consumoActual: ultimaBoleta?.consumoM3 || 0,
      saldoActual: user?.saldoActual || 0,
      deudaTotal: user?.deudaTotal || 0,
    };

    res.json({
      success: true,
      data: dashboardData,
      message: 'Dashboard obtenido exitosamente',
    });
  }
));

export default router;