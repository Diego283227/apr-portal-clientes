import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, EyeOff, Lock, Crown, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import passwordResetService from '@/services/passwordReset';
import { useQueryClient } from '@tanstack/react-query';

interface ResetPasswordAdminFormProps {
  token: string;
  onSuccess: () => void;
}

export default function ResetPasswordAdminForm({ token, onSuccess }: ResetPasswordAdminFormProps) {
  const queryClient = useQueryClient();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      setError('Token de recuperación no válido');
    }
  }, [token]);

  const validatePassword = (pass: string): string[] => {
    const errors: string[] = [];
    
    if (pass.length < 8) {
      errors.push('Debe tener al menos 8 caracteres');
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
        tipoUsuario: 'super_admin'
      });

      if (response.success) {
        // Show success toast
        toast.success('¡Contraseña administrativa actualizada exitosamente!', {
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

          // Force redirect to admin login with page reload
          window.location.replace(window.location.origin + window.location.pathname + '#admin-login');
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

  if (isSuccess) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 relative overflow-hidden flex items-center justify-center p-6">
        <div className="absolute inset-0 bg-grid-pattern opacity-30"></div>
        
        <Card className="w-full max-w-md backdrop-blur-xl bg-white/10 border-white/20">
          <CardHeader className="text-center pb-6">
            <div className="mx-auto w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-400" />
            </div>
            <CardTitle className="text-xl font-bold text-white">¡Contraseña Actualizada!</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-blue-100/80">
              Tu contraseña administrativa ha sido actualizada exitosamente.
            </p>
            <p className="text-sm text-blue-100/60">
              Serás redirigido al login administrativo en unos segundos...
            </p>
            <div className="pt-4">
              <Button
                onClick={() => {
                  localStorage.removeItem('token');
                  localStorage.removeItem('user');
                  onSuccess();
                }}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white"
              >
                Ir al Login Administrativo
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

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
            <p className="text-blue-100/80">
              El enlace de recuperación no es válido o ha expirado.
            </p>
            <p className="text-sm text-blue-100/60">
              Por favor solicita un nuevo enlace de recuperación.
            </p>
            <div className="pt-4">
              <Button 
                onClick={onSuccess}
                variant="outline"
                className="w-full bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                Volver al Login Administrativo
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 relative overflow-hidden">
      <div className="absolute inset-0 bg-grid-pattern opacity-30"></div>
      
      <div className="relative min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          
          {/* Header */}
          <div className="text-center mb-8">
            <div className="mx-auto w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center mb-6">
              <Crown className="w-10 h-10 text-blue-300" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Nueva Contraseña Admin</h1>
            <p className="text-blue-100/70">Ingresa tu nueva contraseña administrativa</p>
          </div>

          {/* Form Card */}
          <Card className="backdrop-blur-xl bg-white/10 border-white/20">
            <CardHeader>
              <CardTitle className="text-center text-white">Restablecer Contraseña Administrativa</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">

                {/* New Password Input */}
                <div className="space-y-3">
                  <Label className="text-white/90 text-sm font-medium">
                    Nueva Contraseña
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Ingresa tu nueva contraseña"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setError('');
                      }}
                      className="h-12 pl-11 pr-11"
                      style={{
                        backgroundColor: 'rgba(0, 0, 0, 0.4) !important',
                        borderColor: 'rgba(255, 255, 255, 0.7) !important',
                        color: 'white !important',
                        borderWidth: '1px',
                        borderStyle: 'solid'
                      }}
                      required
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/80 hover:text-white transition-colors p-1.5"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <p className="text-xs text-blue-100/60">
                    Debe tener al menos 8 caracteres (recomendado para cuentas administrativas)
                  </p>
                </div>

                {/* Confirm Password Input */}
                <div className="space-y-3">
                  <Label className="text-white/90 text-sm font-medium">
                    Confirmar Contraseña
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" />
                    <Input
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirma tu nueva contraseña"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        setError('');
                      }}
                      className="h-12 pl-11 pr-11"
                      style={{
                        backgroundColor: 'rgba(0, 0, 0, 0.4) !important',
                        borderColor: 'rgba(255, 255, 255, 0.7) !important',
                        color: 'white !important',
                        borderWidth: '1px',
                        borderStyle: 'solid'
                      }}
                      required
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/80 hover:text-white transition-colors p-1.5"
                    >
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* Error Message */}
                {error && (
                  <Alert className="bg-red-500/10 border-red-500/20 text-red-200">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Actualizando contraseña...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Lock className="w-4 h-4" />
                      Actualizar Contraseña Administrativa
                    </div>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Floating Elements */}
      <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-500/20 rounded-full blur-3xl"></div>
      <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl"></div>
    </div>
  );
}