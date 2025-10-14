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
    <div className="fixed top-0 left-0 right-0 z-40 bg-gradient-to-r from-blue-600 via-blue-700 to-blue-600 text-white shadow-xl backdrop-blur-md">
      <div className="max-w-4xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Left side - Selection info and close button */}
          <div className="flex items-center gap-4">
            <button
              onClick={onClearSelection}
              className="text-white hover:text-red-100 hover:bg-red-600 bg-red-500 bg-opacity-80 p-2 rounded-full transition-all duration-200 shadow-md hover:shadow-lg border-2 border-red-400 hover:border-red-300"
              title="Cerrar selección"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white bg-opacity-90 text-blue-700 rounded-full flex items-center justify-center shadow-md border-2 border-white">
                  <span className="text-sm font-bold">{selectedMessages.length}</span>
                </div>
                <span className="font-semibold text-lg text-white drop-shadow-sm">
                  {selectedMessages.length} mensaje{selectedMessages.length > 1 ? 's' : ''} seleccionado{selectedMessages.length > 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </div>

          {/* Right side - Action buttons */}
          <div className="flex items-center gap-3">
            {/* Copy button */}
            <button
              onClick={handleCopyAll}
              className="text-white hover:text-blue-100 hover:bg-blue-800 bg-blue-700 bg-opacity-80 flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg border-2 border-blue-500 hover:border-blue-400"
              title="Copiar mensajes seleccionados"
            >
              <Copy className="h-4 w-4" />
              <span className="hidden sm:inline font-medium">Copiar</span>
            </button>

            {/* Export button */}
            <button
              onClick={handleExport}
              className="text-white hover:text-green-100 hover:bg-green-700 bg-green-600 bg-opacity-90 flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg border-2 border-green-500 hover:border-green-400"
              title="Exportar mensajes"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline font-medium">Exportar</span>
            </button>

            {/* Forward button */}
            <button
              onClick={handleForward}
              className="text-white hover:text-purple-100 hover:bg-purple-700 bg-purple-600 bg-opacity-90 flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg border-2 border-purple-500 hover:border-purple-400"
              title="Reenviar mensajes"
            >
              <Forward className="h-4 w-4" />
              <span className="hidden sm:inline font-medium">Reenviar</span>
            </button>

            {/* Delete button - only show if user can delete */}
            {canDeleteSelected && (
              <button
                onClick={handleDeleteAll}
                className="text-white hover:text-red-100 hover:bg-red-700 bg-red-600 bg-opacity-95 flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg border-2 border-red-500 hover:border-red-400"
                title="Eliminar mensajes seleccionados"
              >
                <Trash2 className="h-4 w-4" />
                <span className="hidden sm:inline font-medium">Eliminar</span>
              </button>
            )}

            {/* More options */}
            <button
              className="text-white hover:text-slate-100 hover:bg-slate-700 bg-slate-600 bg-opacity-80 p-2 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg border-2 border-slate-500 hover:border-slate-400"
              title="Más opciones"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}