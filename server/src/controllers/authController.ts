import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';
import cloudinary from '../config/cloudinary';
import { uploadFile, deleteFile } from '../utils/uploadthing';
import {
  AuthenticatedRequest,
  LoginCredentials,
  RegisterData,
  AuthResponse
} from '../types';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import { generateToken, generateSocketToken, generateRefreshToken, verifyRefreshToken, setTokenCookies, clearTokenCookies } from '../utils/jwt';
import { User, SuperAdmin } from '../models';
import { createAuditLog } from './auditController';
import emailService from '../services/emailService';
import { validateRut, formatRut } from '../utils/rutValidator';


export const login = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { rut, username, password, tipoUsuario }: LoginCredentials = req.body;

    if (!password) {
      return next(new AppError('Password es requerido', 400));
    }

    let user: any = null;
    let userObj: any = null;

    if (tipoUsuario === 'super_admin') {
      // Super Admin login using username
      if (!username) {
        return next(new AppError('Username es requerido para super admin', 400));
      }

      const superAdmin = await SuperAdmin.findOne({ username, activo: true }).select('+password');
      
      if (!superAdmin) {
        // Log failed login attempt
        await createAuditLog(
          {
            id: 'unknown',
            tipo: 'super_admin',
            nombre: 'Usuario desconocido',
            identificador: username
          },
          'login_fallido',
          'autenticacion',
          `Intento de login fallido - usuario no encontrado: ${username}`,
          { username },
          'fallido',
          undefined,
          req
        );
        return next(new AppError('Credenciales inválidas', 401));
      }

      // Verify password
      const isPasswordValid = await superAdmin.comparePassword(password);

      if (!isPasswordValid) {
        // Log failed login attempt
        await createAuditLog(
          {
            id: (superAdmin._id as mongoose.Types.ObjectId).toString(),
            tipo: 'super_admin',
            nombre: `${superAdmin.nombres} ${superAdmin.apellidos}`,
            identificador: superAdmin.username
          },
          'login_fallido',
          'autenticacion',
          'Intento de login fallido - contraseña incorrecta',
          { username },
          'fallido',
          undefined,
          req
        );
        return next(new AppError('Credenciales inválidas', 401));
      }

      // Update last access
      superAdmin.ultimoAcceso = new Date();
      await superAdmin.save();

      userObj = {
        id: (superAdmin._id as any).toString(),
        username: superAdmin.username,
        email: superAdmin.email,
        nombres: superAdmin.nombres,
        apellidos: superAdmin.apellidos,
        telefono: superAdmin.telefono,
        direccion: superAdmin.direccion,
        role: superAdmin.role,
        activo: superAdmin.activo,
        ultimoAcceso: superAdmin.ultimoAcceso?.toISOString(),
        fechaCreacion: superAdmin.fechaCreacion.toISOString(),
        permisos: superAdmin.permisos
      };

      // Log successful login
      await createAuditLog(
        {
          id: userObj.id,
          tipo: 'super_admin',
          nombre: `${userObj.nombres} ${userObj.apellidos}`,
          identificador: userObj.username
        },
        'login_exitoso',
        'autenticacion',
        'Inicio de sesión exitoso',
        { username },
        'exitoso',
        undefined,
        req
      );
    } else {
      // Regular user login using RUT or codigoSocio
      if (!rut) {
        return next(new AppError('RUT o código de socio es requerido', 400));
      }

      // Try to find by RUT first, then by codigoSocio
      let regularUser = await User.findOne({ rut, activo: true });
      
      // If not found by RUT, try by codigoSocio (assuming rut field contains the code)
      if (!regularUser && rut) {
        regularUser = await User.findOne({ codigoSocio: rut, activo: true });
      }

      if (!regularUser) {
        return next(new AppError('Credenciales inválidas', 401));
      }

      // Check if user role matches requested type
      if (tipoUsuario && regularUser.role !== tipoUsuario) {
        return next(new AppError('Tipo de usuario incorrecto', 401));
      }

      // Verify password
      const isPasswordValid = await regularUser.comparePassword(password);

      if (!isPasswordValid) {
        return next(new AppError('Credenciales inválidas', 401));
      }

      userObj = {
        id: (regularUser._id as any).toString(),
        rut: regularUser.rut,
        nombres: regularUser.nombres,
        apellidos: regularUser.apellidos,
        email: regularUser.email,
        role: regularUser.role,
        telefono: regularUser.telefono,
        direccion: regularUser.direccion,
        fechaIngreso: regularUser.fechaIngreso.toISOString(),
        codigoSocio: regularUser.codigoSocio,
        saldoActual: regularUser.saldoActual,
        deudaTotal: regularUser.deudaTotal,
        permisos: regularUser.permisos
      };

      // Log successful login for regular users
      await createAuditLog(
        {
          id: userObj.id,
          tipo: 'socio',
          nombre: `${userObj.nombres} ${userObj.apellidos}`,
          identificador: userObj.rut
        },
        'login_exitoso',
        'autenticacion',
        'Inicio de sesión exitoso',
        { rut },
        'exitoso',
        undefined,
        req
      );
    }

    // Generate tokens
    const token = generateToken(userObj);
    const refreshToken = generateRefreshToken(userObj);

    // Set cookies
    setTokenCookies(res, token, refreshToken);

    const response: AuthResponse = {
      success: true,
      data: {
        user: userObj,
        token,
        refreshToken
      },
      message: 'Bienvenido a tu Sesión',
    };

    res.status(200).json(response);
  }
);

export const register = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const {
      rut,
      nombres,
      apellidos,
      email,
      telefono,
      direccion,
      password,
      confirmPassword
    }: RegisterData = req.body;

    // Validation
    if (!rut || !nombres || !apellidos || !email || !password) {
      return next(new AppError('RUT, nombres, apellidos, email y password son requeridos', 400));
    }

    // Validate RUT
    const rutValidation = validateRut(rut);
    if (!rutValidation.isValid) {
      const errorMessage = rutValidation.errors.join(', ');
      console.log(`❌ Invalid RUT registration attempt: ${rut} - ${errorMessage}`);
      return next(new AppError(`RUT inválido: ${errorMessage}`, 400));
    }

    // Use formatted RUT
    const formattedRut = rutValidation.formatted!;

    if (password !== confirmPassword) {
      return next(new AppError('Las contraseñas no coinciden', 400));
    }

    if (password.length < 6) {
      return next(new AppError('Password debe tener al menos 6 caracteres', 400));
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ rut: formattedRut }, { email }]
    });

    if (existingUser) {
      return next(new AppError('Usuario ya existe con este RUT o email', 400));
    }

    // Create new user
    const newUser = new User({
      rut: formattedRut,
      nombres,
      apellidos,
      email,
      password,
      telefono,
      direccion,
      role: 'socio',
      saldoActual: 0,
      deudaTotal: 0
    });

    await newUser.save();

    // Convert to plain object for JWT
    const userObj = {
      id: (newUser._id as any).toString(),
      rut: newUser.rut,
      nombres: newUser.nombres,
      apellidos: newUser.apellidos,
      email: newUser.email,
      role: newUser.role,
      telefono: newUser.telefono,
      direccion: newUser.direccion,
      fechaIngreso: newUser.fechaIngreso.toISOString(),
      codigoSocio: newUser.codigoSocio,
      saldoActual: newUser.saldoActual,
      deudaTotal: newUser.deudaTotal
    };

    // Send welcome email (no await - fire and forget)
    if (newUser.codigoSocio) {
      emailService.sendWelcomeEmail(newUser.email, {
        nombres: newUser.nombres,
        apellidos: newUser.apellidos,
        codigoSocio: newUser.codigoSocio,
        rut: newUser.rut
      }).then(result => {
        if (result.success) {
          console.log('✅ Welcome email sent to new user:', newUser.email);
        } else {
          console.warn('⚠️ Welcome email could not be sent:', result.message || result.error);
        }
      }).catch(err => {
        console.error('❌ Error sending welcome email:', err);
      });
    } else {
      console.warn('⚠️ Cannot send welcome email: codigoSocio not generated yet');
    }

    // Generate tokens
    const token = generateToken(userObj);
    const refreshToken = generateRefreshToken(userObj);

    // Set cookies
    setTokenCookies(res, token, refreshToken);

    const response: AuthResponse = {
      success: true,
      data: {
        user: userObj,
        token,
        refreshToken
      },
      message: 'Registro exitoso',
    };

    res.status(201).json(response);
  }
);

export const refreshToken = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const clientRefreshToken = req.body?.refreshToken;
    let refreshToken = clientRefreshToken || req.cookies?.refreshToken;

    if (!refreshToken) {
      return next(new AppError('Refresh token requerido', 401));
    }

    try {
      const decoded = verifyRefreshToken(refreshToken);
      let userObj: any = null;

      // Try to find as regular user first
      let user = await User.findById(decoded.userId);
      
      if (user && user.activo) {
        userObj = {
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
      } else {
        // Try to find as SuperAdmin
        const superAdmin = await SuperAdmin.findById(decoded.userId);
        
        if (!superAdmin || !superAdmin.activo) {
          return next(new AppError('Refresh token inválido', 401));
        }

        // Update last access
        superAdmin.ultimoAcceso = new Date();
        await superAdmin.save();

        userObj = {
          id: (superAdmin._id as any).toString(),
          username: superAdmin.username,
          email: superAdmin.email,
          nombres: superAdmin.nombres,
          apellidos: superAdmin.apellidos,
          telefono: superAdmin.telefono,
          direccion: superAdmin.direccion,
          role: superAdmin.role,
          activo: superAdmin.activo,
          ultimoAcceso: superAdmin.ultimoAcceso?.toISOString(),
          fechaCreacion: superAdmin.fechaCreacion.toISOString(),
          permisos: superAdmin.permisos
        };
      }

      if (!userObj) {
        return next(new AppError('Refresh token inválido', 401));
      }

      // Generate new tokens
      const newToken = generateToken(userObj);
      const newRefreshToken = generateRefreshToken(userObj);

      // Set new cookies
      setTokenCookies(res, newToken, newRefreshToken);

      res.status(200).json({
        success: true,
        data: {
          user: userObj,
          token: newToken,
          refreshToken: newRefreshToken
        },
        message: 'Token renovado exitosamente',
      });
    } catch (error) {
      return next(new AppError('Refresh token inválido', 401));
    }
  }
);

export const logout = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // Clear cookies
    clearTokenCookies(res);

    res.status(200).json({
      success: true,
      message: 'Logout exitoso',
    });
  }
);

export const getMe = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('No autorizado', 401));
    }

    res.status(200).json({
      success: true,
      data: req.user,
      message: 'Usuario obtenido exitosamente',
    });
  }
);

export const updateProfile = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('No autorizado', 401));
    }

    const { nombres, apellidos, email, telefono, direccion } = req.body;
    let updatedUser: any = null;

    if (req.user.role === 'super_admin') {
      // Update SuperAdmin profile
      const admin = await SuperAdmin.findById(req.user.id);
      if (!admin) {
        return next(new AppError('Administrador no encontrado', 404));
      }

      // Update fields if provided
      if (nombres) admin.nombres = nombres;
      if (apellidos) admin.apellidos = apellidos;
      if (email) {
        // Check if email is already taken
        const existingAdmin = await SuperAdmin.findOne({ 
          email, 
          _id: { $ne: admin._id } 
        });
        if (existingAdmin) {
          return next(new AppError('Email ya está en uso', 400));
        }
        admin.email = email;
      }
      if (telefono !== undefined) admin.telefono = telefono;
      if (direccion !== undefined) admin.direccion = direccion;

      await admin.save();

      updatedUser = {
        id: (admin._id as any).toString(),
        username: admin.username,
        email: admin.email,
        nombres: admin.nombres,
        apellidos: admin.apellidos,
        telefono: admin.telefono,
        direccion: admin.direccion,
        role: admin.role,
        activo: admin.activo,
        ultimoAcceso: admin.ultimoAcceso?.toISOString(),
        fechaCreacion: admin.fechaCreacion.toISOString(),
        permisos: admin.permisos
      };

      // Log the update
      await createAuditLog(
        {
          id: updatedUser.id,
          tipo: 'super_admin',
          nombre: `${updatedUser.nombres} ${updatedUser.apellidos}`,
          identificador: updatedUser.username
        },
        'actualizar_perfil_admin',
        'perfil',
        'Actualización de perfil de administrador',
        { updatedFields: { nombres, apellidos, email, telefono, direccion } },
        'exitoso',
        undefined,
        req
      );
    } else {
      // Update regular user profile (socio)
      const user = await User.findById(req.user.id);
      if (!user) {
        return next(new AppError('Usuario no encontrado', 404));
      }

      // Update fields if provided
      if (nombres) user.nombres = nombres;
      if (apellidos) user.apellidos = apellidos;
      if (email) {
        // Check if email is already taken
        const existingUser = await User.findOne({ 
          email, 
          _id: { $ne: user._id } 
        });
        if (existingUser) {
          return next(new AppError('Email ya está en uso', 400));
        }
        user.email = email;
      }
      if (telefono !== undefined) user.telefono = telefono;
      if (direccion !== undefined) user.direccion = direccion;

      await user.save();

      updatedUser = {
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

      // Log the update
      await createAuditLog(
        {
          id: updatedUser.id,
          tipo: 'socio',
          nombre: `${updatedUser.nombres} ${updatedUser.apellidos}`,
          identificador: updatedUser.rut
        },
        'actualizar_perfil_socio',
        'perfil',
        'Actualización de perfil de socio',
        { updatedFields: { nombres, apellidos, email, telefono, direccion } },
        'exitoso',
        undefined,
        req
      );
    }

    res.status(200).json({
      success: true,
      data: updatedUser,
      message: 'Perfil actualizado exitosamente'
    });
  }
);

export const getSocketToken = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const user = req.user!;
    
    // Generate a token specifically for Socket.IO (7 days duration)
    const token = generateSocketToken(user);
    
    res.status(200).json({
      success: true,
      data: { token },
      message: 'Token para Socket.IO obtenido (válido por 7 días)'
    });
  }
);

export const forgotPassword = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    // VALIDATION: Email must match RUT/codigo/username - Updated 2025-01-29
    console.log('🔥🔥🔥 FORGOT PASSWORD CONTROLLER STARTED 🔥🔥🔥');
    const { email, tipoUsuario, rut, codigo, username } = req.body;
    console.log('📥 Request data:', { email, tipoUsuario, rut, codigo, username });

    if (!email) {
      return next(new AppError('Email es requerido', 400));
    }

    let user: any = null;
    let userModel: any = null;

    if (tipoUsuario === 'super_admin') {
      console.log('🔍 Buscando super admin...');

      if (!username) {
        console.log('❌ No se proporcionó username para super_admin');
        return next(new AppError('Nombre de usuario es requerido', 400));
      }

      userModel = SuperAdmin;
      user = await SuperAdmin.findOne({
        email: email.toLowerCase(),
        username: username.trim(),
        activo: true
      }).select('+passwordResetToken +passwordResetExpires');
      console.log('🔍 Super admin encontrado:', user ? 'SÍ' : 'NO');
    } else {
      // For socios, validate both email AND (rut OR codigo)
      if (!rut && !codigo) {
        console.log('❌ No se proporcionó RUT ni código');
        return next(new AppError('RUT o código de socio es requerido', 400));
      }

      userModel = User;

      // Build query to match email AND (rut OR codigoSocio)
      const query: any = {
        email: email.toLowerCase(),
        activo: true
      };

      // Add rut or codigo to query
      if (rut) {
        query.rut = rut.trim();
      } else if (codigo) {
        query.codigoSocio = codigo.trim();
      }

      console.log('🔍 Buscando socio con query:', query);
      user = await User.findOne(query).select('+passwordResetToken +passwordResetExpires');
      console.log('🔍 Usuario encontrado:', user ? 'SÍ' : 'NO');
    }

    if (!user) {
      console.log('⚠️  Usuario no encontrado - datos no coinciden');
      // Log failed attempt
      await createAuditLog(
        {
          id: 'unknown',
          tipo: tipoUsuario || 'socio',
          nombre: 'Usuario desconocido',
          identificador: email
        },
        'solicitud_reset_password_fallida',
        'autenticacion',
        `Solicitud de reset de contraseña fallida - datos no coinciden: ${email}`,
        { email, tipoUsuario, rut, codigo },
        'fallido',
        undefined,
        req
      );

      // Return specific error message
      let errorMsg = 'Los datos ingresados no coinciden';
      if (tipoUsuario === 'super_admin' && username) {
        errorMsg = 'El email no coincide con el nombre de usuario ingresado';
      } else if (rut) {
        errorMsg = 'El email no coincide con el RUT ingresado';
      } else if (codigo) {
        errorMsg = 'El email no coincide con el código de socio ingresado';
      }

      return next(new AppError(errorMsg, 400));
    }

    // Generate reset token
    const crypto = require('crypto');
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    user.passwordResetToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
    
    user.passwordResetExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await user.save({ validateBeforeSave: false });

    // Log successful request
    await createAuditLog(
      {
        id: (user._id as any).toString(),
        tipo: tipoUsuario === 'super_admin' ? 'super_admin' : 'socio',
        nombre: `${user.nombres} ${user.apellidos}`,
        identificador: tipoUsuario === 'super_admin' ? user.username : user.rut
      },
      'solicitud_reset_password',
      'autenticacion',
      'Solicitud de reset de contraseña exitosa',
      { email },
      'exitoso',
      undefined,
      req
    );

    // Send password reset email
    try {
      console.log(`📤 [AUTH CONTROLLER] Attempting to send password reset email to: ${email}`);
      console.log(`📤 [AUTH CONTROLLER] Reset token: ${resetToken.substring(0, 10)}...`);
      console.log(`📤 [AUTH CONTROLLER] User type: ${tipoUsuario}`);

      const emailResult = await emailService.sendPasswordReset(
        email,
        resetToken,
        tipoUsuario === 'super_admin' ? 'super_admin' : 'socio'
      );

      console.log(`📧 [AUTH CONTROLLER] Email result:`, emailResult);

      if (emailResult.success) {
        console.log(`✅ [AUTH CONTROLLER] Password reset email sent successfully to ${email}`);
      } else {
        console.warn(`⚠️  [AUTH CONTROLLER] Failed to send password reset email to ${email}:`, emailResult.error);
      }
    } catch (emailError) {
      console.error('❌ [AUTH CONTROLLER] Error sending password reset email:', emailError);
    }

    // Log the token for development
    console.log(`🔐 Password reset token for ${email}: ${resetToken}`);
    console.log(`🔐 Token expires at: ${user.passwordResetExpires}`);

    res.status(200).json({
      success: true,
      message: 'Si el email existe, se ha enviado un enlace de recuperación',
      // Remove in production - only for testing
      resetToken: process.env.NODE_ENV === 'development' ? resetToken : undefined
    });
  }
);

export const resetPassword = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { token, newPassword, tipoUsuario } = req.body;

    if (!token || !newPassword) {
      return next(new AppError('Token y nueva contraseña son requeridos', 400));
    }

    if (newPassword.length < 6) {
      return next(new AppError('La contraseña debe tener al menos 6 caracteres', 400));
    }

    // Hash the token to compare with stored hash
    const crypto = require('crypto');
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    let user: any = null;

    if (tipoUsuario === 'super_admin') {
      user = await SuperAdmin.findOne({
        passwordResetToken: hashedToken,
        passwordResetExpires: { $gt: Date.now() }
      }).select('+passwordResetToken +passwordResetExpires');
    } else {
      user = await User.findOne({
        passwordResetToken: hashedToken,
        passwordResetExpires: { $gt: Date.now() }
      }).select('+passwordResetToken +passwordResetExpires');
    }

    if (!user) {
      return next(new AppError('Token inválido o expirado', 400));
    }

    // Set new password
    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;

    await user.save();

    // Log successful password reset
    await createAuditLog(
      {
        id: (user._id as any).toString(),
        tipo: tipoUsuario === 'super_admin' ? 'super_admin' : 'socio',
        nombre: `${user.nombres} ${user.apellidos}`,
        identificador: tipoUsuario === 'super_admin' ? user.username : user.rut
      },
      'reset_password',
      'autenticacion',
      'Reset de contraseña exitoso',
      {},
      'exitoso',
      undefined,
      req
    );

    res.status(200).json({
      success: true,
      message: 'Contraseña actualizada exitosamente'
    });
  }
);

export const uploadAvatar = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const user = req.user!;
    const file = req.file;

    if (!file) {
      return next(new AppError('No se proporcionó ningún archivo', 400));
    }

    try {
      let profilePhotoUrl: string;
      let uploadMethod = 'uploadthing';

      try {
        // Upload to UploadThing
        console.log('🔄 Attempting UploadThing upload...');
        const fileExtension = path.extname(file.originalname);
        const filename = `avatar_${user.id}${fileExtension}`;

        profilePhotoUrl = await uploadFile(file.buffer, filename);
        console.log('✅ UploadThing upload successful!');
        console.log('📷 UploadThing URL:', profilePhotoUrl);
      } catch (uploadthingError) {
        console.warn('⚠️ UploadThing upload failed, using local storage fallback:', uploadthingError);
        uploadMethod = 'local';

        // Fallback to local storage
        const uploadsDir = path.join(process.cwd(), 'uploads', 'avatars');
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }

        // Generate filename
        const fileExtension = path.extname(file.originalname);
        const filename = `${user.id}${fileExtension}`;
        const filepath = path.join(uploadsDir, filename);

        // Save file to disk
        fs.writeFileSync(filepath, file.buffer);
        profilePhotoUrl = `/uploads/avatars/${filename}`;
        console.log('✅ Local upload successful:', profilePhotoUrl);
      }

      let updatedUser: any;

      if (user.tipo === 'super_admin') {
        const superAdmin = await SuperAdmin.findById(user.id);
        if (!superAdmin) {
          return next(new AppError('Super admin no encontrado', 404));
        }

        // Delete old image (handle UploadThing, Cloudinary and local storage)
        if (superAdmin.profilePhoto) {
          try {
            if (superAdmin.profilePhoto.includes('uploadthing.com')) {
              // Delete from UploadThing
              await deleteFile(superAdmin.profilePhoto);
              console.log('🗑️ Old UploadThing image deleted');
            } else if (superAdmin.profilePhoto.includes('cloudinary')) {
              // Delete from Cloudinary
              const publicId = `portal-online/avatars/avatar_${user.id}`;
              await cloudinary.uploader.destroy(publicId);
              console.log('🗑️ Old Cloudinary image deleted');
            } else if (superAdmin.profilePhoto.startsWith('/uploads/')) {
              // Delete from local storage
              const oldFilePath = path.join(process.cwd(), superAdmin.profilePhoto.substring(1));
              if (fs.existsSync(oldFilePath)) {
                fs.unlinkSync(oldFilePath);
                console.log('🗑️ Old local image deleted');
              }
            }
          } catch (deleteError) {
            console.warn('⚠️ Failed to delete old image:', deleteError);
          }
        }

        superAdmin.profilePhoto = profilePhotoUrl;
        await superAdmin.save();

        updatedUser = {
          id: (superAdmin._id as any).toString(),
          username: superAdmin.username,
          email: superAdmin.email,
          nombres: superAdmin.nombres,
          apellidos: superAdmin.apellidos,
          telefono: superAdmin.telefono,
          direccion: superAdmin.direccion,
          profilePhoto: superAdmin.profilePhoto,
          role: superAdmin.role,
          activo: superAdmin.activo
        };
      } else {
        const socio = await User.findById(user.id);
        if (!socio) {
          return next(new AppError('Usuario no encontrado', 404));
        }

        // Delete old image (handle UploadThing, Cloudinary and local storage)
        if (socio.profilePhoto) {
          try {
            if (socio.profilePhoto.includes('uploadthing.com')) {
              // Delete from UploadThing
              await deleteFile(socio.profilePhoto);
              console.log('🗑️ Old UploadThing image deleted');
            } else if (socio.profilePhoto.includes('cloudinary')) {
              // Delete from Cloudinary
              const publicId = `portal-online/avatars/avatar_${user.id}`;
              await cloudinary.uploader.destroy(publicId);
              console.log('🗑️ Old Cloudinary image deleted');
            } else if (socio.profilePhoto.startsWith('/uploads/')) {
              // Delete from local storage
              const oldFilePath = path.join(process.cwd(), socio.profilePhoto.substring(1));
              if (fs.existsSync(oldFilePath)) {
                fs.unlinkSync(oldFilePath);
                console.log('🗑️ Old local image deleted');
              }
            }
          } catch (deleteError) {
            console.warn('⚠️ Failed to delete old image:', deleteError);
          }
        }

        socio.profilePhoto = profilePhotoUrl;
        await socio.save();

        updatedUser = {
          id: (socio._id as any).toString(),
          rut: socio.rut,
          nombres: socio.nombres,
          apellidos: socio.apellidos,
          email: socio.email,
          telefono: socio.telefono,
          direccion: socio.direccion,
          profilePhoto: socio.profilePhoto,
          codigoSocio: socio.codigoSocio,
          activo: socio.activo
        };
      }

      // Log the avatar upload
      await createAuditLog(
        {
          id: user.id,
          tipo: user.tipo === 'super_admin' ? 'super_admin' : 'socio',
          nombre: `${user.nombres} ${user.apellidos}`,
          identificador: user.tipo === 'super_admin' ? (user.username || '') : (user.rut || '')
        },
        'subir_avatar',
        'perfil',
        'Avatar subido exitosamente',
        {
          uploadMethod,
          photoUrl: profilePhotoUrl,
          fileSize: file.size,
          isUploadThing: uploadMethod === 'uploadthing',
          isFallback: uploadMethod === 'local'
        },
        'exitoso',
        undefined,
        req
      );

      console.log('📤 Sending response:', {
        profilePhoto: profilePhotoUrl,
        uploadMethod,
        userId: user.id
      });

      res.status(200).json({
        success: true,
        data: {
          profilePhoto: profilePhotoUrl,
          user: updatedUser
        },
        message: 'Avatar subido exitosamente'
      });

    } catch (error) {
      console.error('Error uploading avatar:', error);
      return next(new AppError('Error al subir el avatar', 500));
    }
  }
);

export const removeAvatar = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const user = req.user!;

    try {
      let updatedUser: any;

      if (user.tipo === 'super_admin') {
        const superAdmin = await SuperAdmin.findById(user.id);
        if (!superAdmin) {
          return next(new AppError('Super admin no encontrado', 404));
        }

        // Remove old avatar from UploadThing, Cloudinary or local storage
        if (superAdmin.profilePhoto) {
          try {
            if (superAdmin.profilePhoto.includes('uploadthing.com')) {
              await deleteFile(superAdmin.profilePhoto);
              console.log('🗑️ UploadThing image deleted');
            } else if (superAdmin.profilePhoto.includes('cloudinary')) {
              const publicId = `portal-online/avatars/avatar_${user.id}`;
              await cloudinary.uploader.destroy(publicId);
              console.log('🗑️ Cloudinary image deleted');
            } else if (superAdmin.profilePhoto.startsWith('/uploads/')) {
              const oldFilePath = path.join(process.cwd(), superAdmin.profilePhoto.substring(1));
              if (fs.existsSync(oldFilePath)) {
                fs.unlinkSync(oldFilePath);
                console.log('🗑️ Local image deleted');
              }
            }
          } catch (deleteError) {
            console.warn('⚠️ Failed to delete image:', deleteError);
          }
        }

        superAdmin.profilePhoto = undefined;
        await superAdmin.save();

        updatedUser = {
          id: (superAdmin._id as any).toString(),
          username: superAdmin.username,
          email: superAdmin.email,
          nombres: superAdmin.nombres,
          apellidos: superAdmin.apellidos,
          telefono: superAdmin.telefono,
          direccion: superAdmin.direccion,
          profilePhoto: null,
          role: superAdmin.role,
          activo: superAdmin.activo
        };
      } else {
        const socio = await User.findById(user.id);
        if (!socio) {
          return next(new AppError('Usuario no encontrado', 404));
        }

        // Remove old avatar from UploadThing, Cloudinary or local storage
        if (socio.profilePhoto) {
          try {
            if (socio.profilePhoto.includes('uploadthing.com')) {
              await deleteFile(socio.profilePhoto);
              console.log('🗑️ UploadThing image deleted');
            } else if (socio.profilePhoto.includes('cloudinary')) {
              const publicId = `portal-online/avatars/avatar_${user.id}`;
              await cloudinary.uploader.destroy(publicId);
              console.log('🗑️ Cloudinary image deleted');
            } else if (socio.profilePhoto.startsWith('/uploads/')) {
              const oldFilePath = path.join(process.cwd(), socio.profilePhoto.substring(1));
              if (fs.existsSync(oldFilePath)) {
                fs.unlinkSync(oldFilePath);
                console.log('🗑️ Local image deleted');
              }
            }
          } catch (deleteError) {
            console.warn('⚠️ Failed to delete image:', deleteError);
          }
        }

        socio.profilePhoto = undefined;
        await socio.save();

        updatedUser = {
          id: (socio._id as any).toString(),
          rut: socio.rut,
          nombres: socio.nombres,
          apellidos: socio.apellidos,
          email: socio.email,
          telefono: socio.telefono,
          direccion: socio.direccion,
          profilePhoto: null,
          codigoSocio: socio.codigoSocio,
          activo: socio.activo
        };
      }

      // Log the avatar removal
      await createAuditLog(
        {
          id: user.id,
          tipo: user.tipo === 'super_admin' ? 'super_admin' : 'socio',
          nombre: `${user.nombres} ${user.apellidos}`,
          identificador: user.tipo === 'super_admin' ? (user.username || '') : (user.rut || '')
        },
        'eliminar_avatar',
        'perfil',
        'Avatar eliminado exitosamente',
        {},
        'exitoso',
        undefined,
        req
      );

      res.status(200).json({
        success: true,
        data: {
          profilePhoto: null,
          user: updatedUser
        },
        message: 'Avatar eliminado exitosamente'
      });

    } catch (error) {
      console.error('Error removing avatar:', error);
      return next(new AppError('Error al eliminar el avatar', 500));
    }
  }
);