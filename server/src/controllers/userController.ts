import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { User } from '../models';
import { AppError, asyncHandler } from '../middleware/errorHandler';

// Get all socios for admin use
export const getSocios = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    // Only super_admin can access this
    if (req.user?.role !== 'super_admin') {
      throw new AppError('No autorizado para ver esta información', 403);
    }

    const socios = await User.find({ 
      role: 'socio',
      activo: true 
    }).select('nombres apellidos rut email codigoSocio direccion telefono fechaIngreso saldoActual deudaTotal');

    console.log(`📋 Admin ${req.user.email} retrieved ${socios.length} socios`);

    res.json({
      success: true,
      data: socios.map(socio => ({
        id: (socio._id as any).toString(),
        nombres: socio.nombres,
        apellidos: socio.apellidos,
        rut: socio.rut,
        email: socio.email,
        codigoSocio: socio.codigoSocio,
        direccion: socio.direccion,
        telefono: socio.telefono,
        fechaIngreso: socio.fechaIngreso,
        saldoActual: socio.saldoActual,
        deudaTotal: socio.deudaTotal
      })),
      message: 'Socios obtenidos exitosamente'
    });
  }
);

// Get user profile
export const getProfile = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw new AppError('Usuario no autenticado', 401);
    }

    // Find full user data
    const user = await User.findById(req.user.id).select('-password');
    
    if (!user) {
      throw new AppError('Usuario no encontrado', 404);
    }

    res.json({
      success: true,
      data: {
        id: (user._id as any).toString(),
        nombres: user.nombres,
        apellidos: user.apellidos,
        rut: user.rut,
        email: user.email,
        role: user.role,
        telefono: user.telefono,
        direccion: user.direccion,
        codigoSocio: user.codigoSocio,
        fechaIngreso: user.fechaIngreso,
        saldoActual: user.saldoActual,
        deudaTotal: user.deudaTotal,
        activo: user.activo
      },
      message: 'Perfil obtenido exitosamente'
    });
  }
);

// Update user profile
export const updateProfile = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw new AppError('Usuario no autenticado', 401);
    }

    const { nombres, apellidos, telefono, direccion } = req.body;

    // Validate required fields
    if (!nombres || !apellidos) {
      throw new AppError('Nombres y apellidos son requeridos', 400);
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      {
        nombres: nombres.trim(),
        apellidos: apellidos.trim(),
        telefono: telefono?.trim(),
        direccion: direccion?.trim()
      },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      throw new AppError('Usuario no encontrado', 404);
    }

    console.log(`👤 User ${user.email} updated their profile`);

    res.json({
      success: true,
      data: {
        id: (user._id as any).toString(),
        nombres: user.nombres,
        apellidos: user.apellidos,
        rut: user.rut,
        email: user.email,
        role: user.role,
        telefono: user.telefono,
        direccion: user.direccion,
        codigoSocio: user.codigoSocio,
        fechaIngreso: user.fechaIngreso,
        saldoActual: user.saldoActual,
        deudaTotal: user.deudaTotal,
        activo: user.activo
      },
      message: 'Perfil actualizado exitosamente'
    });
  }
);

