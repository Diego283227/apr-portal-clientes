import React, { useEffect, useState } from 'react';
import AIAssistantChatView from '@/components/socio/AIAssistantChatView';
import { ThemeProvider } from '@/contexts/ThemeContext';

interface ChatbotPageProps {
  initialConversationId?: string;
}

export default function ChatbotPage({ initialConversationId }: ChatbotPageProps) {
  // Detectar tema del sistema inmediatamente para evitar flashazo
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setIsDark(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setIsDark(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  const handleClose = () => {
    // Volver al dashboard del socio
    window.location.hash = '#socio-dashboard';
  };

  return (
    <ThemeProvider>
      <div
        className="fixed inset-0 w-full h-full bg-white dark:bg-black [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        style={{ backgroundColor: isDark ? '#000000' : '#ffffff' }}
      >
        <AIAssistantChatView
          onClose={handleClose}
          initialConversationId={initialConversationId}
        />
      </div>
    </ThemeProvider>
  );
}
