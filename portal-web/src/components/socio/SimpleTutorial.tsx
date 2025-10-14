import React, { useState, useEffect } from 'react';
import { X, ArrowRight, CheckCircle, Target } from 'lucide-react';

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  targetInfo: string;
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'welcome',
    title: '¡Bienvenido al Portal APR!',
    description: 'Te voy a mostrar cada parte de la plataforma y para qué sirve.',
    targetInfo: 'Empecemos con un recorrido completo'
  },
  {
    id: 'profile',
    title: 'Tu Perfil Personal',
    description: 'En la sección de tu perfil (parte izquierda del menú) puedes ver tu información personal, saldo actual y deuda. IMPORTANTE: Puedes editar tu teléfono y dirección, y los cambios se guardan automáticamente cada 500ms sin necesidad de hacer clic en "Guardar".',
    targetInfo: 'Busca tu nombre y foto en el menú lateral izquierdo'
  },
  {
    id: 'boletas',
    title: 'Mis Boletas',
    description: 'En "Mis Boletas" del menú puedes ver todas tus facturas de agua. Puedes filtrar por: Pendientes ⏳, Pagadas ✅, Vencidas ⚠️ y descargar cada boleta en PDF.',
    targetInfo: 'Encuentra "Mis Boletas" en el menú lateral'
  },
  {
    id: 'pago',
    title: 'Realizar Pagos',
    description: 'Desde "Realizar Pago" puedes pagar tus deudas de forma 100% segura. Aceptamos: tarjeta de crédito, débito y transferencia bancaria. El sistema es completamente seguro.',
    targetInfo: 'Busca "Realizar Pago" en el menú lateral'
  },
  {
    id: 'chat',
    title: 'Chat de Soporte',
    description: 'En "Soporte" del menú puedes chatear directamente con nuestro equipo si tienes dudas sobre tus facturas, problemas con el agua, o cualquier consulta.',
    targetInfo: 'Encuentra "Soporte" en el menú lateral'
  },
  {
    id: 'floating',
    title: 'Botón Flotante Inteligente',
    description: 'FUNCIONALIDAD ESPECIAL: Cuando hagas scroll hacia abajo en cualquier página, aparecerá automáticamente un botón flotante azul en la esquina superior izquierda para acceder rápido al menú.',
    targetInfo: 'Prueba hacer scroll hacia abajo para verlo'
  },
  {
    id: 'complete',
    title: '¡Tutorial Completado! 🎉',
    description: 'Perfecto, ya conoces todas las funciones principales:\n• Perfil con auto-guardado automático\n• Boletas con filtros y descargas PDF\n• Pagos 100% seguros\n• Chat de soporte directo\n• Botón flotante inteligente',
    targetInfo: '¡Ya puedes usar el portal completo!'
  }
];

interface SimpleTutorialProps {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
}

export default function SimpleTutorial({ isOpen, onClose, userName }: SimpleTutorialProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const getCurrentStep = () => TUTORIAL_STEPS[currentStep];
  const isLastStep = currentStep === TUTORIAL_STEPS.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      onClose();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  if (!isOpen) return null;

  const step = getCurrentStep();

  return (
    <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      
      <div className="relative bg-white rounded-xl shadow-2xl max-w-lg w-full mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
              <Target className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-lg">Tutorial del Portal</h2>
              <p className="text-sm text-gray-500">Paso {currentStep + 1} de {TUTORIAL_STEPS.length}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-6 pt-4">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${((currentStep + 1) / TUTORIAL_STEPS.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="text-center mb-6">
            {step.id === 'complete' ? (
              <div className="text-6xl mb-4">🎉</div>
            ) : (
              <div className="text-6xl mb-4">🎯</div>
            )}
            
            <h3 className="text-xl font-bold mb-3">
              {step.title}
            </h3>
            
            <p className="text-gray-600 whitespace-pre-line leading-relaxed mb-4">
              {step.description}
            </p>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-blue-700 font-medium">
                💡 {step.targetInfo}
              </p>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex justify-between items-center">
            <button
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ← Anterior
            </button>

            <button
              onClick={handleNext}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              {isLastStep ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Finalizar
                </>
              ) : (
                <>
                  Siguiente
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Hook para usar el tutorial simple
export function useSimpleTutorial() {
  const [showTutorial, setShowTutorial] = useState(false);

  useEffect(() => {
    const hasCompletedTutorial = localStorage.getItem('simple-tutorial-completed');
    if (!hasCompletedTutorial) {
      const timer = setTimeout(() => {
        setShowTutorial(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  const startTutorial = () => setShowTutorial(true);
  
  const hideTutorial = () => {
    setShowTutorial(false);
    localStorage.setItem('simple-tutorial-completed', 'true');
  };

  const resetTutorial = () => {
    localStorage.removeItem('simple-tutorial-completed');
    setShowTutorial(true);
  };

  return {
    showTutorial,
    startTutorial,
    hideTutorial,
    resetTutorial
  };
}