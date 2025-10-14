import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';

interface HintConfig {
  id: string;
  message: string;
  trigger: 'idle' | 'hover' | 'focus' | 'error' | 'success' | 'context';
  element?: string; // CSS selector
  delay: number;
  priority: 'low' | 'medium' | 'high';
  conditions?: {
    minIdleTime?: number;
    maxShowCount?: number;
    pageSpecific?: string[];
    timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night';
  };
  actions?: {
    sound?: boolean;
    highlight?: string; // CSS selector to highlight
    bounce?: boolean;
    pulse?: boolean;
  };
}

interface UserActivity {
  lastMouseMove: number;
  lastKeyPress: number;
  lastClick: number;
  lastScroll: number;
  currentPage: string;
  sessionStart: number;
}

// Contextual hints configuration
const INTELLIGENT_HINTS: HintConfig[] = [
  {
    id: 'welcome_idle',
    message: '👋 ¡Hola! ¿Necesitas ayuda para navegar? Puedo guiarte paso a paso.',
    trigger: 'idle',
    delay: 8000,
    priority: 'medium',
    conditions: {
      minIdleTime: 5000,
      maxShowCount: 2,
      pageSpecific: ['/dashboard', '/']
    },
    actions: {
      sound: true,
      pulse: true
    }
  },
  {
    id: 'profile_edit_hint',
    message: '✏️ Tip: Puedes editar tu información personal haciendo clic en "Editar" en tu perfil.',
    trigger: 'hover',
    element: '#socio-profile',
    delay: 3000,
    priority: 'low',
    conditions: {
      maxShowCount: 1,
      pageSpecific: ['/dashboard', '/perfil']
    },
    actions: {
      highlight: '#edit-profile-btn',
      bounce: true
    }
  },
  {
    id: 'boletas_filter_help',
    message: '🔍 Usa los filtros de colores para encontrar rápidamente las boletas que buscas.',
    trigger: 'context',
    element: '.filter-badges',
    delay: 5000,
    priority: 'medium',
    conditions: {
      pageSpecific: ['/boletas'],
      maxShowCount: 3
    },
    actions: {
      highlight: '.filter-badge',
      pulse: true
    }
  },
  {
    id: 'auto_save_discovery',
    message: '💾 ¿Sabías que el sistema guarda tus cambios automáticamente? ¡No necesitas hacer clic en "Guardar"!',
    trigger: 'focus',
    element: '#telefono-input, #direccion-input',
    delay: 2000,
    priority: 'high',
    conditions: {
      pageSpecific: ['/perfil'],
      maxShowCount: 1
    },
    actions: {
      sound: true,
      pulse: true
    }
  },
  {
    id: 'chat_support_reminder',
    message: '💬 ¿Tienes dudas? El chat de soporte está disponible 24/7 para ayudarte.',
    trigger: 'idle',
    delay: 15000,
    priority: 'low',
    conditions: {
      minIdleTime: 10000,
      maxShowCount: 1,
      timeOfDay: 'morning'
    },
    actions: {
      highlight: '#nav-chat',
      bounce: true
    }
  },
  {
    id: 'rut_audio_accessibility',
    message: '🔊 Función de accesibilidad: Haz clic en el icono de audio para escuchar tu RUT.',
    trigger: 'hover',
    element: '#rut-section',
    delay: 4000,
    priority: 'medium',
    conditions: {
      pageSpecific: ['/perfil'],
      maxShowCount: 1
    },
    actions: {
      highlight: '#rut-speak-btn',
      pulse: true,
      sound: true
    }
  },
  {
    id: 'payment_security_tip',
    message: '🔒 Tip de seguridad: Siempre verifica que la URL comience con "https://" antes de ingresar datos de pago.',
    trigger: 'context',
    delay: 2000,
    priority: 'high',
    conditions: {
      pageSpecific: ['/pago', '/checkout'],
      maxShowCount: 2
    },
    actions: {
      sound: true
    }
  },
  {
    id: 'floating_button_discovery',
    message: '🎈 ¿Viste que aparece un botón flotante al hacer scroll? Te permite acceder rápido al menú.',
    trigger: 'idle',
    delay: 10000,
    priority: 'low',
    conditions: {
      minIdleTime: 8000,
      maxShowCount: 1
    },
    actions: {
      highlight: '#floating-sidebar-btn',
      bounce: true
    }
  },
  {
    id: 'keyboard_shortcuts',
    message: '⌨️ Shortcuts útiles: Ctrl+/ para ayuda rápida, Escape para cerrar modales.',
    trigger: 'idle',
    delay: 20000,
    priority: 'low',
    conditions: {
      minIdleTime: 15000,
      maxShowCount: 1
    }
  },
  {
    id: 'mobile_responsive_tip',
    message: '📱 Esta aplicación funciona perfectamente en tu móvil. ¡Pruébala desde tu teléfono!',
    trigger: 'idle',
    delay: 30000,
    priority: 'low',
    conditions: {
      minIdleTime: 25000,
      maxShowCount: 1
    }
  }
];

export function useIntelligentHints(currentPage: string, isEnabled: boolean = true) {
  const [userActivity, setUserActivity] = useState<UserActivity>({
    lastMouseMove: Date.now(),
    lastKeyPress: Date.now(),
    lastClick: Date.now(),
    lastScroll: Date.now(),
    currentPage,
    sessionStart: Date.now()
  });
  
  const [shownHints, setShownHints] = useState<Set<string>>(new Set());
  const [isUserIdle, setIsUserIdle] = useState(false);
  const [activeHints, setActiveHints] = useState<HintConfig[]>([]);
  
  const activityTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const hintCounters = useRef<Map<string, number>>(new Map());
  const highlightedElements = useRef<Set<string>>(new Set());

  // Get time of day for contextual hints
  const getTimeOfDay = useCallback(() => {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 18) return 'afternoon';
    if (hour >= 18 && hour < 22) return 'evening';
    return 'night';
  }, []);

  // Check if hint conditions are met
  const shouldShowHint = useCallback((hint: HintConfig): boolean => {
    if (!isEnabled) return false;
    
    const { conditions } = hint;
    if (!conditions) return true;

    // Check page specific conditions
    if (conditions.pageSpecific && !conditions.pageSpecific.includes(currentPage)) {
      return false;
    }

    // Check max show count
    if (conditions.maxShowCount) {
      const currentCount = hintCounters.current.get(hint.id) || 0;
      if (currentCount >= conditions.maxShowCount) {
        return false;
      }
    }

    // Check minimum idle time
    if (conditions.minIdleTime) {
      const timeSinceLastActivity = Math.min(
        Date.now() - userActivity.lastMouseMove,
        Date.now() - userActivity.lastClick,
        Date.now() - userActivity.lastScroll
      );
      if (timeSinceLastActivity < conditions.minIdleTime) {
        return false;
      }
    }

    // Check time of day
    if (conditions.timeOfDay && conditions.timeOfDay !== getTimeOfDay()) {
      return false;
    }

    return true;
  }, [isEnabled, currentPage, userActivity, getTimeOfDay]);

  // Add visual effects to elements
  const addVisualEffect = useCallback((selector: string, effect: 'bounce' | 'pulse' | 'highlight') => {
    const element = document.querySelector(selector);
    if (!element) return;

    // Remove previous effects
    element.classList.remove('hint-bounce', 'hint-pulse', 'hint-highlight');
    highlightedElements.current.delete(selector);

    // Add new effect
    switch (effect) {
      case 'bounce':
        element.classList.add('hint-bounce');
        break;
      case 'pulse':
        element.classList.add('hint-pulse');
        break;
      case 'highlight':
        element.classList.add('hint-highlight');
        highlightedElements.current.add(selector);
        break;
    }

    // Auto-remove effect after animation
    setTimeout(() => {
      element.classList.remove('hint-bounce', 'hint-pulse');
      if (effect !== 'highlight') {
        highlightedElements.current.delete(selector);
      }
    }, 2000);
  }, []);

  // Play hint sound
  const playHintSound = useCallback(() => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance('Hint');
      utterance.volume = 0.2;
      utterance.rate = 1.5;
      speechSynthesis.speak(utterance);
    }
  }, []);

  // Show hint with effects
  const showHint = useCallback((hint: HintConfig) => {
    if (!shouldShowHint(hint)) return;

    // Increment counter
    const currentCount = hintCounters.current.get(hint.id) || 0;
    hintCounters.current.set(hint.id, currentCount + 1);

    // Show toast notification
    const duration = hint.priority === 'high' ? 8000 : hint.priority === 'medium' ? 6000 : 4000;
    
    toast.info(hint.message, {
      duration,
      id: hint.id, // Prevent duplicate toasts
      action: hint.element ? {
        label: "Ver",
        onClick: () => {
          const element = document.querySelector(hint.element!);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            addVisualEffect(hint.element!, 'highlight');
          }
        }
      } : undefined
    });

    // Apply visual effects
    if (hint.actions) {
      if (hint.actions.sound) {
        playHintSound();
      }
      
      if (hint.actions.highlight) {
        addVisualEffect(hint.actions.highlight, 'highlight');
      }
      
      if (hint.actions.bounce && hint.element) {
        addVisualEffect(hint.element, 'bounce');
      }
      
      if (hint.actions.pulse && hint.element) {
        addVisualEffect(hint.element, 'pulse');
      }
    }

    // Mark as shown
    setShownHints(prev => new Set([...prev, hint.id]));
    
    // Add to active hints
    setActiveHints(prev => [...prev.filter(h => h.id !== hint.id), hint]);
  }, [shouldShowHint, addVisualEffect, playHintSound]);

  // Setup activity detection
  const setupActivityDetection = useCallback(() => {
    const updateActivity = (type: keyof Pick<UserActivity, 'lastMouseMove' | 'lastKeyPress' | 'lastClick' | 'lastScroll'>) => {
      setUserActivity(prev => ({
        ...prev,
        [type]: Date.now()
      }));
      setIsUserIdle(false);
    };

    // Mouse movement detection
    const handleMouseMove = () => updateActivity('lastMouseMove');
    const handleClick = () => updateActivity('lastClick');
    const handleKeyPress = () => updateActivity('lastKeyPress');
    const handleScroll = () => updateActivity('lastScroll');

    document.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.addEventListener('click', handleClick, { passive: true });
    document.addEventListener('keydown', handleKeyPress, { passive: true });
    document.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('click', handleClick);
      document.removeEventListener('keydown', handleKeyPress);
      document.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Setup hint timers
  const setupHintTimers = useCallback(() => {
    // Clear existing timers
    activityTimers.current.forEach(timer => clearTimeout(timer));
    activityTimers.current.clear();

    INTELLIGENT_HINTS.forEach(hint => {
      if (hint.trigger === 'idle') {
        const timer = setTimeout(() => {
          const timeSinceLastActivity = Math.min(
            Date.now() - userActivity.lastMouseMove,
            Date.now() - userActivity.lastClick,
            Date.now() - userActivity.lastScroll
          );
          
          if (timeSinceLastActivity >= hint.delay) {
            setIsUserIdle(true);
            showHint(hint);
          }
        }, hint.delay);
        
        activityTimers.current.set(hint.id, timer);
      } else if (hint.trigger === 'context' && hint.element) {
        // Check if element exists before setting up context hints
        const element = document.querySelector(hint.element);
        if (element) {
          const timer = setTimeout(() => {
            showHint(hint);
          }, hint.delay);
          
          activityTimers.current.set(hint.id, timer);
        }
      }
    });
  }, [userActivity, showHint]);

  // Setup element-specific hints (hover, focus)
  const setupElementHints = useCallback(() => {
    INTELLIGENT_HINTS.forEach(hint => {
      if (!hint.element) return;
      
      const element = document.querySelector(hint.element);
      if (!element) return;

      if (hint.trigger === 'hover') {
        let hoverTimer: NodeJS.Timeout;
        
        const handleMouseEnter = () => {
          hoverTimer = setTimeout(() => {
            showHint(hint);
          }, hint.delay);
        };
        
        const handleMouseLeave = () => {
          clearTimeout(hoverTimer);
        };

        element.addEventListener('mouseenter', handleMouseEnter);
        element.addEventListener('mouseleave', handleMouseLeave);
      } else if (hint.trigger === 'focus') {
        const handleFocus = () => {
          setTimeout(() => {
            showHint(hint);
          }, hint.delay);
        };

        element.addEventListener('focus', handleFocus);
      }
    });
  }, [showHint]);

  // Reset hints for new page
  const resetForNewPage = useCallback(() => {
    setShownHints(new Set());
    setActiveHints([]);
    setIsUserIdle(false);
    hintCounters.current.clear();
    
    // Clear highlighting
    highlightedElements.current.forEach(selector => {
      const element = document.querySelector(selector);
      if (element) {
        element.classList.remove('hint-highlight');
      }
    });
    highlightedElements.current.clear();
    
    setUserActivity(prev => ({
      ...prev,
      currentPage,
      sessionStart: Date.now(),
      lastMouseMove: Date.now(),
      lastClick: Date.now(),
      lastScroll: Date.now(),
      lastKeyPress: Date.now()
    }));
  }, [currentPage]);

  // Manually trigger hint
  const triggerHint = useCallback((hintId: string) => {
    const hint = INTELLIGENT_HINTS.find(h => h.id === hintId);
    if (hint) {
      showHint(hint);
    }
  }, [showHint]);

  // Get available hints for current context
  const getAvailableHints = useCallback(() => {
    return INTELLIGENT_HINTS.filter(hint => 
      !shownHints.has(hint.id) && shouldShowHint(hint)
    );
  }, [shownHints, shouldShowHint]);

  // Initialize on mount
  useEffect(() => {
    if (!isEnabled) return;

    const cleanupActivity = setupActivityDetection();
    setupElementHints();
    
    // Small delay to allow page to render
    setTimeout(() => {
      setupHintTimers();
    }, 1000);

    return () => {
      cleanupActivity();
      activityTimers.current.forEach(timer => clearTimeout(timer));
    };
  }, [isEnabled, setupActivityDetection, setupElementHints, setupHintTimers]);

  // Reset when page changes
  useEffect(() => {
    resetForNewPage();
  }, [currentPage, resetForNewPage]);

  // Update timers when activity changes
  useEffect(() => {
    if (isEnabled && !isUserIdle) {
      const debounceTimer = setTimeout(() => {
        setupHintTimers();
      }, 1000);
      
      return () => clearTimeout(debounceTimer);
    }
  }, [userActivity, isEnabled, isUserIdle, setupHintTimers]);

  return {
    isUserIdle,
    activeHints,
    shownHints: Array.from(shownHints),
    userActivity,
    triggerHint,
    getAvailableHints,
    resetForNewPage
  };
}

// CSS injection for hint animations
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes hint-bounce {
      0%, 20%, 53%, 80%, 100% {
        transform: translate3d(0, 0, 0);
      }
      40%, 43% {
        transform: translate3d(0, -15px, 0);
      }
      70% {
        transform: translate3d(0, -8px, 0);
      }
      90% {
        transform: translate3d(0, -3px, 0);
      }
    }
    
    @keyframes hint-pulse {
      0% {
        transform: scale(1);
        box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.4);
      }
      70% {
        transform: scale(1.02);
        box-shadow: 0 0 0 10px rgba(59, 130, 246, 0);
      }
      100% {
        transform: scale(1);
        box-shadow: 0 0 0 0 rgba(59, 130, 246, 0);
      }
    }
    
    .hint-bounce {
      animation: hint-bounce 1s ease-in-out;
    }
    
    .hint-pulse {
      animation: hint-pulse 2s infinite;
    }
    
    .hint-highlight {
      position: relative;
      outline: 2px solid #3b82f6 !important;
      outline-offset: 2px;
      border-radius: 4px;
      background-color: rgba(59, 130, 246, 0.1) !important;
      transition: all 0.3s ease;
      z-index: 1000;
    }
    
    .hint-highlight::after {
      content: '';
      position: absolute;
      top: -4px;
      left: -4px;
      right: -4px;
      bottom: -4px;
      border: 2px dashed #3b82f6;
      border-radius: 8px;
      animation: hint-pulse 2s infinite;
      pointer-events: none;
    }
  `;
  document.head.appendChild(style);
}

export default useIntelligentHints;