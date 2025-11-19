import { useState, useEffect } from "react";
import {
  Eye,
  EyeOff,
  Droplets,
  AlertCircle,
  Lock,
  CheckCircle2,
  Home,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import passwordResetService from "@/services/passwordReset";

interface ResetPasswordFormProps {
  token: string;
  onSuccess: () => void;
}

export default function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  // Remove theme classes on mount (public area)
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
  }, []);

  const validatePassword = (pass: string): string[] => {
    const errors: string[] = [];
    if (pass.length < 6) {
      errors.push("Debe tener al menos 6 caracteres");
    }
    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password || !confirmPassword) {
      setError("Por favor completa todos los campos");
      return;
    }

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    const passwordErrors = validatePassword(password);
    if (passwordErrors.length > 0) {
      setError(passwordErrors[0]);
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await passwordResetService.resetPassword({
        token,
        newPassword: password,
        tipoUsuario: "socio",
      });

      if (response.success) {
        setIsSuccess(true);
        toast.success("¡Contraseña actualizada exitosamente!");

        // Store flag to redirect to login after page reload
        try {
          sessionStorage.setItem("redirect_to_login", "true");
        } catch {
          // Ignore
        }

        // Clear auth storage and redirect to homepage after 3 seconds
        setTimeout(() => {
          try {
            localStorage.clear();
          } catch {
            // Ignore errors
          }

          // Reload homepage - App.tsx will check redirect flag
          window.location.replace(
            window.location.origin + window.location.pathname
          );
        }, 3000);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Error desconocido";
      setError(errorMessage);
      toast.error("Error al restablecer contraseña");
      setIsLoading(false);
    }
  };

  const goToLogin = () => {
    window.location.href =
      window.location.origin + window.location.pathname + "#login";
  };

  // Estilos inline para inputs
  const inputStyle: React.CSSProperties = {
    width: "100%",
    height: "48px",
    padding: "0 16px",
    paddingRight: "48px",
    borderRadius: "8px",
    border: "2px solid #e5e7eb",
    backgroundColor: "#ffffff",
    color: "#1f2937",
    fontSize: "16px",
    outline: "none",
  };

  // Token inválido o expirado
  if (!token) {
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

          {/* Right Side - Error Message */}
          <div className="w-full max-w-md flex items-center justify-center self-stretch">
            <div className="w-full bg-white border border-gray-200 rounded-2xl shadow-xl p-8">
              <div className="text-center">
                <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                  <AlertCircle className="w-8 h-8 text-red-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">
                  Enlace No Válido
                </h2>
                <p className="text-gray-600 mb-4">
                  El enlace de recuperación no es válido o ha expirado.
                </p>
                <p className="text-sm text-gray-500 mb-6">
                  Por favor solicita un nuevo enlace de recuperación.
                </p>
                <Button
                  onClick={goToLogin}
                  className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white"
                >
                  Volver al Login
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Back to Home Button */}
        <div className="absolute top-6 left-6">
          <Button
            onClick={goToLogin}
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

  // Success message
  if (isSuccess) {
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
              <div className="text-center">
                <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">
                  ¡Contraseña Actualizada!
                </h2>
                <p className="text-gray-600 mb-4">
                  Tu contraseña ha sido actualizada exitosamente.
                </p>
                <p className="text-sm text-gray-500 mb-6">
                  Serás redirigido al login en unos segundos...
                </p>
                <Button
                  onClick={goToLogin}
                  className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white"
                >
                  Ir al Login
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Back to Home Button */}
        <div className="absolute top-6 left-6">
          <Button
            onClick={goToLogin}
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

  // Main reset password form
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
                Nueva Contraseña
              </h1>
              <p className="text-gray-600">Ingresa tu nueva contraseña</p>
            </div>

            {/* Form Card */}
            <div className="bg-white border border-gray-200 rounded-2xl shadow-xl p-8">
              {/* Desktop Header */}
              <div className="hidden lg:block text-center mb-8">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent mb-2">
                  Nueva Contraseña
                </h2>
                <p className="text-gray-600">
                  Ingresa tu nueva contraseña segura
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Nueva Contraseña */}
                <div className="space-y-2">
                  <Label className="text-gray-700 text-sm font-medium">
                    Nueva Contraseña
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 z-10" />
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Ingresa tu nueva contraseña"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setError("");
                      }}
                      style={{ ...inputStyle, paddingLeft: "48px" }}
                      required
                      disabled={isLoading}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors z-20"
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500">
                    Debe tener al menos 6 caracteres
                  </p>
                </div>

                {/* Confirmar Contraseña */}
                <div className="space-y-2">
                  <Label className="text-gray-700 text-sm font-medium">
                    Confirmar Contraseña
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 z-10" />
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirma tu nueva contraseña"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        setError("");
                      }}
                      style={{ ...inputStyle, paddingLeft: "48px" }}
                      required
                      disabled={isLoading}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors z-20"
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
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
                      Actualizando contraseña...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Lock className="w-4 h-4" />
                      Actualizar Contraseña
                    </div>
                  )}
                </Button>

                {/* Back Link */}
                <div className="text-center pt-4">
                  <button
                    type="button"
                    onClick={goToLogin}
                    className="text-cyan-600 text-sm font-medium hover:text-cyan-700 underline"
                  >
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
          onClick={goToLogin}
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
