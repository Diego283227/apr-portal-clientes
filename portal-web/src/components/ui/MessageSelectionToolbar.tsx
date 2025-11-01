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
    <div className="fixed top-0 left-0 right-0 z-40 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center gap-4">
          {/* Close button (X) */}
          <button
            onClick={onClearSelection}
            className="text-white bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 p-2 rounded-full transition-all duration-200 flex-shrink-0"
            title="Cerrar selección"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Counter badge and text */}
          <div className="flex items-center gap-3 flex-1">
            <div className="w-8 h-8 bg-blue-600 dark:bg-blue-700 text-white rounded-full flex items-center justify-center">
              <span className="text-sm font-bold">{selectedMessages.length}</span>
            </div>
            <span className="font-semibold text-base text-gray-900 dark:text-white">
              {selectedMessages.length} mensaje{selectedMessages.length > 1 ? 's' : ''} seleccionado{selectedMessages.length > 1 ? 's' : ''}
            </span>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Copy button */}
            <button
              onClick={handleCopyAll}
              className="text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 flex items-center gap-2 px-4 py-2 rounded-md transition-all duration-200"
              title="Copiar mensajes seleccionados"
            >
              <Copy className="h-4 w-4" />
              <span className="hidden sm:inline font-medium">Copiar</span>
            </button>

            {/* Export button */}
            <button
              onClick={handleExport}
              className="text-white bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800 flex items-center gap-2 px-4 py-2 rounded-md transition-all duration-200"
              title="Exportar mensajes"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline font-medium">Exportar</span>
            </button>

            {/* Forward button */}
            <button
              onClick={handleForward}
              className="text-white bg-purple-600 hover:bg-purple-700 dark:bg-purple-700 dark:hover:bg-purple-800 flex items-center gap-2 px-4 py-2 rounded-md transition-all duration-200"
              title="Reenviar mensajes"
            >
              <Forward className="h-4 w-4" />
              <span className="hidden sm:inline font-medium">Reenviar</span>
            </button>

            {/* Delete button - only show if user can delete */}
            {canDeleteSelected && (
              <button
                onClick={handleDeleteAll}
                className="text-white bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800 flex items-center gap-2 px-4 py-2 rounded-md transition-all duration-200"
                title="Eliminar mensajes seleccionados"
              >
                <Trash2 className="h-4 w-4" />
                <span className="hidden sm:inline font-medium">Eliminar</span>
              </button>
            )}

            {/* More options */}
            <button
              className="text-gray-700 dark:text-gray-300 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 p-2 rounded-md transition-all duration-200"
              title="Más opciones"
            >
              <MoreHorizontal className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}