import React, { useState, useEffect, useCallback } from 'react';
import { X, ArrowRight, CheckCircle, Target } from 'lucide-react';

interface TutorialStep {
  id: string;
  target: string;
  title: string;
  description: string;
  action: string;
  position: 'top' | 'bottom' | 'left' | 'right';
  highlight?: boolean;
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'welcome',
    target: 'body',
    title: '¡Bienvenido al Portal APR!',
    description: 'Te voy a mostrar cómo usar cada parte de la plataforma. Sigue las instrucciones y haz clic donde te indique.',
    action: 'Haz clic en "Continuar" para empezar',
    position: 'top',
    highlight: false
  },
  {
    id: 'profile',
    target: '#socio-profile',
    title: 'Tu Perfil Personal',
    description: 'Este es tu perfil. Aquí puedes ver tu información personal, saldo actual y deuda. IMPORTANTE: Puedes editar tu teléfono y dirección, y los cambios se guardan automáticamente cada 500ms sin necesidad de hacer clic en "Guardar".',
    action: 'HAZ CLIC en tu perfil para continuar',
    position: 'right',
    highlight: true
  },
  {
    id: 'boletas',
    target: '#nav-boletas',
    title: 'Mis Boletas',
    description: 'Aquí puedes ver todas tus facturas de agua. Puedes filtrar por: Pendientes ⏳, Pagadas ✅, Vencidas ⚠️ y descargar cada boleta en PDF.',
    action: 'HAZ CLIC en "Mis Boletas" para continuar',
    position: 'right',
    highlight: true
  },
  {
    id: 'pago',
    target: '#nav-pago',
    title: 'Realizar Pagos',
    description: 'Desde aquí puedes pagar tus deudas de forma 100% segura. Aceptamos: tarjeta de crédito, débito y transferencia bancaria. El sistema es completamente seguro.',
    action: 'HAZ CLIC en "Realizar Pago" para continuar',
    position: 'right',
    highlight: true
  },
  {
    id: 'chat',
    target: '#nav-chat',
    title: 'Chat de Soporte',
    description: 'Si tienes dudas sobre tus facturas, problemas con el agua, o cualquier consulta, puedes chatear directamente con nuestro equipo de soporte.',
    action: 'HAZ CLIC en "Soporte" para continuar',
    position: 'right',
    highlight: true
  },
  {
    id: 'dashboard',
    target: '#nav-dashboard',
    title: 'Dashboard Principal',
    description: 'Tu panel principal donde puedes ver el resumen de tu cuenta, saldo, deuda y acceder a todas las funciones rápidamente.',
    action: 'HAZ CLIC en "Dashboard" para continuar',
    position: 'right',
    highlight: true
  },
  {
    id: 'floating-button',
    target: 'body',
    title: 'Botón Flotante Inteligente',
    description: 'FUNCIONALIDAD ESPECIAL: Cuando hagas scroll hacia abajo en cualquier página, aparecerá automáticamente un botón flotante azul en la esquina superior izquierda para acceder rápido al menú.',
    action: 'Haz scroll hacia abajo para ver el botón flotante, luego haz clic en "Continuar"',
    position: 'top',
    highlight: false
  },
  {
    id: 'complete',
    target: 'body',
    title: '¡Tutorial Completado! 🎉',
    description: 'Perfecto, ya conoces todas las funciones principales:\n• Perfil con auto-guardado\n• Boletas con filtros y PDF\n• Pagos seguros\n• Chat de soporte\n• Botón flotante inteligente',
    action: 'Haz clic en "Finalizar" para cerrar el tutorial',
    position: 'top',
    highlight: false
  }
];

interface InteractiveTutorialProps {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
}

export default function InteractiveTutorial({ isOpen, onClose, userName }: InteractiveTutorialProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isWaitingForClick, setIsWaitingForClick] = useState(false);
  const [highlightedElement, setHighlightedElement] = useState<HTMLElement | null>(null);
  const [showScrollPrompt, setShowScrollPrompt] = useState(false);

  const getCurrentStep = () => TUTORIAL_STEPS[currentStep];
  const isLastStep = currentStep === TUTORIAL_STEPS.length - 1;

  // Cleanup function
  const cleanup = useCallback(() => {
    // Remove all event listeners
    document.querySelectorAll('[data-tutorial-listener]').forEach(element => {
      element.removeEventListener('click', handleTargetClick, true);
      element.removeAttribute('data-tutorial-listener');
    });

    // Remove highlight
    if (highlightedElement) {
      highlightedElement.style.position = '';
      highlightedElement.style.zIndex = '';
      highlightedElement.style.boxShadow = '';
      highlightedElement.style.border = '';
      highlightedElement.style.borderRadius = '';
      highlightedElement.style.pointerEvents = '';
      highlightedElement.style.cursor = '';
      setHighlightedElement(null);
    }

    // Remove overlay
    const overlay = document.getElementById('tutorial-overlay');
    if (overlay) {
      overlay.remove();
    }
  }, [highlightedElement, handleTargetClick]);

  // Handle target element click
  const handleTargetClick = useCallback((e: Event) => {
    if (!isWaitingForClick) return;
    
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    
    setIsWaitingForClick(false);
    
    // Advance to next step
    setTimeout(() => {
      if (currentStep < TUTORIAL_STEPS.length - 1) {
        setCurrentStep(prev => prev + 1);
      }
    }, 300);
    
    return false;
  }, [isWaitingForClick, currentStep]);

  // Setup step highlighting and click detection
  const setupStep = useCallback(() => {
    if (!isOpen) return;

    cleanup();

    const step = getCurrentStep();
    
    if (step.id === 'floating-button') {
      setShowScrollPrompt(true);
      return;
    }

    if (step.target === 'body' || !step.highlight) {
      return;
    }

    const targetElement = document.querySelector(step.target) as HTMLElement;
    
    if (!targetElement) {
      console.warn(`Tutorial: Element not found: ${step.target}`);
      return;
    }

    // Highlight the element and ensure it's above overlay
    targetElement.style.position = 'relative';
    targetElement.style.zIndex = '10000';
    targetElement.style.boxShadow = '0 0 0 4px rgba(59, 130, 246, 0.5), 0 0 0 8px rgba(59, 130, 246, 0.2)';
    targetElement.style.border = '2px solid #3b82f6';
    targetElement.style.borderRadius = '8px';
    
    setHighlightedElement(targetElement);

    // Create overlay to block other interactions
    const overlay = document.createElement('div');
    overlay.id = 'tutorial-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      z-index: 9998;
      pointer-events: auto;
    `;
    
    // Block all clicks except on target element
    overlay.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }, true);
    
    document.body.appendChild(overlay);

    // Add click listener - simple approach
    targetElement.addEventListener('click', handleTargetClick, true);
    targetElement.setAttribute('data-tutorial-listener', 'true');
    targetElement.style.pointerEvents = 'auto';
    targetElement.style.cursor = 'pointer';

    setIsWaitingForClick(true);
  }, [isOpen, currentStep, cleanup, handleTargetClick]);

  // Handle scroll detection for floating button
  useEffect(() => {
    if (showScrollPrompt) {
      const handleScroll = () => {
        if (window.scrollY > 100) {
          setShowScrollPrompt(false);
          // Check if floating button appeared
          const floatingBtn = document.getElementById('floating-sidebar-btn');
          if (floatingBtn) {
            setTimeout(() => {
              if (currentStep < TUTORIAL_STEPS.length - 1) {
                setCurrentStep(prev => prev + 1);
              }
            }, 1000);
          }
        }
      };

      window.addEventListener('scroll', handleScroll);
      return () => window.removeEventListener('scroll', handleScroll);
    }
  }, [showScrollPrompt, currentStep]);

  useEffect(() => {
    setupStep();
  }, [setupStep, currentStep]);

  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  const handleNext = () => {
    if (getCurrentStep().id === 'welcome' || getCurrentStep().id === 'complete') {
      if (isLastStep) {
        onClose();
      } else {
        setCurrentStep(prev => prev + 1);
      }
    }
  };

  const handleClose = () => {
    cleanup();
    onClose();
  };

  if (!isOpen) return null;

  const step = getCurrentStep();

  return (
    <>
      {/* Tutorial Modal */}
      <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/70" onClick={handleClose} />
        
        <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <Target className="w-4 h-4 text-white" />
              </div>
              <div>
                <h2 className="font-semibold text-lg">Tutorial Interactivo</h2>
                <p className="text-sm text-gray-500">Paso {currentStep + 1} de {TUTORIAL_STEPS.length}</p>
              </div>
            </div>
            <button
              onClick={handleClose}
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
              ) : isWaitingForClick ? (
                <div className="text-6xl mb-4 animate-pulse">👆</div>
              ) : (
                <div className="text-6xl mb-4">🎯</div>
              )}
              
              <h3 className="text-xl font-bold mb-3">
                {step.title.replace('{{userName}}', userName)}
              </h3>
              
              <p className="text-gray-600 whitespace-pre-line leading-relaxed">
                {step.description}
              </p>
            </div>

            {/* Action */}
            <div className="text-center">
              {isWaitingForClick ? (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-center gap-2 text-blue-700 font-medium">
                    <div className="animate-bounce">👆</div>
                    <span>{step.action}</span>
                  </div>
                </div>
              ) : showScrollPrompt ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-center gap-2 text-yellow-700 font-medium">
                    <div className="animate-bounce">👇</div>
                    <span>{step.action}</span>
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleNext}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 mx-auto"
                >
                  {isLastStep ? (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Finalizar Tutorial
                    </>
                  ) : (
                    <>
                      <ArrowRight className="w-4 h-4" />
                      Continuar
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// Hook para usar el tutorial interactivo
export function useInteractiveTutorial() {
  const [showTutorial, setShowTutorial] = useState(false);

  useEffect(() => {
    const hasCompletedTutorial = localStorage.getItem('interactive-tutorial-completed');
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
    localStorage.setItem('interactive-tutorial-completed', 'true');
  };

  const resetTutorial = () => {
    localStorage.removeItem('interactive-tutorial-completed');
    setShowTutorial(true);
  };

  return {
    showTutorial,
    startTutorial,
    hideTutorial,
    resetTutorial
  };
}