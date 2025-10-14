import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Mail, Droplets, CheckCircle2, AlertCircle, User } from 'lucide-react';
import { toast } from 'sonner';
import passwordResetService from '@/services/passwordReset';

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
        [loginType]: identifier.trim() // Envía el RUT o código según el tipo seleccionado
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

  // Estilos inline
  const inputStyle: React.CSSProperties = {
    width: '100%',
    height: '48px',
    padding: '0 16px',
    borderRadius: '8px',
    border: '2px solid rgba(255, 255, 255, 0.3)',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    color: '#ffffff',
    fontSize: '16px',
    outline: 'none',
  };

  if (isSubmitted) {
    return (
      <div style={{
        minHeight: '100vh',
        width: '100%',
        background: 'linear-gradient(to bottom right, #1e3a8a, #0e7490, #1e3a8a)',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px'
      }}>
        <div style={{ position: 'absolute', inset: 0, opacity: 0.3 }} className="bg-grid-pattern"></div>

        <div style={{
          width: '100%',
          maxWidth: '28rem',
          backdropFilter: 'blur(20px)',
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: '16px',
          padding: '32px'
        }}>
          <div style={{ textAlign: 'center', paddingBottom: '24px' }}>
            <div style={{
              margin: '0 auto 16px',
              width: '64px',
              height: '64px',
              backgroundColor: 'rgba(34, 197, 94, 0.2)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <CheckCircle2 style={{ width: '32px', height: '32px', color: '#4ade80' }} />
            </div>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#ffffff', marginBottom: '8px' }}>Email Enviado</h2>
          </div>
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <p style={{ color: 'rgba(191, 219, 254, 0.8)' }}>
              Se ha enviado un enlace de recuperación a <strong style={{ color: '#ffffff' }}>{email}</strong>
            </p>
            <p style={{ fontSize: '14px', color: 'rgba(191, 219, 254, 0.6)' }}>
              Si no recibes el email en los próximos minutos, revisa tu carpeta de spam.
            </p>
            <div style={{ paddingTop: '16px' }}>
              <Button
                onClick={onBack}
                variant="outline"
                className="w-full bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                <ArrowLeft style={{ width: '16px', height: '16px', marginRight: '8px' }} />
                Volver al login
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      width: '100%',
      background: 'linear-gradient(to bottom right, #1e3a8a, #0e7490, #1e3a8a)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <div style={{ position: 'absolute', inset: 0, opacity: 0.3 }} className="bg-grid-pattern"></div>

      {/* APR Rural Background Image */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
          <img
            src="/apr-rural.jpg"
            alt="APR Rural"
            style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.15 }}
          />
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to bottom, rgba(6, 182, 212, 0.1), rgba(37, 99, 235, 0.2), rgba(30, 58, 138, 0.4))'
          }}></div>
        </div>
      </div>

      <div style={{
        position: 'relative',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px'
      }}>
        <div style={{ width: '100%', maxWidth: '28rem' }}>

          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{
              margin: '0 auto 24px',
              width: '80px',
              height: '80px',
              background: 'linear-gradient(to right, #22d3ee, #3b82f6, #22d3ee)',
              borderRadius: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
              border: '2px solid rgba(103, 232, 249, 0.5)'
            }}>
              <Droplets style={{ width: '40px', height: '40px', color: 'white' }} />
            </div>
            <h1 style={{
              fontSize: '30px',
              fontWeight: 'bold',
              background: 'linear-gradient(to right, #a5f3fc, #bfdbfe)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginBottom: '8px'
            }}>Recuperar Contraseña</h1>
            <p style={{ color: 'rgba(207, 250, 254, 0.7)' }}>Te ayudamos a recuperar el acceso a tu cuenta</p>
          </div>

          {/* Form Card */}
          <div style={{
            backdropFilter: 'blur(20px)',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '16px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            padding: '32px'
          }}>
            <h2 style={{
              textAlign: 'center',
              color: '#ffffff',
              fontSize: '20px',
              fontWeight: '600',
              marginBottom: '24px'
            }}>Recuperar Acceso</h2>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

              {/* Login Type Toggle */}
              <div style={{
                display: 'flex',
                gap: '4px',
                backgroundColor: 'rgba(0, 0, 0, 0.3)',
                padding: '6px',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.2)'
              }}>
                <button
                  type="button"
                  onClick={() => setLoginType('rut')}
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    borderRadius: '8px',
                    fontWeight: '600',
                    border: 'none',
                    cursor: 'pointer',
                    background: loginType === 'rut' ? 'linear-gradient(to right, #06b6d4, #2563eb)' : 'transparent',
                    color: loginType === 'rut' ? '#ffffff' : '#d1d5db',
                    boxShadow: loginType === 'rut' ? '0 10px 15px -3px rgba(0, 0, 0, 0.1)' : 'none',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  <User style={{ width: '16px', height: '16px' }} />
                  RUT
                </button>
                <button
                  type="button"
                  onClick={() => setLoginType('codigo')}
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    borderRadius: '8px',
                    fontWeight: '600',
                    border: 'none',
                    cursor: 'pointer',
                    background: loginType === 'codigo' ? 'linear-gradient(to right, #06b6d4, #2563eb)' : 'transparent',
                    color: loginType === 'codigo' ? '#ffffff' : '#d1d5db',
                    boxShadow: loginType === 'codigo' ? '0 10px 15px -3px rgba(0, 0, 0, 0.1)' : 'none',
                    transition: 'all 0.2s'
                  }}
                >
                  Código Socio
                </button>
              </div>

              {/* Identifier Input */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <Label style={{ color: '#ffffff', fontSize: '14px', fontWeight: '500' }}>
                  {loginType === 'rut' ? 'RUT' : 'Código de Socio'}
                </Label>
                <input
                  type="text"
                  placeholder={loginType === 'rut' ? '12.345.678-9' : 'Ingresa tu código'}
                  value={identifier}
                  onChange={(e) => {
                    setIdentifier(e.target.value);
                    setError('');
                  }}
                  style={inputStyle}
                  required
                  disabled={isLoading}
                />
              </div>

              {/* Email Input */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <Label style={{ color: '#ffffff', fontSize: '14px', fontWeight: '500' }}>
                  Correo Electrónico
                </Label>
                <div style={{ position: 'relative' }}>
                  <Mail style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '20px',
                    height: '20px',
                    color: 'rgba(255, 255, 255, 0.5)'
                  }} />
                  <input
                    type="email"
                    placeholder="tu-email@ejemplo.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError('');
                    }}
                    style={{ ...inputStyle, paddingLeft: '44px' }}
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  color: '#fca5a5',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <AlertCircle style={{ width: '16px', height: '16px' }} />
                  <span style={{ fontSize: '14px' }}>{error}</span>
                </div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
              >
                {isLoading ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '16px',
                      height: '16px',
                      border: '2px solid rgba(255, 255, 255, 0.3)',
                      borderTopColor: '#ffffff',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }} />
                    Enviando enlace...
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Mail style={{ width: '16px', height: '16px' }} />
                    Enviar Enlace de Recuperación
                  </div>
                )}
              </Button>

              {/* Back Link */}
              <div style={{ textAlign: 'center', paddingTop: '16px' }}>
                <button
                  type="button"
                  onClick={onBack}
                  style={{
                    color: '#bfdbfe',
                    fontSize: '14px',
                    textDecoration: 'underline',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    margin: '0 auto'
                  }}
                >
                  <ArrowLeft style={{ width: '16px', height: '16px' }} />
                  Volver al login
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Floating Elements */}
      <div style={{
        position: 'absolute',
        top: '-40px',
        right: '-40px',
        width: '160px',
        height: '160px',
        backgroundColor: 'rgba(6, 182, 212, 0.3)',
        borderRadius: '50%',
        filter: 'blur(64px)'
      }}></div>
      <div style={{
        position: 'absolute',
        bottom: '-64px',
        left: '-64px',
        width: '192px',
        height: '192px',
        backgroundColor: 'rgba(59, 130, 246, 0.3)',
        borderRadius: '50%',
        filter: 'blur(64px)'
      }}></div>
    </div>
  );
}
