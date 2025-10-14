import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { Target, Hand, CheckCircle, ArrowRight, X } from 'lucide-react';

interface RealTutorialProps {
  userName: string;
  onClose?: () => void;
}

const TUTORIAL_STEPS = [
  {
    step: 1,
    title: 'PASO 1: HAZ CLIC EN TU PERFIL',
    description: 'Vamos a empezar por tu perfil personal',
    instruction: 'Busca donde dice tu NOMBRE o "Mi Perfil" en la sidebar izquierda y HAZ CLIC ahí',
    whatItDoes: '👤 PERFIL: Te permite ver y editar tu información personal (teléfono, dirección, etc.)',
    findSelectors: [
      // Selectores específicos más probables
      'a[href*="perfil"]', 
      'a[href*="profile"]',
      '[data-nav="perfil"]',
      '[data-nav="profile"]',
      '#nav-perfil',
      '#nav-profile',
      '.nav-perfil',
      '.nav-profile',
      // Selectores generales de sidebar
      '.sidebar a', 
      'nav a',
      '.navigation a'
    ],
    textMatches: ['perfil', 'mi perfil', 'profile', 'información personal', 'datos personales'],
    expectedUrl: '/perfil'
  },
  {
    step: 2,
    title: 'PASO 2: HAZ CLIC EN BOLETAS',
    description: 'Ahora vamos a revisar tus facturas',
    instruction: 'En la sidebar izquierda, busca donde dice "Boletas", "Mis Boletas" o "Facturas" y HAZ CLIC',
    whatItDoes: '📄 BOLETAS: Aquí ves todas tus facturas de agua - pendientes, pagadas y vencidas. Puedes descargarlas en PDF.',
    findSelectors: [
      'a[href*="boleta"]',
      'a[href*="factura"]', 
      '[data-nav="boletas"]',
      '#nav-boletas',
      '.nav-boletas',
      '.sidebar a',
      'nav a'
    ],
    textMatches: ['boletas', 'mis boletas', 'facturas', 'bills'],
    expectedUrl: '/boletas'
  },
  {
    step: 3,
    title: 'PASO 3: HAZ CLIC EN PAGOS',
    description: 'Vamos a la función más importante: pagar tus facturas',
    instruction: 'En la sidebar izquierda, busca donde dice "Pago", "Pagos" o "Realizar Pago" y HAZ CLIC',
    whatItDoes: '💳 PAGOS: Aquí puedes pagar tus facturas de forma segura con tarjeta de crédito, débito o transferencia bancaria.',
    findSelectors: [
      'a[href*="pago"]',
      'a[href*="payment"]',
      '[data-nav="pago"]',
      '#nav-pago',
      '.nav-pago',
      '.sidebar a',
      'nav a'
    ],
    textMatches: ['pago', 'pagos', 'realizar pago', 'payment', 'pagar'],
    expectedUrl: '/pago'
  },
  {
    step: 4,
    title: 'PASO 4: HAZ CLIC EN CHAT/SOPORTE',
    description: 'Por último, veamos cómo obtener ayuda',
    instruction: 'En la sidebar izquierda, busca donde dice "Chat", "Mensajes", "Soporte" o "Ayuda" y HAZ CLIC',
    whatItDoes: '💬 CHAT: Te conecta directamente con administradores para resolver dudas sobre facturas, reportar problemas o hacer consultas.',
    findSelectors: [
      'a[href*="chat"]',
      'a[href*="mensaje"]',
      'a[href*="soporte"]',
      '[data-nav="chat"]',
      '#nav-chat',
      '.nav-chat',
      '.sidebar a',
      'nav a'
    ],
    textMatches: ['chat', 'mensajes', 'soporte', 'ayuda', 'support', 'help'],
    expectedUrl: '/chat'
  },
  {
    step: 5,
    title: '¡TUTORIAL COMPLETADO!',
    description: 'Felicitaciones, ya conoces todas las funciones principales',
    instruction: '',
    whatItDoes: '🎉 ¡Perfecto! Ahora sabes navegar por todo el portal: Perfil, Boletas, Pagos y Chat de Soporte.',
    findSelectors: [],
    textMatches: [],
    expectedUrl: ''
  }
];

export default function RealTutorial({ userName, onClose }: RealTutorialProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [highlightedElements, setHighlightedElements] = useState<HTMLElement[]>([]);
  const [waiting, setWaiting] = useState(false);
  const [foundElements, setFoundElements] = useState<HTMLElement[]>([]);
  const clickListenerRef = useRef<((event: MouseEvent) => void) | null>(null);

  const step = TUTORIAL_STEPS[currentStep];
  const progress = ((currentStep + 1) / TUTORIAL_STEPS.length) * 100;

  // Función para limpiar resaltados anteriores
  const clearHighlights = () => {
    highlightedElements.forEach(element => {
      element.style.outline = '';
      element.style.backgroundColor = '';
      element.style.boxShadow = '';
      element.style.zIndex = '';
      element.style.position = '';
      element.style.animation = '';
      element.classList.remove('tutorial-highlighted');
    });
    setHighlightedElements([]);
  };

  // Función mejorada para encontrar elementos
  const findTargetElements = (stepData: typeof TUTORIAL_STEPS[0]): HTMLElement[] => {
    const elements: HTMLElement[] = [];
    
    // 1. Buscar por selectores específicos
    stepData.findSelectors.forEach(selector => {
      try {
        const found = document.querySelectorAll(selector) as NodeListOf<HTMLElement>;
        found.forEach(el => {
          if (el.offsetParent !== null && !elements.includes(el)) { // Solo elementos visibles
            elements.push(el);
          }
        });
      } catch (e) {
        // Selector inválido, continuar
      }
    });

    // 2. Buscar por contenido de texto en enlaces de navegación
    if (elements.length === 0) {
      const navElements = document.querySelectorAll('nav a, .sidebar a, .navigation a, [class*="nav"] a, [class*="menu"] a');
      navElements.forEach(el => {
        const text = el.textContent?.toLowerCase().trim() || '';
        const href = (el as HTMLAnchorElement).href || '';
        
        stepData.textMatches.forEach(match => {
          if (text.includes(match.toLowerCase()) || href.toLowerCase().includes(match)) {
            if (!elements.includes(el as HTMLElement)) {
              elements.push(el as HTMLElement);
            }
          }
        });
      });
    }

    // 3. Buscar en todos los enlaces si aún no encontramos nada
    if (elements.length === 0) {
      const allLinks = document.querySelectorAll('a');
      allLinks.forEach(el => {
        const text = el.textContent?.toLowerCase().trim() || '';
        const href = el.href || '';
        
        stepData.textMatches.forEach(match => {
          if (text.includes(match.toLowerCase()) || href.toLowerCase().includes(match)) {
            if (el.offsetParent !== null && !elements.includes(el as HTMLElement)) {
              elements.push(el as HTMLElement);
            }
          }
        });
      });
    }

    return elements;
  };

  // Función para resaltar elementos
  const highlightElements = (elements: HTMLElement[]) => {
    clearHighlights();
    
    if (elements.length === 0) return;

    const highlightedEls: HTMLElement[] = [];
    
    elements.forEach((element, index) => {
      // Hacer scroll al primer elemento
      if (index === 0) {
        element.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center',
          inline: 'center'
        });
      }

      // Aplicar estilos de resaltado
      setTimeout(() => {
        element.style.outline = '4px solid #ef4444';
        element.style.outlineOffset = '2px';
        element.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
        element.style.boxShadow = '0 0 20px rgba(239, 68, 68, 0.6)';
        element.style.zIndex = '10000';
        element.style.position = 'relative';
        element.style.borderRadius = '6px';
        element.style.animation = 'tutorialPulseRed 2s infinite';
        element.classList.add('tutorial-highlighted');
        
        highlightedEls.push(element);
      }, 500);
    });

    setHighlightedElements(highlightedEls);
    return highlightedEls;
  };

  // Función para configurar detección de clics mejorada
  const setupClickDetection = (targetElements: HTMLElement[]) => {
    if (targetElements.length === 0) return;
    
    setWaiting(true);
    
    // Remover listener anterior
    if (clickListenerRef.current) {
      document.removeEventListener('click', clickListenerRef.current, true);
    }
    
    const handleClick = (event: MouseEvent) => {
      const clickedElement = event.target as HTMLElement;
      const clickedLink = clickedElement.closest('a') as HTMLAnchorElement;
      
      // Verificar si el clic fue en uno de los elementos target
      let isCorrectClick = false;
      
      for (const targetElement of targetElements) {
        if (targetElement.contains(clickedElement) || 
            clickedElement === targetElement ||
            (clickedLink && targetElement.contains(clickedLink))) {
          isCorrectClick = true;
          break;
        }
      }
      
      if (isCorrectClick) {
        // Clic correcto
        setWaiting(false);
        clearHighlights();
        
        toast.success('¡PERFECTO! ✅ Navegación detectada', {
          duration: 2000
        });
        
        // Esperar a que la navegación se complete antes de continuar
        setTimeout(() => {
          nextStep();
        }, 2000);
        
        // Remover listener
        document.removeEventListener('click', handleClick, true);
        clickListenerRef.current = null;
        
      } else {
        // Clic incorrecto
        event.preventDefault();
        event.stopPropagation();
        
        toast.error('❌ Haz clic en uno de los elementos resaltados en ROJO', {
          duration: 2500
        });
        
        // Hacer parpadear los elementos
        highlightedElements.forEach(el => {
          el.style.animation = 'none';
          setTimeout(() => {
            el.style.animation = 'tutorialPulseRed 1s infinite';
          }, 100);
        });
      }
    };

    clickListenerRef.current = handleClick;
    document.addEventListener('click', handleClick, true);
    
    // Timeout para dar pista después de 15 segundos
    setTimeout(() => {
      if (waiting) {
        toast.info('💡 Pista: Busca en el menú lateral izquierdo (sidebar)', {
          duration: 5000
        });
      }
    }, 15000);
  };

  // Función para avanzar al siguiente paso
  const nextStep = () => {
    if (currentStep < TUTORIAL_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      completeTutorial();
    }
  };

  // Función para completar tutorial
  const completeTutorial = () => {
    clearHighlights();
    if (clickListenerRef.current) {
      document.removeEventListener('click', clickListenerRef.current, true);
    }
    
    toast.success('🎉 ¡TUTORIAL COMPLETADO! Ya sabes navegar por todo el portal', {
      duration: 5000
    });
    
    localStorage.setItem('real-tutorial-completed', 'true');
    setIsActive(false);
    
    if (onClose) onClose();
  };

  // Función para saltar paso
  const skipStep = () => {
    clearHighlights();
    if (clickListenerRef.current) {
      document.removeEventListener('click', clickListenerRef.current, true);
      clickListenerRef.current = null;
    }
    nextStep();
  };

  // Efecto para configurar cada paso
  useEffect(() => {
    if (!isActive || currentStep >= TUTORIAL_STEPS.length - 1) return;

    const currentStepData = TUTORIAL_STEPS[currentStep];
    
    // Esperar un poco para que el DOM se estabilice
    setTimeout(() => {
      const elements = findTargetElements(currentStepData);
      setFoundElements(elements);
      
      if (elements.length > 0) {
        // Mostrar instrucciones
        toast.info(`PASO ${currentStep + 1}: ${currentStepData.title}`, {
          duration: 10000,
          description: currentStepData.instruction
        });
        
        // Resaltar elementos
        const highlighted = highlightElements(elements);
        
        if (highlighted.length > 0) {
          setupClickDetection(elements);
        }
        
      } else {
        // No encontró elementos
        toast.warning(`❌ No encontré elementos para: "${currentStepData.title}"`, {
          duration: 8000,
          description: `Busca manualmente: ${currentStepData.instruction}`,
          action: {
            label: "Saltar paso",
            onClick: skipStep
          }
        });
      }
    }, 1000);

  }, [currentStep, isActive]);

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      clearHighlights();
      if (clickListenerRef.current) {
        document.removeEventListener('click', clickListenerRef.current, true);
      }
    };
  }, []);

  // CSS para animaciones
  useEffect(() => {
    if (!document.getElementById('tutorial-styles')) {
      const style = document.createElement('style');
      style.id = 'tutorial-styles';
      style.textContent = `
        @keyframes tutorialPulseRed {
          0% { 
            box-shadow: 0 0 20px rgba(239, 68, 68, 0.6);
            outline-color: #ef4444;
          }
          50% { 
            box-shadow: 0 0 30px rgba(239, 68, 68, 0.9);
            outline-color: #dc2626;
            outline-width: 6px;
          }
          100% { 
            box-shadow: 0 0 20px rgba(239, 68, 68, 0.6);
            outline-color: #ef4444;
          }
        }
        
        .tutorial-highlighted {
          transition: all 0.3s ease !important;
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  if (!isActive) return null;

  return (
    <Card className="fixed top-4 right-4 w-96 z-[10001] shadow-2xl border-4 border-red-500 bg-gradient-to-b from-red-50 to-white">
      <CardHeader className="pb-3 bg-red-600 text-white rounded-t-lg">
        <CardTitle className="flex items-center justify-between text-lg">
          <div className="flex items-center gap-2">
            <Target className="h-6 w-6" />
            Tutorial Real - {userName}
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={completeTutorial}
            className="text-white hover:bg-red-700 h-6 w-6 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardTitle>
        <Progress value={progress} className="w-full h-3 bg-red-100" />
        <div className="text-sm text-red-100">
          Paso {currentStep + 1} de {TUTORIAL_STEPS.length} • {Math.round(progress)}% completado
        </div>
      </CardHeader>
      
      <CardContent className="p-6 space-y-4">
        {currentStep < TUTORIAL_STEPS.length - 1 ? (
          <>
            <div className="text-center">
              <div className="text-xl font-bold text-red-600 mb-2">
                {step.title}
              </div>
              <div className="text-gray-700 text-sm mb-3">
                {step.description}
              </div>
            </div>

            <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <Hand className="h-5 w-5 text-yellow-600 mt-1 flex-shrink-0" />
                <div className="text-yellow-800 font-medium text-sm">
                  <strong>INSTRUCCIÓN:</strong><br />
                  {step.instruction}
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-3">
              <div className="text-blue-800 text-sm">
                <strong>¿Para qué sirve?</strong><br />
                {step.whatItDoes}
              </div>
            </div>

            {waiting && (
              <div className="text-center bg-red-50 rounded-lg p-4 border-2 border-red-300">
                <div className="flex items-center justify-center gap-2 text-red-800 mb-2">
                  <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse"></div>
                  <span className="font-medium">Esperando tu clic...</span>
                </div>
                <div className="text-sm text-red-600">
                  Busca elementos resaltados en ROJO<br />
                  {foundElements.length > 0 && `Encontré ${foundElements.length} elemento(s) posible(s)`}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button 
                onClick={skipStep}
                variant="outline" 
                size="sm" 
                className="flex-1"
              >
                Saltar Paso <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
              <Button 
                onClick={completeTutorial}
                variant="outline" 
                size="sm"
                className="px-3"
              >
                Terminar
              </Button>
            </div>
          </>
        ) : (
          <div className="text-center space-y-4">
            <CheckCircle className="h-16 w-16 text-green-600 mx-auto" />
            <div className="text-xl font-bold text-green-600">
              ¡TUTORIAL COMPLETADO!
            </div>
            <div className="text-gray-600 text-sm">
              ¡Perfecto! Ya sabes navegar por todo el portal:
              <ul className="mt-2 text-xs text-left">
                <li>👤 <strong>Perfil</strong> - Ver y editar información personal</li>
                <li>📄 <strong>Boletas</strong> - Ver y descargar facturas</li>
                <li>💳 <strong>Pagos</strong> - Pagar facturas de forma segura</li>
                <li>💬 <strong>Chat</strong> - Soporte y ayuda directa</li>
              </ul>
            </div>
            <Button onClick={completeTutorial} className="bg-green-600 hover:bg-green-700">
              ¡Entendido!
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Hook mejorado
export function useRealTutorial() {
  const [showTutorial, setShowTutorial] = useState(false);

  useEffect(() => {
    const completed = localStorage.getItem('real-tutorial-completed');
    if (!completed) {
      setTimeout(() => {
        setShowTutorial(true);
      }, 3000);
    }
  }, []);

  return {
    showTutorial,
    startTutorial: () => setShowTutorial(true),
    hideTutorial: () => setShowTutorial(false)
  };
}