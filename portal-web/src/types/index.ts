export type UserRole = 'socio' | 'super_admin';

export interface User {
  id: string;
  rut: string;
  nombres: string;
  apellidos: string;
  email: string;
  telefono?: string;
  role: UserRole;
  codigoSocio?: string;
  direccion?: string;
  fechaIngreso: string;
  saldoActual?: number;
  deudaTotal?: number;
  permisos?: string[];
}

export interface Socio extends User {
  role: 'socio';
  codigoSocio: string;
  saldoActual: number;
  deudaTotal: number;
}

export interface SuperAdmin extends User {
  role: 'super_admin';
  permisos: string[];
}

export interface Boleta {
  id: string;
  numeroBoleta: string;
  socioId: string;
  socio: Socio;
  fechaEmision: string;
  fechaVencimiento: string;
  consumoM3: number;
  montoTotal: number;
  estado: 'pendiente' | 'pagada' | 'vencida';
  pagada?: boolean; // Marca permanente de si fue pagada alguna vez
  fechaPago?: string; // Fecha en que se marcó como pagada
  detalle: {
    consumoAnterior: number;
    consumoActual: number;
    tarifaM3: number;
    cargoFijo: number;
    otrosCargos?: number;
    descuentos?: number;
  };
  lecturaAnterior: number;
  lecturaActual: number;
  periodo: string; // YYYY-MM
}

export interface Pago {
  id: string;
  boletaId: string;
  socioId: string;
  monto: number;
  fechaPago: string;
  metodoPago: 'webpay' | 'flow' | 'transferencia' | 'efectivo';
  estadoPago: 'pendiente' | 'completado' | 'fallido' | 'reembolsado';
  transactionId?: string;
  transaccionId?: string; // Alternative field name
  comprobantePdf?: string;
  observaciones?: string;
}

export interface PaymentMethod {
  id: string;
  nombre: string;
  tipo: 'webpay' | 'flow' | 'transferencia';
  activo: boolean;
  configuracion: {
    [key: string]: string;
  };
}

export interface DashboardStats {
  totalSocios: number;
  boletasPendientes: number;
  boletasPagadas: number;
  ingresosTotales: number;
  ingresosMes: number;
  morosidad: number;
}

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken: string;
}

export interface LoginCredentials {
  rut?: string;
  codigoSocio?: string;
  password: string;
}

export interface RegisterData {
  rut: string;
  nombre: string;
  email: string;
  telefono?: string;
  direccion?: string;
  password: string;
  confirmPassword: string;
}