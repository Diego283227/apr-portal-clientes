import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, EyeOff, Droplets, AlertCircle, Lock } from 'lucide-react';
import { toast } from 'sonner';
import passwordResetService from '@/services/passwordReset';
import { useQueryClient } from '@tanstack/react-query';

interface ResetPasswordFormProps {
  token: string;
  onSuccess: () => void;
}

export default function ResetPasswordForm({ token, onSuccess }: ResetPasswordFormProps) {
  const queryClient = useQueryClient();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Shared input class for consistency
  const inputClassName = "w-full h-12 px-4 pr-12 rounded-lg border-2 border-white/30 bg-white/10 text-white placeholder:text-white/50 focus:outline-none focus:border-cyan-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

  const buttonClassName = "absolute right-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white transition-colors p-1 cursor-pointer";

  useEffect(() => {
    if (!token) {
      setError('Token de recuperación no válido');
    }
  }, [token]);

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
        // Show success toast
        toast.success('¡Contraseña actualizada exitosamente!', {
          duration: 3000,
        });

        // Wait 2 seconds then force redirect
        setTimeout(() => {
          // Clear everything
          localStorage.clear();
          sessionStorage.clear();

          // Clear React Query cache
          queryClient.clear();
          queryClient.setQueryData(['user'], null);
          queryClient.cancelQueries({ queryKey: ['user'] });

          // Force redirect to login with page reload
          window.location.replace(window.location.origin + window.location.pathname + '#login');
        }, 2000);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      setError(errorMessage);
      toast.error('Error al restablecer contraseña');
    } finally {
      setIsLoading(false);
    }
  };

  // Invalid Token Screen
  if (!token) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 relative overflow-hidden flex items-center justify-center p-6">
        <div className="absolute inset-0 bg-grid-pattern opacity-30"></div>
        <Card className="w-full max-w-md backdrop-blur-xl bg-white/10 border-white/20">
          <CardHeader className="text-center pb-6">
            <div className="mx-auto w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="w-8 h-8 text-red-400" />
            </div>
            <CardTitle className="text-xl font-bold text-white">Enlace No Válido</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-blue-100/80">El enlace de recuperación no es válido o ha expirado.</p>
            <p className="text-sm text-blue-100/60">Por favor solicita un nuevo enlace de recuperación.</p>
            <div className="pt-4">
              <Button
                onClick={onSuccess}
                variant="outline"
                className="w-full bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                Volver al Login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main Reset Password Form
  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-blue-900 via-cyan-800 to-blue-900 relative overflow-hidden">
      <div className="absolute inset-0 bg-grid-pattern opacity-30"></div>

      {/* APR Rural Background Image */}
      <div className="absolute inset-0 z-0">
        <div className="relative w-full h-full">
          <img
            src="/apr-rural.jpg"
            alt="APR Rural - Tanques de agua azules"
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
          <Card className="backdrop-blur-xl bg-white/10 border-white/20 shadow-2xl">
            <CardHeader>
              <CardTitle className="text-center text-white text-xl">Restablecer Contraseña</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">

                {/* Nueva Contraseña */}
                <div className="space-y-2">
                  <label className="block text-white text-sm font-medium">Nueva Contraseña</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Ingresa tu nueva contraseña"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setError('');
                      }}
                      className={inputClassName}
                      required
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className={buttonClassName}
                      tabIndex={-1}
                      disabled={isLoading}
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                  <p className="text-xs text-cyan-200/60">Debe tener al menos 6 caracteres</p>
                </div>

                {/* Confirmar Contraseña */}
                <div className="space-y-2">
                  <label className="block text-white text-sm font-medium">Confirmar Contraseña</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirma tu nueva contraseña"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        setError('');
                      }}
                      className={inputClassName}
                      required
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className={buttonClassName}
                      tabIndex={-1}
                      disabled={isLoading}
                    >
                      {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                {/* Error Message */}
                {error && (
                  <Alert className="bg-red-500/10 border-red-500/30 text-red-200">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center gap-3">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Actualizando contraseña...
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2">
                      <Lock className="w-4 h-4" />
                      Actualizar Contraseña
                    </div>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Floating Elements */}
      <div className="absolute -top-10 -right-10 w-40 h-40 bg-cyan-500/30 rounded-full blur-3xl"></div>
      <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-blue-500/30 rounded-full blur-3xl"></div>
      <div className="absolute top-1/2 right-1/3 w-32 h-32 bg-teal-400/20 rounded-full blur-2xl"></div>
    </div>
  );
}
