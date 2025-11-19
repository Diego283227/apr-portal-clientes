import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  Send,
  Loader2,
  Megaphone,
  Users,
  AlertCircle,
} from "lucide-react";
import { apiClient } from "../../services/api";
import { toast } from "sonner";

interface GlobalMessageViewProps {
  onBack?: () => void;
}

export default function GlobalMessageView({ onBack }: GlobalMessageViewProps) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleSendGlobalMessage = async () => {
    if (!message.trim()) {
      toast.error("Por favor escribe un mensaje");
      return;
    }

    try {
      setSending(true);
      const response = await apiClient.post("/chat/broadcast", {
        content: message.trim(),
      });

      if (response.data.success) {
        toast.success(
          `Mensaje enviado a ${response.data.data.sentCount} socios`
        );
        setMessage("");
      }
    } catch (error: any) {
      console.error("Error sending global message:", error);
      toast.error(
        error.response?.data?.message || "Error al enviar mensaje global"
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center gap-4">
          {onBack && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              className="hover:bg-gray-100"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
              <Megaphone className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Mensaje Global
              </h1>
              <p className="text-sm text-gray-500">
                Envía un mensaje a todos los socios
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto">
          {/* Info Card */}
          <Card className="mb-6 border-blue-200 bg-blue-50">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-900">
                  <p className="font-medium mb-1">Comunicación Masiva</p>
                  <p className="text-blue-700">
                    El mensaje que escribas será enviado a todos los socios
                    activos del sistema. Aparecerá en su vista de chat como un
                    mensaje del administrador.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Message Composer */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Componer Mensaje
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mensaje
                </label>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Escribe tu mensaje aquí... (ej: Estimados socios, les informamos que...)"
                  className="min-h-[200px] resize-none"
                  disabled={sending}
                />
                <div className="flex justify-between items-center mt-2">
                  <p className="text-xs text-gray-500">
                    {message.length} caracteres
                  </p>
                  <p className="text-xs text-gray-500">
                    Se enviará a todos los socios activos
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setMessage("")}
                  disabled={sending || !message.trim()}
                >
                  Limpiar
                </Button>
                <Button
                  onClick={handleSendGlobalMessage}
                  disabled={sending || !message.trim()}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {sending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Enviar a Todos
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Guidelines */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-base">Recomendaciones</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">•</span>
                  <span>Usa mensajes claros y concisos</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">•</span>
                  <span>
                    Incluye información relevante y útil para todos los socios
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">•</span>
                  <span>
                    Evita enviar mensajes masivos con demasiada frecuencia
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">•</span>
                  <span>Verifica el contenido antes de enviar</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
