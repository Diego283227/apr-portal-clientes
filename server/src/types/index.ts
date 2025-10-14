import { Request } from 'express';

// User types
export interface User {
  id: string;
  rut: string;
  nombres: string;
  apellidos: string;
  email: string;
  role: UserRole;
  tipo?: 'socio' | 'admin' | 'super_admin';
  telefono?: string;
  direccion?: string;
  fechaIngreso: string;
  codigoSocio?: string;
  saldoActual?: number;
  deudaTotal?: number;
  permisos?: string[];
  profilePhoto?: string;
  username?: string;
}

// SuperAdmin type (separate collection)
export interface SuperAdminUser {
  id: string;
  username: string;
  email: string;
  nombres: string;
  apellidos: string;
  role: 'super_admin';
  tipo: 'super_admin';
  activo: boolean;
  ultimoAcceso?: string;
  fechaCreacion: string;
  profilePhoto?: string;
  telefono?: string;
  direccion?: string;
  permisos: {
    gestionUsuarios: boolean;
    gestionBoletas: boolean;
    gestionPagos: boolean;
    reportes: boolean;
    configuracion: boolean;
    auditoria: boolean;
  };
}

export type UserRole = 'socio' | 'admin' | 'super_admin';

// Auth types
export interface LoginCredentials {
  rut?: string; // For socios/admins
  username?: string; // For super_admins
  password: string;
  tipoUsuario: UserRole;
}

export interface RegisterData {
  rut: string;
  nombres: string;
  apellidos: string;
  email: string;
  telefono?: string;
  direccion?: string;
  password: string;
  confirmPassword?: string;
}

export interface AuthResponse {
  success: boolean;
  data?: {
    user: User;
    token?: string;
    refreshToken?: string;
  };
  message: string;
}

export interface JWTPayload {
  userId: string;
  rut: string;
  role: UserRole;
  iat: number;
  exp: number;
}

// Request with user
export interface AuthenticatedRequest extends Request {
  user?: User | SuperAdminUser;
}

// Boleta types
export interface Boleta {
  id: string;
  numeroBoleta: string;
  socioId: string;
  socio?: User;
  fechaEmision: string;
  fechaVencimiento: string;
  consumoM3: number;
  montoTotal: number;
  estado: 'pendiente' | 'pagada' | 'vencida' | 'anulada';
  detalle: BoletaDetalle;
  lecturaAnterior: number;
  lecturaActual: number;
  periodo: string;
}

export interface BoletaDetalle {
  consumoAnterior: number;
  consumoActual: number;
  tarifaM3: number;
  cargoFijo: number;
  otrosCargos: number;
  descuentos: number;
}

// Payment types
export interface PaymentMethod {
  id: string;
  nombre: string;
  tipo: 'webpay' | 'flow' | 'mercadopago';
  activo: boolean;
  configuracion: Record<string, any>;
}

export interface Payment {
  id: string;
  boletaId: string;
  socioId: string;
  monto: number;
  fechaPago: string;
  metodoPago: 'paypal' | 'webpay' | 'transferencia' | 'efectivo';
  estadoPago: 'pendiente' | 'completado' | 'fallido' | 'reembolsado';
  transactionId?: string;
  boleta?: Boleta;
}

// Dashboard types
export interface DashboardStats {
  totalSocios: number;
  boletasPendientes: number;
  boletasPagadas: number;
  ingresosTotales: number;
  ingresosMes: number;
  morosidad: number;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message: string;
  errors?: string[];
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Error types
export interface ApiError extends Error {
  statusCode: number;
  isOperational: boolean;
}