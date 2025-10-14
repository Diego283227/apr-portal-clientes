import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ArrowLeft, 
  Download, 
  CreditCard, 
  Search,
  Receipt,
  AlertCircle,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { useBoletas } from '@/hooks/useBoletas';
import { usePayments } from '@/hooks/usePayments';
import type { Boleta } from '@/types';

interface BoletasViewEnabledProps {
  onBack: () => void;
  onProceedToPay: (boletaIds: string[]) => void;
  onViewDetalle: (boletaId: string) => void;
}

export default function BoletasViewEnabled({ 
  onBack, 
  onProceedToPay,
  onViewDetalle 
}: BoletasViewEnabledProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEstado, setFilterEstado] = useState<'all' | 'pendiente' | 'pagada' | 'vencida'>('all');
  const [showSuccess, setShowSuccess] = useState(false);

  const {
    boletas,
    isLoading,
    error,
    pendingBoletas,
    totalDeuda,
    selectedBoletas,
    selectedBoletasData,
    selectedTotal,
    toggleBoleta,
    selectAllPending,
    clearSelection
  } = useBoletas();

  const { isProcessing } = usePayments();

  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(amount);

  const formatDate = (dateString: string) => 
    new Date(dateString).toLocaleDateString('es-CL');

  const getEstadoBadge = (estado: Boleta['estado']) => {
    switch (estado) {
      case 'pagada':
        return <Badge className="bg-green-500">Pagada</Badge>;
      case 'vencida':
        return <Badge variant="destructive">Vencida</Badge>;
      case 'pendiente':
        return <Badge variant="secondary">Pendiente</Badge>;
    }
  };

  const filteredBoletas = boletas.filter(boleta => {
    const matchesSearch = boleta.numeroBoleta.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         boleta.periodo.includes(searchTerm);
    const matchesFilter = filterEstado === 'all' || boleta.estado === filterEstado;
    return matchesSearch && matchesFilter;
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      selectAllPending();
    } else {
      clearSelection();
    }
  };

  const handleProceedToPay = () => {
    if (selectedBoletas.length > 0) {
      onProceedToPay(selectedBoletas);
    }
  };

  const handleDownloadPDF = (boletaId: string) => {
    // Implementar descarga de PDF
    console.log('Download PDF for boleta:', boletaId);
    // En una implementación real, esto haría una llamada a la API para generar/descargar el PDF
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center py-4">
              <Button variant="ghost" size="sm" onClick={onBack} className="mr-4">
                <ArrowLeft size={16} />
              </Button>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-gray-900">Mis Boletas</h1>
                <p className="text-sm text-gray-600">Cargando boletas...</p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="pt-6">
                  <Skeleton className="h-4 w-20 mb-2" />
                  <Skeleton className="h-8 w-16" />
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="pt-6">
                  <Skeleton className="h-6 w-40 mb-4" />
                  <div className="grid grid-cols-4 gap-4">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center py-4">
              <Button variant="ghost" size="sm" onClick={onBack} className="mr-4">
                <ArrowLeft size={16} />
              </Button>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-gray-900">Mis Boletas</h1>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Error al cargar las boletas. Mostrando datos de demostración.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="mr-4"
            >
              <ArrowLeft size={16} />
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">Mis Boletas</h1>
              <p className="text-sm text-gray-600">
                Gestiona y paga tus boletas de agua
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Success message */}
        {showSuccess && (
          <Alert className="mb-6 border-green-200 bg-green-50">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Las boletas seleccionadas han sido enviadas para pago.
            </AlertDescription>
          </Alert>
        )}

        {/* Resumen */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Boletas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{filteredBoletas.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Pendientes/Vencidas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {pendingBoletas.length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Seleccionadas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {selectedBoletas.length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total a Pagar
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(selectedTotal)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros y Búsqueda */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4 mb-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <Input
                  placeholder="Buscar por número de boleta o período..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant={filterEstado === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterEstado('all')}
                >
                  Todas
                </Button>
                <Button
                  variant={filterEstado === 'pendiente' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterEstado('pendiente')}
                >
                  Pendientes
                </Button>
                <Button
                  variant={filterEstado === 'vencida' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterEstado('vencida')}
                >
                  Vencidas
                </Button>
                <Button
                  variant={filterEstado === 'pagada' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterEstado('pagada')}
                >
                  Pagadas
                </Button>
              </div>
            </div>

            {/* Selection controls */}
            {pendingBoletas.length > 0 && (
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="select-all"
                    checked={selectedBoletas.length === pendingBoletas.length && pendingBoletas.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                  <label htmlFor="select-all" className="text-sm cursor-pointer">
                    Seleccionar todas las pendientes ({pendingBoletas.length})
                  </label>
                </div>

                {selectedBoletas.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearSelection}
                    >
                      Limpiar selección
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleProceedToPay}
                      className="bg-green-600 hover:bg-green-700"
                      disabled={isProcessing}
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 size={16} className="mr-2 animate-spin" />
                          Procesando...
                        </>
                      ) : (
                        <>
                          <CreditCard size={16} className="mr-2" />
                          Pagar Seleccionadas ({formatCurrency(selectedTotal)})
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Lista de Boletas */}
        <div className="space-y-4">
          {filteredBoletas.map((boleta) => (
            <Card key={boleta.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    {(boleta.estado === 'pendiente' || boleta.estado === 'vencida') && (
                      <Checkbox
                        id={`boleta-${boleta.id}`}
                        checked={selectedBoletas.includes(boleta.id)}
                        onCheckedChange={() => toggleBoleta(boleta.id)}
                        className="mt-2"
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
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onViewDetalle(boleta.id)}
                    >
                      Ver Detalle
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadPDF(boleta.id)}
                    >
                      <Download size={16} className="mr-1" />
                      PDF
                    </Button>

                    {(boleta.estado === 'pendiente' || boleta.estado === 'vencida') && (
                      <Button
                        size="sm"
                        onClick={() => onProceedToPay([boleta.id])}
                        className="bg-green-600 hover:bg-green-700"
                        disabled={isProcessing}
                      >
                        <CreditCard size={16} className="mr-1" />
                        Pagar
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredBoletas.length === 0 && (
          <Card>
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

        {/* Floating action button for paying all debt */}
        {totalDeuda > 0 && !isProcessing && (
          <div className="fixed bottom-6 right-6">
            <Button
              size="lg"
              className="shadow-lg bg-green-600 hover:bg-green-700"
              onClick={() => onProceedToPay(pendingBoletas.map(b => b.id))}
            >
              <CreditCard size={20} className="mr-2" />
              Pagar Todo ({formatCurrency(totalDeuda)})
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}