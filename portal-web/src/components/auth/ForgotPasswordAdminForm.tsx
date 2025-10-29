import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Mail, Droplets, CheckCircle2, AlertCircle, Crown } from 'lucide-react';
import { toast } from 'sonner';
import passwordResetService from '@/services/passwordReset';

interface ForgotPasswordAdminFormProps {
  onBack: () => void;
}

export default function ForgotPasswordAdminForm({ onBack }: ForgotPasswordAdminFormProps) {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username.trim()) {
      setError('Por favor ingresa tu nombre de usuario');
      return;
    }

    if (!email.trim()) {
      setError('Por favor ingresa tu email');
      return;
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Por favor ingresa un email válido');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await passwordResetService.forgotPassword({
        email: email.trim().toLowerCase(),
        tipoUsuario: 'super_admin',
        username: username.trim()
      });

      if (response.success) {
        setIsSubmitted(true);
        toast.success('Se ha enviado el enlace de recuperación');
        
        // In development, show the token
        if (response.resetToken && import.meta.env.DEV) {
          console.log('🔐 Token de desarrollo:', response.resetToken);
          toast.info(`Token de desarrollo: ${response.resetToken.substring(0, 10)}...`);
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      setError(errorMessage);
      toast.error('Error al solicitar recuperación de contraseña');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 relative overflow-hidden flex items-center justify-center p-6">
        <div className="absolute inset-0 bg-grid-pattern opacity-30"></div>
        
        <Card className="w-full max-w-md backdrop-blur-xl bg-white/10 border-white/20">
          <CardHeader className="text-center pb-6">
            <div className="mx-auto w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-400" />
            </div>
            <CardTitle className="text-xl font-bold text-white">Email Enviado</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-blue-100/80">
              Se ha enviado un enlace de recuperación a <strong className="text-white">{email}</strong>
            </p>
            <p className="text-sm text-blue-100/60">
              Si no recibes el email en los próximos minutos, revisa tu carpeta de spam.
            </p>
            <div className="pt-4">
              <Button 
                onClick={onBack}
                variant="outline"
                className="w-full bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver al login
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
            <h1 className="text-3xl font-bold text-white mb-2">Recuperar Acceso Admin</h1>
            <p className="text-blue-100/70">Te ayudamos a recuperar el acceso a tu cuenta de administrador</p>
          </div>

          {/* Form Card */}
          <Card className="backdrop-blur-xl bg-white/10 border-white/20">
            <CardHeader>
              <CardTitle className="text-center text-white">Recuperar Acceso Administrativo</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                
                {/* Username Input */}
                <div className="space-y-3">
                  <Label className="text-white/90 text-sm font-medium">
                    Nombre de Usuario
                  </Label>
                  <Input
                    type="text"
                    placeholder="tu-usuario-admin"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      setError('');
                    }}
                    className="h-12"
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
                </div>

                {/* Email Input */}
                <div className="space-y-3">
                  <Label className="text-white/90 text-sm font-medium">
                    Correo Electrónico
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" />
                    <Input
                      type="email"
                      placeholder="admin@ejemplo.com"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setError('');
                      }}
                      className="h-12 pl-11"
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
                      Enviando enlace...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      Enviar Enlace de Recuperación
                    </div>
                  )}
                </Button>

                {/* Back Link */}
                <div className="text-center pt-4">
                  <button
                    type="button"
                    onClick={onBack}
                    className="text-blue-200 hover:text-white text-sm transition-colors underline underline-offset-2 flex items-center justify-center gap-2 mx-auto"
                    style={{
                      background: 'none !important',
                      backgroundColor: 'transparent !important',
                      border: 'none !important',
                      boxShadow: 'none !important',
                      outline: 'none !important'
                    }}
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Volver al login administrativo
                  </button>
                </div>
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