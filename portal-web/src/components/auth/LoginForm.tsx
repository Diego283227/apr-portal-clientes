import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, Droplets, User, ArrowRight, Home } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import type { LoginCredentials } from '@/services/auth';

interface LoginFormProps {
  onRegister: () => void;
  onAdminAccess: () => void;
  onForgotPassword: () => void;
  onBackToHome?: () => void;
}

export default function LoginForm({ onRegister, onAdminAccess, onForgotPassword, onBackToHome }: LoginFormProps) {
  const { login, isLoginLoading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [loginType, setLoginType] = useState<'rut' | 'codigo'>('rut');
  const [formData, setFormData] = useState({
    rut: '',
    codigoSocio: '',
    password: ''
  });

  // Remove theme classes on mount (public area)
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const credentials: LoginCredentials = {
      rut: loginType === 'rut' ? formData.rut : formData.codigoSocio,
      password: formData.password,
      tipoUsuario: 'socio'
    };
    login(credentials);
  };

  // Estilos inline para inputs
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

  return (
    <div style={{
      minHeight: '100vh',
      width: '100%',
      background: 'linear-gradient(to bottom right, #1e3a8a, #0e7490, #1e3a8a)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background Pattern */}
      <div style={{
        position: 'absolute',
        inset: 0,
        opacity: 0.3
      }} className="bg-grid-pattern"></div>

      {/* APR Rural Background Image */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
          <img
            src="/apr-rural.jpg"
            alt="APR Rural"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              opacity: 0.15
            }}
          />
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to bottom, rgba(6, 182, 212, 0.1), rgba(37, 99, 235, 0.2), rgba(30, 58, 138, 0.4))'
          }}></div>
        </div>
      </div>

      <div style={{ position: 'relative', minHeight: '100vh', display: 'flex' }}>

        {/* Left Side - Branding (hidden on mobile) */}
        <div className="hidden lg:flex lg:w-1/2" style={{
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px',
          background: 'linear-gradient(to bottom right, rgba(8, 145, 178, 0.2), rgba(37, 99, 235, 0.2))',
          backdropFilter: 'blur(4px)'
        }}>
          <div style={{ maxWidth: '28rem', textAlign: 'center' }}>
            <div style={{
              margin: '0 auto 32px',
              width: '128px',
              height: '128px',
              background: 'linear-gradient(to right, #22d3ee, #3b82f6, #22d3ee)',
              borderRadius: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: '2px solid rgba(103, 232, 249, 0.5)'
            }}>
              <Droplets style={{ width: '64px', height: '64px', color: 'white', filter: 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.3))' }} />
            </div>
            <h1 style={{
              fontSize: '48px',
              fontWeight: 'bold',
              background: 'linear-gradient(to right, #a5f3fc, #bfdbfe)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginBottom: '16px'
            }}>Portal APR</h1>
            <p style={{ color: 'rgba(207, 250, 254, 0.8)', fontSize: '20px', marginBottom: '32px' }}>
              Sistema de gestión integral para Agua Potable Rural
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', color: 'rgba(207, 250, 254, 0.7)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '12px', height: '12px', backgroundColor: '#22d3ee', borderRadius: '50%' }}></div>
                <span>Consulta de boletas en tiempo real</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '12px', height: '12px', backgroundColor: '#22d3ee', borderRadius: '50%' }}></div>
                <span>Pagos seguros en línea</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '12px', height: '12px', backgroundColor: '#22d3ee', borderRadius: '50%' }}></div>
                <span>Historial detallado de consumo</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Form */}
        <div style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px 24px'
        }} className="lg:w-1/2">
          <div style={{ width: '100%', maxWidth: '28rem' }}>

            {/* Mobile Header */}
            <div className="lg:hidden" style={{ textAlign: 'center', marginBottom: '32px' }}>
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
              }}>Portal APR</h1>
              <p style={{ color: 'rgba(207, 250, 254, 0.7)' }}>Accede a tu cuenta de socio</p>
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

              {/* Desktop Header */}
              <div className="hidden lg:block" style={{ textAlign: 'center', marginBottom: '32px' }}>
                <h2 style={{
                  fontSize: '24px',
                  fontWeight: 'bold',
                  background: 'linear-gradient(to right, #a5f3fc, #bfdbfe)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  marginBottom: '8px'
                }}>Iniciar Sesión</h2>
                <p style={{ color: 'rgba(207, 250, 254, 0.7)' }}>Accede con tu cuenta de socio</p>
              </div>

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

                {/* Input Field */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <Label style={{ color: '#ffffff', fontSize: '14px', fontWeight: '500' }}>
                    {loginType === 'rut' ? 'RUT' : 'Código de Socio'}
                  </Label>
                  <input
                    type="text"
                    placeholder={loginType === 'rut' ? '12.345.678-9' : 'Ingresa tu código'}
                    value={loginType === 'rut' ? formData.rut : formData.codigoSocio}
                    onChange={(e) => setFormData({
                      ...formData,
                      [loginType === 'rut' ? 'rut' : 'codigoSocio']: e.target.value
                    })}
                    style={inputStyle}
                    required
                  />
                </div>

                {/* Password Field */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <Label style={{ color: '#ffffff', fontSize: '14px', fontWeight: '500' }}>Contraseña</Label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Ingresa tu contraseña"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      style={{ ...inputStyle, paddingRight: '48px' }}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: 'absolute',
                        right: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        padding: '8px',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#ffffff'
                      }}
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={isLoginLoading}
                  className="w-full h-12 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
                  style={{ marginTop: '8px' }}
                >
                  {isLoginLoading ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{
                        width: '20px',
                        height: '20px',
                        border: '2px solid rgba(255, 255, 255, 0.3)',
                        borderTopColor: '#ffffff',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                      }} />
                      Iniciando sesión...
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      Iniciar Sesión
                      <ArrowRight style={{ width: '20px', height: '20px' }} />
                    </div>
                  )}
                </Button>

                {/* Footer Links */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', textAlign: 'center', paddingTop: '16px' }}>
                  <button
                    type="button"
                    onClick={onForgotPassword}
                    style={{
                      color: '#67e8f9',
                      fontSize: '14px',
                      textDecoration: 'underline',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                  <div style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    ¿No tienes cuenta?
                    <button
                      type="button"
                      onClick={onRegister}
                      style={{
                        color: '#67e8f9',
                        fontWeight: '600',
                        textDecoration: 'underline',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      Regístrate
                    </button>
                  </div>
                </div>
              </form>
            </div>
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

      {/* Navigation Buttons */}
      <div style={{ position: 'absolute', top: '24px', left: '24px' }}>
        {onBackToHome && (
          <Button
            onClick={onBackToHome}
            variant="ghost"
            size="sm"
            className="text-white/70 hover:text-white hover:bg-white/10"
          >
            <Home style={{ width: '16px', height: '16px', marginRight: '8px' }} />
            Inicio
          </Button>
        )}
      </div>

      {/* Admin Access */}
      <button
        onClick={onAdminAccess}
        style={{
          position: 'absolute',
          top: '16px',
          right: '16px',
          width: '12px',
          height: '12px',
          background: 'transparent',
          opacity: 0,
          border: 'none',
          cursor: 'pointer'
        }}
        title="Acceso administrativo"
      />
    </div>
  );
}
