import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, UserPlus } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import type { RegisterData } from '@/services/auth';
import { validateRut, formatRut } from '@/utils/rutValidator';

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

    // Validate RUT with new comprehensive validator
    if (!formData.rut.trim()) {
      newErrors.rut = 'RUT es requerido';
    } else {
      const rutValidation = validateRut(formData.rut);
      if (!rutValidation.isValid) {
        newErrors.rut = rutValidation.errors[0]; // Show first error
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
      // Format RUT as user types
      processedValue = formatRut(value);
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
    border: '2px solid #e5e7eb',
    backgroundColor: '#ffffff',
    color: '#1f2937',
    fontSize: '16px',
    outline: 'none',
  };

  const textareaStyle: React.CSSProperties = {
    width: '100%',
    minHeight: '80px',
    padding: '12px 16px',
    borderRadius: '8px',
    border: '2px solid #e5e7eb',
    backgroundColor: '#ffffff',
    color: '#1f2937',
    fontSize: '16px',
    outline: 'none',
    resize: 'none' as const,
  };

  return (
    <div className="min-h-screen w-full bg-white relative overflow-hidden">
      <div className="relative min-h-screen flex gap-6 items-center justify-center px-6 py-12 overflow-y-auto">

        {/* Left Side - APR Image (hidden on mobile) */}
        <div className="hidden lg:flex relative overflow-hidden rounded-3xl flex-shrink-0 self-stretch">
          <img
            src="/apr-rural.jpg"
            alt="APR Rural - Infraestructura de Agua Potable"
            className="w-[420px] h-full object-cover object-center rounded-3xl"
          />
          {/* Subtle overlay for text readability */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/30 rounded-3xl"></div>
        </div>

        {/* Right Side - Form */}
        <div className="w-full max-w-2xl flex items-center justify-center self-stretch overflow-y-auto">

          <div className="w-full pb-6">

            {/* Mobile Header */}
            <div className="lg:hidden text-center mb-8">
              <div className="mx-auto mb-6 w-20 h-20 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                <UserPlus className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent mb-2">
                Registro
              </h1>
              <p className="text-gray-600">Crea tu cuenta de socio</p>
            </div>

            {/* Form Card */}
            <div className="bg-white border border-gray-200 rounded-2xl shadow-xl p-6 lg:p-8">

              {/* Desktop Header */}
              <div className="hidden lg:block text-center mb-8">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent mb-2">
                  Registro de Socio
                </h2>
                <p className="text-gray-600">Completa tus datos para crear tu cuenta</p>
              </div>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                {/* Row 1: RUT, Nombres, Apellidos */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                  {/* RUT Field */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <Label style={{ color: '#374151', fontSize: '14px', fontWeight: '500' }}>RUT *</Label>
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
                    <Label style={{ color: '#374151', fontSize: '14px', fontWeight: '500' }}>Nombres *</Label>
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
                    <Label style={{ color: '#374151', fontSize: '14px', fontWeight: '500' }}>Apellidos *</Label>
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
                    <Label style={{ color: '#374151', fontSize: '14px', fontWeight: '500' }}>Email *</Label>
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
                    <Label style={{ color: '#374151', fontSize: '14px', fontWeight: '500' }}>Teléfono</Label>
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
                    <Label style={{ color: '#374151', fontSize: '14px', fontWeight: '500' }}>Contraseña *</Label>
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
                          color: '#6b7280'
                        }}
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    {errors.password && <p style={{ color: '#fca5a5', fontSize: '14px' }}>{errors.password}</p>}
                  </div>

                  {/* Confirm Password Field */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <Label style={{ color: '#374151', fontSize: '14px', fontWeight: '500' }}>Confirmar Contraseña *</Label>
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
                          color: '#6b7280'
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
                  <p style={{ color: '#6b7280', fontSize: '14px' }}>
                    Al registrarte, aceptas nuestros{' '}
                    <button
                      type="button"
                      onClick={() => alert('Términos y condiciones: Documento próximamente disponible')}
                      style={{
                        color: '#06b6d4',
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
                        color: '#6b7280',
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
                      <span style={{ color: '#06b6d4', fontWeight: '600', textDecoration: 'underline' }}>
                        Inicia sesión
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={onForgotPassword}
                      style={{
                        color: '#6b7280',
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
                      <span style={{ color: '#06b6d4', fontWeight: '500', textDecoration: 'underline' }}>
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
    </div>
  );
}
