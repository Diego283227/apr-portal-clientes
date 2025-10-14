import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowRight, 
  User, 
  FileText, 
  CreditCard, 
  MessageCircle,
  Edit,
  Save,
  Smartphone,
  X,
  Play
} from 'lucide-react';

interface BasicTutorialProps {
  userName: string;
  onClose?: () => void;
}

const TUTORIAL_SLIDES = [
  {
    id: 1,
    title: "¡Bienvenido al Portal APR!",
    content: (
      <div className="text-center space-y-4">
        <div className="text-6xl">👋</div>
        <h2 className="text-xl font-bold">¡Hola! Te voy a mostrar cómo usar el portal</h2>
        <p className="text-gray-600">Es muy fácil, solo tienes 4 funciones principales que necesitas conocer.</p>
      </div>
    )
  },
  {
    id: 2,
    title: "Tu Perfil Personal",
    content: (
      <div className="space-y-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
            <User className="h-6 w-6 text-blue-600" />
          </div>
          <h2 className="text-xl font-bold">Mi Perfil</h2>
        </div>
        
        <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-400">
          <h3 className="font-semibold text-blue-800 mb-2">¿Para qué sirve?</h3>
          <ul className="text-blue-700 space-y-1 text-sm">
            <li>• Ver tu información personal (nombre, RUT, teléfono, dirección)</li>
            <li>• <strong>Editar tu teléfono y dirección</strong> cuando sea necesario</li>
            <li>• Todo se guarda automáticamente, no necesitas hacer clic en "Guardar"</li>
          </ul>
        </div>

        <div className="bg-green-50 p-3 rounded-lg border border-green-200">
          <div className="flex items-center gap-2 mb-2">
            <Edit className="h-4 w-4 text-green-600" />
            <span className="font-medium text-green-800">Auto-guardado inteligente</span>
          </div>
          <p className="text-green-700 text-sm">
            Cuando editas tu teléfono o dirección, los cambios se guardan automáticamente 
            cada 500ms sin que tengas que hacer nada.
          </p>
        </div>
      </div>
    )
  },
  {
    id: 3,
    title: "Tus Boletas y Facturas", 
    content: (
      <div className="space-y-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
            <FileText className="h-6 w-6 text-green-600" />
          </div>
          <h2 className="text-xl font-bold">Mis Boletas</h2>
        </div>

        <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-400">
          <h3 className="font-semibold text-green-800 mb-2">¿Qué puedes hacer aquí?</h3>
          <ul className="text-green-700 space-y-1 text-sm">
            <li>• Ver todas tus facturas de agua</li>
            <li>• Filtrar por estado: <Badge variant="secondary" className="text-xs">Pendientes</Badge> <Badge variant="outline" className="text-xs">Pagadas</Badge> <Badge className="text-xs bg-red-100 text-red-800">Vencidas</Badge></li>
            <li>• Descargar facturas en PDF para tus archivos</li>
            <li>• Ver detalles completos de cada factura</li>
          </ul>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-yellow-100 p-2 rounded border">
            <div className="text-lg font-bold text-yellow-700">⏳</div>
            <div className="text-xs text-yellow-700">Pendientes</div>
          </div>
          <div className="bg-green-100 p-2 rounded border">
            <div className="text-lg font-bold text-green-700">✅</div>
            <div className="text-xs text-green-700">Pagadas</div>  
          </div>
          <div className="bg-red-100 p-2 rounded border">
            <div className="text-lg font-bold text-red-700">⚠️</div>
            <div className="text-xs text-red-700">Vencidas</div>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 4,
    title: "Realizar Pagos",
    content: (
      <div className="space-y-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
            <CreditCard className="h-6 w-6 text-purple-600" />
          </div>
          <h2 className="text-xl font-bold">Pagos Seguros</h2>
        </div>

        <div className="bg-purple-50 p-4 rounded-lg border-l-4 border-purple-400">
          <h3 className="font-semibold text-purple-800 mb-2">¿Cómo pagar tus facturas?</h3>
          <ul className="text-purple-700 space-y-1 text-sm">
            <li>• <strong>Tarjeta de crédito</strong> - Pago inmediato y seguro</li>
            <li>• <strong>Tarjeta de débito</strong> - Descuenta directo de tu cuenta</li>
            <li>• <strong>Transferencia bancaria</strong> - Desde tu banco online</li>
            <li>• Todos los pagos están protegidos con encriptación</li>
          </ul>
        </div>

        <div className="bg-green-50 p-3 rounded-lg border border-green-200">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="font-medium text-green-800 text-sm">Sistema 100% Seguro</span>
          </div>
          <p className="text-green-700 text-xs">
            Tu información financiera está protegida con la misma seguridad que usan los bancos.
          </p>
        </div>
      </div>
    )
  },
  {
    id: 5,
    title: "Chat de Soporte",
    content: (
      <div className="space-y-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
            <MessageCircle className="h-6 w-6 text-orange-600" />
          </div>
          <h2 className="text-xl font-bold">Ayuda Directa</h2>
        </div>

        <div className="bg-orange-50 p-4 rounded-lg border-l-4 border-orange-400">
          <h3 className="font-semibold text-orange-800 mb-2">¿Cuándo usar el chat?</h3>
          <ul className="text-orange-700 space-y-1 text-sm">
            <li>• Tienes dudas sobre una factura</li>
            <li>• Problemas con el servicio de agua</li>
            <li>• No puedes realizar un pago</li>
            <li>• Cualquier consulta o reclamo</li>
          </ul>
        </div>

        <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
            <span className="font-medium text-blue-800 text-sm">Soporte en Tiempo Real</span>
          </div>
          <p className="text-blue-700 text-xs">
            Los administradores reciben tus mensajes al instante y te responden rápidamente.
          </p>
        </div>
      </div>
    )
  },
  {
    id: 6,
    title: "Botón Flotante Inteligente",
    content: (
      <div className="space-y-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
            <Smartphone className="h-6 w-6 text-indigo-600" />
          </div>
          <h2 className="text-xl font-bold">Funciones Inteligentes</h2>
        </div>

        <div className="bg-indigo-50 p-4 rounded-lg border-l-4 border-indigo-400">
          <h3 className="font-semibold text-indigo-800 mb-2">Características especiales:</h3>
          <ul className="text-indigo-700 space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <div className="w-2 h-2 bg-indigo-400 rounded-full mt-2 flex-shrink-0"></div>
              <span><strong>Botón flotante:</strong> Cuando haces scroll aparece un botón flotante para acceder rápido al menú</span>
            </li>
            <li className="flex items-start gap-2">
              <div className="w-2 h-2 bg-indigo-400 rounded-full mt-2 flex-shrink-0"></div>
              <span><strong>RUT con audio:</strong> Puedes escuchar tu RUT pronunciado (para accesibilidad)</span>
            </li>
            <li className="flex items-start gap-2">
              <div className="w-2 h-2 bg-indigo-400 rounded-full mt-2 flex-shrink-0"></div>
              <span><strong>Responsive:</strong> Funciona perfecto en tu celular y tablet</span>
            </li>
          </ul>
        </div>

        <div className="text-center">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white px-4 py-2 rounded-full text-sm">
            <div className="w-3 h-3 bg-white rounded-full animate-bounce"></div>
            Botón Flotante (aparece al hacer scroll)
          </div>
        </div>
      </div>
    )
  },
  {
    id: 7,
    title: "¡Ya estás listo!",
    content: (
      <div className="text-center space-y-6">
        <div className="text-6xl">🎉</div>
        <h2 className="text-xl font-bold text-green-600">¡Tutorial completado!</h2>
        
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <h3 className="font-semibold text-green-800 mb-3">Ahora ya sabes usar:</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-blue-600" />
              <span>Mi Perfil</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <FileText className="h-4 w-4 text-green-600" />
              <span>Mis Boletas</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CreditCard className="h-4 w-4 text-purple-600" />
              <span>Pagos</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <MessageCircle className="h-4 w-4 text-orange-600" />
              <span>Chat Soporte</span>
            </div>
          </div>
        </div>

        <p className="text-gray-600 text-sm">
          Si tienes alguna duda, recuerda que puedes usar el chat de soporte 
          para contactar directamente con nuestro equipo.
        </p>
      </div>
    )
  }
];

export default function BasicTutorial({ userName, onClose }: BasicTutorialProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);

  const slide = TUTORIAL_SLIDES[currentSlide];
  const progress = ((currentSlide + 1) / TUTORIAL_SLIDES.length) * 100;
  const isLastSlide = currentSlide === TUTORIAL_SLIDES.length - 1;

  // Auto-advance slides
  useEffect(() => {
    if (!isPlaying || isLastSlide) return;

    const timer = setTimeout(() => {
      nextSlide();
    }, 8000); // 8 seconds per slide

    return () => clearTimeout(timer);
  }, [currentSlide, isPlaying, isLastSlide]);

  const nextSlide = () => {
    if (currentSlide < TUTORIAL_SLIDES.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      completeTutorial();
    }
  };

  const prevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  const completeTutorial = () => {
    localStorage.setItem('basic-tutorial-completed', 'true');
    setIsActive(false);
    if (onClose) onClose();
  };

  const toggleAutoPlay = () => {
    setIsPlaying(!isPlaying);
  };

  if (!isActive) return null;

  return (
    <Card className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-md z-50 shadow-2xl border-2 border-blue-300 bg-white">
      <CardHeader className="pb-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-t-lg">
        <CardTitle className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">Portal APR - Tutorial</h1>
            <p className="text-sm text-blue-100">¡Hola {userName}! 👋</p>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={completeTutorial}
            className="text-white hover:bg-white hover:bg-opacity-20 h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardTitle>
        
        <div className="space-y-2">
          <Progress value={progress} className="w-full h-2 bg-blue-200" />
          <div className="flex justify-between items-center text-sm text-blue-100">
            <span>Slide {currentSlide + 1} de {TUTORIAL_SLIDES.length}</span>
            <span>{Math.round(progress)}%</span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-6 min-h-[400px]">
        <div className="space-y-4">
          <div className="text-center mb-4">
            <h2 className="text-lg font-bold text-gray-800">{slide.title}</h2>
          </div>
          
          <div className="min-h-[280px]">
            {slide.content}
          </div>
        </div>
      </CardContent>

      <div className="p-4 bg-gray-50 rounded-b-lg border-t">
        <div className="flex justify-between items-center">
          <Button 
            onClick={prevSlide} 
            variant="outline" 
            size="sm"
            disabled={currentSlide === 0}
          >
            ← Anterior
          </Button>
          
          <div className="flex items-center gap-2">
            <Button
              onClick={toggleAutoPlay}
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
            >
              {isPlaying ? (
                <div className="w-3 h-3 bg-red-500 rounded"></div>
              ) : (
                <Play className="h-3 w-3" />
              )}
            </Button>
            
            {isPlaying && !isLastSlide && (
              <span className="text-xs text-gray-500">Auto</span>
            )}
          </div>
          
          <Button 
            onClick={isLastSlide ? completeTutorial : nextSlide}
            className="bg-blue-600 hover:bg-blue-700"
            size="sm"
          >
            {isLastSlide ? (
              <>¡Entendido! <CheckCircle className="h-4 w-4 ml-1" /></>
            ) : (
              <>Siguiente <ArrowRight className="h-4 w-4 ml-1" /></>
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
}

// Hook simple para usar el tutorial
export function useBasicTutorial() {
  const [showTutorial, setShowTutorial] = useState(false);

  useEffect(() => {
    const completed = localStorage.getItem('basic-tutorial-completed');
    if (!completed) {
      setTimeout(() => {
        setShowTutorial(true);
      }, 2000);
    }
  }, []);

  return {
    showTutorial,
    startTutorial: () => setShowTutorial(true),
    hideTutorial: () => setShowTutorial(false)
  };
}