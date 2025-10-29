import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:7781/api';

export interface ForgotPasswordRequest {
  email: string;
  tipoUsuario: 'socio' | 'super_admin';
  rut?: string; // For socio verification
  codigo?: string; // For socio verification
  username?: string; // For super_admin verification
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
  tipoUsuario: 'socio' | 'super_admin';
}

export interface PasswordResetResponse {
  success: boolean;
  message: string;
  resetToken?: string; // Only in development
}

class PasswordResetService {
  async forgotPassword(data: ForgotPasswordRequest): Promise<PasswordResetResponse> {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/forgot-password`, data);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || 'Error al solicitar recuperación de contraseña');
      }
      throw new Error('Error de conexión');
    }
  }

  async resetPassword(data: ResetPasswordRequest): Promise<PasswordResetResponse> {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/reset-password`, data);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || 'Error al restablecer contraseña');
      }
      throw new Error('Error de conexión');
    }
  }
}

export const passwordResetService = new PasswordResetService();
export default passwordResetService;