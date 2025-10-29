import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, UserPlus } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import type { RegisterData } from '@/services/auth';
import { formatRUTInput, validateStrictRUT, calculateRUTVerifier } from '@/lib/utils';

interface RegisterFormProps {
  onBackToLogin: () => void;
  onForgotPassword: () => void;
}

export default function RegisterForm({ onBackToLogin, onForgotPassword }: RegisterFormProps) {
  const { register, isRegisterLoading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState<RegisterData>({
    rut: '',
    nombres: '',
    apellidos: '',
    email: '',
    telefono: '',
    direccion: '',
    password: '',
    confirmPassword: ''
  });

  const [errors, setErrors] = useState<Partial<RegisterData>>({});

  // Remove theme classes on mount (public area)
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
  }, []);

  const validateForm = (): boolean => {
    const newErrors: Partial<RegisterData> = {};

    if (!formData.rut.trim()) {
      newErrors.rut = 'RUT es requerido';
    } else if (!validateStrictRUT(formData.rut)) {
      const cleanRUT = formData.rut.replace(/[^0-9]/g, '');
      if (cleanRUT.length >= 7 && cleanRUT.length <= 8) {
        const correctVerifier = calculateRUTVerifier(cleanRUT);
        const rutParts = formData.rut.split('-');
        if (rutParts.length === 2) {
          newErrors.rut = `RUT inválido. El dígito verificador correcto es: ${rutParts[0]}-${correctVerifier}`;
        } else {
          newErrors.rut = 'RUT inválido. Formato: XX.XXX.XXX-X (debe terminar en número o K)';
        }
      } else {
        newErrors.rut = 'RUT inválido. Formato: XX.XXX.XXX-X (debe terminar en número o K)';
      }
    }

    if (!formData.nombres.trim()) newErrors.nombres = 'Nombres es requerido';
    if (!formData.apellidos.trim()) newErrors.apellidos = 'Apellidos es requerido';
    if (!formData.email.trim()) newErrors.email = 'Email es requerido';
    if (!formData.email.includes('@')) newErrors.email = 'Email inválido';
    if (!formData.password) newErrors.password = 'Contraseña es requerida';
    if (formData.password.length < 6) newErrors.password = 'Contraseña debe tener al menos 6 caracteres';
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Las contraseñas no coinciden';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      register(formData, () => {
        onBackToLogin();
      });
    }
  };

  const handleInputChange = (field: keyof RegisterData, value: string) => {
    let processedValue = value;

    if (field === 'rut') {
      processedValue = formatRUTInput(value);
    }

    setFormData({ ...formData, [field]: processedValue });
    if (errors[field]) {
      setErrors({ ...errors, [field]: undefined });
    }
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

  const textareaStyle: React.CSSProperties = {
    width: '100%',
    minHeight: '80px',
    padding: '12px 16px',
    borderRadius: '8px',
    border: '2px solid rgba(255, 255, 255, 0.3)',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    color: '#ffffff',
    fontSize: '16px',
    outline: 'none',
    resize: 'none' as const,
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

      <div style={{ position: 'relative', minHeight: '100vh', display: 'flex', overflowY: 'auto' }}>

        {/* Left Side - Branding */}
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
              <UserPlus style={{ width: '64px', height: '64px', color: 'white', filter: 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.3))' }} />
            </div>
            <h1 style={{
              fontSize: '48px',
              fontWeight: 'bold',
              background: 'linear-gradient(to right, #a5f3fc, #bfdbfe)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginBottom: '16px'
            }}>¡Únete a APR!</h1>
            <p style={{ color: 'rgba(207, 250, 254, 0.8)', fontSize: '20px', marginBottom: '32px' }}>
              Crea tu cuenta de socio y accede a todos los servicios
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', color: 'rgba(207, 250, 254, 0.7)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '12px', height: '12px', backgroundColor: '#22d3ee', borderRadius: '50%' }}></div>
                <span>Registro rápido y seguro</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '12px', height: '12px', backgroundColor: '#22d3ee', borderRadius: '50%' }}></div>
                <span>Acceso inmediato a tu cuenta</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '12px', height: '12px', backgroundColor: '#22d3ee', borderRadius: '50%' }}></div>
                <span>Control total de tus servicios</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Form */}
        <div style={{
          width: '100%',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          padding: '24px 16px',
          position: 'relative',
          overflowY: 'auto'
        }} className="lg:w-1/2 lg:items-center lg:py-12 lg:px-6">

          <div style={{ width: '100%', maxWidth: '56rem', paddingBottom: '24px' }}>

            {/* Mobile Header */}
            <div className="lg:hidden" style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{
                margin: '0 auto 16px',
                width: '64px',
                height: '64px',
                background: 'linear-gradient(to right, #22d3ee, #3b82f6, #22d3ee)',
                borderRadius: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
                border: '2px solid rgba(103, 232, 249, 0.5)'
              }}>
                <UserPlus style={{ width: '32px', height: '32px', color: 'white' }} />
              </div>
              <h1 style={{
                fontSize: '24px',
                fontWeight: 'bold',
                background: 'linear-gradient(to right, #a5f3fc, #bfdbfe)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                marginBottom: '6px'
              }}>Registro</h1>
              <p style={{ color: 'rgba(207, 250, 254, 0.7)', fontSize: '14px' }}>Crea tu cuenta de socio</p>
            </div>

            {/* Form Card */}
            <div style={{
              backdropFilter: 'blur(20px)',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '16px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              padding: '20px'
            }} className="lg:p-8">

              {/* Desktop Header */}
              <div className="hidden lg:block" style={{ textAlign: 'center', marginBottom: '32px' }}>
                <h2 style={{
                  fontSize: '24px',
                  fontWeight: 'bold',
                  background: 'linear-gradient(to right, #a5f3fc, #bfdbfe)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  marginBottom: '8px'
                }}>Registro de Socio</h2>
                <p style={{ color: 'rgba(207, 250, 254, 0.7)' }}>Completa tus datos para crear tu cuenta</p>
              </div>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                {/* Row 1: RUT, Nombres, Apellidos */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                  {/* RUT Field */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <Label style={{ color: '#ffffff', fontSize: '14px', fontWeight: '500' }}>RUT *</Label>
                    <input
                      type="text"
                      placeholder="12.345.678-9"
                      value={formData.rut}
                      onChange={(e) => handleInputChange('rut', e.target.value)}
                      style={{
                        ...inputStyle,
                        borderColor: errors.rut ? '#f87171' : 'rgba(255, 255, 255, 0.3)'
                      }}
                      required
                    />
                    {errors.rut && <p style={{ color: '#fca5a5', fontSize: '14px' }}>{errors.rut}</p>}
                  </div>

                  {/* Nombres Field */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <Label style={{ color: '#ffffff', fontSize: '14px', fontWeight: '500' }}>Nombres *</Label>
                    <input
                      type="text"
                      placeholder="Juan Carlos"
                      value={formData.nombres}
                      onChange={(e) => handleInputChange('nombres', e.target.value)}
                      style={{
                        ...inputStyle,
                        borderColor: errors.nombres ? '#f87171' : 'rgba(255, 255, 255, 0.3)'
                      }}
                      required
                    />
                    {errors.nombres && <p style={{ color: '#fca5a5', fontSize: '14px' }}>{errors.nombres}</p>}
                  </div>

                  {/* Apellidos Field */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <Label style={{ color: '#ffffff', fontSize: '14px', fontWeight: '500' }}>Apellidos *</Label>
                    <input
                      type="text"
                      placeholder="Pérez González"
                      value={formData.apellidos}
                      onChange={(e) => handleInputChange('apellidos', e.target.value)}
                      style={{
                        ...inputStyle,
                        borderColor: errors.apellidos ? '#f87171' : 'rgba(255, 255, 255, 0.3)'
                      }}
                      required
                    />
                    {errors.apellidos && <p style={{ color: '#fca5a5', fontSize: '14px' }}>{errors.apellidos}</p>}
                  </div>
                </div>

                {/* Row 2: Email, Teléfono */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                  {/* Email Field */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <Label style={{ color: '#ffffff', fontSize: '14px', fontWeight: '500' }}>Email *</Label>
                    <input
                      type="email"
                      placeholder="juan@ejemplo.com"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      style={{
                        ...inputStyle,
                        borderColor: errors.email ? '#f87171' : 'rgba(255, 255, 255, 0.3)'
                      }}
                      required
                    />
                    {errors.email && <p style={{ color: '#fca5a5', fontSize: '14px' }}>{errors.email}</p>}
                  </div>

                  {/* Phone Field */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <Label style={{ color: '#ffffff', fontSize: '14px', fontWeight: '500' }}>Teléfono</Label>
                    <input
                      type="tel"
                      placeholder="+56 9 1234 5678"
                      value={formData.telefono}
                      onChange={(e) => handleInputChange('telefono', e.target.value)}
                      style={inputStyle}
                    />
                  </div>
                </div>

                {/* Row 3: Dirección (full width) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <Label style={{ color: '#ffffff', fontSize: '14px', fontWeight: '500' }}>Dirección</Label>
                  <textarea
                    placeholder="Calle Principal 123, Comuna, Región"
                    value={formData.direccion}
                    onChange={(e) => handleInputChange('direccion', e.target.value)}
                    rows={2}
                    style={textareaStyle}
                  />
                </div>

                {/* Row 4: Password, Confirm Password */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                  {/* Password Field */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <Label style={{ color: '#ffffff', fontSize: '14px', fontWeight: '500' }}>Contraseña *</Label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showPassword ? "text" : "password"}
                        placeholder="Mínimo 6 caracteres"
                        value={formData.password}
                        onChange={(e) => handleInputChange('password', e.target.value)}
                        style={{
                          ...inputStyle,
                          paddingRight: '48px',
                          borderColor: errors.password ? '#f87171' : 'rgba(255, 255, 255, 0.3)'
                        }}
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
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    {errors.password && <p style={{ color: '#fca5a5', fontSize: '14px' }}>{errors.password}</p>}
                  </div>

                  {/* Confirm Password Field */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <Label style={{ color: '#ffffff', fontSize: '14px', fontWeight: '500' }}>Confirmar Contraseña *</Label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Repetir contraseña"
                        value={formData.confirmPassword}
                        onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                        style={{
                          ...inputStyle,
                          paddingRight: '48px',
                          borderColor: errors.confirmPassword ? '#f87171' : 'rgba(255, 255, 255, 0.3)'
                        }}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
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
                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    {errors.confirmPassword && <p style={{ color: '#fca5a5', fontSize: '14px' }}>{errors.confirmPassword}</p>}
                  </div>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={isRegisterLoading}
                  className="w-full h-12 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
                  style={{ marginTop: '8px' }}
                >
                  {isRegisterLoading ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{
                        width: '20px',
                        height: '20px',
                        border: '2px solid rgba(255, 255, 255, 0.3)',
                        borderTopColor: '#ffffff',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                      }} />
                      Registrando cuenta...
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <UserPlus style={{ width: '20px', height: '20px' }} />
                      Crear Cuenta
                    </div>
                  )}
                </Button>

                {/* Footer */}
                <div style={{ textAlign: 'center', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <p style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px' }}>
                    Al registrarte, aceptas nuestros{' '}
                    <button
                      type="button"
                      onClick={() => alert('Términos y condiciones: Documento próximamente disponible')}
                      style={{
                        color: '#67e8f9',
                        fontWeight: '600',
                        textDecoration: 'underline',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      términos y condiciones
                    </button>
                  </p>

                  {/* Login and Reset Password Links */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
                    <button
                      type="button"
                      onClick={onBackToLogin}
                      style={{
                        color: 'rgba(255, 255, 255, 0.9)',
                        fontSize: '14px',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      ¿Ya tienes una cuenta?{' '}
                      <span style={{ color: '#67e8f9', fontWeight: '600', textDecoration: 'underline' }}>
                        Inicia sesión
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={onForgotPassword}
                      style={{
                        color: 'rgba(255, 255, 255, 0.7)',
                        fontSize: '13px',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      ¿Olvidaste tu contraseña?{' '}
                      <span style={{ color: '#67e8f9', fontWeight: '500', textDecoration: 'underline' }}>
                        Recupérala
                      </span>
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
    </div>
  );
}
