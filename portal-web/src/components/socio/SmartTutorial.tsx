import React, { useState, useEffect, useCallback, useRef } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { 
  Brain, 
  Target, 
  Lightbulb, 
  CheckCircle, 
  ArrowRight, 
  Settings,
  TrendingUp,
  Award,
  Clock,
  Eye,
  Volume2,
  Play,
  Pause,
  RotateCcw
} from 'lucide-react';

interface SmartTutorialProps {
  isOpen: boolean;
  onClose: () => void;
  currentPage: string;
  userName: string;
  autoStart?: boolean;
  onComplete?: () => void;
}

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  selector: string;
  action: 'click' | 'input' | 'hover' | 'scroll' | 'audio' | 'wait';
  expectedResult?: string;
  hint?: string;
  detectionConfig?: {
    eventType: string;
    validationFn?: (element: Element, event: Event) => boolean;
    dataCapture?: (element: Element, event: Event) => any;
    timeout?: number;
  };
}

interface SmartHint {
  id: string;
  trigger: 'idle' | 'error' | 'success' | 'context';
  message: string;
  duration: number;
  priority: 'low' | 'medium' | 'high';
}

// Tutorial configurations based on page context
const TUTORIAL_CONFIGS: Record<string, TutorialStep[]> = {
  '/dashboard': [
    {
      id: 'welcome',
      title: 'Bienvenido al Dashboard',
      description: 'Esta es tu página principal donde puedes ver toda tu información de un vistazo.',
      selector: '#main-dashboard',
      action: 'wait',
      hint: 'Aquí verás resúmenes de boletas, pagos y notificaciones importantes.'
    },
    {
      id: 'profile-card',
      title: 'Tu Información Personal',
      description: 'Este es tu perfil. Haz clic para editarlo y ver todas las funciones disponibles.',
      selector: '#socio-profile',
      action: 'click',
      expectedResult: 'navigate_to_profile',
      detectionConfig: {
        eventType: 'click',
        timeout: 15000,
        dataCapture: (element, event) => ({
          clicked: true,
          timestamp: Date.now(),
          elementType: 'profile-card'
        })
      }
    },
    {
      id: 'boletas-overview',
      title: 'Resumen de Boletas',
      description: 'Aquí ves tus boletas pendientes. El sistema detectará cuando hagas clic.',
      selector: '#boletas-summary',
      action: 'click',
      hint: 'Puedes hacer clic para ir directamente a ver todas tus boletas.',
      detectionConfig: {
        eventType: 'click',
        timeout: 20000
      }
    }
  ],
  '/perfil': [
    {
      id: 'profile-intro',
      title: 'Tu Perfil Completo',
      description: 'Aquí está toda tu información personal. Vamos a explorar las funciones avanzadas.',
      selector: '#profile-container',
      action: 'wait'
    },
    {
      id: 'edit-mode',
      title: 'Activar Edición Inteligente',
      description: 'Haz clic en "Editar" para activar el modo de edición con auto-guardado.',
      selector: '#edit-profile-btn',
      action: 'click',
      expectedResult: 'edit_mode_activated',
      hint: 'El botón está en la esquina superior derecha de la tarjeta de información.',
      detectionConfig: {
        eventType: 'click',
        validationFn: (element) => {
          return element.textContent?.includes('Editar') || false;
        },
        dataCapture: (element, event) => ({
          editModeActivated: true,
          buttonText: element.textContent,
          timestamp: Date.now()
        })
      }
    },
    {
      id: 'auto-save-test',
      title: 'Probar Auto-guardado',
      description: 'Modifica tu teléfono para ver cómo funciona el auto-guardado en tiempo real.',
      selector: '#telefono-input',
      action: 'input',
      hint: 'Escribe o modifica el número. Verás "Guardando..." automáticamente.',
      detectionConfig: {
        eventType: 'input',
        timeout: 30000,
        dataCapture: (element, event) => ({
          oldValue: (element as HTMLInputElement).defaultValue,
          newValue: (element as HTMLInputElement).value,
          autoSaveTriggered: true,
          timestamp: Date.now()
        })
      }
    },
    {
      id: 'rut-audio',
      title: 'Función de Accesibilidad: RUT Oral',
      description: 'Haz clic en el botón de audio (🔊) para escuchar tu RUT pronunciado.',
      selector: '#rut-speak-btn',
      action: 'audio',
      hint: 'Esta función ayuda a personas con dificultades visuales.',
      detectionConfig: {
        eventType: 'click',
        dataCapture: (element, event) => ({
          audioTriggered: true,
          rutValue: document.querySelector('#rut-section .font-mono')?.textContent,
          accessibilityFeature: true,
          timestamp: Date.now()
        })
      }
    }
  ],
  '/boletas': [
    {
      id: 'boletas-intro',
      title: 'Gestión de Boletas',
      description: 'Aquí puedes ver todas tus boletas: pendientes, pagadas y vencidas.',
      selector: '#boletas-container',
      action: 'wait'
    },
    {
      id: 'filter-boletas',
      title: 'Filtrar por Estado',
      description: 'Usa los filtros para ver solo las boletas que te interesan.',
      selector: '.filter-badge',
      action: 'click',
      detectionConfig: {
        eventType: 'click',
        dataCapture: (element, event) => ({
          filterType: element.textContent,
          timestamp: Date.now()
        })
      }
    }
  ]
};

const SMART_HINTS: SmartHint[] = [
  {
    id: 'idle_encouragement',
    trigger: 'idle',
    message: '🤔 ¿Necesitas ayuda? Estoy aquí para guiarte paso a paso.',
    duration: 4000,
    priority: 'medium'
  },
  {
    id: 'click_success',
    trigger: 'success',
    message: '✅ ¡Perfecto! Has dominado esta acción.',
    duration: 2000,
    priority: 'high'
  },
  {
    id: 'context_tip',
    trigger: 'context',
    message: '💡 Tip: Esta función tiene características avanzadas que puedes explorar.',
    duration: 3000,
    priority: 'low'
  }
];

export default function SmartTutorial({ 
  isOpen, 
  onClose, 
  currentPage, 
  userName, 
  autoStart = false, 
  onComplete 
}: SmartTutorialProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [driverInstance, setDriverInstance] = useState<any>(null);
  const [detectedActions, setDetectedActions] = useState<any[]>([]);
  const [showHints, setShowHints] = useState(true);
  const [tutorialSpeed, setTutorialSpeed] = useState<'slow' | 'normal' | 'fast'>('normal');
  const [progress, setProgress] = useState(0);
  const [isWaiting, setIsWaiting] = useState(false);
  const [currentHint, setCurrentHint] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalSteps: 0,
    completedSteps: 0,
    avgTimePerStep: 0,
    successRate: 100
  });
  
  const stepStartTime = useRef<number>(0);
  const idleTimer = useRef<NodeJS.Timeout | null>(null);
  const hintTimer = useRef<NodeJS.Timeout | null>(null);

  // Get tutorial steps for current page
  const getTutorialSteps = useCallback((): TutorialStep[] => {
    return TUTORIAL_CONFIGS[currentPage] || [];
  }, [currentPage]);

  // Smart hint system
  const showSmartHint = useCallback((hint: SmartHint) => {
    if (!showHints) return;
    
    setCurrentHint(hint.message);
    toast.info(hint.message, { duration: hint.duration });
    
    if (hintTimer.current) clearTimeout(hintTimer.current);
    hintTimer.current = setTimeout(() => {
      setCurrentHint(null);
    }, hint.duration);
  }, [showHints]);

  // Idle detection system
  const startIdleDetection = useCallback(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    
    const timeout = {
      'slow': 15000,
      'normal': 10000,
      'fast': 7000
    }[tutorialSpeed];

    idleTimer.current = setTimeout(() => {
      const idleHint = SMART_HINTS.find(h => h.trigger === 'idle');
      if (idleHint) showSmartHint(idleHint);
    }, timeout);
  }, [tutorialSpeed, showSmartHint]);

  // Action detection with AI-like validation
  const setupActionDetection = useCallback((step: TutorialStep) => {
    const element = document.querySelector(step.selector);
    if (!element || !step.detectionConfig) return;

    const { eventType, validationFn, dataCapture, timeout = 20000 } = step.detectionConfig;
    
    setIsWaiting(true);
    stepStartTime.current = Date.now();
    startIdleDetection();

    // Timeout handler
    const timeoutHandler = setTimeout(() => {
      setIsWaiting(false);
      toast.warning(`⏰ Tiempo agotado. Intenta: ${step.hint || step.action}`, {
        duration: 5000
      });
    }, timeout);

    // Action handler
    const handleAction = (event: Event) => {
      if (validationFn && !validationFn(element, event)) {
        return; // Action doesn't meet validation criteria
      }

      clearTimeout(timeoutHandler);
      setIsWaiting(false);
      
      if (idleTimer.current) clearTimeout(idleTimer.current);

      // Capture interaction data
      const actionData = {
        stepId: step.id,
        stepTitle: step.title,
        actionType: step.action,
        timestamp: Date.now(),
        timeToComplete: Date.now() - stepStartTime.current,
        data: dataCapture ? dataCapture(element, event) : null,
        success: true
      };

      setDetectedActions(prev => [...prev, actionData]);

      // Success feedback
      const successHint = SMART_HINTS.find(h => h.trigger === 'success');
      if (successHint) showSmartHint(successHint);

      // Play success sound if enabled
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance('¡Excelente!');
        utterance.volume = 0.3;
        speechSynthesis.speak(utterance);
      }

      // Auto-advance to next step
      const delay = {
        'slow': 3000,
        'normal': 2000,
        'fast': 1000
      }[tutorialSpeed];

      setTimeout(() => {
        advanceToNextStep();
      }, delay);
    };

    // Add event listener
    element.addEventListener(eventType, handleAction, { once: true });

    return () => {
      element.removeEventListener(eventType, handleAction);
      clearTimeout(timeoutHandler);
    };
  }, [tutorialSpeed, startIdleDetection, showSmartHint]);

  // Advance to next step
  const advanceToNextStep = useCallback(() => {
    const steps = getTutorialSteps();
    const nextStep = currentStep + 1;
    
    if (nextStep >= steps.length) {
      // Tutorial completed
      completeTutorial();
      return;
    }

    setCurrentStep(nextStep);
    setProgress(((nextStep + 1) / steps.length) * 100);
    
    // Update stats
    setStats(prev => ({
      ...prev,
      completedSteps: prev.completedSteps + 1,
      avgTimePerStep: (prev.avgTimePerStep + (Date.now() - stepStartTime.current)) / 2
    }));
  }, [currentStep, getTutorialSteps]);

  // Complete tutorial
  const completeTutorial = useCallback(() => {
    setIsActive(false);
    if (driverInstance) {
      driverInstance.destroy();
    }

    // Save completion data
    const completionData = {
      page: currentPage,
      completedAt: Date.now(),
      steps: detectedActions.length,
      avgTime: stats.avgTimePerStep,
      successRate: stats.successRate
    };
    
    const completed = JSON.parse(localStorage.getItem('smart-tutorials-completed') || '[]');
    completed.push(completionData);
    localStorage.setItem('smart-tutorials-completed', JSON.stringify(completed));

    toast.success(`🎉 ¡Tutorial completado! Has dominado ${detectedActions.length} acciones.`, {
      duration: 5000
    });

    if (onComplete) onComplete();
    onClose();
  }, [currentPage, detectedActions, stats, driverInstance, onComplete, onClose]);

  // Start tutorial
  const startTutorial = useCallback(() => {
    const steps = getTutorialSteps();
    if (steps.length === 0) {
      toast.error('No hay tutorial disponible para esta página.');
      return;
    }

    setIsActive(true);
    setCurrentStep(0);
    setProgress(0);
    setStats(prev => ({ ...prev, totalSteps: steps.length }));
    
    // Initialize driver.js with enhanced configuration
    const driver = driver({
      showProgress: true,
      allowClose: false,
      nextBtnText: 'Continuar →',
      prevBtnText: '← Anterior',  
      doneBtnText: '✅ Finalizar',
      progressText: 'Paso {{current}} de {{total}}',
      overlayClickNext: false,
      smoothScroll: true,
      steps: steps.map((step, index) => ({
        element: step.selector,
        popover: {
          title: `🎯 ${step.title}`,
          description: `
            <div class="smart-tutorial-step">
              <div class="step-description">
                <p>${step.description}</p>
                ${step.hint ? `<div class="hint-box">💡 <strong>Consejo:</strong> ${step.hint}</div>` : ''}
              </div>
              
              <div class="action-required">
                <div class="action-badge">
                  🎬 <strong>Acción:</strong> ${step.action.toUpperCase()}
                </div>
                <div class="detection-status" id="detection-status-${step.id}">
                  <div class="waiting-indicator">⏳ Esperando tu acción...</div>
                </div>
              </div>
              
              <div class="progress-info">
                <div class="step-counter">Paso ${index + 1} de ${steps.length}</div>
                <div class="time-info" id="time-info-${step.id}">⏱️ Sin prisa, tómate tu tiempo</div>
              </div>
            </div>
          `,
          side: 'top',
          align: 'start'
        }
      })),
      onNextClick: (element, step, options) => {
        // Custom next logic - will be handled by action detection
      },
      onHighlighted: (element, step, options) => {
        const stepData = steps[options.state?.activeIndex || 0];
        if (stepData && stepData.action !== 'wait') {
          setupActionDetection(stepData);
        }
      }
    });

    setDriverInstance(driver);
    driver.drive();
    
    toast.info(`🚀 Tutorial iniciado - Modo: ${tutorialSpeed}`, {
      duration: 3000
    });
  }, [getTutorialSteps, tutorialSpeed, setupActionDetection]);

  // Auto-start effect
  useEffect(() => {
    if (autoStart && isOpen && !isActive) {
      setTimeout(startTutorial, 1000);
    }
  }, [autoStart, isOpen, isActive, startTutorial]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
      if (hintTimer.current) clearTimeout(hintTimer.current);
      if (driverInstance) driverInstance.destroy();
    };
  }, [driverInstance]);

  if (!isOpen) return null;

  const steps = getTutorialSteps();

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Brain className="h-6 w-6 text-purple-600" />
              🧠 Tutorial Inteligente - {currentPage}
            </DialogTitle>
            {progress > 0 && (
              <div className="mt-2">
                <Progress value={progress} className="w-full h-3" />
                <p className="text-sm text-muted-foreground mt-1">
                  Progreso: {Math.round(progress)}% • {detectedActions.length} acciones detectadas
                </p>
              </div>
            )}
          </DialogHeader>

          <div className="space-y-6">
            {!isActive ? (
              <>
                <div className="text-center space-y-4">
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold">
                      👋 ¡Hola {userName}! Tutorial para: {currentPage}
                    </h3>
                    <p className="text-muted-foreground">
                      Tutorial contextual inteligente que se adapta a tu página actual
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <Target className="h-8 w-8 mx-auto text-blue-600 mb-2" />
                      <p className="text-sm font-medium">Detección Precisa</p>
                      <p className="text-xs text-muted-foreground">Captura cada acción</p>
                    </div>
                    <div className="p-3 bg-green-50 rounded-lg">
                      <Brain className="h-8 w-8 mx-auto text-green-600 mb-2" />
                      <p className="text-sm font-medium">IA Adaptativa</p>
                      <p className="text-xs text-muted-foreground">Se ajusta a tu ritmo</p>
                    </div>
                    <div className="p-3 bg-purple-50 rounded-lg">
                      <Award className="h-8 w-8 mx-auto text-purple-600 mb-2" />
                      <p className="text-sm font-medium">Seguimiento</p>
                      <p className="text-xs text-muted-foreground">Mide tu progreso</p>
                    </div>
                  </div>

                  {steps.length > 0 ? (
                    <div className="space-y-3">
                      <Alert>
                        <Lightbulb className="h-4 w-4" />
                        <AlertDescription>
                          <div className="space-y-2">
                            <p className="font-medium">Tutorial disponible: {steps.length} pasos</p>
                            <div className="text-sm">
                              {steps.slice(0, 3).map((step, index) => (
                                <div key={step.id} className="flex items-center gap-2">
                                  <span className="w-5 h-5 bg-blue-100 text-blue-600 rounded-full text-xs flex items-center justify-center">
                                    {index + 1}
                                  </span>
                                  <span>{step.title}</span>
                                </div>
                              ))}
                              {steps.length > 3 && (
                                <p className="text-muted-foreground mt-1">...y {steps.length - 3} pasos más</p>
                              )}
                            </div>
                          </div>
                        </AlertDescription>
                      </Alert>

                      <div className="flex flex-col gap-3">
                        <div className="flex justify-center gap-2">
                          <label className="text-sm font-medium">Velocidad:</label>
                          {(['slow', 'normal', 'fast'] as const).map((speed) => (
                            <Button
                              key={speed}
                              variant={tutorialSpeed === speed ? "default" : "outline"}
                              size="sm"
                              onClick={() => setTutorialSpeed(speed)}
                            >
                              {{slow: '🐌 Lento', normal: '⚡ Normal', fast: '🚀 Rápido'}[speed]}
                            </Button>
                          ))}
                        </div>

                        <div className="flex justify-center gap-4">
                          <Button 
                            onClick={startTutorial} 
                            size="lg"
                            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                          >
                            <Play className="h-5 w-5 mr-2" />
                            🚀 Iniciar Tutorial Inteligente
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <Alert>
                      <AlertDescription>
                        No hay tutorial específico disponible para esta página ({currentPage}).
                        Puedes navegar a otras secciones para obtener tutoriales contextuales.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>

                {/* Statistics Panel */}
                {detectedActions.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-green-600" />
                        Tu Progreso de Aprendizaje
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600">{stats.completedSteps}</div>
                          <div className="text-sm text-muted-foreground">Pasos Completados</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">{Math.round(stats.avgTimePerStep / 1000)}s</div>
                          <div className="text-sm text-muted-foreground">Tiempo Promedio</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-purple-600">{stats.successRate}%</div>
                          <div className="text-sm text-muted-foreground">Tasa de Éxito</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-orange-600">{detectedActions.length}</div>
                          <div className="text-sm text-muted-foreground">Acciones Detectadas</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <div className="text-center space-y-4">
                <div className="flex items-center justify-center gap-2 p-4 bg-blue-50 rounded-lg">
                  <Eye className="h-5 w-5 text-blue-600" />
                  <span className="font-medium text-blue-800">
                    Tutorial Activo - Sigue las instrucciones en pantalla
                  </span>
                </div>

                {currentHint && (
                  <Alert className="border-yellow-200 bg-yellow-50">
                    <Lightbulb className="h-4 w-4 text-yellow-600" />
                    <AlertDescription className="text-yellow-800">
                      {currentHint}
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex justify-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setIsActive(false);
                      if (driverInstance) driverInstance.destroy();
                    }}
                  >
                    <Pause className="h-4 w-4 mr-2" />
                    Pausar Tutorial
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setCurrentStep(0);
                      setProgress(0);
                      if (driverInstance) driverInstance.destroy();
                      setTimeout(startTutorial, 500);
                    }}
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Reiniciar
                  </Button>
                </div>
              </div>
            )}

            {/* Real-time Action Display */}
            {detectedActions.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Acciones Detectadas en Tiempo Real
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {detectedActions.slice(-5).map((action, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm p-2 bg-green-50 rounded">
                        <Badge variant="outline" className="text-xs bg-green-100">
                          {action.actionType}
                        </Badge>
                        <span className="flex-1">{action.stepTitle}</span>
                        <span className="text-muted-foreground text-xs">
                          {Math.round(action.timeToComplete / 1000)}s
                        </span>
                        <CheckCircle className="h-3 w-3 text-green-600" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              🧠 Tutorial con IA que detecta y valida cada acción en tiempo real
            </p>
            <div className="flex justify-center gap-2 text-xs">
              <Badge variant="secondary">Detección automática</Badge>
              <Badge variant="secondary">Feedback inteligente</Badge>
              <Badge variant="secondary">Hints contextuales</Badge>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Custom CSS for enhanced tutorial steps */}
      <style jsx>{`
        .smart-tutorial-step {
          font-family: inherit;
          line-height: 1.5;
        }
        
        .step-description {
          margin-bottom: 16px;
        }
        
        .hint-box {
          background: #f0f9ff;
          border: 1px solid #bae6fd;
          border-radius: 6px;
          padding: 8px 12px;
          margin-top: 8px;
          font-size: 0.875rem;
          color: #075985;
        }
        
        .action-required {
          background: #fefce8;
          border: 1px solid #facc15;
          border-radius: 6px;
          padding: 12px;
          margin: 12px 0;
        }
        
        .action-badge {
          font-weight: 600;
          color: #854d0e;
          margin-bottom: 8px;
        }
        
        .detection-status {
          font-size: 0.875rem;
        }
        
        .waiting-indicator {
          color: #dc2626;
          font-weight: 500;
          animation: pulse 2s infinite;
        }
        
        .progress-info {
          display: flex;
          justify-content: space-between;
          font-size: 0.75rem;
          color: #6b7280;
          margin-top: 12px;
          padding-top: 8px;
          border-top: 1px solid #e5e7eb;
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </>
  );
}

// Hook for auto-triggering contextual tutorials
export function useSmartTutorial(currentPage: string, userName: string) {
  const [showTutorial, setShowTutorial] = useState(false);
  const [hasShownForPage, setHasShownForPage] = useState(false);

  useEffect(() => {
    // Check if user has seen tutorial for this page
    const seenPages = JSON.parse(localStorage.getItem('smart-tutorial-seen') || '[]');
    
    if (!seenPages.includes(currentPage) && !hasShownForPage) {
      // Show tutorial after 2 seconds on new pages
      const timer = setTimeout(() => {
        setShowTutorial(true);
        setHasShownForPage(true);
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [currentPage, hasShownForPage]);

  const markPageAsSeen = useCallback(() => {
    const seenPages = JSON.parse(localStorage.getItem('smart-tutorial-seen') || '[]');
    if (!seenPages.includes(currentPage)) {
      seenPages.push(currentPage);
      localStorage.setItem('smart-tutorial-seen', JSON.stringify(seenPages));
    }
    setShowTutorial(false);
  }, [currentPage]);

  const showManualTutorial = useCallback(() => {
    setShowTutorial(true);
  }, []);

  return {
    showTutorial,
    setShowTutorial,
    markPageAsSeen,
    showManualTutorial,
    SmartTutorialComponent: (props: Partial<SmartTutorialProps>) => (
      <SmartTutorial
        isOpen={showTutorial}
        onClose={() => setShowTutorial(false)}
        currentPage={currentPage}
        userName={userName}
        onComplete={markPageAsSeen}
        {...props}
      />
    )
  };
}