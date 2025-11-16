import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthenticatedRequest, JWTPayload, UserRole } from '../types';
import { AppError, asyncHandler } from './errorHandler';
import { User, SuperAdmin } from '../models';


export const authenticate = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    let token: string | undefined;

    // Check for token in Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
      console.log('🔐 Token found in Authorization header:', token ? `${token.substring(0, 20)}...` : 'null/undefined');
    }
    // Check for token in cookies
    else if (req.cookies.token) {
      token = req.cookies.token;
      console.log('🔐 Token found in cookies:', token ? `${token.substring(0, 20)}...` : 'null/undefined');
    }

    console.log('🔐 Full Authorization header:', req.headers.authorization);

    if (!token) {
      console.log('🔐 No token found in request');
      return next(new AppError('No autorizado, token requerido', 401));
    }

    if (token === 'null' || token === 'undefined') {
      console.log('🔐 Token is string null/undefined');
      return next(new AppError('Token inválido', 401));
    }

    if (!process.env.JWT_SECRET) {
      console.error('🔐 JWT_SECRET not configured');
      return next(new AppError('Error de configuración del servidor', 500));
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;

      // Find user in database (try both User and SuperAdmin collections)
      let user = await User.findById(decoded.userId);
      let isSuperAdmin = false;
      
      if (!user) {
        // Try to find in SuperAdmin collection
        const superAdmin = await SuperAdmin.findById(decoded.userId);
        if (superAdmin) {
          user = superAdmin as any;
          isSuperAdmin = true;
        }
      }
      
      if (!user) {
        console.log('🔐 User not found with ID:', decoded.userId);
        return next(new AppError('Token inválido - usuario no encontrado', 401));
      }

      // Allow login regardless of activo status
      // if (!user.activo) {
      //   console.log('🔐 User account is inactive:', decoded.userId);
      //   return next(new AppError('Cuenta desactivada', 401));
      // }


      // Convert to plain object for req.user
      if (isSuperAdmin) {
        req.user = {
          id: (user._id as any).toString(),
          username: (user as any).username,
          nombres: user.nombres,
          apellidos: user.apellidos,
          email: user.email,
          role: 'super_admin' as const,
          tipo: 'super_admin' as const,
          activo: user.activo,
          ultimoAcceso: (user as any).ultimoAcceso?.toISOString(),
          fechaCreacion: (user as any).fechaCreacion.toISOString(),
          telefono: (user as any).telefono,
          direccion: (user as any).direccion,
          profilePhoto: (user as any).profilePhoto,
          permisos: (user as any).permisos
        };
      } else {
        req.user = {
          id: (user._id as any).toString(),
          rut: (user as any).rut,
          nombres: user.nombres,
          apellidos: user.apellidos,
          email: user.email,
          role: user.role as 'socio' | 'admin',
          tipo: user.role as 'socio' | 'admin',
          telefono: (user as any).telefono,
          direccion: (user as any).direccion,
          fechaIngreso: (user as any).fechaIngreso.toISOString(),
          codigoSocio: (user as any).codigoSocio,
          saldoActual: (user as any).saldoActual,
          deudaTotal: (user as any).deudaTotal,
          profilePhoto: (user as any).profilePhoto,
          username: (user as any).username,
          permisos: (user as any).permisos
        };
      }

      // Only log authentication success for non-notification endpoints to reduce noise
      if (!req.originalUrl?.includes('/notifications')) {
        console.log(`🔐 User authenticated successfully: ${user.email} Role: ${user.role}`);
      }
      
      next();
    } catch (error) {
      console.error('🔐 Token verification failed:', error instanceof jwt.JsonWebTokenError ? error.message : error);
      
      if (error instanceof jwt.TokenExpiredError) {
        return next(new AppError('Token expirado', 401));
      } else if (error instanceof jwt.JsonWebTokenError) {
        return next(new AppError('Token malformado', 401));
      } else {
        return next(new AppError('Token inválido', 401));
      }
    }
  }
);

export const authorize = (...roles: UserRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('No autorizado', 401));
    }

    console.log(`🔐 Authorization check: User role "${req.user.role}" vs allowed roles:`, roles);
    console.log(`🔐 Role comparison: includes check = ${roles.includes(req.user.role)}`);

    if (!roles.includes(req.user.role)) {
      console.log(`❌ Authorization failed: "${req.user.role}" not in [${roles.join(', ')}]`);
      return next(
        new AppError(
          `Rol ${req.user.role} no tiene permisos para acceder a este recurso`,
          403
        )
      );
    }

    console.log(`✅ Authorization successful for role: ${req.user.role}`);
    next();
  };
};

export const optionalAuth = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    let token: string | undefined;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies.token) {
      token = req.cookies.token;
    }

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
        const user = await User.findById(decoded.userId);

        if (user) { // Allow regardless of activo status
          req.user = {
            id: (user._id as any).toString(),
            rut: user.rut,
            nombres: user.nombres,
            apellidos: user.apellidos,
            email: user.email,
            role: user.role,
            telefono: user.telefono,
            direccion: user.direccion,
            fechaIngreso: user.fechaIngreso.toISOString(),
            codigoSocio: user.codigoSocio,
            saldoActual: user.saldoActual,
            deudaTotal: user.deudaTotal,
            permisos: user.permisos
          };
        }
      } catch (error) {
        // Token inválido, pero continuamos sin usuario
      }
    }

    next();
  }
);