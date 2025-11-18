import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, Droplets, User, ArrowRight, Home } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import type { LoginCredentials } from '@/services/auth';
import { formatRUTInput } from '@/lib/utils';

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
    border: '2px solid #e5e7eb',
    backgroundColor: '#ffffff',
    color: '#1f2937',
    fontSize: '16px',
    outline: 'none',
  };

  return (
    <div className="min-h-screen w-full bg-white relative overflow-hidden">
      <div className="relative min-h-screen flex gap-4 items-center justify-center px-6 py-12">

        {/* Left Side - APR Image (hidden on mobile) */}
        <div className="hidden lg:flex relative overflow-hidden max-w-[320px] max-h-[480px] rounded-3xl flex-shrink-0">
          <img
            src="/apr-rural.jpg"
            alt="APR Rural - Infraestructura de Agua Potable"
            className="w-[320px] h-[480px] object-cover object-center rounded-3xl"
          />
          {/* Subtle overlay for text readability */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/30 rounded-3xl"></div>
        </div>

        {/* Right Side - Form */}
        <div className="w-full max-w-md flex items-center justify-center">
          <div className="w-full">

            {/* Mobile Header */}
            <div className="lg:hidden" style={{ textAlign: 'center', marginBottom: '32px' }}>
              <div style={{
                margin: '0 auto 24px',
                width: '80px',
                height: '80px',
                background: 'linear-gradient(to right, #06b6d4, #3b82f6)',
                borderRadius: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)'
              }}>
                <Droplets style={{ width: '40px', height: '40px', color: 'white' }} />
              </div>
              <h1 style={{
                fontSize: '30px',
                fontWeight: 'bold',
                background: 'linear-gradient(to right, #06b6d4, #3b82f6)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                marginBottom: '8px'
              }}>Portal APR</h1>
              <p style={{ color: '#6b7280' }}>Accede a tu cuenta de socio</p>
            </div>

            {/* Form Card */}
            <div style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: '16px',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
              padding: '32px'
            }}>

              {/* Desktop Header */}
              <div className="hidden lg:block" style={{ textAlign: 'center', marginBottom: '32px' }}>
                <h2 style={{
                  fontSize: '24px',
                  fontWeight: 'bold',
                  background: 'linear-gradient(to right, #06b6d4, #3b82f6)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  marginBottom: '8px'
                }}>Iniciar Sesión</h2>
                <p style={{ color: '#6b7280' }}>Accede con tu cuenta de socio</p>
              </div>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

                {/* Login Type Toggle */}
                <div style={{
                  display: 'flex',
                  gap: '4px',
                  backgroundColor: '#f3f4f6',
                  padding: '6px',
                  borderRadius: '12px',
                  border: '1px solid #e5e7eb'
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
                      color: loginType === 'rut' ? '#ffffff' : '#6b7280',
                      boxShadow: loginType === 'rut' ? '0 4px 6px -1px rgba(0, 0, 0, 0.1)' : 'none',
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
                      color: loginType === 'codigo' ? '#ffffff' : '#6b7280',
                      boxShadow: loginType === 'codigo' ? '0 4px 6px -1px rgba(0, 0, 0, 0.1)' : 'none',
                      transition: 'all 0.2s'
                    }}
                  >
                    Código Socio
                  </button>
                </div>

                {/* Input Field */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <Label style={{ color: '#374151', fontSize: '14px', fontWeight: '500' }}>
                    {loginType === 'rut' ? 'RUT' : 'Código de Socio'}
                  </Label>
                  <input
                    type="text"
                    placeholder={loginType === 'rut' ? '12.345.678-9' : 'Ingresa tu código'}
                    value={loginType === 'rut' ? formData.rut : formData.codigoSocio}
                    onChange={(e) => {
                      const value = loginType === 'rut' ? formatRUTInput(e.target.value) : e.target.value;
                      setFormData({
                        ...formData,
                        [loginType === 'rut' ? 'rut' : 'codigoSocio']: value
                      });
                    }}
                    style={inputStyle}
                    required
                  />
                </div>

                {/* Password Field */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <Label style={{ color: '#374151', fontSize: '14px', fontWeight: '500' }}>Contraseña</Label>
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
                        color: '#6b7280'
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
                      color: '#06b6d4',
                      fontSize: '14px',
                      textDecoration: 'underline',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                  <div style={{ color: '#6b7280', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    ¿No tienes cuenta?
                    <button
                      type="button"
                      onClick={onRegister}
                      style={{
                        color: '#06b6d4',
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

      {/* Navigation Buttons */}
      <div style={{ position: 'absolute', top: '24px', left: '24px' }}>
        {onBackToHome && (
          <Button
            onClick={onBackToHome}
            variant="ghost"
            size="sm"
            className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
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
