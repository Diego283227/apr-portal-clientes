import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { 
  HelpCircle, 
  Play, 
  CheckCircle, 
  Target 
} from 'lucide-react';
import InteractiveTutorial from './InteractiveTutorial';

interface TutorialIntegrationProps {
  userName: string;
  currentPage?: string;
  showAutoPrompt?: boolean;
}

export default function TutorialIntegration({ 
  userName, 
  currentPage = '/dashboard',
  showAutoPrompt = true 
}: TutorialIntegrationProps) {
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialCompleted, setTutorialCompleted] = useState(false);
  const [showWelcomePrompt, setShowWelcomePrompt] = useState(false);

  // Verificar si el usuario ya completó el tutorial
  useEffect(() => {
    const completed = localStorage.getItem('interactive-tutorial-completed');
    setTutorialCompleted(completed === 'true');
    
    // Mostrar prompt de bienvenida si es nuevo usuario
    if (!completed && showAutoPrompt) {
      setTimeout(() => {
        setShowWelcomePrompt(true);
      }, 3000); // Esperar 3 segundos después de cargar
    }
  }, [showAutoPrompt]);

  const handleStartTutorial = () => {
    setShowTutorial(true);
    setShowWelcomePrompt(false);
    
    toast.info('🎯 Iniciando tutorial interactivo...', {
      duration: 2000
    });
  };

  const handleCloseTutorial = () => {
    setShowTutorial(false);
    
    // Verificar si se completó
    const completed = localStorage.getItem('interactive-tutorial-completed');
    if (completed === 'true' && !tutorialCompleted) {
      setTutorialCompleted(true);
      toast.success('🎉 ¡Tutorial completado con éxito!', {
        duration: 4000
      });
    }
  };

  return (
    <>
      {/* Botón flotante para iniciar tutorial */}
      <div className="fixed bottom-6 right-6 z-40">
        <Button
          onClick={handleStartTutorial}
          className="rounded-full w-14 h-14 shadow-2xl bg-blue-600 hover:bg-blue-700"
          title="Iniciar tutorial interactivo"
        >
          {tutorialCompleted ? (
            <CheckCircle className="h-6 w-6 text-white" />
          ) : (
            <Target className="h-6 w-6 text-white" />
          )}
        </Button>
        
        {!tutorialCompleted && (
          <Badge 
            variant="destructive" 
            className="absolute -top-2 -right-2 px-2 py-1 text-xs animate-pulse"
          >
            Nuevo
          </Badge>
        )}
      </div>

      {/* Prompt de bienvenida automático */}
      {showWelcomePrompt && !tutorialCompleted && (
        <Card className="fixed bottom-24 right-6 w-80 shadow-2xl border-2 border-blue-200 z-40 animate-in slide-in-from-right">
          <CardContent className="p-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <HelpCircle className="h-4 w-4 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">
                    ¡Hola {userName}! 👋
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    ¿Te gustaría que te enseñe cómo usar el portal paso a paso? 
                    Te mostraré exactamente dónde hacer clic.
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowWelcomePrompt(false)}
                  className="h-6 w-6 p-0"
                >
                  ×
                </Button>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  onClick={handleStartTutorial}
                  size="sm" 
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  <Play className="h-4 w-4 mr-1" />
                  ¡Sí, empezar!
                </Button>
                <Button 
                  onClick={() => setShowWelcomePrompt(false)}
                  variant="outline" 
                  size="sm"
                >
                  Después
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Indicador de tutorial disponible en el menú */}
      {!tutorialCompleted && (
        <style jsx>{`
          /* Añadir indicator pulsante al botón de tutorial en el menú */
          #nav-tutorial::after,
          [data-nav="tutorial"]::after,
          .tutorial-menu-item::after {
            content: "";
            position: absolute;
            top: 8px;
            right: 8px;
            width: 8px;
            height: 8px;
            background: #ef4444;
            border-radius: 50%;
            animation: pulse 2s infinite;
          }
          
          @keyframes pulse {
            0% {
              transform: scale(1);
              opacity: 1;
            }
            50% {
              transform: scale(1.2);
              opacity: 0.7;
            }
            100% {
              transform: scale(1);
              opacity: 1;
            }
          }
        `}</style>
      )}

      {/* Componente del tutorial interactivo */}
      <InteractiveTutorial
        isOpen={showTutorial}
        onClose={handleCloseTutorial}
        userName={userName}
        currentPage={currentPage}
      />
    </>
  );
}

// Hook para usar el tutorial en cualquier página
export function useTutorialPrompt(userName: string, pageId: string) {
  const [shouldShowTutorial, setShouldShowTutorial] = useState(false);
  
  useEffect(() => {
    const tutorialCompleted = localStorage.getItem('interactive-tutorial-completed');
    const pageVisits = JSON.parse(localStorage.getItem('page-visits') || '{}');
    
    // Si no ha completado tutorial y es la primera vez en esta página
    if (!tutorialCompleted && !pageVisits[pageId]) {
      setShouldShowTutorial(true);
      
      // Marcar página como visitada
      pageVisits[pageId] = Date.now();
      localStorage.setItem('page-visits', JSON.stringify(pageVisits));
    }
  }, [pageId]);
  
  return {
    shouldShowTutorial,
    showTutorial: () => setShouldShowTutorial(true),
    hideTutorial: () => setShouldShowTutorial(false)
  };
}

// Componente para integrar en el dashboard principal
export function DashboardWithTutorial({ 
  userName, 
  children 
}: { 
  userName: string; 
  children: React.ReactNode; 
}) {
  return (
    <div className="relative">
      {/* Contenido principal del dashboard */}
      {children}
      
      {/* Sistema de tutorial */}
      <TutorialIntegration 
        userName={userName}
        currentPage="/dashboard"
        showAutoPrompt={true}
      />
    </div>
  );
}