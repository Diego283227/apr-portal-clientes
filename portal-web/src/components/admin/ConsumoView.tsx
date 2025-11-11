import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { toast } from 'sonner';
import { apiClient } from '@/services/api';
import {
  Droplet,
  User,
  Calendar,
  Gauge,
  FileText,
  Calculator,
  CheckCircle,
  Search,
  Loader2
} from 'lucide-react';

interface Socio {
  _id: string;
  id?: string; // Backend returns 'id' instead of '_id'
  nombres: string;
  apellidos: string;
  rut: string;
  codigoSocio: string;
  email: string;
  medidor?: {
    numero: string;
    ubicacion?: string;
    fechaInstalacion?: string;
    lecturaInicial?: number;
  };
  categoriaUsuario?: string;
}

interface UltimaLectura {
  lecturaActual: number;
  fechaLectura: string;
  numeroMedidor: string;
}

interface CalculoPreview {
  consumoM3: number;
  cargoFijo: number;
  costoConsumo: number;
  descuentos: number;
  recargos: number;
  montoTotal: number;
}

export default function ConsumoView() {
  const [socios, setSocios] = useState<Socio[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [socioSeleccionado, setSocioSeleccionado] = useState<Socio | null>(null);
  const [ultimaLectura, setUltimaLectura] = useState<UltimaLectura | null>(null);
  const [loading, setLoading] = useState(false);
  const [calculando, setCalculando] = useState(false);
  const [registrando, setRegistrando] = useState(false);

  const [formData, setFormData] = useState({
    numeroMedidor: '',
    codigoCliente: '',
    lecturaAnterior: 0,
    lecturaActual: 0,
    fechaLectura: new Date().toISOString().slice(0, 10), // YYYY-MM-DD
    horaLectura: new Date().toTimeString().slice(0, 5), // HH:MM
    nombreLector: '',
    periodo: new Date().toISOString().slice(0, 7), // YYYY-MM
    observaciones: '',
    incidencias: '',
    lecturaEsCero: false
  });

  const [calculoPreview, setCalculoPreview] = useState<CalculoPreview | null>(null);

  // Cargar socios al montar
  useEffect(() => {
    cargarSocios();
  }, []);

  const cargarSocios = async () => {
    try {
      const response = await apiClient.get('/admin/socios', {
        params: { limit: 1000 } // Get all socios without pagination
      });
      setSocios(response.data.data.socios || []);
    } catch (error: any) {
      console.error('Error loading socios:', error);
      toast.error('Error al cargar socios');
    }
  };

  // Buscar socios - solo mostrar los que tienen medidor asignado
  const sociosFiltrados = socios.filter(socio =>
    // Solo incluir socios con medidor asignado
    socio.medidor && socio.medidor.numero &&
    // Aplicar búsqueda
    (
      `${socio.nombres} ${socio.apellidos}`.toLowerCase().includes(busqueda.toLowerCase()) ||
      socio.rut.includes(busqueda) ||
      socio.codigoSocio.includes(busqueda)
    )
  );

  // Cuando se selecciona un socio, cargar su última lectura
  const seleccionarSocio = async (socio: Socio) => {
    setSocioSeleccionado(socio);
    setCalculoPreview(null);

    // Validar que el socio tenga medidor asignado
    if (!socio.medidor || !socio.medidor.numero) {
      toast.error('Este socio no tiene medidor asignado. Por favor, asigne un medidor primero en la gestión de socios.');
      return;
    }

    try {
      setLoading(true);
      // Use id (returned by backend) or fallback to _id
      const socioId = (socio as any).id || socio._id;
      const response = await apiClient.get(`/consumo/socio/${socioId}/ultima`);

      if (response.data.data) {
        const ultima = response.data.data;
        setUltimaLectura(ultima);
        setFormData(prev => ({
          ...prev,
          numeroMedidor: socio.medidor!.numero,
          codigoCliente: socio.codigoSocio,
          lecturaAnterior: ultima.lecturaActual
        }));
      } else {
        setUltimaLectura(null);
        setFormData(prev => ({
          ...prev,
          numeroMedidor: socio.medidor!.numero,
          codigoCliente: socio.codigoSocio,
          lecturaAnterior: socio.medidor?.lecturaInicial || 0
        }));
        toast.info('Este socio no tiene lecturas previas. Se usará la lectura inicial del medidor.');
      }
    } catch (error: any) {
      console.error('Error loading last reading:', error);
      toast.error('Error al cargar última lectura');
    } finally {
      setLoading(false);
    }
  };

  // Calcular preview del monto
  const calcularPreview = () => {
    if (!socioSeleccionado || formData.lecturaActual <= 0) {
      toast.error('Complete todos los campos requeridos');
      return;
    }

    if (formData.lecturaActual < formData.lecturaAnterior) {
      toast.error('La lectura actual no puede ser menor que la anterior');
      return;
    }

    const consumo = formData.lecturaActual - formData.lecturaAnterior;

    setCalculoPreview({
      consumoM3: consumo,
      cargoFijo: 0,
      costoConsumo: 0,
      descuentos: 0,
      recargos: 0,
      montoTotal: 0
    });

    toast.success(`Consumo calculado: ${consumo} m³`);
  };

  // Registrar lectura y generar boleta
  const registrarLectura = async () => {
    if (!socioSeleccionado) {
      toast.error('Seleccione un socio');
      return;
    }

    if (formData.lecturaActual <= 0 || !formData.numeroMedidor) {
      toast.error('Complete todos los campos requeridos');
      return;
    }

    if (formData.lecturaActual < formData.lecturaAnterior) {
      toast.error('La lectura actual no puede ser menor que la anterior');
      return;
    }

    try {
      setRegistrando(true);

      // Use id (returned by backend) or fallback to _id
      const socioId = (socioSeleccionado as any).id || socioSeleccionado._id;

      const payload = {
        socioId: socioId,
        numeroMedidor: formData.numeroMedidor,
        codigoCliente: formData.codigoCliente,
        lecturaAnterior: formData.lecturaAnterior,
        lecturaActual: formData.lecturaActual,
        fechaLectura: formData.fechaLectura,
        horaLectura: formData.horaLectura,
        nombreLector: formData.nombreLector,
        periodo: `${formData.periodo}-01`, // Convertir YYYY-MM a YYYY-MM-DD
        observaciones: formData.observaciones,
        incidencias: formData.incidencias,
        lecturaEsCero: formData.lecturaEsCero
      };

      const response = await apiClient.post('/consumo', payload);

      const { lectura, boleta, calculoTarifa } = response.data.data;

      toast.success(
        `Lectura registrada y boleta ${boleta.numeroBoleta} generada exitosamente. Monto: $${calculoTarifa.montoTotal.toLocaleString()}`
      );

      // Resetear formulario
      setSocioSeleccionado(null);
      setUltimaLectura(null);
      setCalculoPreview(null);
      setBusqueda('');
      setFormData({
        numeroMedidor: '',
        codigoCliente: '',
        lecturaAnterior: 0,
        lecturaActual: 0,
        fechaLectura: new Date().toISOString().slice(0, 10),
        horaLectura: new Date().toTimeString().slice(0, 5),
        nombreLector: '',
        periodo: new Date().toISOString().slice(0, 7),
        observaciones: '',
        incidencias: '',
        lecturaEsCero: false
      });

    } catch (error: any) {
      console.error('Error registering reading:', error);
      toast.error(error.response?.data?.message || 'Error al registrar lectura');
    } finally {
      setRegistrando(false);
    }
  };

  const consumoCalculado = formData.lecturaActual - formData.lecturaAnterior;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Registro de Consumo</h1>
          <p className="text-gray-500">Registre lecturas de medidor y genere boletas automáticamente</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Panel de búsqueda de socios */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="w-5 h-5" />
              Buscar Socio
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Buscar por nombre, RUT o código</Label>
              <Input
                type="text"
                placeholder="Buscar..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </div>

            <div className="max-h-96 overflow-y-auto space-y-2">
              {busqueda.length >= 2 ? (
                sociosFiltrados.length > 0 ? (
                  sociosFiltrados.map(socio => (
                    <Card
                      key={socio._id}
                      className={`p-3 cursor-pointer hover:bg-gray-50 transition-colors ${
                        socioSeleccionado?._id === socio._id ? 'border-blue-500 bg-blue-50' : ''
                      }`}
                      onClick={() => seleccionarSocio(socio)}
                    >
                      <div className="font-semibold">{socio.nombres} {socio.apellidos}</div>
                      <div className="text-sm text-gray-500">RUT: {socio.rut}</div>
                      <div className="text-sm text-gray-500">Código: {socio.codigoSocio}</div>
                    </Card>
                  ))
                ) : (
                  <div className="text-center text-gray-500 py-4">
                    No se encontraron socios
                  </div>
                )
              ) : (
                <div className="text-center text-gray-400 py-4">
                  Escriba al menos 2 caracteres para buscar
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Panel de registro de lectura */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gauge className="w-5 h-5" />
              Registro de Lectura
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {socioSeleccionado ? (
              <>
                {/* Información del socio */}
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <User className="w-5 h-5 text-blue-600" />
                      <span className="font-semibold text-blue-900">
                        {socioSeleccionado.nombres} {socioSeleccionado.apellidos}
                      </span>
                    </div>
                    <div className="text-sm text-blue-700 space-y-1">
                      <div>RUT: {socioSeleccionado.rut} | Código: {socioSeleccionado.codigoSocio}</div>
                      <div>Categoría: {socioSeleccionado.categoriaUsuario || 'residencial'}</div>
                      {socioSeleccionado.medidor ? (
                        <div className="mt-2 pt-2 border-t border-blue-300">
                          <div className="font-semibold text-blue-800 mb-1">Medidor Asignado:</div>
                          <div>N°: {socioSeleccionado.medidor.numero}</div>
                          {socioSeleccionado.medidor.ubicacion && (
                            <div>Ubicación: {socioSeleccionado.medidor.ubicacion}</div>
                          )}
                          {socioSeleccionado.medidor.fechaInstalacion && (
                            <div>Instalado: {new Date(socioSeleccionado.medidor.fechaInstalacion).toLocaleDateString()}</div>
                          )}
                        </div>
                      ) : (
                        <div className="mt-2 pt-2 border-t border-yellow-300 text-yellow-800">
                          ⚠️ Este socio no tiene medidor asignado
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Última lectura */}
                {ultimaLectura && (
                  <Card className="bg-gray-50">
                    <CardContent className="pt-4">
                      <div className="text-sm font-semibold text-gray-700 mb-2">Última Lectura Registrada:</div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Lectura:</span>{' '}
                          <span className="font-semibold">{ultimaLectura.lecturaActual} m³</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Fecha:</span>{' '}
                          <span className="font-semibold">
                            {new Date(ultimaLectura.fechaLectura).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Formulario de lectura */}
                <div className="space-y-4">
                  {/* Identificación del Medidor */}
                  <div className="border-b pb-3">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Identificación</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Número de Medidor *</Label>
                        <Input
                          type="text"
                          value={formData.numeroMedidor}
                          disabled
                          className="bg-gray-100"
                        />
                      </div>

                      <div>
                        <Label>Código Cliente/Servicio *</Label>
                        <Input
                          type="text"
                          value={formData.codigoCliente}
                          disabled
                          className="bg-gray-100"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Datos de Lectura */}
                  <div className="border-b pb-3">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Datos de Lectura</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Lectura Anterior (m³)</Label>
                        <Input
                          type="number"
                          min="0"
                          value={formData.lecturaAnterior}
                          onChange={(e) => setFormData({ ...formData, lecturaAnterior: Number(e.target.value) })}
                          disabled={!!ultimaLectura}
                          className="bg-gray-50"
                        />
                      </div>

                      <div>
                        <Label>Lectura Actual (m³) * (Solo dígitos negros)</Label>
                        <Input
                          type="number"
                          min="0"
                          value={formData.lecturaActual || ''}
                          onChange={(e) => setFormData({ ...formData, lecturaActual: Number(e.target.value) })}
                          className="text-lg font-semibold"
                          placeholder="Ej: 245"
                        />
                      </div>

                      <div>
                        <Label>Fecha de Lectura *</Label>
                        <Input
                          type="date"
                          value={formData.fechaLectura}
                          onChange={(e) => setFormData({ ...formData, fechaLectura: e.target.value })}
                        />
                      </div>

                      <div>
                        <Label>Hora Aproximada *</Label>
                        <Input
                          type="time"
                          value={formData.horaLectura}
                          onChange={(e) => setFormData({ ...formData, horaLectura: e.target.value })}
                        />
                      </div>

                      <div>
                        <Label>Período (Mes/Año) *</Label>
                        <Input
                          type="month"
                          value={formData.periodo}
                          onChange={(e) => setFormData({ ...formData, periodo: e.target.value })}
                        />
                      </div>

                      <div>
                        <Label>Nombre del Lector/Técnico *</Label>
                        <Input
                          type="text"
                          value={formData.nombreLector}
                          onChange={(e) => setFormData({ ...formData, nombreLector: e.target.value })}
                          placeholder="Nombre del técnico"
                        />
                      </div>
                    </div>

                    <div className="mt-3 flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="lecturaEsCero"
                        checked={formData.lecturaEsCero}
                        onChange={(e) => setFormData({ ...formData, lecturaEsCero: e.target.checked })}
                        className="w-4 h-4"
                      />
                      <Label htmlFor="lecturaEsCero" className="cursor-pointer">
                        Confirmar lectura en cero (sin movimiento)
                      </Label>
                    </div>
                  </div>
                </div>

                {/* Consumo calculado */}
                {formData.lecturaActual > 0 && (
                  <Card className="bg-green-50 border-green-200">
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Droplet className="w-5 h-5 text-green-600" />
                          <span className="font-semibold text-green-900">Consumo del Período:</span>
                        </div>
                        <span className="text-2xl font-bold text-green-600">
                          {consumoCalculado >= 0 ? consumoCalculado : 0} m³
                        </span>
                      </div>
                      {consumoCalculado < 0 && (
                        <div className="text-red-600 text-sm mt-2">
                          La lectura actual debe ser mayor o igual a la anterior
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Observaciones e Incidencias */}
                <div className="space-y-4">
                  <div>
                    <Label>Incidencias / Anomalías</Label>
                    <Textarea
                      placeholder="Registre cualquier anomalía: medidor dañado, fuga visible, obstrucción de acceso, indicios de manipulación, propiedad desocupada, etc."
                      value={formData.incidencias}
                      onChange={(e) => setFormData({ ...formData, incidencias: e.target.value })}
                      rows={3}
                      className="resize-none"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Ejemplos: Medidor empañado, fuga en tubería, acceso bloqueado, sospecha de fraude
                    </p>
                  </div>

                  <div>
                    <Label>Observaciones Generales (opcional)</Label>
                    <Textarea
                      placeholder="Cualquier otra observación sobre la lectura..."
                      value={formData.observaciones}
                      onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                      rows={2}
                      className="resize-none"
                    />
                  </div>
                </div>

                {/* Botón de registro */}
                <Button
                  onClick={registrarLectura}
                  disabled={
                    registrando ||
                    loading ||
                    consumoCalculado < 0 ||
                    !formData.numeroMedidor ||
                    !formData.codigoCliente ||
                    formData.lecturaActual <= 0 ||
                    !formData.fechaLectura ||
                    !formData.horaLectura ||
                    !formData.nombreLector.trim()
                  }
                  className="w-full"
                  size="lg"
                >
                  {registrando ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Registrando y Generando Boleta...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5 mr-2" />
                      Registrar Consumo y Generar Boleta
                    </>
                  )}
                </Button>
              </>
            ) : (
              <div className="text-center py-12 text-gray-400">
                <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg">Seleccione un socio para comenzar</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
