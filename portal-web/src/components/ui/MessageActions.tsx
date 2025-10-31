import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  MoreHorizontal,
  Edit3,
  Trash2,
  Save,
  X,
  Copy,
  Check,
  Reply,
  Forward
} from 'lucide-react';
import { toast } from 'sonner';

interface Message {
  _id: string;
  conversationId: string;
  senderId: string;
  senderType: 'socio' | 'super_admin';
  senderName: string;
  content: string;
  timestamp: string;
  read: boolean;
  messageType: 'text' | 'system';
}

interface MessageActionsProps {
  message: Message;
  onEdit?: (messageId: string, newContent: string) => Promise<boolean>;
  onDelete?: (messageId: string) => Promise<boolean>;
  onSelect?: (messageId: string) => void;
  onReply?: (message: Message) => void;
  onForward?: (message: Message) => void;
  canEdit?: boolean;
  canDelete?: boolean;
  canSelect?: boolean;
  isSelected?: boolean;
  showAsContextMenu?: boolean;
  position?: { x: number; y: number };
  onClose?: () => void;
}

export default function MessageActions({
  message,
  onEdit,
  onDelete,
  onSelect,
  onReply,
  onForward,
  canEdit = false,
  canDelete = false,
  canSelect = true,
  isSelected = false,
  showAsContextMenu = false,
  position,
  onClose
}: MessageActionsProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Don't show menu for system messages
  if (message.messageType === 'system') {
    return null;
  }

  // Handle click outside for context menu
  useEffect(() => {
    if (showAsContextMenu && onClose) {
      const handleClickOutside = (event: MouseEvent) => {
        if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
          onClose();
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showAsContextMenu, onClose]);

  const handleEdit = async () => {
    if (editContent.trim() === message.content.trim()) {
      setShowEditDialog(false);
      return;
    }

    if (editContent.trim().length === 0) {
      return;
    }

    setIsEditing(true);
    try {
      const success = await onEdit(message._id, editContent.trim());
      if (success) {
        setShowEditDialog(false);
      }
    } catch (error) {
      console.error('Error editing message:', error);
    } finally {
      setIsEditing(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      if (onDelete) {
        const success = await onDelete(message._id);
        if (success) {
          setShowDeleteDialog(false);
          if (onClose) onClose();
        }
      }
    } catch (error) {
      console.error('Error deleting message:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      toast.success('Mensaje copiado al portapapeles');

      // Reset copied state after 2 seconds
      setTimeout(() => setCopied(false), 2000);

      if (onClose) onClose();
    } catch (error) {
      console.error('Error copying message:', error);
      toast.error('No se pudo copiar el mensaje');
    }
  };

  const handleSelect = () => {
    if (onSelect) {
      onSelect(message._id);
    }
    if (onClose) onClose();
  };

  const handleReply = () => {
    if (onReply) {
      onReply(message);
    } else {
      toast.info('Función de respuesta en desarrollo');
    }
    if (onClose) onClose();
  };

  const handleForward = () => {
    if (onForward) {
      onForward(message);
    } else {
      toast.info('Función de reenvío en desarrollo');
    }
    if (onClose) onClose();
  };

  // Context menu component
  if (showAsContextMenu && position) {
    return (
      <>
        <div
          ref={menuRef}
          className="fixed z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl py-2 min-w-[160px]"
          style={{
            left: `${position.x}px`,
            top: `${position.y}px`,
          }}
        >
          {/* Copy option - always available */}
          <button
            onClick={handleCopy}
            className="w-full px-4 py-2 text-left text-sm text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center transition-colors"
          >
            {copied ? (
              <Check className="mr-3 h-4 w-4 text-green-600 dark:text-green-400" />
            ) : (
              <Copy className="mr-3 h-4 w-4 text-gray-700 dark:text-white" />
            )}
            {copied ? 'Copiado' : 'Copiar mensaje'}
          </button>

          {/* Select option */}
          {canSelect && (
            <button
              onClick={handleSelect}
              className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center transition-colors ${
                isSelected ? 'bg-blue-50 dark:bg-gray-600 text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-gray-100'
              }`}
            >
              <Check className="mr-3 h-4 w-4 text-gray-700 dark:text-white" />
              {isSelected ? 'Deseleccionar' : 'Seleccionar'}
            </button>
          )}

          {/* Reply option */}
          <button
            onClick={handleReply}
            className="w-full px-4 py-2 text-left text-sm text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center transition-colors"
          >
            <Reply className="mr-3 h-4 w-4 text-gray-700 dark:text-white" />
            Responder
          </button>

          {/* Forward option */}
          <button
            onClick={handleForward}
            className="w-full px-4 py-2 text-left text-sm text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center transition-colors"
          >
            <Forward className="mr-3 h-4 w-4 text-gray-700 dark:text-white" />
            Reenviar
          </button>

          {/* Edit option - only for own messages */}
          {canEdit && onEdit && (
            <>
              <hr className="my-1 border-gray-200 dark:border-gray-600" />
              <button
                onClick={() => {
                  setEditContent(message.content);
                  setShowEditDialog(true);
                  if (onClose) onClose();
                }}
                className="w-full px-4 py-2 text-left text-sm text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center transition-colors"
              >
                <Edit3 className="mr-3 h-4 w-4 text-gray-700 dark:text-gray-300" />
                Editar
              </button>
            </>
          )}

          {/* Delete option - only for own messages */}
          {canDelete && onDelete && (
            <button
              onClick={() => {
                setShowDeleteDialog(true);
                if (onClose) onClose();
              }}
              className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-gray-700 flex items-center transition-colors"
            >
              <Trash2 className="mr-3 h-4 w-4 text-red-600 dark:text-red-400" />
              Eliminar
            </button>
          )}
        </div>
      </>
    );
  }

  // Regular dropdown menu for hover actions
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <MoreHorizontal className="h-3 w-3 text-gray-700 dark:text-white" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg">
          {/* Copy option */}
          <DropdownMenuItem onClick={handleCopy} className="cursor-pointer text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700">
            {copied ? (
              <Check className="mr-2 h-4 w-4 text-green-600 dark:text-green-400" />
            ) : (
              <Copy className="mr-2 h-4 w-4 text-gray-700 dark:text-white" />
            )}
            {copied ? 'Copiado' : 'Copiar mensaje'}
          </DropdownMenuItem>

          {/* Select option */}
          {canSelect && (
            <DropdownMenuItem onClick={handleSelect} className="cursor-pointer text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700">
              <Check className="mr-2 h-4 w-4 text-gray-700 dark:text-white" />
              {isSelected ? 'Deseleccionar' : 'Seleccionar'}
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator className="dark:bg-gray-600" />

          {/* Reply option */}
          <DropdownMenuItem onClick={handleReply} className="cursor-pointer text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700">
            <Reply className="mr-2 h-4 w-4 text-gray-700 dark:text-white" />
            Responder
          </DropdownMenuItem>

          {/* Forward option */}
          <DropdownMenuItem onClick={handleForward} className="cursor-pointer text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700">
            <Forward className="mr-2 h-4 w-4 text-gray-700 dark:text-white" />
            Reenviar
          </DropdownMenuItem>

          {/* Edit and Delete for own messages */}
          {(canEdit || canDelete) && <DropdownMenuSeparator className="dark:bg-purple-800" />}

          {canEdit && onEdit && (
            <DropdownMenuItem
              onClick={() => {
                setEditContent(message.content);
                setShowEditDialog(true);
              }}
              className="cursor-pointer text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <Edit3 className="mr-2 h-4 w-4 text-gray-700 dark:text-gray-300" />
              Editar
            </DropdownMenuItem>
          )}

          {canDelete && onDelete && (
            <DropdownMenuItem
              onClick={() => setShowDeleteDialog(true)}
              className="cursor-pointer text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-gray-700"
            >
              <Trash2 className="mr-2 h-4 w-4 text-red-600 dark:text-red-400" />
              Eliminar
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-gradient-to-b dark:from-purple-950 dark:via-purple-900 dark:to-black border-gray-200 dark:border-purple-800">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-white flex items-center gap-2">
              <Edit3 className="w-5 h-5" />
              Editar mensaje
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                Mensaje original:
              </label>
              <p className="text-sm bg-gray-100 dark:bg-black/40 text-gray-900 dark:text-gray-200 p-3 rounded-md mt-2">
                {message.content}
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                Nuevo contenido:
              </label>
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full mt-2 p-3 bg-white dark:bg-black/40 text-gray-900 dark:text-white border border-gray-300 dark:border-purple-700 rounded-md focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-600 focus:border-transparent resize-none placeholder:text-gray-500 dark:placeholder:text-gray-400"
                rows={3}
                maxLength={1000}
                placeholder="Escribe el nuevo contenido del mensaje..."
              />
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                {editContent.length}/1000 caracteres
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              onClick={() => setShowEditDialog(false)}
              disabled={isEditing}
              className="flex-1 text-gray-900 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleEdit}
              disabled={isEditing || editContent.trim().length === 0}
              className="flex-1 bg-blue-600 hover:bg-blue-700 dark:bg-purple-700 dark:hover:bg-purple-600 text-white"
            >
              {isEditing ? (
                <>Guardando...</>
              ) : (
                <>Aceptar</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-white dark:bg-gradient-to-br dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 border-2 border-gray-200 dark:border-gray-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-gray-900 dark:text-white flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-red-600 dark:text-red-400" />
              ¿Eliminar mensaje?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3 text-gray-600 dark:text-gray-300">
              <p>Esta acción no se puede deshacer. El mensaje será eliminado permanentemente.</p>
              <div className="bg-gray-100 dark:bg-gray-800/50 p-3 rounded-md border border-gray-200 dark:border-gray-700">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-200">Mensaje a eliminar:</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 italic">
                  "{message.content}"
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel
              disabled={isDeleting}
              className="border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800 text-white border-0"
            >
              {isDeleting ? 'Eliminando...' : 'Eliminar mensaje'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}