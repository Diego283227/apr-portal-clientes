import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { CalendarIcon, Calculator, Users, RefreshCw } from 'lucide-react';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:7781/api';

interface CreateBoletaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface Socio {
  id: string;
  nombres: string;
  apellidos: string;
  rut: string;
  email: string;
  codigoSocio: string;
  direccion: string;
}

interface BoletaFormData {
  socioId: string;
  periodo: string;
  lecturaAnterior: number;
  lecturaActual: number;
  tarifaM3: number;
  cargoFijo: number;
  otrosCargos: number;
  descuentos: number;
  fechaVencimiento: string;
}

export default function CreateBoletaModal({ isOpen, onClose, onSuccess }: CreateBoletaModalProps) {
  const [socios, setSocios] = useState<Socio[]>([]);
  const [selectedSocio, setSelectedSocio] = useState<Socio | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string>('');

  const [formData, setFormData] = useState<BoletaFormData>({
    socioId: '',
    periodo: '',
    lecturaAnterior: 0,
    lecturaActual: 0,
    tarifaM3: 1500,
    cargoFijo: 12500,
    otrosCargos: 0,
    descuentos: 0,
    fechaVencimiento: ''
  });

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    if (!token || token === 'null' || token === 'undefined') {
      throw new Error('No se encontró token de autenticación');
    }
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  };

  // Fetch socios when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchSocios();
      // Set default period to current month
      const now = new Date();
      const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      setFormData(prev => ({
        ...prev,
        periodo: currentPeriod,
        fechaVencimiento: new Date(now.getFullYear(), now.getMonth() + 1, 15).toISOString().split('T')[0]
      }));
    }
  }, [isOpen]);

  const fetchSocios = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await axios.get(`${API_BASE_URL}/users/socios`, {
        headers: getAuthHeaders()
      });
      
      if (response.data.success) {
        setSocios(response.data.data);
      } else {
        setError('Error al cargar los socios');
      }
    } catch (err: any) {
      console.error('Error fetching socios:', err);
      setError(err.response?.data?.message || 'Error al cargar los socios');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocioChange = (socioId: string) => {
    const socio = socios.find(s => s.id === socioId);
    setSelectedSocio(socio || null);
    setFormData(prev => ({ ...prev, socioId }));
  };

  const calculateTotal = () => {
    const consumo = formData.lecturaActual - formData.lecturaAnterior;
    const montoConsumo = Math.max(0, consumo) * formData.tarifaM3;
    return formData.cargoFijo + montoConsumo + formData.otrosCargos - formData.descuentos;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSocio) {
      setError('Debe seleccionar un socio');
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      const consumoM3 = Math.max(0, formData.lecturaActual - formData.lecturaAnterior);
      const montoTotal = calculateTotal();

      const boletaData = {
        socioId: formData.socioId,
        periodo: formData.periodo,
        consumoM3,
        montoTotal,
        fechaVencimiento: formData.fechaVencimiento,
        detalle: {
          consumoAnterior: formData.lecturaAnterior,
          consumoActual: formData.lecturaActual,
          tarifaM3: formData.tarifaM3,
          cargoFijo: formData.cargoFijo,
          otrosCargos: formData.otrosCargos,
          descuentos: formData.descuentos
        },
        lecturaAnterior: formData.lecturaAnterior,
        lecturaActual: formData.lecturaActual
      };

      const response = await axios.post(`${API_BASE_URL}/boletas`, boletaData, {
        headers: getAuthHeaders()
      });

      if (response.data.success) {
        onSuccess();
        onClose();
        // Reset form
        setFormData({
          socioId: '',
          periodo: '',
          lecturaAnterior: 0,
          lecturaActual: 0,
          tarifaM3: 1500,
          cargoFijo: 12500,
          otrosCargos: 0,
          descuentos: 0,
          fechaVencimiento: ''
        });
        setSelectedSocio(null);
      } else {
        setError(response.data.message || 'Error al crear la boleta');
      }
    } catch (err: any) {
      console.error('Error creating boleta:', err);
      setError(err.response?.data?.message || 'Error al crear la boleta');
    } finally {
      setIsSaving(false);
    }
  };

  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(amount);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto !bg-white dark:!bg-gray-900 !border-0 !shadow-2xl !rounded-2xl">
        <DialogHeader className="!border-0">
          <DialogTitle className="flex items-center gap-2 text-xl font-bold text-gray-800 dark:text-gray-100 !border-0">
            <Calculator className="h-6 w-6 text-blue-500" />
            Crear Nueva Boleta
          </DialogTitle>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            Complete los datos para generar una nueva boleta. Se enviarán notificaciones automáticamente si está habilitado.
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border-0 rounded-xl shadow-sm">
              <p className="text-red-600 dark:text-red-400 text-sm font-medium">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Selección de Socio */}
            <Card className="!bg-white dark:!bg-gray-800 !border-0 !shadow-md hover:!shadow-lg transition-all !rounded-xl">
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2 text-gray-800 dark:text-gray-100">
                  <Users className="h-5 w-5 text-blue-500" />
                  Información del Socio
                </h3>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="socio" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                      Seleccionar socio
                    </Label>
                    <Select value={formData.socioId} onValueChange={handleSocioChange} disabled={isLoading}>
                      <SelectTrigger className="w-full !border-0 !bg-gray-50 dark:!bg-gray-700 !shadow-sm hover:!shadow-md transition-all !rounded-lg h-11">
                        <SelectValue placeholder={isLoading ? "Cargando socios..." : "Seleccione un socio"} />
                      </SelectTrigger>
                      <SelectContent className="min-w-[550px]">
                        {socios.map((socio) => (
                          <SelectItem
                            key={socio.id}
                            value={socio.id}
                          >
                            <div className="flex flex-col gap-1 py-1">
                              <div className="font-semibold text-gray-900 dark:text-gray-100">
                                {socio.nombres} {socio.apellidos}
                              </div>
                              <div className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-3 flex-wrap">
                                <span>RUT: {socio.rut}</span>
                                <span>•</span>
                                <span>Código: {socio.codigoSocio}</span>
                                {socio.email && (
                                  <>
                                    <span>•</span>
                                    <span className="truncate max-w-[200px]">{socio.email}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedSocio && (
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl shadow-sm text-sm space-y-1.5">
                      <p className="text-gray-700 dark:text-gray-300"><strong className="text-blue-700 dark:text-blue-400">RUT:</strong> {selectedSocio.rut}</p>
                      <p className="text-gray-700 dark:text-gray-300"><strong className="text-blue-700 dark:text-blue-400">Email:</strong> {selectedSocio.email}</p>
                      <p className="text-gray-700 dark:text-gray-300"><strong className="text-blue-700 dark:text-blue-400">Dirección:</strong> {selectedSocio.direccion}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Información de Período */}
            <Card className="!bg-white dark:!bg-gray-800 !border-0 !shadow-md hover:!shadow-lg transition-all !rounded-xl">
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2 text-gray-800 dark:text-gray-100">
                  <CalendarIcon className="h-5 w-5 text-green-500" />
                  Período y Fechas
                </h3>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="periodo" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                      Período de Facturación
                    </Label>
                    <Input
                      id="periodo"
                      type="month"
                      value={formData.periodo}
                      onChange={(e) => setFormData(prev => ({ ...prev, periodo: e.target.value }))}
                      required
                      placeholder="YYYY-MM"
                      className="w-full !border-0 !bg-gray-50 dark:!bg-gray-700 !shadow-sm hover:!shadow-md transition-all !rounded-lg h-11"
                    />
                  </div>
                  <div>
                    <Label htmlFor="fechaVencimiento" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                      Fecha de Vencimiento
                    </Label>
                    <Input
                      id="fechaVencimiento"
                      type="date"
                      value={formData.fechaVencimiento}
                      onChange={(e) => setFormData(prev => ({ ...prev, fechaVencimiento: e.target.value }))}
                      required
                      className="w-full !border-0 !bg-gray-50 dark:!bg-gray-700 !shadow-sm hover:!shadow-md transition-all !rounded-lg h-11"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Lecturas */}
            <Card className="!bg-white dark:!bg-gray-800 !border-0 !shadow-md hover:!shadow-lg transition-all !rounded-xl">
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-4 text-gray-800 dark:text-gray-100">Lecturas del Medidor</h3>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="lecturaAnterior" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Lectura Anterior (m³)
                    </Label>
                    <Input
                      id="lecturaAnterior"
                      type="number"
                      min="0"
                      value={formData.lecturaAnterior}
                      onChange={(e) => setFormData(prev => ({ ...prev, lecturaAnterior: Number(e.target.value) }))}
                      required
                      className="mt-1.5 !border-0 !bg-gray-50 dark:!bg-gray-700 !shadow-sm hover:!shadow-md transition-all !rounded-lg h-10"
                    />
                  </div>
                  <div>
                    <Label htmlFor="lecturaActual" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Lectura Actual (m³)
                    </Label>
                    <Input
                      id="lecturaActual"
                      type="number"
                      min={formData.lecturaAnterior}
                      value={formData.lecturaActual}
                      onChange={(e) => setFormData(prev => ({ ...prev, lecturaActual: Number(e.target.value) }))}
                      required
                      className="mt-1.5 !border-0 !bg-gray-50 dark:!bg-gray-700 !shadow-sm hover:!shadow-md transition-all !rounded-lg h-10"
                    />
                  </div>
                  <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-xl shadow-sm">
                    <p className="text-sm text-green-700 dark:text-green-400 font-medium">
                      <strong>Consumo:</strong> {Math.max(0, formData.lecturaActual - formData.lecturaAnterior)} m³
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tarifas y Cargos */}
            <Card className="!bg-white dark:!bg-gray-800 !border-0 !shadow-md hover:!shadow-lg transition-all !rounded-xl">
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-4 text-gray-800 dark:text-gray-100">Tarifas y Cargos</h3>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="tarifaM3" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Tarifa por m³
                    </Label>
                    <Input
                      id="tarifaM3"
                      type="number"
                      min="0"
                      value={formData.tarifaM3}
                      onChange={(e) => setFormData(prev => ({ ...prev, tarifaM3: Number(e.target.value) }))}
                      required
                      className="mt-1.5 !border-0 !bg-gray-50 dark:!bg-gray-700 !shadow-sm hover:!shadow-md transition-all !rounded-lg h-10"
                    />
                  </div>
                  <div>
                    <Label htmlFor="cargoFijo" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Cargo Fijo
                    </Label>
                    <Input
                      id="cargoFijo"
                      type="number"
                      min="0"
                      value={formData.cargoFijo}
                      onChange={(e) => setFormData(prev => ({ ...prev, cargoFijo: Number(e.target.value) }))}
                      required
                      className="mt-1.5 !border-0 !bg-gray-50 dark:!bg-gray-700 !shadow-sm hover:!shadow-md transition-all !rounded-lg h-10"
                    />
                  </div>
                  <div>
                    <Label htmlFor="otrosCargos" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Otros Cargos
                    </Label>
                    <Input
                      id="otrosCargos"
                      type="number"
                      min="0"
                      value={formData.otrosCargos}
                      onChange={(e) => setFormData(prev => ({ ...prev, otrosCargos: Number(e.target.value) }))}
                      className="mt-1.5 !border-0 !bg-gray-50 dark:!bg-gray-700 !shadow-sm hover:!shadow-md transition-all !rounded-lg h-10"
                    />
                  </div>
                  <div>
                    <Label htmlFor="descuentos" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Descuentos
                    </Label>
                    <Input
                      id="descuentos"
                      type="number"
                      min="0"
                      value={formData.descuentos}
                      onChange={(e) => setFormData(prev => ({ ...prev, descuentos: Number(e.target.value) }))}
                      className="mt-1.5 !border-0 !bg-gray-50 dark:!bg-gray-700 !shadow-sm hover:!shadow-md transition-all !rounded-lg h-10"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Aviso de Cálculo Automático */}
          <div className="p-4 !bg-blue-50 dark:!bg-blue-900/20 !border-0 !rounded-xl !shadow-sm">
            <div className="flex items-start gap-3">
              <Calculator className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-blue-800 dark:text-blue-300 mb-1">
                  ℹ️ Cálculo Automático de Tarifas
                </h4>
                <p className="text-sm text-blue-700 dark:text-blue-400">
                  Los montos se calcularán automáticamente usando la configuración de tarifas activa.
                  Incluye cargo fijo, consumo escalonado, descuentos y recargos según corresponda.
                </p>
              </div>
            </div>
          </div>

          {/* Resumen de Cálculo */}
          <Card className="!border-0 !bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 !shadow-lg !rounded-xl">
            <CardContent className="pt-6">
              <h3 className="font-bold mb-4 text-blue-900 dark:text-blue-100 text-lg">Resumen del Cálculo</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-gray-800 p-3 rounded-xl shadow-sm">
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Consumo</p>
                  <p className="font-bold text-gray-900 dark:text-gray-100">{Math.max(0, formData.lecturaActual - formData.lecturaAnterior)} m³</p>
                </div>
                <div className="bg-white dark:bg-gray-800 p-3 rounded-xl shadow-sm">
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Cargo Fijo</p>
                  <p className="font-bold text-gray-900 dark:text-gray-100">{formatCurrency(formData.cargoFijo)}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 p-3 rounded-xl shadow-sm">
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Cargo Variable</p>
                  <p className="font-bold text-gray-900 dark:text-gray-100">
                    {formatCurrency(Math.max(0, formData.lecturaActual - formData.lecturaAnterior) * formData.tarifaM3)}
                  </p>
                </div>
                <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-3 rounded-xl shadow-md">
                  <p className="text-xs text-blue-100 mb-1">Total</p>
                  <p className="font-bold text-xl text-white">{formatCurrency(calculateTotal())}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Botones */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg shadow-sm hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving || !selectedSocio}
              className="px-6 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center gap-2"
            >
              {isSaving && <RefreshCw className="w-4 h-4 animate-spin" />}
              {isSaving ? 'Creando...' : 'Crear Boleta'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}