import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';

interface AutoTutorialConfig {
  enabled: boolean;
  showOnFirstVisit: boolean;
  showOnNewFeatures: boolean;
  adaptiveSpeed: boolean;
  contextualHints: boolean;
  idleDetection: boolean;
  userPreferences: {
    speed: 'slow' | 'normal' | 'fast';
    skipCompleted: boolean;
    showHints: boolean;
    autoAdvance: boolean;
    soundEnabled: boolean;
  };
}

interface PageContext {
  route: string;
  hasNewFeatures: boolean;
  userLevel: 'beginner' | 'intermediate' | 'expert';
  lastVisit?: number;
  completedTutorials: string[];
  userBehavior: {
    avgTimeOnPage: number;
    clickPatterns: string[];
    commonErrors: string[];
  };
}

interface TutorialTrigger {
  id: string;
  type: 'onLoad' | 'onIdle' | 'onError' | 'onNewFeature' | 'onStuck' | 'onRequest';
  priority: number;
  conditions: {
    minTimeOnPage?: number;
    maxTutorialsSeen?: number;
    userLevel?: ('beginner' | 'intermediate' | 'expert')[];
    pageSpecific?: string[];
    timeOfDay?: string[];
  };
  tutorialId: string;
}

// Tutorial triggers configuration
const TUTORIAL_TRIGGERS: TutorialTrigger[] = [
  {
    id: 'welcome_newcomer',
    type: 'onLoad',
    priority: 10,
    conditions: {
      userLevel: ['beginner'],
      pageSpecific: ['/dashboard', '/'],
      maxTutorialsSeen: 0
    },
    tutorialId: 'dashboard_intro'
  },
  {
    id: 'profile_idle_help',
    type: 'onIdle',
    priority: 7,
    conditions: {
      minTimeOnPage: 10000,
      pageSpecific: ['/perfil'],
      maxTutorialsSeen: 2
    },
    tutorialId: 'profile_features'
  },
  {
    id: 'payment_assistance',
    type: 'onStuck',
    priority: 9,
    conditions: {
      minTimeOnPage: 15000,
      pageSpecific: ['/pago', '/checkout'],
      userLevel: ['beginner', 'intermediate']
    },
    tutorialId: 'payment_process'
  },
  {
    id: 'boletas_filter_help',
    type: 'onIdle',
    priority: 5,
    conditions: {
      minTimeOnPage: 8000,
      pageSpecific: ['/boletas'],
      maxTutorialsSeen: 1
    },
    tutorialId: 'boletas_management'
  },
  {
    id: 'chat_support_prompt',
    type: 'onStuck',
    priority: 6,
    conditions: {
      minTimeOnPage: 20000,
      userLevel: ['beginner']
    },
    tutorialId: 'chat_support'
  }
];

// Smart tutorial recommendations based on user behavior
const SMART_RECOMMENDATIONS = {
  beginner: [
    'dashboard_intro',
    'profile_features', 
    'boletas_management',
    'chat_support'
  ],
  intermediate: [
    'advanced_features',
    'payment_shortcuts',
    'bulk_operations'
  ],
  expert: [
    'power_user_tips',
    'keyboard_shortcuts',
    'customization_options'
  ]
};

export function useAutoTutorial(
  currentPage: string,
  userName: string,
  initialConfig?: Partial<AutoTutorialConfig>
) {
  // Configuration state
  const [config, setConfig] = useState<AutoTutorialConfig>({
    enabled: true,
    showOnFirstVisit: true,
    showOnNewFeatures: true,
    adaptiveSpeed: true,
    contextualHints: true,
    idleDetection: true,
    userPreferences: {
      speed: 'normal',
      skipCompleted: true,
      showHints: true,
      autoAdvance: false,
      soundEnabled: true
    },
    ...initialConfig
  });

  // Context and state
  const [pageContext, setPageContext] = useState<PageContext>({
    route: currentPage,
    hasNewFeatures: false,
    userLevel: 'beginner',
    completedTutorials: [],
    userBehavior: {
      avgTimeOnPage: 0,
      clickPatterns: [],
      commonErrors: []
    }
  });

  const [activeTutorial, setActiveTutorial] = useState<string | null>(null);
  const [suggestedTutorials, setSuggestedTutorials] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [userInteractions, setUserInteractions] = useState<any[]>([]);
  
  const pageLoadTime = useRef<number>(Date.now());
  const behaviorAnalyzer = useRef<{
    clicks: number;
    scrolls: number;
    timeSpent: number;
    errors: string[];
    stuckTime: number;
  }>({
    clicks: 0,
    scrolls: 0,
    timeSpent: 0,
    errors: [],
    stuckTime: 0
  });

  // Load user data from localStorage
  const loadUserData = useCallback(() => {
    try {
      const savedContext = localStorage.getItem('auto-tutorial-context');
      const savedConfig = localStorage.getItem('auto-tutorial-config');
      
      if (savedContext) {
        const context = JSON.parse(savedContext);
        setPageContext(prev => ({ ...prev, ...context }));
      }
      
      if (savedConfig) {
        const userConfig = JSON.parse(savedConfig);
        setConfig(prev => ({ ...prev, ...userConfig }));
      }
    } catch (error) {
      console.warn('Error loading tutorial data:', error);
    }
  }, []);

  // Save user data to localStorage
  const saveUserData = useCallback(() => {
    localStorage.setItem('auto-tutorial-context', JSON.stringify(pageContext));
    localStorage.setItem('auto-tutorial-config', JSON.stringify(config));
  }, [pageContext, config]);

  // Analyze user behavior to determine skill level
  const analyzeUserBehavior = useCallback(() => {
    const { clicks, scrolls, timeSpent, errors } = behaviorAnalyzer.current;
    
    let userLevel: 'beginner' | 'intermediate' | 'expert' = 'beginner';
    
    // Advanced heuristics for user level detection
    const efficiency = clicks > 0 ? timeSpent / clicks : timeSpent;
    const errorRate = errors.length / Math.max(clicks, 1);
    const totalTutorialsCompleted = pageContext.completedTutorials.length;
    
    if (totalTutorialsCompleted > 5 && efficiency < 5000 && errorRate < 0.1) {
      userLevel = 'expert';
    } else if (totalTutorialsCompleted > 2 && efficiency < 8000 && errorRate < 0.2) {
      userLevel = 'intermediate';
    }
    
    setPageContext(prev => ({
      ...prev,
      userLevel,
      userBehavior: {
        avgTimeOnPage: timeSpent,
        clickPatterns: [`clicks_${clicks}`, `efficiency_${Math.round(efficiency)}`],
        commonErrors: errors
      }
    }));
    
    return userLevel;
  }, [pageContext.completedTutorials]);

  // Smart tutorial recommendation engine
  const getRecommendedTutorials = useCallback(() => {
    const userLevel = analyzeUserBehavior();
    const baseTutorials = SMART_RECOMMENDATIONS[userLevel] || [];
    
    // Filter based on completed tutorials and page context
    const filtered = baseTutorials.filter(tutorialId => {
      if (config.userPreferences.skipCompleted && 
          pageContext.completedTutorials.includes(tutorialId)) {
        return false;
      }
      return true;
    });
    
    // Add contextual tutorials based on current page
    const contextualTutorials = TUTORIAL_TRIGGERS
      .filter(trigger => 
        !trigger.conditions.pageSpecific || 
        trigger.conditions.pageSpecific.includes(currentPage)
      )
      .map(trigger => trigger.tutorialId);
    
    const combined = [...new Set([...filtered, ...contextualTutorials])];
    return combined.slice(0, 3); // Limit to top 3 recommendations
  }, [analyzeUserBehavior, config.userPreferences.skipCompleted, pageContext.completedTutorials, currentPage]);

  // Check if trigger conditions are met
  const evaluateTrigger = useCallback((trigger: TutorialTrigger): boolean => {
    const { conditions } = trigger;
    
    // Check user level
    if (conditions.userLevel && !conditions.userLevel.includes(pageContext.userLevel)) {
      return false;
    }
    
    // Check page specific
    if (conditions.pageSpecific && !conditions.pageSpecific.includes(currentPage)) {
      return false;
    }
    
    // Check time on page
    if (conditions.minTimeOnPage) {
      const timeOnPage = Date.now() - pageLoadTime.current;
      if (timeOnPage < conditions.minTimeOnPage) {
        return false;
      }
    }
    
    // Check max tutorials seen
    if (conditions.maxTutorialsSeen !== undefined) {
      if (pageContext.completedTutorials.length > conditions.maxTutorialsSeen) {
        return false;
      }
    }
    
    return true;
  }, [pageContext.userLevel, currentPage, pageContext.completedTutorials]);

  // Smart tutorial trigger system
  const checkTutorialTriggers = useCallback(() => {
    if (!config.enabled) return;
    
    const applicableTriggers = TUTORIAL_TRIGGERS
      .filter(evaluateTrigger)
      .sort((a, b) => b.priority - a.priority);
    
    const triggeredTutorial = applicableTriggers[0];
    
    if (triggeredTutorial && !activeTutorial) {
      const shouldTrigger = Math.random() < (triggeredTutorial.priority / 10); // Probabilistic triggering
      
      if (shouldTrigger) {
        setActiveTutorial(triggeredTutorial.tutorialId);
        
        toast.info(`💡 ¿Te gustaría aprender sobre ${triggeredTutorial.tutorialId}?`, {
          duration: 8000,
          action: {
            label: "¡Sí, empezar!",
            onClick: () => {
              startTutorial(triggeredTutorial.tutorialId);
            }
          }
        });
      }
    }
  }, [config.enabled, evaluateTrigger, activeTutorial]);

  // Adaptive tutorial speed based on user behavior
  const getAdaptiveSpeed = useCallback(() => {
    if (!config.adaptiveSpeed) return config.userPreferences.speed;
    
    const { clicks, timeSpent } = behaviorAnalyzer.current;
    const clickRate = clicks / Math.max(timeSpent / 1000, 1);
    
    if (clickRate > 2) return 'fast';
    if (clickRate < 0.5) return 'slow';
    return 'normal';
  }, [config.adaptiveSpeed, config.userPreferences.speed]);

  // Activity tracking for behavior analysis
  const trackUserActivity = useCallback(() => {
    const handleClick = () => {
      behaviorAnalyzer.current.clicks++;
      setUserInteractions(prev => [...prev.slice(-19), {
        type: 'click',
        timestamp: Date.now(),
        page: currentPage
      }]);
    };

    const handleScroll = () => {
      behaviorAnalyzer.current.scrolls++;
    };

    const handleError = (event: ErrorEvent) => {
      behaviorAnalyzer.current.errors.push(event.message);
    };

    document.addEventListener('click', handleClick, { passive: true });
    document.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('error', handleError);

    return () => {
      document.removeEventListener('click', handleClick);
      document.removeEventListener('scroll', handleScroll);
      window.removeEventListener('error', handleError);
    };
  }, [currentPage]);

  // Start tutorial with adaptive configuration
  const startTutorial = useCallback((tutorialId: string, options?: {
    skipIntro?: boolean;
    customSpeed?: 'slow' | 'normal' | 'fast';
  }) => {
    const adaptiveSpeed = options?.customSpeed || getAdaptiveSpeed();
    
    // Update configuration for this tutorial
    setConfig(prev => ({
      ...prev,
      userPreferences: {
        ...prev.userPreferences,
        speed: adaptiveSpeed
      }
    }));
    
    setActiveTutorial(tutorialId);
    
    // Toast notification with context
    const levelEmoji = {
      beginner: '🌱',
      intermediate: '⚡',
      expert: '🚀'
    }[pageContext.userLevel];
    
    toast.success(
      `${levelEmoji} Iniciando tutorial "${tutorialId}" - Velocidad: ${adaptiveSpeed}`,
      { duration: 3000 }
    );
  }, [getAdaptiveSpeed, pageContext.userLevel]);

  // Complete tutorial and update user progress
  const completeTutorial = useCallback((tutorialId: string, stats: {
    timeSpent: number;
    stepsCompleted: number;
    errorsCount: number;
  }) => {
    setPageContext(prev => ({
      ...prev,
      completedTutorials: [...prev.completedTutorials, tutorialId],
      userBehavior: {
        ...prev.userBehavior,
        avgTimeOnPage: (prev.userBehavior.avgTimeOnPage + stats.timeSpent) / 2
      }
    }));
    
    setActiveTutorial(null);
    
    // Success notification with personalized message
    const efficiency = stats.stepsCompleted / (stats.timeSpent / 1000);
    let message = '🎉 ¡Tutorial completado!';
    
    if (efficiency > 0.5) {
      message += ' ¡Excelente eficiencia!';
    } else if (stats.errorsCount === 0) {
      message += ' ¡Sin errores!';
    }
    
    toast.success(message, {
      duration: 5000,
      action: {
        label: "Ver más tutoriales",
        onClick: () => {
          const recommended = getRecommendedTutorials();
          setSuggestedTutorials(recommended);
        }
      }
    });
  }, [getRecommendedTutorials]);

  // Update configuration
  const updateConfig = useCallback((updates: Partial<AutoTutorialConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  }, []);

  // Initialize and setup
  useEffect(() => {
    loadUserData();
    const cleanupTracking = trackUserActivity();
    
    // Update time spent tracker
    const timeTracker = setInterval(() => {
      behaviorAnalyzer.current.timeSpent = Date.now() - pageLoadTime.current;
    }, 1000);
    
    return () => {
      cleanupTracking();
      clearInterval(timeTracker);
      saveUserData();
    };
  }, [loadUserData, trackUserActivity, saveUserData]);

  // Check triggers periodically
  useEffect(() => {
    if (!config.enabled) return;
    
    const triggerChecker = setInterval(checkTutorialTriggers, 5000);
    return () => clearInterval(triggerChecker);
  }, [config.enabled, checkTutorialTriggers]);

  // Update page context when route changes
  useEffect(() => {
    pageLoadTime.current = Date.now();
    behaviorAnalyzer.current = {
      clicks: 0,
      scrolls: 0,
      timeSpent: 0,
      errors: [],
      stuckTime: 0
    };
    
    setPageContext(prev => ({
      ...prev,
      route: currentPage,
      lastVisit: Date.now()
    }));
    
    // Get recommendations for new page
    const recommended = getRecommendedTutorials();
    setSuggestedTutorials(recommended);
  }, [currentPage, getRecommendedTutorials]);

  // Auto-save user data periodically
  useEffect(() => {
    const autoSave = setInterval(saveUserData, 30000); // Save every 30 seconds
    return () => clearInterval(autoSave);
  }, [saveUserData]);

  return {
    // Configuration
    config,
    updateConfig,
    
    // Context and state
    pageContext,
    userLevel: pageContext.userLevel,
    completedTutorials: pageContext.completedTutorials,
    
    // Active tutorial
    activeTutorial,
    suggestedTutorials,
    
    // Actions
    startTutorial,
    completeTutorial,
    
    // Analytics
    userInteractions,
    isAnalyzing,
    
    // Utilities
    getAdaptiveSpeed,
    getRecommendedTutorials,
    
    // Smart tutorial component integration
    shouldShowAutoTutorial: config.enabled && suggestedTutorials.length > 0,
    autoTutorialProps: {
      currentPage,
      userName,
      userLevel: pageContext.userLevel,
      recommendedTutorials: suggestedTutorials,
      adaptiveSpeed: getAdaptiveSpeed(),
      onTutorialStart: startTutorial,
      onTutorialComplete: completeTutorial
    }
  };
}

// Higher-order component for automatic tutorial integration
export function withAutoTutorial<T extends object>(
  Component: React.ComponentType<T>,
  tutorialConfig?: Partial<AutoTutorialConfig>
) {
  return function AutoTutorialWrapped(props: T & { 
    currentPage: string; 
    userName: string; 
  }) {
    const autoTutorial = useAutoTutorial(
      props.currentPage, 
      props.userName, 
      tutorialConfig
    );
    
    return (
      <Component 
        {...props} 
        autoTutorial={autoTutorial}
      />
    );
  };
}

export default useAutoTutorial;