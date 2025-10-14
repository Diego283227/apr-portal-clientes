import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  HelpCircle,
  MapPin,
  Navigation,
  Eye,
  Volume2,
  Edit,
  Save,
  Loader2,
  CheckCircle,
  ArrowRight,
  X,
  Home,
  User,
  FileText,
  CreditCard,
  MessageCircle,
  Settings,
  Clock,
  Zap
} from 'lucide-react';
import { toast } from 'sonner';

interface TutorialSocioProps {
  isOpen: boolean;
  onClose: () => void;
  currentLocation?: string;
  userName: string;
  onNavigate?: (view: string) => void;
  onReopenTutorial?: () => void;
}

type TutorialOption = {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  steps: TutorialStep[];
  finalAction?: {
    type: 'navigate' | 'click' | 'scroll';
    target: string; // selector or view name
    description: string;
    delay?: number;
  };
};

type TutorialStep = {
  id: string;
  title: string;
  description: string;
  location: string;
  action: string;
  highlight?: string;
  tip?: string;
  element?: string; // CSS selector for highlighting
  popover?: {
    side?: 'top' | 'bottom' | 'left' | 'right';
    align?: 'start' | 'center' | 'end';
  };
  actionDetector?: {
    type: 'click' | 'input' | 'scroll' | 'audio' | 'custom';
    target?: string; // specific selector for detection
    validation?: (element: Element, event: Event) => boolean;
    captureData?: (element: Element, event: Event) => any;
  };
};

const TUTORIAL_OPTIONS: TutorialOption[] = [
  {
    id: 'profile',
    title: 'Mi Perfil y Auto-guardado',
    description: 'Aprende a editar tu información personal con guardado automático',
    icon: <User className="h-6 w-6" />,
    finalAction: {
      type: 'navigate',
      target: 'perfil',
      description: 'Navegando a tu perfil para que practiques',
      delay: 2000
    },
    steps: [
      {
        id: 'profile-1',
        title: 'Ir a Mi Perfil',
        description: 'Desde el dashboard, busca la sección "Mi Perfil"',
        location: 'Dashboard → Mi Perfil',
        action: 'Hacer clic en "Mi Perfil"',
        highlight: 'Tarjeta con ícono de usuario',
        tip: 'También puedes acceder desde el menú lateral',
        element: '#socio-profile',
        popover: { side: 'right', align: 'start' }
      },
      {
        id: 'profile-2',
        title: 'Activar Modo Edición',
        description: 'Haz clic en el botón "Editar (Auto-guardado)" para poder modificar tu información personal. Este botón activa el modo de edición que te permite cambiar tu teléfono y dirección.',
        location: 'Mi Perfil → Información Personal → Esquina superior derecha',
        action: 'Hacer clic en el botón azul "Editar (Auto-guardado)"',
        highlight: 'Botón azul con ícono de lápiz en la esquina superior derecha de la tarjeta "Información Personal"',
        tip: '🚀 El auto-guardado significa que tus cambios se guardan automáticamente cada 500ms sin que tengas que hacer clic en "Guardar". ¡Es súper rápido y eficiente!',
        element: '#edit-profile-btn',
        popover: { side: 'bottom', align: 'start' },
        actionDetector: {
          type: 'click',
          target: '#edit-profile-btn',
          captureData: (element, event) => ({
            buttonText: element.textContent,
            timestamp: new Date().toISOString(),
            action: 'edit_mode_activated'
          })
        }
      },
      {
        id: 'profile-3',
        title: 'Probar el Auto-guardado',
        description: 'Ahora puedes modificar tu teléfono o dirección. Verás cómo se activa el auto-guardado: aparecerá "Guardando..." y luego un toast de confirmación. Solo los campos editables (teléfono y dirección) se pueden cambiar.',
        location: 'Mi Perfil → Información Personal → Campo Teléfono',
        action: 'Escribir o modificar el número de teléfono en el campo resaltado',
        highlight: 'Campo de input con borde azul y etiqueta "Teléfono" - tiene un ícono de teléfono al lado',
        tip: '⚡ Auto-guardado inteligente: Se activa 500ms después de dejar de escribir. Verás un indicador "Guardando..." con spinner, luego un toast verde "💾 Guardado automático completado"',
        element: '#telefono-field',
        popover: { side: 'right', align: 'start' },
        actionDetector: {
          type: 'input',
          target: '#telefono-input',
          captureData: (element, event) => ({
            oldValue: (element as HTMLInputElement).defaultValue,
            newValue: (element as HTMLInputElement).value,
            fieldType: 'telefono',
            autoSaveTriggered: true,
            timestamp: new Date().toISOString()
          })
        }
      },
      {
        id: 'profile-4',
        title: 'Función RUT Oral',
        description: 'Esta es una característica de accesibilidad única. Haz clic en el botón 🔊 para escuchar tu RUT pronunciado en español. También verás el texto convertido a palabras debajo del RUT.',
        location: 'Mi Perfil → Información Personal → Sección RUT → Botones al lado derecho',
        action: 'Hacer clic en el botón azul 🔊 (Volume2) para escuchar tu RUT',
        highlight: 'Botón pequeño azul con ícono de altavoz (🔊) al lado derecho del RUT formateado',
        tip: '🔊 Función de accesibilidad: Perfecto para personas con dificultades visuales o para verificar que tu RUT esté correcto. El botón 👁️ te lleva al inicio con scroll suave.',
        element: '#rut-speak-btn',
        popover: { side: 'left', align: 'start' },
        actionDetector: {
          type: 'audio',
          target: '#rut-speak-btn',
          captureData: (element, event) => {
            const rutText = document.querySelector('#rut-section .font-mono')?.textContent;
            return {
              rutValue: rutText,
              audioTriggered: true,
              speechSynthesis: 'speechSynthesis' in window,
              timestamp: new Date().toISOString()
            };
          }
        }
      },
      {
        id: 'profile-5',
        title: 'Botón Flotante Inteligente',
        description: 'Esta es una función UX avanzada: cuando haces scroll hacia abajo y el header desaparece de la vista, aparece automáticamente un botón flotante azul. Te permite editar o acceder al menú sin tener que volver arriba.',
        location: 'Mi Perfil → Hacer scroll hacia abajo → Esquina inferior derecha',
        action: 'Hacer scroll hacia abajo en la página y luego clic en el botón flotante circular',
        highlight: 'Botón circular azul flotante (14x14) con sombra en esquina inferior derecha - aparece solo al hacer scroll',
        tip: '🎈 UX Inteligente: El botón cambia según el contexto: en modo visualización muestra ícono "Edit", en modo edición muestra "X" para cancelar. Solo aparece cuando lo necesitas.',
        element: '#floating-sidebar-btn',
        popover: { side: 'left', align: 'start' },
        actionDetector: {
          type: 'scroll',
          target: 'window',
          validation: (element, event) => {
            const scrolled = window.scrollY > 100;
            const floatingBtn = document.querySelector('#floating-sidebar-btn');
            return scrolled && floatingBtn && floatingBtn.offsetParent !== null;
          },
          captureData: (element, event) => ({
            scrollY: window.scrollY,
            floatingBtnVisible: !!document.querySelector('#floating-sidebar-btn')?.offsetParent,
            timestamp: new Date().toISOString(),
            action: 'floating_button_revealed'
          })
        }
      },
      {
        id: 'profile-6',
        title: 'Resumen de Funcionalidades',
        description: 'Has explorado todas las funcionalidades avanzadas del perfil. Ahora conoces: ✅ Auto-guardado cada 500ms ✅ Botón flotante inteligente ✅ RUT oral con síntesis de voz ✅ Campos editables vs no-editables ✅ Indicadores visuales de estado. ¡Tu perfil está lleno de características increíbles!',
        location: 'Mi Perfil → Todas las funcionalidades exploradas',
        action: 'Revisar mentalmente todo lo aprendido sobre el perfil',
        highlight: 'Todo el perfil completo con todas sus características',
        tip: '🎓 Pro: Ahora puedes usar tu perfil de manera eficiente. Recuerda que el auto-guardado te ahorra tiempo y el RUT oral es perfecto para verificación.',
        element: '#socio-profile',
        popover: { side: 'right', align: 'center' },
        actionDetector: {
          type: 'custom',
          target: '#socio-profile',
          validation: () => true,
          captureData: () => ({
            tutorialCompleted: true,
            featuresLearned: ['auto-save', 'floating-button', 'rut-audio', 'editable-fields'],
            completionTime: new Date().toISOString(),
            action: 'tutorial_completed'
          })
        }
      }
    ]
  },
  {
    id: 'boletas',
    title: 'Ver mis Boletas',
    description: 'Consulta tus boletas, pagos pendientes y historial',
    icon: <FileText className="h-6 w-6" />,
    finalAction: {
      type: 'navigate',
      target: 'boletas',
      description: 'Te mostramos la sección de boletas',
      delay: 2000
    },
    steps: [
      {
        id: 'boletas-1',
        title: 'Acceder a Mis Boletas',
        description: 'Para ver todas tus boletas (pendientes, pagadas y vencidas), debes navegar a la sección de boletas. Puedes hacerlo desde el menú lateral o desde el dashboard principal.',
        location: 'Menú Lateral → Mis Boletas',
        action: 'Hacer clic en la opción "Mis Boletas" del menú lateral izquierdo',
        highlight: 'Opción del menú con ícono de documento (FileText) y texto "Mis Boletas"',
        element: '#nav-boletas',
        popover: { side: 'right', align: 'start' },
        actionDetector: {
          type: 'click',
          target: '#nav-boletas',
          captureData: (element, event) => ({
            menuItem: 'boletas',
            navigationTriggered: true,
            timestamp: new Date().toISOString(),
            action: 'navigate_to_boletas'
          })
        }
      },
      {
        id: 'boletas-2',
        title: 'Filtrar Boletas',
        description: 'Usa los filtros para ver boletas pendientes, pagadas o vencidas',
        location: 'Mis Boletas → Filtros superiores',
        action: 'Seleccionar estado deseado',
        highlight: 'Badges de colores en la parte superior',
        element: '.filter-badges',
        popover: { side: 'bottom', align: 'center' },
        actionDetector: {
          type: 'click',
          target: '.filter-badge',
          captureData: (element, event) => ({
            filterType: element.textContent,
            filterApplied: true,
            timestamp: new Date().toISOString(),
            action: 'apply_boletas_filter'
          })
        }
      },
      {
        id: 'boletas-3',
        title: 'Descargar Boleta',
        description: 'Haz clic en "Descargar PDF" para obtener tu boleta',
        location: 'Mis Boletas → Acción en cada boleta',
        action: 'Clic en botón "Descargar"',
        highlight: 'Botón con ícono de descarga',
        element: '.download-btn',
        popover: { side: 'top', align: 'center' },
        actionDetector: {
          type: 'click',
          target: '.download-btn',
          captureData: (element, event) => ({
            boletaId: element.closest('.boleta-card')?.dataset.boletaId,
            downloadTriggered: true,
            fileType: 'PDF',
            timestamp: new Date().toISOString(),
            action: 'download_boleta'
          })
        }
      }
    ]
  },
  {
    id: 'payments',
    title: 'Realizar Pagos',
    description: 'Aprende a pagar tus boletas de forma segura',
    icon: <CreditCard className="h-6 w-6" />,
    finalAction: {
      type: 'navigate',
      target: 'pago',
      description: 'Accediendo a la sección de pagos',
      delay: 2000
    },
    steps: [
      {
        id: 'payments-1',
        title: 'Seleccionar Boleta a Pagar',
        description: 'En "Mis Boletas", encuentra la boleta pendiente',
        location: 'Mis Boletas → Boleta pendiente',
        action: 'Buscar boleta con estado "Pendiente"',
        highlight: 'Badge amarillo "Pendiente"',
        element: '.boleta-pendiente',
        popover: { side: 'top', align: 'start' },
        actionDetector: {
          type: 'click',
          target: '.boleta-pendiente',
          captureData: (element, event) => ({
            boletaStatus: 'pendiente',
            boletaSelected: true,
            timestamp: new Date().toISOString(),
            action: 'select_pending_boleta'
          })
        }
      },
      {
        id: 'payments-2',
        title: 'Iniciar Pago',
        description: 'Haz clic en "Pagar Ahora" en la boleta seleccionada',
        location: 'Mis Boletas → Boleta específica',
        action: 'Clic en "Pagar Ahora"',
        highlight: 'Botón verde en la boleta',
        element: '.pagar-ahora-btn',
        popover: { side: 'bottom', align: 'center' },
        actionDetector: {
          type: 'click',
          target: '.pagar-ahora-btn',
          captureData: (element, event) => ({
            paymentInitiated: true,
            boletaId: element.closest('.boleta-card')?.dataset.boletaId,
            timestamp: new Date().toISOString(),
            action: 'initiate_payment'
          })
        }
      },
      {
        id: 'payments-3',
        title: 'Completar Pago',
        description: 'Sigue el proceso de pago con tu método preferido',
        location: 'Página de Pago → Formulario',
        action: 'Llenar datos y confirmar',
        highlight: 'Formulario de pago seguro',
        element: '.payment-form',
        popover: { side: 'top', align: 'center' },
        actionDetector: {
          type: 'input',
          target: '.payment-form input',
          captureData: (element, event) => ({
            fieldName: (element as HTMLInputElement).name,
            formFilled: true,
            paymentMethod: document.querySelector('.payment-method-select')?.value,
            timestamp: new Date().toISOString(),
            action: 'fill_payment_form'
          })
        }
      }
    ]
  },
  {
    id: 'support',
    title: 'Solicitar Ayuda',
    description: 'Contacta con administradores y obtén soporte',
    icon: <MessageCircle className="h-6 w-6" />,
    finalAction: {
      type: 'navigate',
      target: 'chat',
      description: 'Abriendo el chat de soporte',
      delay: 2000
    },
    steps: [
      {
        id: 'support-1',
        title: 'Chat de Soporte',
        description: 'Accede al chat desde el dashboard',
        location: 'Dashboard → Chat/Mensajes',
        action: 'Clic en ícono de chat',
        highlight: 'Ícono de mensaje en el menú',
        element: '#nav-chat',
        popover: { side: 'right', align: 'start' },
        actionDetector: {
          type: 'click',
          target: '#nav-chat',
          captureData: (element, event) => ({
            supportChatOpened: true,
            navigationSource: 'menu',
            timestamp: new Date().toISOString(),
            action: 'open_support_chat'
          })
        }
      },
      {
        id: 'support-2',
        title: 'Ver Admins Disponibles',
        description: 'En tu perfil puedes ver qué administradores están en línea',
        location: 'Mi Perfil → Estado de Soporte',
        action: 'Revisar panel lateral',
        highlight: 'Panel "Estado de Soporte" con puntos verdes',
        element: '.support-status-panel',
        popover: { side: 'left', align: 'center' },
        actionDetector: {
          type: 'custom',
          target: '.support-status-panel',
          validation: (element) => {
            const onlineAdmins = element.querySelectorAll('.admin-online').length;
            return onlineAdmins > 0;
          },
          captureData: (element, event) => ({
            onlineAdminsCount: element.querySelectorAll('.admin-online').length,
            supportAvailable: true,
            timestamp: new Date().toISOString(),
            action: 'check_admin_availability'
          })
        }
      }
    ]
  }
];

export default function TutorialSocio({ isOpen, onClose, currentLocation, userName, onNavigate, onReopenTutorial }: TutorialSocioProps) {
  const [selectedTutorial, setSelectedTutorial] = useState<TutorialOption | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isInGuidedMode, setIsInGuidedMode] = useState(false);
  const [driverObj, setDriverObj] = useState<any>(null);
  const [hasUserClicked, setHasUserClicked] = useState(false);
  const [userActionDetected, setUserActionDetected] = useState<string | null>(null);
  const [actionDetails, setActionDetails] = useState<any>(null);
  const [interactionHistory, setInteractionHistory] = useState<any[]>([]);
  const [isShowingData, setIsShowingData] = useState(false);
  const [dynamicFeedback, setDynamicFeedback] = useState<string | null>(null);

  // Cleanup driver on unmount
  useEffect(() => {
    return () => {
      if (driverObj) {
        driverObj.destroy();
      }
    };
  }, [driverObj]);

  // Detect current location for contextual suggestions
  const getSuggestedTutorials = () => {
    if (currentLocation?.includes('perfil') || currentLocation?.includes('profile')) {
      return ['profile'];
    }
    if (currentLocation?.includes('boletas') || currentLocation?.includes('bills')) {
      return ['boletas', 'payments'];
    }
    if (currentLocation?.includes('chat') || currentLocation?.includes('messages')) {
      return ['support'];
    }
    return [];
  };

  const suggestedTutorialIds = getSuggestedTutorials();

  // Generate dynamic feedback based on captured interaction data
  const generateDynamicFeedback = (actionType: string, data: any, step: TutorialStep) => {
    let feedback = '';
    
    switch (actionType) {
      case 'input':
        if (data.fieldType === 'telefono') {
          feedback = `📱 Has modificado tu teléfono. El auto-guardado se activará en 500ms automáticamente.`;
        } else if (data.newValue && data.oldValue && data.newValue !== data.oldValue) {
          feedback = `✏️ Cambio detectado: "${data.oldValue}" → "${data.newValue}". Sistema guardando...`;
        }
        break;
      case 'click':
        if (data.action === 'edit_mode_activated') {
          feedback = `🔓 Modo edición activado. Ahora puedes modificar teléfono y dirección.`;
        } else if (data.navigationTriggered) {
          feedback = `🧭 Navegación detectada hacia ${data.menuItem}. Cambio de vista en progreso.`;
        }
        break;
      case 'audio':
        if (data.rutValue) {
          feedback = `🔊 RUT "${data.rutValue}" convertido a audio con síntesis de voz.`;
        }
        break;
      case 'scroll':
        if (data.floatingBtnVisible) {
          feedback = `🎈 Botón flotante aparece automáticamente al hacer scroll (${data.scrollY}px).`;
        }
        break;
      case 'custom':
        if (data.tutorialCompleted) {
          feedback = `🎉 ¡Tutorial completado! Has aprendido ${data.featuresLearned?.length || 0} características.`;
        }
        break;
    }
    
    if (feedback) {
      setDynamicFeedback(feedback);
      setTimeout(() => setDynamicFeedback(null), 5000);
    }
  };

  const handleSelectTutorial = (tutorial: TutorialOption) => {
    setSelectedTutorial(tutorial);
    setCurrentStepIndex(0);
    setIsInGuidedMode(true);
    toast.info(`🎯 Iniciando tutorial: ${tutorial.title}`);
    
    // Close modal first, then start highlighting
    onClose();
    setTimeout(() => {
      startHighlighting(tutorial.steps[0]);
    }, 500);
  };

  const startHighlighting = (step: TutorialStep) => {
    if (!step.element) return;
    
    const element = document.querySelector(step.element);
    if (!element) {
      toast.error(`No se pudo encontrar el elemento: ${step.element}`);
      return;
    }

    // Reset interaction states
    setHasUserClicked(false);
    setUserActionDetected(null);
    setActionDetails(null);

    // Enhanced action detection system
    const setupActionDetector = (detector: typeof step.actionDetector) => {
      if (!detector) return;

      const targetElement = detector.target ? 
        (detector.target === 'window' ? window : document.querySelector(detector.target)) : 
        element;
      
      if (!targetElement && detector.target !== 'window') {
        console.warn(`Action detector target not found: ${detector.target}`);
        return;
      }

      const handleDetectedAction = (event: Event) => {
        // Run validation if provided
        if (detector.validation && !detector.validation(event.target as Element, event)) {
          return;
        }

        // Capture action data
        const capturedData = detector.captureData ? 
          detector.captureData(event.target as Element, event) : 
          { action: detector.type, timestamp: new Date().toISOString() };
        
        setUserActionDetected(detector.type);
        setActionDetails(capturedData);
        setHasUserClicked(true);
        
        // Add to interaction history
        setInteractionHistory(prev => [...prev, {
          stepId: step.id,
          stepTitle: step.title,
          actionType: detector.type,
          data: capturedData,
          timestamp: new Date().toISOString(),
          element: detector.target || step.element
        }]);
        
        // Generate dynamic feedback based on captured data
        generateDynamicFeedback(detector.type, capturedData, step);

        // Dynamic feedback based on action type
        const feedbackMessages = {
          click: '👆 ¡Excelente! Has hecho clic correctamente',
          input: '⌨️ ¡Perfecto! Has empezado a escribir',
          scroll: '📜 ¡Bien! Has hecho scroll como se indicó',
          audio: '🔊 ¡Genial! Has activado el audio',
          custom: '⭐ ¡Muy bien! Acción personalizada detectada'
        };

        toast.success(feedbackMessages[detector.type as keyof typeof feedbackMessages] || '✅ Acción detectada correctamente', {
          duration: 3000,
        });

        // Show captured data with more detail
        if (capturedData && Object.keys(capturedData).length > 0) {
          setIsShowingData(true);
          setTimeout(() => {
            const dataPreview = Object.entries(capturedData)
              .slice(0, 2)
              .map(([key, value]) => `${key}: ${typeof value === 'object' ? JSON.stringify(value).slice(0, 20) + '...' : value}`)
              .join(', ');
            
            toast.info(`📊 Capturado: ${dataPreview}`, {
              duration: 4000,
            });
            
            // Hide data display after showing
            setTimeout(() => setIsShowingData(false), 3000);
          }, 500);
        }
        
        // Update the next button dynamically
        const nextButton = document.querySelector('[data-driver-popover-next-btn]');
        if (nextButton) {
          nextButton.textContent = `🎉 ¡${detector.type.toUpperCase()} detectado! Siguiente →`;
          nextButton.classList.add('bg-green-600', 'hover:bg-green-700');
          nextButton.classList.remove('bg-blue-600', 'hover:bg-blue-700');
        }
      };

      // Set up event listeners based on detector type
      switch (detector.type) {
        case 'click':
          (targetElement as Element).addEventListener('click', handleDetectedAction, { once: true });
          break;
        case 'input':
          (targetElement as Element).addEventListener('input', handleDetectedAction, { once: true });
          (targetElement as Element).addEventListener('change', handleDetectedAction, { once: true });
          break;
        case 'scroll':
          if (detector.target === 'window') {
            const scrollHandler = (event: Event) => {
              handleDetectedAction(event);
              window.removeEventListener('scroll', scrollHandler);
            };
            window.addEventListener('scroll', scrollHandler);
          } else {
            (targetElement as Element).addEventListener('scroll', handleDetectedAction, { once: true });
          }
          break;
        case 'audio':
          (targetElement as Element).addEventListener('click', (event) => {
            // Special handling for audio actions
            const audioContext = (event.target as Element).closest('[data-audio]') || event.target;
            handleDetectedAction(event);
          }, { once: true });
          break;
        case 'custom':
          // For custom actions, we set up a click listener but allow custom validation
          (targetElement as Element).addEventListener('click', handleDetectedAction, { once: true });
          break;
        default:
          console.warn(`Unknown detector type: ${detector.type}`);
      }
    };

    // Set up the action detector for this step
    if (step.actionDetector) {
      setupActionDetector(step.actionDetector);
    }

    // Fallback click listener for basic interaction tracking
    const handleElementClick = () => {
      if (!hasUserClicked && !step.actionDetector) {
        setHasUserClicked(true);
        toast.success('✅ ¡Perfecto! Has hecho clic en el elemento correcto', {
          duration: 2000,
        });
        
        // Update the next button text dynamically
        const nextButton = document.querySelector('[data-driver-popover-next-btn]');
        if (nextButton) {
          nextButton.textContent = '🎉 ¡Genial! Siguiente →';
          nextButton.classList.add('bg-green-600', 'hover:bg-green-700');
          nextButton.classList.remove('bg-blue-600', 'hover:bg-blue-700');
        }
      }
    };

    if (!step.actionDetector) {
      element.addEventListener('click', handleElementClick, { once: true });
    }

    // Create driver.js instance for interactive highlighting
    const driverInstance = driver({
      showProgress: true,
      allowClose: false, // Don't allow closing to keep user focused
      overlayClickNext: false, // Don't advance on overlay click
      nextBtnText: 'Entendido, Siguiente →',
      prevBtnText: '← Volver Atrás',
      doneBtnText: '✅ ¡Perfecto! Finalizar',
      closeBtnAriaLabel: 'Cerrar tutorial',
      progressText: 'Paso {{current}} de {{total}}',
      steps: [{
        element: step.element,
        popover: {
          title: `🎯 ${step.title}`,
          description: `
            <div class="space-y-4">
              <div class="bg-blue-50 p-3 rounded-lg border-l-4 border-blue-400">
                <p class="font-medium text-blue-800">📍 ¿Dónde está?</p>
                <p class="text-sm text-blue-700">${step.location}</p>
              </div>
              
              <div class="bg-green-50 p-3 rounded-lg border-l-4 border-green-400">
                <p class="font-medium text-green-800">⚡ ¿Qué hacer?</p>
                <p class="text-sm text-green-700">${step.action}</p>
                <p class="text-sm text-green-600 mt-1">${step.description}</p>
              </div>
              
              ${step.highlight ? `
                <div class="bg-yellow-50 p-3 rounded-lg border-l-4 border-yellow-400">
                  <p class="font-medium text-yellow-800">🔍 Buscar:</p>
                  <p class="text-sm text-yellow-700">${step.highlight}</p>
                </div>
              ` : ''}
              
              ${step.tip ? `
                <div class="bg-purple-50 p-3 rounded-lg border-l-4 border-purple-400">
                  <p class="font-medium text-purple-800">💡 Consejo Pro:</p>
                  <p class="text-sm text-purple-700">${step.tip}</p>
                </div>
              ` : ''}
              
              <div class="bg-gray-50 p-3 rounded-lg border border-gray-200">
                <p class="text-xs font-medium text-gray-600 uppercase tracking-wide">INSTRUCCIÓN:</p>
                <p class="text-sm text-gray-700 mt-1">
                  ${step.actionDetector ? 
                    `🎯 <strong>${{
                      'click': 'Haz clic en el elemento resaltado',
                      'input': 'Escribe o modifica el contenido del campo',
                      'scroll': 'Haz scroll en la página para activar la función',
                      'audio': 'Haz clic para escuchar el audio',
                      'custom': 'Realiza la acción específica indicada'
                    }[step.actionDetector.type] || 'Realiza la acción indicada'}</strong> para que el sistema detecte y capture tu interacción en tiempo real.` :
                    '👆 <strong>Haz clic en el elemento resaltado</strong> para practicar y ver cómo funciona.'}
                  Luego presiona "Entendido, Siguiente" para continuar.
                </p>
                ${step.actionDetector ? `
                  <div class="mt-2 text-xs text-blue-600">
                    🔍 <strong>Detección activa:</strong> El sistema capturará automáticamente datos sobre tu ${{
                      'click': 'clic (elemento, hora, contexto)',
                      'input': 'escritura (valor anterior/nuevo, campo, timestamp)',
                      'scroll': 'desplazamiento (posición, elementos visibles)',
                      'audio': 'interacción de audio (RUT, síntesis activada)',
                      'custom': 'acción personalizada (datos específicos del contexto)'
                    }[step.actionDetector.type] || 'interacción'}.
                  </div>
                ` : ''}
              </div>
            </div>
          `,
          side: step.popover?.side || 'top',
          align: step.popover?.align || 'start',
        }
      }],
      onNextClick: () => handleNextStep(),
      onPrevClick: () => handlePrevStep(),
      onCloseClick: () => handleFinishTutorial()
    });

    setDriverObj(driverInstance);
    driverInstance.drive();
  };

  const handleNextStep = () => {
    if (selectedTutorial && currentStepIndex < selectedTutorial.steps.length - 1) {
      const nextIndex = currentStepIndex + 1;
      const currentStep = selectedTutorial.steps[currentStepIndex];
      const nextStep = selectedTutorial.steps[nextIndex];
      
      // Dynamic tutorial adaptation based on user interaction
      const adaptTutorialFlow = () => {
        if (currentStep.actionDetector && actionDetails) {
          // Modify next step based on current interaction
          switch (actionDetails.action) {
            case 'edit_mode_activated':
              // If user activated edit mode, enhance the next step's description
              nextStep.description += ' Nota: Como ya activaste el modo edición, los campos ahora están habilitados para modificación.';
              break;
            case 'auto_save_triggered':
              // If auto-save was triggered, add context about the process
              nextStep.tip = (nextStep.tip || '') + ' 💡 Como acabas de experimentar, el auto-guardado funciona automáticamente cada 500ms.';
              break;
            case 'floating_button_revealed':
              // If floating button appeared, explain its context-awareness
              nextStep.description += ' El botón flotante ya apareció porque hiciste scroll, demostrando su naturaleza inteligente.';
              break;
          }
        }
      };
      
      adaptTutorialFlow();
      setCurrentStepIndex(nextIndex);
      
      // Cleanup current driver
      if (driverObj) {
        driverObj.destroy();
      }
      
      // Generate transition feedback
      if (userActionDetected) {
        toast.info(`🔄 Avanzando... Tu ${userActionDetected} fue detectada correctamente`, {
          duration: 2000,
        });
      }
      
      // Start next step highlighting with adapted content
      setTimeout(() => {
        startHighlighting(nextStep);
      }, 100);
    } else {
      handleFinishTutorial();
    }
  };

  const handlePrevStep = () => {
    if (currentStepIndex > 0) {
      const prevIndex = currentStepIndex - 1;
      setCurrentStepIndex(prevIndex);
      
      // Cleanup current driver
      if (driverObj) {
        driverObj.destroy();
      }
      
      // Start previous step highlighting
      setTimeout(() => {
        startHighlighting(selectedTutorial.steps[prevIndex]);
      }, 100);
    }
  };

  const handleFinishTutorial = () => {
    if (driverObj) {
      driverObj.destroy();
    }
    
    const currentTutorial = selectedTutorial;
    
    // Generate completion summary based on interaction history
    const completionSummary = () => {
      if (interactionHistory.length > 0) {
        const actionTypes = [...new Set(interactionHistory.map(i => i.actionType))];
        const uniqueElements = [...new Set(interactionHistory.map(i => i.element))];
        
        toast.success(
          `🎯 Resumen: Realizaste ${interactionHistory.length} interacciones (${actionTypes.join(', ')}) en ${uniqueElements.length} elementos diferentes.`,
          { duration: 6000 }
        );
      }
    };
    
    completionSummary();
    
    // Reset tutorial state first
    setIsInGuidedMode(false);
    setSelectedTutorial(null);
    setCurrentStepIndex(0);
    setDriverObj(null);
    
    // Clear interaction data
    setInteractionHistory([]);
    setUserActionDetected(null);
    setActionDetails(null);
    setDynamicFeedback(null);
    
    toast.success('🎉 ¡Tutorial completado! Ya conoces cómo usar esta función');
    
    // Execute final action if defined
    if (currentTutorial?.finalAction && onNavigate) {
      const { finalAction } = currentTutorial;
      
      setTimeout(() => {
        toast.info(`🎯 ${finalAction.description}`);
        
        if (finalAction.type === 'navigate') {
          onNavigate(finalAction.target);
          
          // After showing the interface, return to tutorial menu
          setTimeout(() => {
            toast.info('📚 Regresando al menú del tutorial para que puedas explorar más');
            if (onReopenTutorial) {
              onReopenTutorial();
            }
          }, finalAction.delay || 3000);
        }
      }, 1000);
    }
  };

  const handleBackToMenu = () => {
    if (driverObj) {
      driverObj.destroy();
    }
    setIsInGuidedMode(false);
    setSelectedTutorial(null);
    setCurrentStepIndex(0);
    setDriverObj(null);
    
    // Clear interaction data when going back to menu
    setInteractionHistory([]);
    setUserActionDetected(null);
    setActionDetails(null);
    setDynamicFeedback(null);
  };

  const currentStep = selectedTutorial?.steps[currentStepIndex];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            Tutorial Interactivo para {userName}
          </DialogTitle>
        </DialogHeader>

        {!isInGuidedMode ? (
          // Tutorial Selection Menu
          <div className="space-y-6">
            
            {/* Location Awareness */}
            {currentLocation && (
              <Card className="border-blue-200 bg-blue-50">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-800">
                      Estás en: {currentLocation}
                    </span>
                  </div>
                  {suggestedTutorialIds.length > 0 && (
                    <p className="text-xs text-blue-600">
                      💡 Te sugerimos los tutoriales resaltados para esta sección
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Welcome Message */}
            <div className="text-center">
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                ¡Bienvenido al Tutorial Interactivo! 👋
              </h2>
              <p className="text-gray-600">
                Selecciona qué te gustaría aprender. Te guiaremos paso a paso con ejemplos prácticos.
              </p>
            </div>

            {/* Tutorial Options */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {TUTORIAL_OPTIONS.map((tutorial) => {
                const isRecommended = suggestedTutorialIds.includes(tutorial.id);
                return (
                  <Card 
                    key={tutorial.id}
                    className={`cursor-pointer transition-all hover:shadow-lg ${
                      isRecommended ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:shadow-md'
                    }`}
                    onClick={() => handleSelectTutorial(tutorial)}
                  >
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center justify-between text-lg">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${
                            isRecommended ? 'bg-blue-200 text-blue-700' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {tutorial.icon}
                          </div>
                          {tutorial.title}
                        </div>
                        {isRecommended && (
                          <Badge variant="default" className="text-xs">
                            <Zap className="h-3 w-3 mr-1" />
                            Sugerido
                          </Badge>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-600 text-sm mb-3">
                        {tutorial.description}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">
                          {tutorial.steps.length} pasos
                        </span>
                        <ArrowRight className="h-4 w-4 text-gray-400" />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Quick Tips */}
            <Card className="bg-green-50 border-green-200">
              <CardContent className="pt-4">
                <h3 className="font-medium text-green-800 mb-2">
                  💡 Funciones Especiales del Portal
                </h3>
                <div className="space-y-2 text-sm text-green-700">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    <span><strong>Auto-guardado:</strong> Tus cambios se guardan automáticamente en 500ms</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Volume2 className="h-4 w-4" />
                    <span><strong>RUT Oral:</strong> Escucha tu RUT pronunciado correctamente</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Navigation className="h-4 w-4" />
                    <span><strong>Botones flotantes:</strong> Aparecen cuando haces scroll para facilitar la navegación</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          // Guided Tutorial Mode
          <div className="space-y-6">
            
            {/* Tutorial Header */}
            <div className="flex items-center justify-between">
              <Button variant="outline" onClick={handleBackToMenu}>
                <ArrowRight className="h-4 w-4 mr-2 rotate-180" />
                Volver al Menú
              </Button>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  Paso {currentStepIndex + 1} de {selectedTutorial?.steps.length}
                </Badge>
                <div className="flex gap-1">
                  {selectedTutorial?.steps.map((_, index) => (
                    <div
                      key={index}
                      className={`h-2 w-6 rounded-full ${
                        index <= currentStepIndex ? 'bg-blue-500' : 'bg-gray-200'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Current Step */}
            {currentStep && (
              <Card className="border-blue-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Navigation className="h-5 w-5 text-blue-600" />
                    </div>
                    {currentStep.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-gray-700">{currentStep.description}</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <h4 className="font-medium text-gray-800">📍 Ubicación:</h4>
                      <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                        <MapPin className="h-4 w-4 text-gray-500" />
                        <span className="text-sm font-mono">{currentStep.location}</span>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <h4 className="font-medium text-gray-800">⚡ Acción:</h4>
                      <div className="flex items-center gap-2 p-2 bg-blue-50 rounded">
                        <CheckCircle className="h-4 w-4 text-blue-500" />
                        <span className="text-sm">{currentStep.action}</span>
                      </div>
                    </div>
                  </div>

                  {currentStep.highlight && (
                    <div className="p-3 bg-yellow-50 border-l-4 border-yellow-400">
                      <h4 className="font-medium text-yellow-800 mb-1">🎯 Buscar:</h4>
                      <p className="text-sm text-yellow-700">{currentStep.highlight}</p>
                    </div>
                  )}

                  {currentStep.tip && (
                    <div className="p-3 bg-green-50 border-l-4 border-green-400">
                      <h4 className="font-medium text-green-800 mb-1">💡 Consejo:</h4>
                      <p className="text-sm text-green-700">{currentStep.tip}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Real-time Interaction Display */}
            {(userActionDetected || dynamicFeedback || isShowingData) && (
              <Card className="border-green-200 bg-green-50">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-green-800">
                      Interacción Detectada en Tiempo Real
                    </span>
                  </div>
                  
                  {userActionDetected && (
                    <div className="text-xs text-green-700 mb-2">
                      <strong>Tipo:</strong> {userActionDetected.toUpperCase()}
                      {actionDetails?.timestamp && (
                        <span className="ml-2">
                          <strong>Hora:</strong> {new Date(actionDetails.timestamp).toLocaleTimeString()}
                        </span>
                      )}
                    </div>
                  )}
                  
                  {dynamicFeedback && (
                    <div className="text-sm text-green-800 bg-white p-2 rounded border">
                      {dynamicFeedback}
                    </div>
                  )}
                  
                  {isShowingData && actionDetails && (
                    <div className="mt-2">
                      <details className="text-xs">
                        <summary className="cursor-pointer text-green-700 hover:text-green-800">
                          Ver datos capturados ({Object.keys(actionDetails).length} propiedades)
                        </summary>
                        <div className="mt-2 bg-white p-2 rounded border font-mono text-xs max-h-32 overflow-y-auto">
                          <pre className="whitespace-pre-wrap">
                            {JSON.stringify(actionDetails, null, 2)}
                          </pre>
                        </div>
                      </details>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
            
            {/* Interaction History */}
            {interactionHistory.length > 0 && (
              <Card className="border-blue-200 bg-blue-50">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Clock className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-800">
                      Historial de Interacciones ({interactionHistory.length})
                    </span>
                  </div>
                  
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {interactionHistory.slice(-3).map((interaction, index) => (
                      <div key={index} className="text-xs bg-white p-2 rounded border">
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-blue-800">
                            {interaction.stepTitle}
                          </span>
                          <span className="text-blue-600">
                            {interaction.actionType.toUpperCase()}
                          </span>
                        </div>
                        <div className="text-blue-700 mt-1">
                          Elemento: <code className="bg-blue-100 px-1 rounded">
                            {interaction.element}
                          </code>
                        </div>
                        <div className="text-blue-600 mt-1">
                          {new Date(interaction.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {interactionHistory.length > 3 && (
                    <div className="text-xs text-blue-600 mt-2 text-center">
                      ... y {interactionHistory.length - 3} interacciones más
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Navigation */}
            <div className="flex justify-between">
              <Button 
                variant="outline" 
                onClick={handlePrevStep}
                disabled={currentStepIndex === 0}
              >
                Anterior
              </Button>
              <Button onClick={handleNextStep}>
                {currentStepIndex === selectedTutorial!.steps.length - 1 ? (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Finalizar Tutorial
                  </>
                ) : (
                  <>
                    Siguiente
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Close Button */}
        <div className="flex justify-end pt-4">
          <Button variant="ghost" onClick={onClose}>
            <X className="h-4 w-4 mr-2" />
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}