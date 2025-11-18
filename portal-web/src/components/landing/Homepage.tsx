import React, { useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Droplets,
  Shield,
  Users,
  BarChart3,
  Clock,
  ArrowRight,
  CheckCircle,
  Star,
  Globe,
  Smartphone,
  CreditCard,
  MessageCircle,
  Play,
} from "lucide-react";

interface HomepageProps {
  onLogin: () => void;
}

const Homepage: React.FC<HomepageProps> = ({ onLogin }) => {
  // Ensure theme classes are removed when Homepage mounts (public area)
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
  }, []);

  // Smooth scroll function
  const handleScrollToSection = (
    e: React.MouseEvent<HTMLAnchorElement>,
    sectionId: string
  ) => {
    e.preventDefault();
    e.stopPropagation();

    const section = document.getElementById(sectionId);

    if (section) {
      // Use scrollIntoView for better compatibility
      section.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });

      // Adjust for fixed header after scroll
      setTimeout(() => {
        const yOffset = -80; // Height of fixed header
        const y =
          section.getBoundingClientRect().top + window.pageYOffset + yOffset;
        window.scrollTo({ top: y, behavior: "smooth" });
      }, 100);
    }
  };

  const features = [
    {
      icon: Droplets,
      title: "Gestión de Agua Potable Rural",
      description:
        "Sistema completo para administrar servicios de agua potable en zonas rurales con tecnología moderna.",
      color: "from-cyan-500 to-blue-600",
    },
    {
      icon: CreditCard,
      title: "Pagos Digitales",
      description:
        "Múltiples métodos de pago incluyendo transferencias, PayPal y pagos móviles para mayor comodidad.",
      color: "from-emerald-500 to-green-600",
    },
    {
      icon: BarChart3,
      title: "Dashboard Inteligente",
      description:
        "Visualiza estadísticas, consumo y gestión de boletas con gráficos interactivos y reportes detallados.",
      color: "from-violet-500 to-purple-600",
    },
    {
      icon: Shield,
      title: "Seguridad Avanzada",
      description:
        "Protección de datos con encriptación de extremo a extremo y autenticación de dos factores.",
      color: "from-rose-500 to-red-600",
    },
    {
      icon: MessageCircle,
      title: "Soporte AI 24/7",
      description:
        "Asistente virtual inteligente para resolver dudas y brindar soporte técnico las 24 horas.",
      color: "from-amber-500 to-orange-600",
    },
    {
      icon: Smartphone,
      title: "Acceso Móvil",
      description:
        "Plataforma responsive que funciona perfectamente en dispositivos móviles, tablets y computadores.",
      color: "from-teal-500 to-cyan-600",
    },
  ];

  const stats = [
    { number: "500+", label: "Familias Beneficiadas", icon: Users },
    { number: "98%", label: "Disponibilidad", icon: CheckCircle },
    { number: "24/7", label: "Monitoreo", icon: Clock },
    { number: "5★", label: "Satisfacción", icon: Star },
  ];

  return (
    <div className="min-h-screen bg-white text-gray-900 overflow-hidden relative">
      {/* Navigation - Modern Sticky Header */}
      <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-lg bg-white/95 border-b border-gray-200 shadow-lg">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <div className="flex items-center gap-3 cursor-pointer">
              <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
                <Droplets className="w-7 h-7 text-white" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-green-600 to-green-600 bg-clip-text text-transparent">
                  Portal APR
                </h1>
                <p className="text-sm text-gray-600 font-medium">
                  Agua Potable Rural
                </p>
              </div>
            </div>

            {/* Navigation Links - Desktop - Estilo Botones Glassmorphism */}
            <div className="hidden md:flex items-center gap-3">
              <a
                href="#inicio"
                onClick={(e) => handleScrollToSection(e, "inicio")}
                className="relative px-5 py-2.5 rounded-xl font-medium cursor-pointer text-gray-700 bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200/50 hover:border-blue-400/60 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/20 backdrop-blur-sm overflow-hidden group"
              >
                <span className="relative z-10 group-hover:text-blue-700 transition-colors">
                  Inicio
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400/0 via-cyan-400/0 to-blue-400/0 group-hover:from-blue-400/20 group-hover:via-cyan-400/20 group-hover:to-blue-400/20 transition-all duration-300" />
              </a>
              <a
                href="#caracteristicas"
                onClick={(e) => handleScrollToSection(e, "caracteristicas")}
                className="relative px-5 py-2.5 rounded-xl font-medium cursor-pointer text-gray-700 bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200/50 hover:border-blue-400/60 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/20 backdrop-blur-sm overflow-hidden group"
              >
                <span className="relative z-10 group-hover:text-blue-700 transition-colors">
                  Características
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400/0 via-cyan-400/0 to-blue-400/0 group-hover:from-blue-400/20 group-hover:via-cyan-400/20 group-hover:to-blue-400/20 transition-all duration-300" />
              </a>
              <a
                href="#servicios"
                onClick={(e) => handleScrollToSection(e, "servicios")}
                className="relative px-5 py-2.5 rounded-xl font-medium cursor-pointer text-gray-700 bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200/50 hover:border-blue-400/60 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/20 backdrop-blur-sm overflow-hidden group"
              >
                <span className="relative z-10 group-hover:text-blue-700 transition-colors">
                  Servicios
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400/0 via-cyan-400/0 to-blue-400/0 group-hover:from-blue-400/20 group-hover:via-cyan-400/20 group-hover:to-blue-400/20 transition-all duration-300" />
              </a>
              <a
                href="#contacto"
                onClick={(e) => handleScrollToSection(e, "contacto")}
                className="relative px-5 py-2.5 rounded-xl font-medium cursor-pointer text-gray-700 bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200/50 hover:border-blue-400/60 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/20 backdrop-blur-sm overflow-hidden group"
              >
                <span className="relative z-10 group-hover:text-blue-700 transition-colors">
                  Contacto
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400/0 via-cyan-400/0 to-blue-400/0 group-hover:from-blue-400/20 group-hover:via-cyan-400/20 group-hover:to-blue-400/20 transition-all duration-300" />
              </a>
            </div>

            {/* Login Button */}
            <button
              onClick={(e) => {
                e.preventDefault();
                console.log("🔄 Login button clicked - navigating to login");
                onLogin();
              }}
              className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-6 py-2.5 rounded-md font-semibold shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2 hover:scale-105"
            >
              <Users className="w-5 h-5" />
              <span className="hidden sm:inline">Iniciar Sesión</span>
            </button>
          </div>
        </nav>
      </header>

      {/* Spacer para compensar el header fixed */}
      <div className="h-20"></div>

      {/* Hero Section - Layout de 2 columnas */}
      <section
        id="inicio"
        className="relative z-10 px-6 py-24 md:py-32 overflow-hidden scroll-mt-20 bg-white"
      >
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Columna Izquierda - Contenido de Texto */}
            <div className="text-left space-y-8">
              {/* Badge mejorado con icono */}
              <div className="animate-in fade-in duration-700 delay-100">
                <div className="bg-gradient-to-r from-green-50 to-green-50 rounded-full px-5 py-2.5 inline-flex items-center gap-2 border border-green-300 shadow-sm">
                  <Droplets className="w-4 h-4 text-green-600" />
                  <span className="text-green-700 text-sm font-semibold tracking-wide">
                    Infraestructura APR
                  </span>
                </div>
              </div>

              {/* Título principal con animación */}
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
                <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-4 bg-gradient-to-r from-green-600 via-green-600 to-green-600 bg-clip-text text-transparent leading-tight">
                  Portal APR
                </h1>
              </div>

              {/* Subtítulo */}
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
                <p className="text-2xl md:text-3xl font-semibold text-gray-800">
                  Agua Potable Rural Digital
                </p>
              </div>

              {/* Descripción */}
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-400">
                <p className="text-lg md:text-xl text-gray-600 leading-relaxed">
                  Plataforma moderna para la gestión integral de servicios de
                  agua potable rural. Administra boletas, pagos, consumo y
                  comunicación con los socios de manera eficiente y
                  transparente.
                </p>
              </div>

              {/* CTAs - Dos botones */}
              <div className="flex flex-col sm:flex-row gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-500">
                <Button
                  onClick={onLogin}
                  size="lg"
                  className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white text-lg px-8 py-6 rounded-xl shadow-2xl hover:shadow-green-500/50 transition-all duration-300 hover:scale-105 font-semibold"
                >
                  <Users className="w-5 h-5 mr-2" />
                  Acceder al Portal
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>

                <Button
                  onClick={() => {
                    document
                      .querySelector("#caracteristicas")
                      ?.scrollIntoView({ behavior: "smooth" });
                  }}
                  size="lg"
                  variant="outline"
                  className="bg-white border-2 border-gray-300 hover:bg-gray-50 hover:border-green-400 text-gray-700 hover:text-green-700 text-lg px-8 py-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 font-semibold"
                >
                  <Play className="w-5 h-5 mr-2" />
                  Conocer Más
                </Button>
              </div>

              {/* Estadísticas rápidas */}
              <div className="grid grid-cols-2 gap-4 pt-8 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-600">
                {stats.map((stat, index) => {
                  const IconComponent = stat.icon;
                  return (
                    <div
                      key={index}
                      className="bg-gradient-to-br from-green-50 to-green-50 rounded-2xl p-4 border border-green-200 hover:border-green-400 hover:shadow-lg transition-all duration-300 hover:scale-105"
                    >
                      <IconComponent className="w-6 h-6 text-green-600 mb-2" />
                      <div className="text-2xl md:text-3xl font-bold text-gray-800 mb-1">
                        {stat.number}
                      </div>
                      <div className="text-xs text-gray-600 font-medium">
                        {stat.label}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Columna Derecha - Imagen APR */}
            <div className="relative animate-in fade-in slide-in-from-right duration-700 delay-300">
              <div className="relative rounded-3xl overflow-hidden shadow-2xl border-4 border-gray-200 hover:border-cyan-400 transition-all duration-500 hover:scale-105">
                <img
                  src="/apr-rural.jpg"
                  alt="APR Rural - Tanques de agua azules"
                  className="w-full h-auto object-cover"
                  style={{ imageRendering: "crisp-edges" }}
                />
              </div>

              {/* Elementos decorativos alrededor de la imagen */}
              <div className="absolute -top-4 -right-4 w-24 h-24 bg-cyan-200 rounded-full blur-2xl opacity-40 animate-pulse"></div>
              <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-blue-200 rounded-full blur-2xl opacity-40 animate-pulse delay-75"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section
        id="caracteristicas"
        className="relative z-10 px-6 py-20 scroll-mt-20 bg-gray-50"
      >
        <div className="max-w-6xl mx-auto">
          {/* Header con badge animado */}
          <div className="text-center mb-16 animate-in fade-in duration-700">
            <div className="mb-6">
              <div className="bg-gradient-to-r from-cyan-50 to-blue-50 rounded-full px-5 py-2.5 inline-flex items-center gap-2 border border-cyan-300 shadow-sm">
                <Star className="w-4 h-4 text-cyan-600" />
                <span className="text-cyan-700 text-sm font-semibold tracking-wide">
                  Características
                </span>
              </div>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">
              Características Principales
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Todo lo que necesitas para gestionar tu servicio de agua potable
              rural de manera profesional
            </p>
          </div>

          {/* Grid de características con animaciones escalonadas */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const IconComponent = feature.icon;
              return (
                <Card
                  key={index}
                  className="bg-white border-gray-200 hover:border-blue-300 hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-500 group relative overflow-hidden animate-in fade-in slide-in-from-bottom-4"
                  style={{
                    animationDelay: `${index * 100}ms`,
                    animationFillMode: "backwards",
                  }}
                >
                  {/* Efecto de brillo en hover */}
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-50/0 via-cyan-50/50 to-blue-50/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                  {/* Borde con gradiente en hover */}
                  <div
                    className={`absolute inset-0 bg-gradient-to-r ${feature.color} opacity-0 group-hover:opacity-5 blur-xl transition-opacity duration-500`}
                  />

                  <CardContent className="p-8 relative z-10">
                    {/* Icono con animación */}
                    <div
                      className={`w-16 h-16 bg-gradient-to-r ${feature.color} rounded-xl flex items-center justify-center mb-6 shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300`}
                    >
                      <IconComponent className="w-8 h-8 text-white group-hover:animate-pulse" />
                    </div>

                    {/* Título */}
                    <h3 className="text-xl font-bold mb-4 text-gray-800 group-hover:text-blue-600 transition-colors">
                      {feature.title}
                    </h3>

                    {/* Descripción */}
                    <p className="text-gray-600 group-hover:text-gray-700 leading-relaxed mb-4 transition-colors">
                      {feature.description}
                    </p>

                    {/* Indicador "Learn more" */}
                    <div className="flex items-center gap-2 text-blue-600 opacity-0 group-hover:opacity-100 transition-all duration-300 text-sm font-semibold">
                      <span>Saber más</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section
        id="servicios"
        className="relative z-10 px-6 py-20 bg-white scroll-mt-20"
      >
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-800">
              Resultados que Hablan por Sí Solos
            </h2>
            <p className="text-lg text-gray-600">
              La confianza de nuestros socios respalda nuestro trabajo
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            {stats.map((stat, index) => {
              const IconComponent = stat.icon;
              return (
                <div key={index} className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <IconComponent className="w-8 h-8 text-white" />
                  </div>
                  <div className="text-3xl md:text-4xl font-bold mb-2 text-blue-600">
                    {stat.number}
                  </div>
                  <div className="text-gray-600 font-medium">{stat.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section
        id="contacto"
        className="relative z-10 px-6 py-20 scroll-mt-20 bg-gray-50"
      >
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-3xl p-12 border border-blue-200 shadow-xl">
            <h2 className="text-3xl md:text-4xl font-bold mb-6 text-gray-800">
              ¿Listo para Modernizar tu APR?
            </h2>
            <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
              Únete a cientos de comunidades que ya disfrutan de un servicio de
              agua potable más eficiente, transparente y moderno.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                onClick={onLogin}
                size="lg"
                className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white text-lg px-8 py-4 rounded-xl shadow-2xl"
              >
                <Play className="w-5 h-5 mr-2" />
                Comenzar Ahora
              </Button>

              <Button
                size="lg"
                variant="outline"
                className="bg-white border-2 border-gray-300 hover:bg-gray-50 hover:border-blue-400 text-gray-700 hover:text-blue-700 text-lg px-8 py-4 rounded-xl"
              >
                Conocer Más
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-gray-200 px-6 py-12 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center gap-4 mb-4 md:mb-0">
              <div className="w-10 h-10 bg-gradient-to-r from-cyan-400 via-blue-500 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg">
                <Droplets className="w-6 h-6 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-lg text-gray-800">
                  Portal APR
                </span>
                <span className="text-xs text-gray-500">
                  Agua Potable Rural
                </span>
              </div>
              <Badge
                variant="secondary"
                className="ml-2 bg-blue-100 text-blue-700 border-blue-200"
              >
                v1.0
              </Badge>
            </div>

            <div className="flex items-center gap-6 text-sm text-gray-600">
              <span>© 2025 Portal APR. Todos los derechos reservados.</span>
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4" />
                <span>Chile</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Homepage;
