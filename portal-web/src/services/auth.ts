import { apiClient } from './api';

export interface LoginCredentials {
  rut?: string;
  username?: string;
  password: string;
  tipoUsuario: 'socio' | 'admin' | 'super_admin';
}

export interface RegisterData {
  rut: string;
  nombres: string;
  apellidos: string;
  email: string;
  telefono?: string;
  direccion?: string;
  password: string;
  confirmPassword: string;
}

export interface User {
  id: string;
  rut?: string;
  username?: string;
  nombres: string;
  apellidos: string;
  email: string;
  telefono?: string;
  direccion?: string;
  role: 'socio' | 'admin' | 'super_admin';
  fechaIngreso?: string;
  activo?: boolean;
  ultimoAcceso?: string;
  fechaCreacion?: string;
  permisos?: any;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data?: {
    user: User;
    token?: string;
  };
}

export const authService = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await apiClient.post('/auth/login', credentials);
    return response.data;
  },

  register: async (data: RegisterData): Promise<AuthResponse> => {
    const response = await apiClient.post('/auth/register', data);
    return response.data;
  },

  logout: async (): Promise<void> => {
    await apiClient.post('/auth/logout');
  },

  refresh: async (): Promise<AuthResponse> => {
    const response = await apiClient.post('/auth/refresh');
    return response.data;
  },

  getProfile: async (): Promise<AuthResponse> => {
    const response = await apiClient.get('/socios/profile');
    return response.data;
  },
};