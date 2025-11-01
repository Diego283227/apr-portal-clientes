import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Copy,
  Trash2,
  X,
  Download,
  Forward,
  MoreHorizontal
} from 'lucide-react';
import { toast } from 'sonner';

interface Message {
  _id: string;
  content: string;
  senderType: 'socio' | 'super_admin';
  senderName: string;
  timestamp: string;
}

interface MessageSelectionToolbarProps {
  selectedMessages: Message[];
  onClearSelection: () => void;
  onDeleteSelected: (messageIds: string[]) => Promise<void>;
  onForwardSelected?: () => Promise<void>;
  canDeleteOthers?: boolean;
  currentUserType?: 'socio' | 'super_admin';
}

export default function MessageSelectionToolbar({
  selectedMessages,
  onClearSelection,
  onDeleteSelected,
  onForwardSelected,
  canDeleteOthers = false,
  currentUserType = 'socio'
}: MessageSelectionToolbarProps) {
  if (selectedMessages.length === 0) {
    return null;
  }

  const handleCopyAll = async () => {
    try {
      const messageTexts = selectedMessages.map(msg =>
        `${msg.senderName} (${new Date(msg.timestamp).toLocaleString()}): ${msg.content}`
      ).join('\n\n');

      await navigator.clipboard.writeText(messageTexts);
      toast.success(`${selectedMessages.length} mensaje${selectedMessages.length > 1 ? 's' : ''} copiado${selectedMessages.length > 1 ? 's' : ''} al portapapeles`);
    } catch (error) {
      console.error('Error copying messages:', error);
      toast.error('No se pudieron copiar los mensajes');
    }
  };

  const handleDeleteAll = async () => {
    // Check if user can delete all selected messages
    const canDeleteAll = canDeleteOthers || selectedMessages.every(msg => msg.senderType === currentUserType);

    if (!canDeleteAll) {
      toast.error('Solo puedes eliminar tus propios mensajes');
      return;
    }

    try {
      const messageIds = selectedMessages.map(msg => msg._id);
      await onDeleteSelected(messageIds);
      toast.success(`${messageIds.length} mensaje${messageIds.length > 1 ? 's' : ''} eliminado${messageIds.length > 1 ? 's' : ''}`);
    } catch (error) {
      console.error('Error deleting messages:', error);
      toast.error('No se pudieron eliminar los mensajes');
    }
  };

  const handleExport = () => {
    try {
      const messageTexts = selectedMessages.map(msg =>
        `${msg.senderName} (${new Date(msg.timestamp).toLocaleString()}): ${msg.content}`
      ).join('\n\n');

      const blob = new Blob([messageTexts], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mensajes_${new Date().toISOString().split('T')[0]}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Mensajes exportados exitosamente');
    } catch (error) {
      console.error('Error exporting messages:', error);
      toast.error('No se pudieron exportar los mensajes');
    }
  };

  const handleForward = async () => {
    if (onForwardSelected) {
      await onForwardSelected();
    } else {
      toast.info('Función de reenvío en desarrollo');
    }
  };

  // Check if all selected messages can be deleted
  const canDeleteSelected = canDeleteOthers || selectedMessages.every(msg => msg.senderType === currentUserType);

  return (
    <div className="fixed top-0 left-0 right-0 z-40 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 py-2">
        <div className="flex items-center gap-3">
          {/* Close button (X) */}
          <button
            onClick={onClearSelection}
            className="text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 p-2 rounded-full transition-colors flex-shrink-0"
            title="Cancelar"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Counter text */}
          <span className="text-sm text-gray-700 dark:text-gray-300 flex-1">
            {selectedMessages.length} seleccionado{selectedMessages.length > 1 ? 's' : ''}
          </span>

          {/* Action icon buttons */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {/* Star/Favorite */}
            <button
              className="text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 p-2 rounded-full transition-colors"
              title="Destacar"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            </button>

            {/* Copy */}
            <button
              onClick={handleCopyAll}
              className="text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 p-2 rounded-full transition-colors"
              title="Copiar"
            >
              <Copy className="h-5 w-5" />
            </button>

            {/* Forward */}
            <button
              onClick={handleForward}
              className="text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 p-2 rounded-full transition-colors"
              title="Reenviar"
            >
              <Forward className="h-5 w-5" />
            </button>

            {/* Delete - only show if user can delete */}
            {canDeleteSelected && (
              <button
                onClick={handleDeleteAll}
                className="text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 p-2 rounded-full transition-colors"
                title="Eliminar"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            )}

            {/* More options */}
            <button
              className="text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 p-2 rounded-full transition-colors"
              title="Más"
            >
              <MoreHorizontal className="h-5 w-5" />
            </button>

            {/* Cancelar button text */}
            <button
              onClick={onClearSelection}
              className="text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 px-3 py-1 rounded transition-colors ml-2"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}