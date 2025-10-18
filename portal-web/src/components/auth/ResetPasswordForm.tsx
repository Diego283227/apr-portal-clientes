import { useState } from 'react';
import { Eye, EyeOff, Droplets, AlertCircle, Lock } from 'lucide-react';
import { toast } from 'sonner';
import passwordResetService from '@/services/passwordReset';

interface ResetPasswordFormProps {
  token: string;
  onSuccess: () => void;
}

export default function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const validatePassword = (pass: string): string[] => {
    const errors: string[] = [];
    if (pass.length < 6) {
      errors.push('Debe tener al menos 6 caracteres');
    }
    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password || !confirmPassword) {
      setError('Por favor completa todos los campos');
      return;
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    const passwordErrors = validatePassword(password);
    if (passwordErrors.length > 0) {
      setError(passwordErrors[0]);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await passwordResetService.resetPassword({
        token,
        newPassword: password,
        tipoUsuario: 'socio'
      });

      if (response.success) {
        toast.success('¡Contraseña actualizada exitosamente!', {
          duration: 2000,
        });

        // Store flag to redirect to login after page reload
        try {
          sessionStorage.setItem('redirect_to_login', 'true');
        } catch {
          // Ignore
        }

        // Clear auth storage and redirect to homepage
        setTimeout(() => {
          try {
            localStorage.clear();
          } catch {
            // Ignore errors
          }

          // Reload homepage - App.tsx will check redirect flag
          window.location.replace(window.location.origin + window.location.pathname);
        }, 1500);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      setError(errorMessage);
      toast.error('Error al restablecer contraseña');
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 relative overflow-hidden flex items-center justify-center p-6">
        <div className="absolute inset-0 bg-grid-pattern opacity-30"></div>
        <div className="w-full max-w-md backdrop-blur-xl bg-white/10 border-2 border-white/20 rounded-2xl shadow-2xl p-8">
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="w-8 h-8 text-red-400" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Enlace No Válido</h2>
            <p className="text-blue-100/80 mb-4">El enlace de recuperación no es válido o ha expirado.</p>
            <p className="text-sm text-blue-100/60 mb-6">Por favor solicita un nuevo enlace de recuperación.</p>
            <button
              onClick={() => window.location.href = window.location.origin + window.location.pathname + '#login'}
              className="w-full px-4 py-2 bg-white/10 border-2 border-white/20 text-white rounded-lg hover:bg-white/20 transition-colors"
            >
              Volver al Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-blue-900 via-cyan-800 to-blue-900 relative overflow-hidden">
      <div className="absolute inset-0 bg-grid-pattern opacity-30"></div>

      <div className="absolute inset-0 z-0">
        <div className="relative w-full h-full">
          <img
            src="/apr-rural.jpg"
            alt="APR Rural"
            className="w-full h-full object-cover opacity-15"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/10 via-blue-600/20 to-blue-900/40"></div>
        </div>
      </div>

      <div className="relative min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="mx-auto w-20 h-20 bg-gradient-to-r from-cyan-400 via-blue-500 to-cyan-600 rounded-2xl flex items-center justify-center mb-6 shadow-xl border-2 border-cyan-300/50">
              <Droplets className="w-10 h-10 text-white drop-shadow-md" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-200 to-blue-200 bg-clip-text text-transparent mb-2">
              Nueva Contraseña
            </h1>
            <p className="text-cyan-100/70">Ingresa tu nueva contraseña</p>
          </div>

          {/* Form Card */}
          <div className="backdrop-blur-xl bg-white/10 border-2 border-white/20 rounded-2xl shadow-2xl p-8">
            <h2 className="text-center text-white text-xl font-semibold mb-6">Restablecer Contraseña</h2>

            <form onSubmit={handleSubmit} className="space-y-5">

              {/* Confirmar Contraseña PRIMERO */}
              <div>
                <label htmlFor="password2" className="block text-white text-sm font-medium mb-2">
                  Confirmar Contraseña
                </label>
                <div className="relative">
                  <input
                    id="password2"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      setError('');
                    }}
                    placeholder="Confirma tu nueva contraseña"
                    className="w-full h-12 px-4 pr-12 rounded-lg border-2 border-white/30 bg-white/10 text-white placeholder:text-white/50 focus:outline-none focus:border-cyan-400 transition-colors"
                    required
                    disabled={isLoading}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-white/70 hover:text-white transition-colors"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              {/* Nueva Contraseña SEGUNDO */}
              <div>
                <label htmlFor="password1" className="block text-white text-sm font-medium mb-2">
                  Nueva Contraseña
                </label>
                <div className="relative">
                  <input
                    id="password1"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError('');
                    }}
                    placeholder="Ingresa tu nueva contraseña"
                    className="w-full h-12 px-4 pr-12 rounded-lg border-2 border-white/30 bg-white/10 text-white placeholder:text-white/50 focus:outline-none focus:border-cyan-400 transition-colors"
                    required
                    disabled={isLoading}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-white/70 hover:text-white transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                <p className="text-xs text-cyan-200/60 mt-1">Debe tener al menos 6 caracteres</p>
              </div>


              {/* Error Message */}
              {error && (
                <div className="bg-red-500/10 border-2 border-red-500/30 text-red-200 rounded-lg p-3 flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                  <p className="text-sm">{error}</p>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Actualizando contraseña...
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    Actualizar Contraseña
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Floating Elements */}
      <div className="absolute -top-10 -right-10 w-40 h-40 bg-cyan-500/30 rounded-full blur-3xl"></div>
      <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-blue-500/30 rounded-full blur-3xl"></div>
      <div className="absolute top-1/2 right-1/3 w-32 h-32 bg-teal-400/20 rounded-full blur-2xl"></div>
    </div>
  );
}
