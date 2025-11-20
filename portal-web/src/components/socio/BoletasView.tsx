import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  ArrowLeft, 
  Download, 
  CreditCard, 
  Search,
  Receipt,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import PaymentInterface from './PaymentInterface';
import BoletaDetalleModal from './BoletaDetalleModal';
import { useSocket } from '@/hooks/useSocket';
import type { Boleta } from '@/types';
import { apiClient } from '@/services/api';
import { toast } from 'sonner';

interface BoletasViewProps {
  boletas: Boleta[];
  isLoading?: boolean;
  error?: any;
  onBack: () => void;
  onPagar: (boletaIds: string[]) => void;
  onDownloadPDF: (boletaId: string) => void;
  onViewDetalle: (boletaId: string) => void;
  onRefresh?: () => void;
}

export default function BoletasView({ 
  boletas, 
  isLoading,
  error,
  onBack, 
  onPagar, 
  onDownloadPDF, 
  onViewDetalle,
  onRefresh
}: BoletasViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEstado, setFilterEstado] = useState<'all' | 'pendiente' | 'pagada' | 'vencida'>('all');
  const [selectedBoletas, setSelectedBoletas] = useState<string[]>([]);
  const [showPaymentInterface, setShowPaymentInterface] = useState(false);
  const [selectedBoletaForModal, setSelectedBoletaForModal] = useState<Boleta | null>(null);
  const [showBoletaModal, setShowBoletaModal] = useState(false);
  
  // Get token for socket connection
  const token = localStorage.getItem('token');
  const { socket } = useSocket(token || undefined);

  // Function to handle opening the modal with boleta details
  const handleViewBoletaDetail = (boletaId: string) => {
    const boleta = boletas.find(b => b.id === boletaId);
    if (boleta) {
      setSelectedBoletaForModal(boleta);
      setShowBoletaModal(true);
    }
  };

  // Function to close the modal
  const handleCloseModal = () => {
    setShowBoletaModal(false);
    setSelectedBoletaForModal(null);
  };

  // Listen for new boleta notifications and refresh
  useEffect(() => {
    if (socket) {
      const handleNewNotification = (notification: any) => {
        console.log('📧 New notification received:', notification);
        // If it's a boleta notification, refresh the list
        if (notification.referencia?.tipo === 'boleta' && onRefresh) {
          console.log('🔄 Refreshing boletas due to new boleta notification');
          onRefresh();
        }
      };

      socket.on('new_notification', handleNewNotification);

      return () => {
        socket.off('new_notification', handleNewNotification);
      };
    }
  }, [socket, onRefresh]);

  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(amount);

  const formatDate = (dateString: string) => 
    new Date(dateString).toLocaleDateString('es-CL');

  const getEstadoBadge = (estado: Boleta['estado']) => {
    switch (estado) {
      case 'pagada':
        return <Badge className="bg-green-500 dark:bg-green-600 text-white">Pagada</Badge>;
      case 'vencida':
        return <Badge variant="destructive" className="bg-red-500 dark:bg-red-600 text-white">Vencida</Badge>;
      case 'pendiente':
        return <Badge variant="secondary" className="bg-yellow-500 dark:bg-yellow-600 text-white">Pendiente</Badge>;
    }
  };

  const filteredBoletas = boletas.filter(boleta => {
    const matchesSearch = boleta.numeroBoleta.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         boleta.periodo.includes(searchTerm);
    const matchesFilter = filterEstado === 'all' || boleta.estado === filterEstado;
    return matchesSearch && matchesFilter;
  });

  const totalDeuda = filteredBoletas
    .filter(b => b.estado === 'pendiente' || b.estado === 'vencida')
    .reduce((sum, b) => sum + b.montoTotal, 0);

  const handleBoletaSelect = (boletaId: string, checked: boolean) => {
    if (checked) {
      setSelectedBoletas(prev => [...prev, boletaId]);
    } else {
      setSelectedBoletas(prev => prev.filter(id => id !== boletaId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const payableBoletas = filteredBoletas.filter(b => b.estado === 'pendiente' || b.estado === 'vencida');
      setSelectedBoletas(payableBoletas.map(b => b.id));
    } else {
      setSelectedBoletas([]);
    }
  };

  const handlePaySelected = () => {
    console.log('🔵 handlePaySelected llamado');
    console.log('🔵 selectedBoletas:', selectedBoletas);
    const selectedBoletasData = boletas.filter(b => selectedBoletas.includes(b.id));
    console.log('🔵 selectedBoletasData:', selectedBoletasData);
    console.log('🔵 Cambiando showPaymentInterface a true');
    setShowPaymentInterface(true);
  };

  const handlePaymentMethodSelect = async (method: string, selectedBoletasData: any[]) => {
    console.log('🔍 DEBUG: Método de pago seleccionado:', method);
    console.log('🔍 DEBUG: Tipo de método:', typeof method);
    console.log('🔍 DEBUG: Comparación flow:', method === 'flow', method, 'flow');
    console.log('🔍 DEBUG: Comparación mercadopago:', method === 'mercadopago', method, 'mercadopago');
    console.log('🔍 DEBUG: Boletas a pagar:', selectedBoletasData);
    
    try {
      const boletaIds = selectedBoletasData.map(b => b._id || b.id);
      console.log('🔍 DEBUG: IDs de boletas:', boletaIds);
      
      if (method === 'flow') {
        console.log('✅ Procesando pago con FLOW');
        toast.info('Redirigiendo a Flow...');
        const response = await apiClient.post('/flow/create-payment', {
          boletaIds: boletaIds,
        });
        console.log('🔍 DEBUG: Respuesta Flow:', response.data);

        if (response.data.success && response.data.data.paymentUrl) {
          console.log('✅ Redirigiendo a URL de Flow:', response.data.data.paymentUrl);
          window.location.href = response.data.data.paymentUrl;
        } else {
          toast.error('Error al crear el pago de Flow');
          setShowPaymentInterface(false);
          setSelectedBoletas([]);
        }
        return;
      }

      if (method === 'mercadopago') {
        console.log('✅ Procesando pago con MERCADOPAGO');
        toast.info('Redirigiendo a MercadoPago...');
        const response = await apiClient.post('/mercadopago/create-preference', {
          boletaIds: boletaIds,
        });
        console.log('🔍 DEBUG: Respuesta MercadoPago:', response.data);

        if (response.data.success && response.data.data.init_point) {
          console.log('✅ Redirigiendo a URL de MercadoPago:', response.data.data.init_point);
          window.location.href = response.data.data.init_point;
        } else {
          toast.error('Error al crear el pago de MercadoPago');
          setShowPaymentInterface(false);
          setSelectedBoletas([]);
        }
        return;
      }

      console.log('❌ Método no reconocido:', method);
      toast.error('Método de pago no disponible aún');
      setShowPaymentInterface(false);
      setSelectedBoletas([]);
      
    } catch (error: any) {
      console.error('❌ Error al procesar pago:', error);
      toast.error('Error al procesar el pago', {
        description: error.response?.data?.message || 'Intenta nuevamente'
      });
      setShowPaymentInterface(false);
      setSelectedBoletas([]);
    }
  };

  const payableBoletas = filteredBoletas.filter(b => b.estado === 'pendiente' || b.estado === 'vencida');
  const selectedPayableAmount = boletas
    .filter(b => selectedBoletas.includes(b.id))
    .reduce((sum, b) => sum + b.montoTotal, 0);

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando boletas...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card className="bg-white dark:bg-gray-800 border-0 shadow-lg">
            <CardContent className="pt-8 pb-8 text-center">
              <div className="text-red-500 mb-4">
                <Receipt size={48} className="mx-auto" />
              </div>
              <h3 className="text-lg font-semibold text-gray-600 mb-2">
                Error al cargar las boletas
              </h3>
              <p className="text-gray-500 mb-4">
                {error?.message || 'Ocurrió un error al obtener tus boletas'}
              </p>
              {onRefresh && (
                <Button onClick={onRefresh} variant="outline">
                  Intentar nuevamente
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (showPaymentInterface) {
    console.log('🎨 Mostrando PaymentInterface');
    console.log('🎨 showPaymentInterface:', showPaymentInterface);
    console.log('🎨 selectedBoletas:', selectedBoletas);
    const selectedBoletasData = boletas.filter(b => selectedBoletas.includes(b.id));
    console.log('🎨 selectedBoletasData filtrado:', selectedBoletasData);
    return (
      <PaymentInterface
        selectedBoletas={selectedBoletasData}
        onBack={() => setShowPaymentInterface(false)}
        onPaymentMethodSelect={handlePaymentMethodSelect}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {/* Resumen */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white dark:bg-gray-800 border-0 shadow-lg hover:shadow-xl transition-all">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">
                Total Boletas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{filteredBoletas.length}</div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-gray-800 border-0 shadow-lg hover:shadow-xl transition-all">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">
                Pendientes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                {filteredBoletas.filter(b => b.estado === 'pendiente').length}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-gray-800 border-0 shadow-lg hover:shadow-xl transition-all">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">
                Vencidas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                {filteredBoletas.filter(b => b.estado === 'vencida').length}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-gray-800 border-0 shadow-lg hover:shadow-xl transition-all">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">
                Deuda Total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                {formatCurrency(totalDeuda)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros y Búsqueda */}
        <Card className="bg-white dark:bg-gray-800 border-0 shadow-lg mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" size={16} />
                <Input
                  placeholder="Buscar por número de boleta o período..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-white dark:bg-gray-900 text-gray-900 dark:text-white border-gray-300 dark:border-gray-700 placeholder:text-gray-500 dark:placeholder:text-gray-400"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setFilterEstado('all')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    filterEstado === 'all'
                      ? 'bg-blue-500 text-white shadow-md'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  Todas
                </button>
                <button
                  onClick={() => setFilterEstado('pendiente')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    filterEstado === 'pendiente'
                      ? 'bg-yellow-500 text-white shadow-md'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  Pendientes
                </button>
                <button
                  onClick={() => setFilterEstado('pagada')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    filterEstado === 'pagada'
                      ? 'bg-green-500 text-white shadow-md'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  Pagadas
                </button>
                <button
                  onClick={() => setFilterEstado('vencida')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    filterEstado === 'vencida'
                      ? 'bg-red-500 text-white shadow-md'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  Vencidas
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Selección y Pago Masivo */}
        {payableBoletas.length > 0 && (
          <Card className="bg-white dark:bg-gray-800 border-0 shadow-lg mb-6 ring-2 ring-blue-200 dark:ring-blue-700">
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="select-all"
                    checked={selectedBoletas.length === payableBoletas.length && payableBoletas.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                  <label htmlFor="select-all" className="text-sm font-medium text-blue-600 dark:text-blue-400">
                    Seleccionar todas las boletas pendientes ({payableBoletas.length})
                  </label>
                </div>
                
                {selectedBoletas.length > 0 && (
                  <div className="flex items-center gap-4 ml-auto">
                    <div className="text-sm text-blue-700 dark:text-blue-300">
                      <span className="font-medium">{selectedBoletas.length} boletas seleccionadas</span>
                      <span className="ml-2">Total: {formatCurrency(selectedPayableAmount)}</span>
                    </div>
                    <Button
                      onClick={handlePaySelected}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <CreditCard className="h-4 w-4 mr-2" />
                      Pagar Seleccionadas
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Lista de Boletas */}
        <div className="space-y-4">
          {filteredBoletas.map((boleta) => (
            <Card key={boleta.id} className="bg-white dark:bg-gray-800 border-0 shadow-lg hover:shadow-xl transition-all">
              <CardContent className="pt-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    {/* Checkbox para selección */}
                    {(boleta.estado === 'pendiente' || boleta.estado === 'vencida') && (
                      <Checkbox
                        id={boleta.id}
                        checked={selectedBoletas.includes(boleta.id)}
                        onCheckedChange={(checked) => handleBoletaSelect(boleta.id, checked as boolean)}
                      />
                    )}
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Receipt size={20} className="text-blue-600" />
                        <h3 className="font-semibold text-lg">
                          Boleta #{boleta.numeroBoleta}
                        </h3>
                        {getEstadoBadge(boleta.estado)}
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">Período</p>
                          <p className="font-medium">{boleta.periodo}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Fecha Emisión</p>
                          <p className="font-medium">{formatDate(boleta.fechaEmision)}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Consumo</p>
                          <p className="font-medium">{boleta.consumoM3} m³</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Vencimiento</p>
                          <p className="font-medium">{formatDate(boleta.fechaVencimiento)}</p>
                        </div>
                      </div>

                      <div className="mt-3">
                        <p className="text-2xl font-bold text-blue-600">
                          {formatCurrency(boleta.montoTotal)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      onClick={() => handleViewBoletaDetail(boleta.id)}
                      className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-all text-sm font-medium"
                    >
                      Ver Detalle
                    </button>

                    <button
                      onClick={() => onDownloadPDF(boleta.id)}
                      className="px-4 py-2 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-all text-sm font-medium flex items-center justify-center gap-1"
                    >
                      <Download size={16} />
                      PDF
                    </button>

                    {(boleta.estado === 'pendiente' || boleta.estado === 'vencida') && (
                      <button
                        onClick={() => onPagar([boleta.id])}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all text-sm font-medium flex items-center justify-center gap-1"
                      >
                        <CreditCard size={16} />
                        Pagar
                      </button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredBoletas.length === 0 && (
          <Card className="bg-white dark:bg-gray-800 border-0 shadow-lg">
            <CardContent className="pt-8 pb-8 text-center">
              <Receipt size={48} className="mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">
                No se encontraron boletas
              </h3>
              <p className="text-gray-500">
                {searchTerm || filterEstado !== 'all' 
                  ? 'Prueba ajustando los filtros de búsqueda'
                  : 'No tienes boletas registradas en el sistema'
                }
              </p>
            </CardContent>
          </Card>
        )}

        {/* Acción flotante para pagar deuda total */}
        {totalDeuda > 0 && (
          <div className="fixed bottom-6 right-6">
            <Button
              size="lg"
              className="shadow-lg bg-green-600 hover:bg-green-700"
              onClick={() => onPagar(filteredBoletas.filter(b => b.estado === 'pendiente' || b.estado === 'vencida').map(b => b.id))}
            >
              <CreditCard size={20} className="mr-2" />
              Pagar Todo ({formatCurrency(totalDeuda)})
            </Button>
          </div>
        )}

        {/* Modal para ver detalles de boleta */}
        <BoletaDetalleModal
          boleta={selectedBoletaForModal}
          isOpen={showBoletaModal}
          onClose={handleCloseModal}
          onPagar={onPagar}
          onDownloadPDF={onDownloadPDF}
        />
      </div>
    </div>
  );
}