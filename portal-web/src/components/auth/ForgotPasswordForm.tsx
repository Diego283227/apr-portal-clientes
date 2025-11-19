import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Mail, Droplets, CheckCircle2, AlertCircle, User, Home } from 'lucide-react';
import { toast } from 'sonner';
import passwordResetService from '@/services/passwordReset';
import { formatRUTInput } from '@/lib/utils';

interface ForgotPasswordFormProps {
  onBack: () => void;
}

export default function ForgotPasswordForm({ onBack }: ForgotPasswordFormProps) {
  const [email, setEmail] = useState('');
  const [loginType, setLoginType] = useState<'rut' | 'codigo'>('rut');
  const [identifier, setIdentifier] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');

  // Remove theme classes on mount (public area)
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!identifier.trim()) {
      const fieldName = loginType === 'rut' ? 'RUT' : 'código de socio';
      setError(`Por favor ingresa tu ${fieldName}`);
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
        tipoUsuario: 'socio',
        [loginType]: identifier.trim()
      });

      if (response.success) {
        setIsSubmitted(true);
        toast.success('Se ha enviado el enlace de recuperación');

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

  // Estilos inline para inputs
  const inputStyle: React.CSSProperties = {
    width: '100%',
    height: '48px',
    padding: '0 16px',
    borderRadius: '8px',
    border: '2px solid #e5e7eb',
    backgroundColor: '#ffffff',
    color: '#1f2937',
    fontSize: '16px',
    outline: 'none',
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen w-full bg-white relative overflow-hidden">
        <div className="relative min-h-screen flex gap-6 items-center justify-center px-6 py-12">
          
          {/* Left Side - APR Image (hidden on mobile) */}
          <div className="hidden lg:flex relative overflow-hidden rounded-3xl flex-shrink-0 self-stretch">
            <img
              src="/apr-rural.jpg"
              alt="APR Rural - Infraestructura de Agua Potable"
              className="w-[420px] h-full object-cover object-center rounded-3xl"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/30 rounded-3xl"></div>
          </div>

          {/* Right Side - Success Message */}
          <div className="w-full max-w-md flex items-center justify-center self-stretch">
            <div className="w-full bg-white border border-gray-200 rounded-2xl shadow-xl p-8">
              <div className="text-center mb-6">
                <div className="mx-auto mb-4 w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Email Enviado</h2>
              </div>
              <div className="text-center space-y-4">
                <p className="text-gray-600">
                  Se ha enviado un enlace de recuperación a <strong className="text-gray-900">{email}</strong>
                </p>
                <p className="text-sm text-gray-500">
                  Si no recibes el email en los próximos minutos, revisa tu carpeta de spam.
                </p>
                <div className="pt-4">
                  <Button
                    onClick={onBack}
                    className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Volver al login
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Back to Home Button */}
        <div className="absolute top-6 left-6">
          <Button
            onClick={onBack}
            variant="ghost"
            size="sm"
            className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          >
            <Home className="w-4 h-4 mr-2" />
            Inicio
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-white relative overflow-hidden">
      <div className="relative min-h-screen flex gap-6 items-center justify-center px-6 py-12">

        {/* Left Side - APR Image (hidden on mobile) */}
        <div className="hidden lg:flex relative overflow-hidden rounded-3xl flex-shrink-0 self-stretch">
          <img
            src="/apr-rural.jpg"
            alt="APR Rural - Infraestructura de Agua Potable"
            className="w-[420px] h-full object-cover object-center rounded-3xl"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/30 rounded-3xl"></div>
        </div>

        {/* Right Side - Form */}
        <div className="w-full max-w-md flex items-center justify-center self-stretch">
          <div className="w-full">

            {/* Mobile Header */}
            <div className="lg:hidden text-center mb-8">
              <div className="mx-auto mb-6 w-20 h-20 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Droplets className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent mb-2">
                Recuperar Contraseña
              </h1>
              <p className="text-gray-600">Te ayudamos a recuperar el acceso</p>
            </div>

            {/* Form Card */}
            <div className="bg-white border border-gray-200 rounded-2xl shadow-xl p-8">

              {/* Desktop Header */}
              <div className="hidden lg:block text-center mb-8">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent mb-2">
                  Recuperar Contraseña
                </h2>
                <p className="text-gray-600">Ingresa tus datos para recuperar tu cuenta</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">

                {/* Login Type Toggle */}
                <div className="flex gap-1 bg-gray-100 p-1.5 rounded-xl border border-gray-200">
                  <button
                    type="button"
                    onClick={() => setLoginType('rut')}
                    className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-all ${
                      loginType === 'rut'
                        ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <User className="w-4 h-4 inline mr-2" />
                    RUT
                  </button>
                  <button
                    type="button"
                    onClick={() => setLoginType('codigo')}
                    className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-all ${
                      loginType === 'codigo'
                        ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Código Socio
                  </button>
                </div>

                {/* Identifier Input */}
                <div className="space-y-2">
                  <Label className="text-gray-700 text-sm font-medium">
                    {loginType === 'rut' ? 'RUT' : 'Código de Socio'}
                  </Label>
                  <input
                    type="text"
                    placeholder={loginType === 'rut' ? '12.345.678-9' : 'Ingresa tu código'}
                    value={identifier}
                    onChange={(e) => {
                      const value = loginType === 'rut' ? formatRUTInput(e.target.value) : e.target.value;
                      setIdentifier(value);
                      setError('');
                    }}
                    style={inputStyle}
                    required
                    disabled={isLoading}
                  />
                </div>

                {/* Email Input */}
                <div className="space-y-2">
                  <Label className="text-gray-700 text-sm font-medium">
                    Correo Electrónico
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="email"
                      placeholder="tu-email@ejemplo.com"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setError('');
                      }}
                      style={{ ...inputStyle, paddingLeft: '48px' }}
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-sm">{error}</span>
                  </div>
                )}

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
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
                    className="text-cyan-600 text-sm font-medium hover:text-cyan-700 underline inline-flex items-center gap-2"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Volver al login
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Back to Home Button */}
      <div className="absolute top-6 left-6">
        <Button
          onClick={onBack}
          variant="ghost"
          size="sm"
          className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
        >
          <Home className="w-4 h-4 mr-2" />
          Inicio
        </Button>
      </div>
    </div>
  );
}
