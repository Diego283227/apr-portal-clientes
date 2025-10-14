import React, { useState } from 'react';
import { X } from 'lucide-react';
import AIAssistantChatView from '../socio/AIAssistantChatView';

interface AIAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialConversationId?: string;
}

const AIAssistantModal: React.FC<AIAssistantModalProps> = ({
  isOpen,
  onClose,
  initialConversationId
}) => {
  const [isSearchViewActive, setIsSearchViewActive] = useState(false);

  if (!isOpen) return null;

  const handleClose = () => {
    // Volver a la URL base del dashboard al cerrar
    window.location.hash = '#socio-dashboard';
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
    >
      <div className="relative w-full h-full bg-background">
        {!isSearchViewActive && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleClose();
            }}
            className="absolute top-4 right-4 z-[10000] p-3 rounded-full bg-gradient-to-r from-blue-600 to-blue-700 dark:from-gray-900 dark:to-black border-0 shadow-xl hover:from-blue-700 hover:to-blue-800 dark:hover:from-gray-800 dark:hover:to-gray-900 transition-all duration-200 transform hover:scale-105"
            aria-label="Volver al dashboard"
          >
            <X className="h-6 w-6 text-white" />
          </button>
        )}

        <div className="w-full h-full">
          <AIAssistantChatView
            onClose={handleClose}
            initialConversationId={initialConversationId}
            onSearchViewChange={setIsSearchViewActive}
          />
        </div>
      </div>
    </div>
  );
};

export default AIAssistantModal;