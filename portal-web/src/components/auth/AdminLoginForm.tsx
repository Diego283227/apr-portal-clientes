import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, Shield, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface AdminLoginFormProps {
  onBackToMain: () => void;
  onForgotPassword?: () => void;
}

export default function AdminLoginForm({ onBackToMain, onForgotPassword }: AdminLoginFormProps) {
  const { login, isLoginLoading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });

  // Remove theme classes on mount (public area)
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login({
      username: formData.username,
      password: formData.password,
      tipoUsuario: 'super_admin'
    });
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-blue-900 via-blue-800 to-blue-950 flex items-center justify-center p-4 relative overflow-hidden">

      {/* Water wave pattern overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.3),transparent_50%),radial-gradient(ellipse_at_bottom,rgba(37,99,235,0.2),transparent_50%)]"></div>

      {/* Animated water ripples */}
      <div className="absolute top-20 right-20 w-72 h-72 bg-blue-400 rounded-full mix-blend-overlay filter blur-3xl opacity-20 animate-blob"></div>
      <div className="absolute top-40 left-20 w-72 h-72 bg-cyan-400 rounded-full mix-blend-overlay filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
      <div className="absolute -bottom-8 left-1/2 w-72 h-72 bg-blue-500 rounded-full mix-blend-overlay filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>

      {/* Back Button */}
      <button
        onClick={onBackToMain}
        className="absolute top-6 left-6 text-blue-100 hover:text-white transition-all duration-200 flex items-center gap-2 group"
      >
        <div className="p-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 group-hover:bg-white/20 transition-all">
          <ArrowLeft size={20} />
        </div>
        <span className="font-medium text-sm">Volver</span>
      </button>

      {/* Main Card */}
      <div className="relative w-full max-w-md">

        {/* Card */}
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-blue-200/50 p-8 md:p-12 relative overflow-hidden">

          {/* Decorative header gradient */}
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-600"></div>

          {/* Icon */}
          <div className="flex justify-center mb-8">
            <div className="relative">
              <div className="absolute inset-0 bg-blue-600 rounded-2xl blur-xl opacity-50"></div>
              <div className="relative bg-gradient-to-br from-blue-600 to-blue-700 p-5 rounded-2xl shadow-lg">
                <Shield className="w-12 h-12 text-white" strokeWidth={2.5} />
              </div>
            </div>
          </div>

          {/* Title */}
          <div className="text-center mb-10">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-900 to-blue-700 bg-clip-text text-transparent mb-3">Panel de Administración</h1>
            <p className="text-blue-600 font-medium text-sm mb-1">APR Portal - Sistema de Gestión</p>
            <p className="text-gray-500 text-xs">Acceso exclusivo para administradores</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Username Field */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-blue-900">
                Usuario Administrador
              </label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder="Ingresa tu usuario"
                className="w-full px-4 py-3.5 bg-blue-50/50 border-2 border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-blue-300 text-blue-900 font-medium"
                required
              />
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-blue-900">
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full px-4 py-3.5 pr-12 bg-blue-50/50 border-2 border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-blue-300 text-blue-900 font-medium"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-400 hover:text-blue-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Forgot Password Link */}
            {onForgotPassword && (
              <div className="text-right">
                <button
                  type="button"
                  onClick={onForgotPassword}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isLoginLoading}
              className="w-full h-14 bg-gradient-to-r from-blue-600 via-blue-700 to-blue-600 hover:from-blue-700 hover:via-blue-800 hover:to-blue-700 text-white font-bold rounded-xl shadow-lg hover:shadow-2xl hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed mt-8 text-base"
            >
              {isLoginLoading ? (
                <div className="flex items-center justify-center gap-3">
                  <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Verificando acceso...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-3">
                  <Shield className="w-6 h-6" strokeWidth={2.5} />
                  <span>Acceder al Panel</span>
                </div>
              )}
            </Button>
          </form>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-blue-100 text-center">
            <div className="flex items-center justify-center gap-2 text-blue-700 mb-2">
              <Shield className="w-4 h-4" />
              <p className="text-xs font-semibold">
                Sistema de Gestión APR
              </p>
            </div>
            <p className="text-xs text-blue-500">
              Acceso restringido • Solo personal autorizado
            </p>
          </div>
        </div>

        {/* Bottom decoration */}
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4/5 h-4 bg-gradient-to-r from-blue-500/30 via-cyan-500/30 to-blue-500/30 rounded-full blur-xl"></div>
      </div>

      {/* Animation styles */}
      <style>{`
        @keyframes blob {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
}
