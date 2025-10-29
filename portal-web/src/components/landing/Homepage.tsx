import React, { useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  Play
} from 'lucide-react';

interface HomepageProps {
  onLogin: () => void;
}

const Homepage: React.FC<HomepageProps> = ({ onLogin }) => {
  // Ensure theme classes are removed when Homepage mounts (public area)
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    console.log('🏠 Homepage mounted - theme classes removed');
  }, []);

  const features = [
    {
      icon: Droplets,
      title: "Gestión de Agua Potable Rural",
      description: "Sistema completo para administrar servicios de agua potable en zonas rurales con tecnología moderna.",
      color: "from-cyan-500 to-blue-600"
    },
    {
      icon: CreditCard,
      title: "Pagos Digitales",
      description: "Múltiples métodos de pago incluyendo transferencias, PayPal y pagos móviles para mayor comodidad.",
      color: "from-emerald-500 to-green-600"
    },
    {
      icon: BarChart3,
      title: "Dashboard Inteligente",
      description: "Visualiza estadísticas, consumo y gestión de boletas con gráficos interactivos y reportes detallados.",
      color: "from-violet-500 to-purple-600"
    },
    {
      icon: Shield,
      title: "Seguridad Avanzada",
      description: "Protección de datos con encriptación de extremo a extremo y autenticación de dos factores.",
      color: "from-rose-500 to-red-600"
    },
    {
      icon: MessageCircle,
      title: "Soporte AI 24/7",
      description: "Asistente virtual inteligente para resolver dudas y brindar soporte técnico las 24 horas.",
      color: "from-amber-500 to-orange-600"
    },
    {
      icon: Smartphone,
      title: "Acceso Móvil",
      description: "Plataforma responsive que funciona perfectamente en dispositivos móviles, tablets y computadores.",
      color: "from-teal-500 to-cyan-600"
    }
  ];

  const stats = [
    { number: "500+", label: "Familias Beneficiadas", icon: Users },
    { number: "98%", label: "Disponibilidad", icon: CheckCircle },
    { number: "24/7", label: "Monitoreo", icon: Clock },
    { number: "5★", label: "Satisfacción", icon: Star }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-cyan-800 to-blue-900 text-white overflow-hidden relative">
      {/* Background with static water effects */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/40 to-blue-600/40" />

        {/* Static water orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-400/30 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-blue-500/30 rounded-full blur-3xl" />
        <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-teal-400/25 rounded-full blur-2xl" />
        <div className="absolute top-10 right-10 w-32 h-32 bg-cyan-300/20 rounded-full blur-xl" />
        <div className="absolute bottom-20 left-10 w-48 h-48 bg-blue-400/25 rounded-full blur-2xl" />
        <div className="absolute top-3/4 left-1/2 w-24 h-24 bg-teal-300/30 rounded-full blur-lg" />

        {/* Static flowing water lines */}
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-transparent via-cyan-400/20 to-transparent transform -skew-x-12" />
        <div className="absolute top-1/3 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-400/15 to-transparent transform skew-x-12" />
        <div className="absolute top-2/3 left-0 w-full h-1 bg-gradient-to-r from-transparent via-teal-400/15 to-transparent transform -skew-x-12" />
        <div className="absolute bottom-0 left-0 w-full h-2 bg-gradient-to-r from-transparent via-cyan-300/20 to-transparent transform skew-x-12" />
      </div>

      {/* Navigation - Ultra Simple */}
      <div
        style={{
          backgroundColor: '#0066FF',
          padding: '20px 0',
          borderBottom: '3px solid #00FFFF',
          width: '100%',
          userSelect: 'text',
          position: 'relative',
          zIndex: 50
        }}
      >
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0 20px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', userSelect: 'text' }}>
            <div
              style={{
                width: '50px',
                height: '50px',
                backgroundColor: '#0099FF',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid #00FFFF'
              }}
            >
              <Droplets style={{ width: '30px', height: '30px', color: '#FFFFFF' }} />
            </div>
            <div style={{ userSelect: 'text' }}>
              <h1
                style={{
                  color: '#00FFFF',
                  fontSize: '26px',
                  fontWeight: '900',
                  margin: '0',
                  fontFamily: 'Arial, sans-serif',
                  userSelect: 'text'
                }}
              >
                Portal APR
              </h1>
              <div
                style={{
                  color: '#FFFFFF',
                  fontSize: '16px',
                  fontWeight: '700',
                  fontFamily: 'Arial, sans-serif',
                  userSelect: 'text'
                }}
              >
                Agua Potable Rural
              </div>
            </div>
          </div>
          <a
            href="#login"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('🔄 Login link clicked - navigating to login');
              onLogin();
            }}
            style={{
              backgroundColor: '#0099FF',
              color: '#FFFFFF',
              border: '2px solid #00FFFF',
              padding: '12px 24px',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontFamily: 'Arial, sans-serif',
              textDecoration: 'none',
              userSelect: 'none',
              position: 'relative',
              zIndex: 51
            }}
          >
            <Users style={{ width: '18px', height: '18px' }} />
            Iniciar Sesión
          </a>
        </div>
      </div>

      {/* Hero Section */}
      <section className="relative z-10 px-6 py-20 overflow-hidden">
        {/* APR Rural Background Image */}
        <div className="absolute inset-0 z-0">
          <div className="relative w-full h-full">
            <img
              src="/apr-rural.jpg"
              alt="APR Rural - Tanques de agua azules"
              className="w-full h-full object-cover opacity-40"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/20 via-blue-600/30 to-blue-900/50"></div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto text-center relative z-10">
          <div className="mb-8">
            <div className="w-28 h-28 mx-auto bg-gradient-to-r from-cyan-400 via-blue-500 to-blue-600 rounded-3xl flex items-center justify-center mb-6 shadow-2xl border-3 border-cyan-300/60 backdrop-blur-sm">
              <Droplets className="w-14 h-14 text-white drop-shadow-lg" />
            </div>
            <div className="bg-cyan-500/10 backdrop-blur-sm rounded-full px-4 py-2 inline-block border border-cyan-400/30">
              <span className="text-cyan-200 text-sm font-semibold">Infraestructura APR</span>
            </div>
          </div>

          <div>
            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-cyan-300 via-blue-400 to-teal-300 bg-clip-text text-transparent">
              Portal APR
            </h1>
          </div>

          <div>
            <p className="text-2xl md:text-3xl font-semibold mb-4 text-cyan-200">
              Agua Potable Rural Digital
            </p>
          </div>

          <div>
            <p className="text-lg md:text-xl text-white/80 mb-8 max-w-3xl mx-auto leading-relaxed">
              Plataforma moderna para la gestión integral de servicios de agua potable rural.
              Administra boletas, pagos, consumo y comunicación con los socios de manera eficiente y transparente.
            </p>
          </div>

          <div className="flex justify-center">
            <Button
              onClick={onLogin}
              size="lg"
              className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-lg px-8 py-4 rounded-xl shadow-2xl"
            >
              <Users className="w-5 h-5 mr-2" />
              Acceder al Portal
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative z-10 px-6 py-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
              Características Principales
            </h2>
            <p className="text-xl text-white/80 max-w-2xl mx-auto">
              Todo lo que necesitas para gestionar tu servicio de agua potable rural de manera profesional
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const IconComponent = feature.icon;
              return (
                <Card key={index} className="bg-white/10 border-white/20 hover:bg-white/15 transition-colors duration-300 group backdrop-blur-sm">
                  <CardContent className="p-8">
                    <div className={`w-16 h-16 bg-gradient-to-r ${feature.color} rounded-xl flex items-center justify-center mb-6`}>
                      <IconComponent className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-xl font-bold mb-4 text-white group-hover:text-blue-300 transition-colors">
                      {feature.title}
                    </h3>
                    <p className="text-white/70 leading-relaxed">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="relative z-10 px-6 py-20 bg-white/5 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Resultados que Hablan por Sí Solos
            </h2>
            <p className="text-lg text-white/80">
              La confianza de nuestros socios respalda nuestro trabajo
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            {stats.map((stat, index) => {
              const IconComponent = stat.icon;
              return (
                <div key={index} className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <IconComponent className="w-8 h-8 text-white" />
                  </div>
                  <div className="text-3xl md:text-4xl font-bold mb-2 text-cyan-400">
                    {stat.number}
                  </div>
                  <div className="text-white/70 font-medium">
                    {stat.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 px-6 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 backdrop-blur-lg rounded-3xl p-12 border border-blue-500/30">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              ¿Listo para Modernizar tu APR?
            </h2>
            <p className="text-lg text-white/80 mb-8 max-w-2xl mx-auto">
              Únete a cientos de comunidades que ya disfrutan de un servicio de agua potable
              más eficiente, transparente y moderno.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                onClick={onLogin}
                size="lg"
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-lg px-8 py-4 rounded-xl shadow-2xl"
              >
                <Play className="w-5 h-5 mr-2" />
                Comenzar Ahora
              </Button>

              <Button
                size="lg"
                variant="ghost"
                className="text-blue-300 hover:bg-blue-500/10 text-lg px-8 py-4 rounded-xl"
              >
                Conocer Más
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/20 px-6 py-12">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center gap-4 mb-4 md:mb-0">
              <div className="w-10 h-10 bg-gradient-to-r from-cyan-400 via-blue-500 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg border border-cyan-300/40">
                <Droplets className="w-6 h-6 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-lg">Portal APR</span>
                <span className="text-xs text-cyan-300/70">Agua Potable Rural</span>
              </div>
              <Badge variant="secondary" className="ml-2 bg-cyan-500/20 text-cyan-200 border-cyan-400/30">v2.0</Badge>
            </div>

            <div className="flex items-center gap-6 text-sm text-white/70">
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
