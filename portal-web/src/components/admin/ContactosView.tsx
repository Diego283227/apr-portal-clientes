import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Mail,
  Phone,
  MessageCircle,
  Eye,
  Trash2,
  CheckCircle,
  Clock,
  Archive,
} from 'lucide-react';
import { toast } from 'sonner';
import contactosService, { Contacto } from '@/services/contactos';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function ContactosView() {
  const [contactos, setContactos] = useState<Contacto[]>([]);
  const [loading, setLoading] = useState(true);
  const [estadoFilter, setEstadoFilter] = useState<string>('todos');
  const [selectedContacto, setSelectedContacto] = useState<Contacto | null>(null);
  const [notas, setNotas] = useState('');
  const [stats, setStats] = useState({
    nuevo: 0,
    leido: 0,
    respondido: 0,
    archivado: 0,
  });

  useEffect(() => {
    cargarContactos();
  }, [estadoFilter]);

  const cargarContactos = async () => {
    try {
      setLoading(true);
      const filtro = estadoFilter === 'todos' ? '' : estadoFilter;
      const response = await contactosService.obtenerContactos(filtro);
      setContactos(response.data);
      setStats(response.stats);
    } catch (error) {
      toast.error('Error al cargar contactos');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleEstadoChange = async (contactoId: string, nuevoEstado: string) => {
    try {
      await contactosService.actualizarContacto(contactoId, { estado: nuevoEstado });
      toast.success('Estado actualizado');
      cargarContactos();
    } catch (error) {
      toast.error('Error al actualizar estado');
    }
  };

  const handleGuardarNotas = async () => {
    if (!selectedContacto) return;

    try {
      await contactosService.actualizarContacto(selectedContacto._id, { notas });
      toast.success('Notas guardadas');
      setSelectedContacto(null);
      cargarContactos();
    } catch (error) {
      toast.error('Error al guardar notas');
    }
  };

  const handleEliminar = async (contactoId: string) => {
    if (!confirm('¿Estás seguro de eliminar este contacto?')) return;

    try {
      await contactosService.eliminarContacto(contactoId);
      toast.success('Contacto eliminado');
      cargarContactos();
    } catch (error) {
      toast.error('Error al eliminar contacto');
    }
  };

  const openContactoDetail = (contacto: Contacto) => {
    setSelectedContacto(contacto);
    setNotas(contacto.notas || '');

    // Marcar como leído si está nuevo
    if (contacto.estado === 'nuevo') {
      handleEstadoChange(contacto._id, 'leido');
    }
  };

  const getEstadoBadge = (estado: string) => {
    const variants: Record<string, { variant: any; icon: any; label: string }> = {
      nuevo: { variant: 'default', icon: Clock, label: 'Nuevo' },
      leido: { variant: 'secondary', icon: Eye, label: 'Leído' },
      respondido: { variant: 'default', icon: CheckCircle, label: 'Respondido' },
      archivado: { variant: 'outline', icon: Archive, label: 'Archivado' },
    };

    const config = variants[estado] || variants.nuevo;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('es-CL', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Contactos</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Gestiona los mensajes recibidos desde la página principal
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Nuevos</p>
                <p className="text-2xl font-bold">{stats.nuevo || 0}</p>
              </div>
              <Clock className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Leídos</p>
                <p className="text-2xl font-bold">{stats.leido || 0}</p>
              </div>
              <Eye className="w-8 h-8 text-gray-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Respondidos</p>
                <p className="text-2xl font-bold">{stats.respondido || 0}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Archivados</p>
                <p className="text-2xl font-bold">{stats.archivado || 0}</p>
              </div>
              <Archive className="w-8 h-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={estadoFilter} onValueChange={setEstadoFilter}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Todos los estados" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="nuevo">Nuevos</SelectItem>
              <SelectItem value="leido">Leídos</SelectItem>
              <SelectItem value="respondido">Respondidos</SelectItem>
              <SelectItem value="archivado">Archivados</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Lista de contactos */}
      <div className="grid gap-4">
        {loading ? (
          <Card>
            <CardContent className="p-6">
              <p className="text-center text-gray-500">Cargando contactos...</p>
            </CardContent>
          </Card>
        ) : contactos.length === 0 ? (
          <Card>
            <CardContent className="p-6">
              <p className="text-center text-gray-500">No hay contactos para mostrar</p>
            </CardContent>
          </Card>
        ) : (
          contactos.map((contacto) => (
            <Card
              key={contacto._id}
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => openContactoDetail(contacto)}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold">{contacto.nombre}</h3>
                      {getEstadoBadge(contacto.estado)}
                    </div>

                    <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        {contacto.email}
                      </div>
                      {contacto.telefono && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4" />
                          {contacto.telefono}
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        {formatDate(contacto.creadoEn)}
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <MessageCircle className="w-4 h-4 mt-1 flex-shrink-0 text-gray-400" />
                      <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                        {contacto.mensaje}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEliminar(contacto._id);
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Modal de detalle */}
      <Dialog open={!!selectedContacto} onOpenChange={() => setSelectedContacto(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalle del Contacto</DialogTitle>
            <DialogDescription>
              Mensaje recibido el {selectedContacto && formatDate(selectedContacto.creadoEn)}
            </DialogDescription>
          </DialogHeader>

          {selectedContacto && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Nombre</label>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {selectedContacto.nombre}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium">Email</label>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {selectedContacto.email}
                  </p>
                </div>

                {selectedContacto.telefono && (
                  <div>
                    <label className="text-sm font-medium">Teléfono</label>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {selectedContacto.telefono}
                    </p>
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium">Estado</label>
                  <Select
                    value={selectedContacto.estado}
                    onValueChange={(value) => handleEstadoChange(selectedContacto._id, value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nuevo">Nuevo</SelectItem>
                      <SelectItem value="leido">Leído</SelectItem>
                      <SelectItem value="respondido">Respondido</SelectItem>
                      <SelectItem value="archivado">Archivado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Mensaje</label>
                <p className="mt-2 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm">
                  {selectedContacto.mensaje}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Notas Internas</label>
                <Textarea
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  placeholder="Agrega notas sobre este contacto..."
                  rows={4}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setSelectedContacto(null)}>
                  Cerrar
                </Button>
                <Button onClick={handleGuardarNotas}>Guardar Notas</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
