import React from 'react';
import { useNavigate } from '@/hooks/useNavigate';
import AIAssistantChatView from '@/components/socio/AIAssistantChatView';
import { ThemeProvider } from '@/contexts/ThemeContext';

interface ChatbotPageProps {
  initialConversationId?: string;
}

export default function ChatbotPage({ initialConversationId }: ChatbotPageProps) {
  const navigate = useNavigate();

  const handleClose = () => {
    // Volver al dashboard del socio
    window.location.hash = '#socio-dashboard';
  };

  return (
    <ThemeProvider>
      <div className="fixed inset-0 w-full h-full bg-white dark:bg-black [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <AIAssistantChatView
          onClose={handleClose}
          initialConversationId={initialConversationId}
        />
      </div>
    </ThemeProvider>
  );
}
