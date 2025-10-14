import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import {
  Brain,
  Zap,
  Target,
  Award,
  Settings,
  Play,
  Pause,
  RotateCcw,
  Eye,
  Lightbulb,
  TrendingUp,
  Volume2,
  VolumeX
} from 'lucide-react';

// Import our custom hooks and components
import SmartTutorial, { useSmartTutorial } from './SmartTutorial';
import useIntelligentHints from '../hooks/useIntelligentHints';
import useAutoTutorial from '../hooks/useAutoTutorial';

interface TutorialSystemProps {
  currentPage: string;
  userName: string;
  isEnabled?: boolean;
  showControls?: boolean;
  onTutorialComplete?: () => void;
}

interface TutorialStats {
  totalTutorialsCompleted: number;
  avgCompletionTime: number;
  hintsUsed: number;
  userLevel: 'beginner' | 'intermediate' | 'expert';
  lastActivity: number;
}

export default function TutorialSystem({
  currentPage,
  userName,
  isEnabled = true,
  showControls = true,
  onTutorialComplete
}: TutorialSystemProps) {
  // Hooks integration
  const smartTutorial = useSmartTutorial(currentPage, userName);
  const intelligentHints = useIntelligentHints(currentPage, isEnabled);
  const autoTutorial = useAutoTutorial(currentPage, userName);
  
  // Local state
  const [systemEnabled, setSystemEnabled] = useState(isEnabled);
  const [currentMode, setCurrentMode] = useState<'auto' | 'smart' | 'hints' | 'off'>('auto');
  const [showStats, setShowStats] = useState(false);
  const [tutorialStats, setTutorialStats] = useState<TutorialStats>({
    totalTutorialsCompleted: 0,
    avgCompletionTime: 0,
    hintsUsed: 0,
    userLevel: 'beginner',
    lastActivity: Date.now()
  });

  // Load stats from localStorage
  useEffect(() => {
    const savedStats = localStorage.getItem('tutorial-system-stats');
    if (savedStats) {
      try {
        setTutorialStats(JSON.parse(savedStats));
      } catch (error) {
        console.warn('Error loading tutorial stats:', error);
      }
    }
  }, []);

  // Save stats to localStorage
  useEffect(() => {
    localStorage.setItem('tutorial-system-stats', JSON.stringify(tutorialStats));
  }, [tutorialStats]);

  // Update stats when tutorials complete
  const handleTutorialComplete = (tutorialType: string, duration: number) => {
    setTutorialStats(prev => ({
      ...prev,
      totalTutorialsCompleted: prev.totalTutorialsCompleted + 1,
      avgCompletionTime: (prev.avgCompletionTime + duration) / 2,
      lastActivity: Date.now()
    }));

    if (onTutorialComplete) {
      onTutorialComplete();
    }

    toast.success(`🎉 Tutorial ${tutorialType} completado!`, {
      duration: 3000,
      action: {
        label: "Ver estadísticas",
        onClick: () => setShowStats(true)
      }
    });
  };

  // Smart mode selection based on user behavior
  const getRecommendedMode = () => {
    const { userLevel } = autoTutorial.pageContext;
    const hintsActive = intelligentHints.activeHints.length > 0;
    const hasAvailableTutorials = autoTutorial.suggestedTutorials.length > 0;

    if (userLevel === 'beginner' && hasAvailableTutorials) {
      return 'smart';
    } else if (userLevel === 'intermediate' && hintsActive) {
      return 'hints';
    } else if (userLevel === 'expert') {
      return 'off';
    }
    return 'auto';
  };

  // Auto-adjust mode based on context
  useEffect(() => {
    if (currentMode === 'auto') {
      const recommendedMode = getRecommendedMode();
      if (recommendedMode !== 'auto') {
        setCurrentMode(recommendedMode);
        toast.info(`🤖 Modo automático activado: ${recommendedMode}`, {
          duration: 2000
        });
      }
    }
  }, [currentMode, autoTutorial.pageContext.userLevel, intelligentHints.activeHints, autoTutorial.suggestedTutorials]);

  // Manual tutorial trigger
  const startManualTutorial = () => {
    smartTutorial.showManualTutorial();
    toast.info('🚀 Iniciando tutorial inteligente...', { duration: 2000 });
  };

  // Emergency help system
  const triggerEmergencyHelp = () => {
    // Show all available help at once
    const availableHints = intelligentHints.getAvailableHints();
    
    if (availableHints.length > 0) {
      availableHints.slice(0, 2).forEach((hint, index) => {
        setTimeout(() => {
          intelligentHints.triggerHint(hint.id);
        }, index * 1000);
      });
    }
    
    smartTutorial.showManualTutorial();
    
    toast.info('🆘 Activando sistema de ayuda completo...', {
      duration: 4000
    });
  };

  // Calculate system effectiveness
  const getSystemEffectiveness = () => {
    const totalInteractions = intelligentHints.userActivity.lastClick + 
                            intelligentHints.userActivity.lastScroll + 
                            intelligentHints.userActivity.lastKeyPress;
    const hintsUsed = intelligentHints.shownHints.length;
    const tutorialsCompleted = tutorialStats.totalTutorialsCompleted;
    
    return Math.min(100, (tutorialsCompleted * 20) + (hintsUsed * 10) + Math.min(30, totalInteractions / 100));
  };

  const effectiveness = getSystemEffectiveness();

  if (!systemEnabled) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSystemEnabled(true)}
          className="shadow-lg"
        >
          <Brain className="h-4 w-4 mr-2" />
          Activar Tutorial IA
        </Button>
      </div>
    );
  }

  return (
    <>
      {/* Smart Tutorial Component */}
      <smartTutorial.SmartTutorialComponent 
        onComplete={() => handleTutorialComplete('smart', Date.now())}
      />

      {/* Control Panel (if enabled) */}
      {showControls && (
        <div className="fixed bottom-4 right-4 z-50 space-y-2">
          {/* Main Control Card */}
          <Card className="w-80 shadow-xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-purple-50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-purple-600" />
                  <span>Sistema Tutorial IA</span>
                </div>
                <Badge 
                  variant={effectiveness > 80 ? "default" : effectiveness > 50 ? "secondary" : "outline"}
                  className="text-xs"
                >
                  {Math.round(effectiveness)}%
                </Badge>
              </CardTitle>
              <Progress value={effectiveness} className="h-2" />
            </CardHeader>
            
            <CardContent className="space-y-3">
              {/* Mode Selector */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">
                  Modo Activo
                </label>
                <div className="grid grid-cols-2 gap-1">
                  {[
                    { key: 'auto', label: '🤖 Auto', desc: 'Adaptativo' },
                    { key: 'smart', label: '🧠 Smart', desc: 'Tutorial completo' },
                    { key: 'hints', label: '💡 Hints', desc: 'Solo consejos' },
                    { key: 'off', label: '⏸️ Off', desc: 'Desactivado' }
                  ].map(mode => (
                    <Button
                      key={mode.key}
                      variant={currentMode === mode.key ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentMode(mode.key as any)}
                      className="h-auto p-2 flex-col text-xs"
                    >
                      <span>{mode.label}</span>
                      <span className="text-xs text-muted-foreground">{mode.desc}</span>
                    </Button>
                  ))}
                </div>
              </div>

              {/* Status Indicators */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 bg-white rounded border">
                  <div className="text-lg font-bold text-blue-600">
                    {autoTutorial.suggestedTutorials.length}
                  </div>
                  <div className="text-xs text-muted-foreground">Disponibles</div>
                </div>
                <div className="p-2 bg-white rounded border">
                  <div className="text-lg font-bold text-green-600">
                    {intelligentHints.activeHints.length}
                  </div>
                  <div className="text-xs text-muted-foreground">Hints Activos</div>
                </div>
                <div className="p-2 bg-white rounded border">
                  <div className="text-lg font-bold text-purple-600">
                    {autoTutorial.pageContext.userLevel === 'beginner' ? '🌱' : 
                     autoTutorial.pageContext.userLevel === 'intermediate' ? '⚡' : '🚀'}
                  </div>
                  <div className="text-xs text-muted-foreground">Nivel</div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  onClick={startManualTutorial}
                  disabled={currentMode === 'off'}
                  className="flex-1"
                >
                  <Play className="h-3 w-3 mr-1" />
                  Iniciar
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={triggerEmergencyHelp}
                  className="flex-1"
                >
                  <Lightbulb className="h-3 w-3 mr-1" />
                  Ayuda
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => setShowStats(!showStats)}
                >
                  <TrendingUp className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Stats Panel (expandable) */}
          {showStats && (
            <Card className="w-80 shadow-xl">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-sm">
                  <span>📊 Estadísticas</span>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => setShowStats(false)}
                  >
                    ×
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="font-medium">Tutoriales Completados</div>
                    <div className="text-2xl font-bold text-blue-600">
                      {tutorialStats.totalTutorialsCompleted}
                    </div>
                  </div>
                  <div>
                    <div className="font-medium">Tiempo Promedio</div>
                    <div className="text-2xl font-bold text-green-600">
                      {Math.round(tutorialStats.avgCompletionTime / 1000)}s
                    </div>
                  </div>
                </div>
                
                <div>
                  <div className="font-medium mb-1">Interacciones Recientes</div>
                  <div className="space-y-1 max-h-20 overflow-y-auto text-xs">
                    {intelligentHints.shownHints.slice(-3).map((hintId, index) => (
                      <div key={index} className="flex items-center gap-2 p-1 bg-muted rounded">
                        <Lightbulb className="h-3 w-3 text-yellow-500" />
                        <span className="truncate">{hintId}</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="pt-2 border-t">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Efectividad del Sistema</span>
                    <span>{Math.round(effectiveness)}%</span>
                  </div>
                  <Progress value={effectiveness} className="h-1 mt-1" />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Active Hint Display */}
          {intelligentHints.isUserIdle && currentMode !== 'off' && (
            <Alert className="w-80 border-yellow-200 bg-yellow-50">
              <Lightbulb className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800 text-sm">
                💡 Sistema de hints activo - Detectando inactividad
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={() => intelligentHints.resetForNewPage()}
                  className="ml-2 h-6 px-2"
                >
                  Reiniciar
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Smart Recommendations */}
          {autoTutorial.suggestedTutorials.length > 0 && currentMode === 'auto' && (
            <Alert className="w-80 border-blue-200 bg-blue-50">
              <Target className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800 text-sm">
                🎯 {autoTutorial.suggestedTutorials.length} tutoriales recomendados para ti
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={() => autoTutorial.startTutorial(autoTutorial.suggestedTutorials[0])}
                  className="ml-2 h-6 px-2"
                >
                  Empezar
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Collapse Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSystemEnabled(false)}
            className="w-full shadow-md bg-white/80"
          >
            <Eye className="h-4 w-4 mr-2" />
            Ocultar Sistema
          </Button>
        </div>
      )}

      {/* Floating Mini Controls (when main controls are hidden) */}
      {!showControls && systemEnabled && (
        <div className="fixed bottom-4 right-4 z-50 flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={startManualTutorial}
            className="shadow-lg bg-white/90"
          >
            <Brain className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={triggerEmergencyHelp}
            className="shadow-lg bg-white/90"
          >
            <Lightbulb className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Global Keyboard Shortcuts */}
      <div className="sr-only">
        Atajos: Ctrl+/ para ayuda, Escape para cerrar, Ctrl+Shift+T para tutorial
      </div>

      {/* Custom CSS for enhanced interactions */}
      <style jsx>{`
        /* Enhanced hover effects for tutorial elements */
        .tutorial-element-hover {
          transition: all 0.3s ease;
          position: relative;
        }
        
        .tutorial-element-hover:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(0,0,0,0.1);
        }
        
        /* Smart highlighting for detected elements */
        .smart-highlight {
          animation: smartPulse 2s infinite;
          border: 2px solid #3b82f6;
          border-radius: 8px;
        }
        
        @keyframes smartPulse {
          0% { 
            box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.4);
            border-color: #3b82f6;
          }
          70% { 
            box-shadow: 0 0 0 10px rgba(59, 130, 246, 0);
            border-color: #60a5fa;
          }
          100% { 
            box-shadow: 0 0 0 0 rgba(59, 130, 246, 0);
            border-color: #3b82f6;
          }
        }
        
        /* Floating animation for control panel */
        .tutorial-controls {
          animation: floatingControls 3s ease-in-out infinite;
        }
        
        @keyframes floatingControls {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-3px); }
        }
      `}</style>
    </>
  );
}

// Export additional utility components
export const TutorialFloatingButton = ({ onClick }: { onClick: () => void }) => (
  <Button
    onClick={onClick}
    className="fixed bottom-6 right-6 z-50 rounded-full w-14 h-14 shadow-2xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 border-0"
    size="lg"
  >
    <Brain className="h-6 w-6 text-white" />
  </Button>
);

export const TutorialProgressIndicator = ({ 
  progress, 
  stepCount, 
  currentStep 
}: { 
  progress: number;
  stepCount: number;
  currentStep: number;
}) => (
  <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-white/90 backdrop-blur-sm rounded-full px-4 py-2 shadow-lg border">
    <div className="flex items-center gap-3">
      <div className="text-sm font-medium">
        Paso {currentStep + 1} de {stepCount}
      </div>
      <Progress value={progress} className="w-24 h-2" />
      <div className="text-sm text-muted-foreground">
        {Math.round(progress)}%
      </div>
    </div>
  </div>
);

export default TutorialSystem;