import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DatePicker } from '@/components/ui/date-picker';
import {
  ArrowLeft,
  Search,
  Filter,
  Download,
  Eye,
  RefreshCw,
  TrendingUp,
  DollarSign,
  Calendar,
  AlertCircle,
  Menu,
  X,
  User,
  Receipt,
  CreditCard
} from 'lucide-react';
import type { Pago, Boleta } from '@/types';

interface PagosAdminViewProps {
  pagos: (Pago & { boleta?: Boleta | Boleta[] | null })[];
  onBack: () => void;
  onViewPago: (pagoId: string) => void;
  onRefreshPagos: () => void;
  onExportData: (dateRange?: { from: Date; to: Date }) => void;
}

export default function PagosAdminView({
  pagos,
  onBack,
  onViewPago,
  onRefreshPagos,
  onExportData
}: PagosAdminViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEstado, setFilterEstado] = useState<'all' | 'completado' | 'pendiente' | 'fallido'>('all');
  const [filterMetodo, setFilterMetodo] = useState<'all' | 'paypal' | 'webpay' | 'flow' | 'mercadopago' | 'transferencia' | 'efectivo'>('all');
  const [dateFrom, setDateFrom] = useState<Date>();
  const [dateTo, setDateTo] = useState<Date>();

  // Menú hamburguesa
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);

  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(amount);

  const formatDateTime = (dateString: string) => 
    new Date(dateString).toLocaleString('es-CL');

  // Helper para obtener la boleta (puede ser objeto, array o null)
  const getBoleta = (pago: Pago & { boleta?: Boleta | Boleta[] | null }): Boleta | null => {
    if (!pago.boleta) return null;
    if (Array.isArray(pago.boleta)) {
      return pago.boleta.length > 0 ? pago.boleta[0] : null;
    }
    return pago.boleta;
  };

  const getEstadoBadge = (estado: Pago['estadoPago']) => {
    switch (estado) {
      case 'completado':
        return <Badge className="bg-green-500">Completado</Badge>;
      case 'pendiente':
        return <Badge variant="secondary">Pendiente</Badge>;
      case 'fallido':
        return <Badge variant="destructive">Fallido</Badge>;
      case 'reembolsado':
        return <Badge className="bg-orange-500">Reembolsado</Badge>;
    }
  };

  const getMetodoBadge = (metodo: Pago['metodoPago']) => {
    const colors = {
      paypal: 'bg-blue-100 text-blue-800 border-blue-200',
      mercadopago: 'bg-blue-100 text-blue-800 border-blue-200',
      webpay: 'bg-gray-100 text-gray-600 border-gray-200',
      flow: 'bg-green-100 text-green-800 border-green-200',
      transferencia: 'bg-gray-100 text-gray-600 border-gray-200',
      efectivo: 'bg-gray-100 text-gray-600 border-gray-200'
    };

    const labels = {
      paypal: 'PayPal',
      mercadopago: 'MercadoPago',
      webpay: 'WebPay',
      flow: 'Flow',
      transferencia: 'Transferencia',
      efectivo: 'Efectivo'
    };

    return (
      <Badge
        variant="secondary"
        className={colors[metodo]}
      >
        {labels[metodo]}
      </Badge>
    );
  };

  const filteredPagos = pagos.filter(pago => {
    const boleta = getBoleta(pago);
    const matchesSearch = 
      boleta?.numeroBoleta?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      boleta?.socio?.nombres?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      boleta?.socio?.apellidos?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      boleta?.socio?.rut?.includes(searchTerm) ||
      pago.transactionId?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesEstado = filterEstado === 'all' || pago.estadoPago === filterEstado;
    const matchesMetodo = filterMetodo === 'all' || pago.metodoPago === filterMetodo;
    
    const pagoDate = new Date(pago.fechaPago);
    const matchesDateFrom = !dateFrom || pagoDate >= dateFrom;
    const matchesDateTo = !dateTo || pagoDate <= dateTo;
    
    return matchesSearch && matchesEstado && matchesMetodo && matchesDateFrom && matchesDateTo;
  });

  const stats = {
    total: filteredPagos.length,
    completados: filteredPagos.filter(p => p.estadoPago === 'completado').length,
    pendientes: filteredPagos.filter(p => p.estadoPago === 'pendiente').length,
    fallidos: filteredPagos.filter(p => p.estadoPago === 'fallido').length,
    montoTotal: filteredPagos
      .filter(p => p.estadoPago === 'completado')
      .reduce((sum, p) => sum + p.monto, 0)
  };

  const metodoStats = {
    paypal: filteredPagos.filter(p => p.metodoPago === 'paypal' && p.estadoPago === 'completado').reduce((sum, p) => sum + p.monto, 0),
    webpay: filteredPagos.filter(p => p.metodoPago === 'webpay' && p.estadoPago === 'completado').reduce((sum, p) => sum + p.monto, 0),
    flow: filteredPagos.filter(p => p.metodoPago === 'flow' && p.estadoPago === 'completado').reduce((sum, p) => sum + p.monto, 0),
    mercadopago: filteredPagos.filter(p => p.metodoPago === 'mercadopago' && p.estadoPago === 'completado').reduce((sum, p) => sum + p.monto, 0),
    transferencia: filteredPagos.filter(p => p.metodoPago === 'transferencia' && p.estadoPago === 'completado').reduce((sum, p) => sum + p.monto, 0),
    efectivo: filteredPagos.filter(p => p.metodoPago === 'efectivo' && p.estadoPago === 'completado').reduce((sum, p) => sum + p.monto, 0)
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Overlay del menú */}
      {menuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* Menú lateral desplegable desde la derecha */}
      <div className={`fixed right-0 top-0 bottom-0 w-80 bg-white dark:bg-gray-800 shadow-2xl z-50 transition-transform duration-300 ${
        menuOpen ? 'translate-x-0' : 'translate-x-full'
      }`}>
        <div className="flex flex-col h-full">
          {/* Header del menú */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">Opciones</h2>
            <button
              onClick={() => setMenuOpen(false)}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </button>
          </div>

          {/* Opciones del menú */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Buscador */}
            <button
              onClick={() => {
                setSearchModalOpen(true);
                setMenuOpen(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-all shadow-md"
            >
              <Search className="w-5 h-5" />
              <span className="font-medium">Buscar Pagos</span>
            </button>

            {/* Filtros por Estado */}
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                <Filter className="w-4 h-4 inline mr-1" />
                Filtrar por Estado
              </label>
              <div className="space-y-2">
                {[
                  { value: 'all', label: 'Todos' },
                  { value: 'completado', label: 'Completados' },
                  { value: 'pendiente', label: 'Pendientes' },
                  { value: 'fallido', label: 'Fallidos' }
                ].map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => {
                      setFilterEstado(value as any);
                      setMenuOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2.5 rounded-lg transition-all ${
                      filterEstado === value
                        ? 'bg-blue-500 text-white shadow-md'
                        : 'bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Filtros por Método de Pago */}
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                <CreditCard className="w-4 h-4 inline mr-1" />
                Filtrar por Método
              </label>
              <div className="space-y-2">
                {[
                  { value: 'all', label: '📋 Todos', active: true },
                  { value: 'paypal', label: '💰 PayPal', active: true },
                  { value: 'webpay', label: 'WebPay', active: false },
                  { value: 'flow', label: 'Flow', active: false },
                  { value: 'mercadopago', label: 'MercadoPago', active: false },
                  { value: 'transferencia', label: 'Transferencia', active: false },
                  { value: 'efectivo', label: 'Efectivo', active: false }
                ].map(({ value, label, active }) => (
                  <button
                    key={value}
                    onClick={() => {
                      if (active) {
                        setFilterMetodo(value as any);
                        setMenuOpen(false);
                      }
                    }}
                    disabled={!active}
                    className={`w-full text-left px-4 py-2.5 rounded-lg transition-all ${
                      filterMetodo === value
                        ? 'bg-blue-500 text-white shadow-md'
                        : active
                        ? 'bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed opacity-50'
                    }`}
                  >
                    {label} {!active && '(Inactivo)'}
                  </button>
                ))}
              </div>
            </div>

            {/* Acciones */}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => {
                  onRefreshPagos();
                  setMenuOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-all mb-2"
              >
                <RefreshCw className="w-5 h-5" />
                <span className="font-medium">Actualizar</span>
              </button>

              <button
                onClick={() => {
                  onExportData(dateFrom && dateTo ? { from: dateFrom, to: dateTo } : undefined);
                  setMenuOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-all"
              >
                <Download className="w-5 h-5" />
                <span className="font-medium">Exportar</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Búsqueda */}
      <Card className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity ${searchModalOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        {searchModalOpen && (
          <div className="absolute inset-0 bg-black/50" onClick={() => setSearchModalOpen(false)} />
        )}
        <div className={`relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-2xl w-full mx-4 transition-transform ${searchModalOpen ? 'scale-100' : 'scale-95'}`}>
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Search className="w-5 h-5 text-blue-500" />
                Buscar Pagos
              </h3>
              <button
                onClick={() => setSearchModalOpen(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              </button>
            </div>

            <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">
              Busque pagos por número de boleta, nombre del socio, RUT o ID de transacción
            </p>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Búsqueda</label>
                <Input
                  placeholder="Buscar por boleta, socio, RUT o transaction ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="!border-0 !bg-gray-50 dark:!bg-gray-700 !shadow-sm hover:!shadow-md transition-all !rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Fecha Desde</label>
                  <DatePicker
                    selected={dateFrom}
                    onSelect={setDateFrom}
                    placeholderText="Seleccionar fecha"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Fecha Hasta</label>
                  <DatePicker
                    selected={dateTo}
                    onSelect={setDateTo}
                    placeholderText="Seleccionar fecha"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setDateFrom(undefined);
                    setDateTo(undefined);
                  }}
                  className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg shadow-sm hover:shadow-md transition-all font-medium"
                >
                  Limpiar
                </button>
                <button
                  onClick={() => setSearchModalOpen(false)}
                  className="px-6 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg shadow-md hover:shadow-lg transition-all flex items-center gap-2 font-medium"
                >
                  <Search className="h-4 w-4" />
                  Buscar
                </button>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={onBack}
                className="mr-4"
              >
                <ArrowLeft size={16} />
              </Button>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-gray-900">Pagos Recibidos</h1>
                <p className="text-xs md:text-sm text-gray-600">
                  Gestionar y revisar todos los pagos procesados
                </p>
              </div>
            </div>

            {/* Botón hamburguesa - Solo en móvil */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="lg:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <Menu className="w-6 h-6 text-gray-600 dark:text-gray-300" />
            </button>

            {/* Botones de acciones - Solo en desktop */}
            <div className="hidden lg:flex items-center gap-2">
              <Button
                onClick={onRefreshPagos}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Actualizar
              </Button>
              <Button
                onClick={() => onExportData()}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Exportar
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Estadísticas Principales */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white dark:bg-gray-800 border-0 shadow-lg hover:shadow-xl transition-all">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Pagos</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">
                {stats.completados} completados
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-gray-800 border-0 shadow-lg hover:shadow-xl transition-all">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monto Total</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(stats.montoTotal)}
              </div>
              <p className="text-xs text-muted-foreground">
                Pagos completados
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-gray-800 border-0 shadow-lg hover:shadow-xl transition-all">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {stats.pendientes}
              </div>
              <p className="text-xs text-muted-foreground">
                En proceso
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-gray-800 border-0 shadow-lg hover:shadow-xl transition-all">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Fallidos</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {stats.fallidos}
              </div>
              <p className="text-xs text-muted-foreground">
                Requieren atención
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Estadísticas por Método de Pago */}
        <Card className="bg-white dark:bg-gray-800 border-0 shadow-lg mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Distribución por Método de Pago
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-6">
              {/* Flow - Verde */}
              <div className="text-center bg-green-50 dark:bg-green-900/20 p-6 rounded-xl shadow-md">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <p className="text-lg font-semibold text-green-800 dark:text-green-300">Flow</p>
                  <Badge className="bg-green-500 text-xs">ACTIVO</Badge>
                </div>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                  {formatCurrency(metodoStats.flow)}
                </p>
                <p className="text-sm text-green-700 dark:text-green-500 mt-2">✅ Funcionando</p>
              </div>

              {/* MercadoPago - Azul */}
              <div className="text-center bg-blue-50 dark:bg-blue-900/20 p-6 rounded-xl shadow-md">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <p className="text-lg font-semibold text-blue-800 dark:text-blue-300">💳 MercadoPago</p>
                  <Badge className="bg-green-500 text-xs">ACTIVO</Badge>
                </div>
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                  {formatCurrency(metodoStats.mercadopago)}
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-500 mt-2">✅ Funcionando</p>
              </div>
            </div>

            {/* Resumen de MercadoPago */}
            {metodoStats.mercadopago > 0 && (
              <div className="mt-6 bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20 p-4 rounded-xl shadow-md">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-blue-800">💳 Resumen MercadoPago</h3>
                    <p className="text-sm text-blue-700">Pagos procesados correctamente</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-blue-600">
                      {formatCurrency(metodoStats.mercadopago)}
                    </p>
                    <p className="text-sm text-blue-600">
                      {filteredPagos.filter(p => p.metodoPago === 'mercadopago' && p.estadoPago === 'completado').length} transacciones
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Filtros - Visibles solo en desktop */}
        <Card className="bg-white dark:bg-gray-800 border-0 shadow-lg mb-6 hidden lg:block">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <Input
                  placeholder="Buscar pagos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={filterEstado} onValueChange={(value: any) => setFilterEstado(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="completado">Completados</SelectItem>
                  <SelectItem value="pendiente">Pendientes</SelectItem>
                  <SelectItem value="fallido">Fallidos</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterMetodo} onValueChange={(value: any) => setFilterMetodo(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Método de Pago" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">📋 Todos los métodos</SelectItem>
                  <SelectItem value="paypal">💰 PayPal (Activo)</SelectItem>
                  <SelectItem value="mercadopago">💳 MercadoPago (Activo)</SelectItem>
                  <SelectItem value="webpay" disabled>WebPay (Inactivo)</SelectItem>
                  <SelectItem value="flow" disabled>Flow (Inactivo)</SelectItem>
                  <SelectItem value="transferencia" disabled>Transferencia (Inactivo)</SelectItem>
                  <SelectItem value="efectivo" disabled>Efectivo (Inactivo)</SelectItem>
                </SelectContent>
              </Select>

              <DatePicker
                selected={dateFrom}
                onSelect={setDateFrom}
                placeholderText="Fecha desde"
              />

              <DatePicker
                selected={dateTo}
                onSelect={setDateTo}
                placeholderText="Fecha hasta"
              />

              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm('');
                  setFilterEstado('all');
                  setFilterMetodo('all');
                  setDateFrom(undefined);
                  setDateTo(undefined);
                }}
              >
                <Filter size={16} className="mr-1" />
                Limpiar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tabla de Pagos */}
        <Card className="bg-white dark:bg-gray-800 border-0 shadow-lg">
          <CardHeader>
            <CardTitle>Pagos ({stats.total})</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredPagos.length === 0 ? (
              <div className="text-center py-8">
                <DollarSign size={48} className="mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-600 mb-2">
                  No se encontraron pagos
                </h3>
                <p className="text-gray-500">
                  {searchTerm || filterEstado !== 'all' || filterMetodo !== 'all' || dateFrom || dateTo
                    ? 'Prueba ajustando los filtros de búsqueda'
                    : 'No hay pagos registrados en el sistema'
                  }
                </p>
              </div>
            ) : (
              <>
                {/* Vista de Tarjetas para Móvil */}
                <div className="lg:hidden space-y-4">
                  {filteredPagos.map((pago) => {
                    const boleta = getBoleta(pago);
                    return (
                    <Card key={pago.id} className="!border-0 !shadow-md hover:!shadow-lg transition-all !bg-gray-50 dark:!bg-gray-700">
                      <CardContent className="p-4">
                        {/* Header de la tarjeta */}
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <Receipt className="w-4 h-4 text-blue-500" />
                              <span className="font-semibold text-gray-900 dark:text-gray-100">
                                {boleta?.numeroBoleta ? (
                                  `#${boleta.numeroBoleta}`
                                ) : (
                                  <span className="text-gray-400 italic text-sm">Sin boleta asignada</span>
                                )}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                              <Calendar className="w-3 h-3" />
                              {formatDateTime(pago.fechaPago)}
                            </div>
                          </div>
                          {getEstadoBadge(pago.estadoPago)}
                        </div>

                        {/* Información del Socio */}
                        <div className="mb-3 p-3 bg-white dark:bg-gray-800 rounded-lg">
                          <div className="flex items-center gap-2 mb-1">
                            <User className="w-4 h-4 text-gray-500" />
                            <span className="font-medium text-gray-900 dark:text-gray-100">
                              {boleta?.socio?.nombres || 'N/A'}
                            </span>
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400 ml-6">
                            Código: {boleta?.socio?.codigoSocio || 'N/A'}
                          </div>
                        </div>

                        {/* Monto y Método */}
                        <div className="grid grid-cols-2 gap-3 mb-3">
                          <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                            <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Monto</div>
                            <div className="font-semibold text-green-700 dark:text-green-400">
                              {formatCurrency(pago.monto)}
                            </div>
                          </div>
                          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                            <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Método</div>
                            <div className="text-xs">
                              {getMetodoBadge(pago.metodoPago)}
                            </div>
                          </div>
                        </div>

                        {/* Transaction ID */}
                        <div className="mb-3 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                          <div className="flex items-center gap-2">
                            <CreditCard className="w-4 h-4 text-gray-500" />
                            <div className="flex-1">
                              <div className="text-xs text-gray-600 dark:text-gray-400">Transaction ID</div>
                              <code className="text-xs font-mono text-gray-900 dark:text-gray-100 break-all">
                                {pago.transactionId || 'N/A'}
                              </code>
                            </div>
                          </div>
                        </div>

                        {/* Acciones */}
                        <div className="pt-3 border-t border-gray-200 dark:border-gray-600">
                          <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => onViewPago(pago.id)}
                          >
                            <Eye size={14} className="mr-2" />
                            Ver Detalles
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                  })}
                </div>

                {/* Vista de Tabla para Desktop */}
                <div className="hidden lg:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fecha/Hora</TableHead>
                        <TableHead>Boleta</TableHead>
                        <TableHead>Socio</TableHead>
                        <TableHead>Monto</TableHead>
                        <TableHead>Método</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Transaction ID</TableHead>
                        <TableHead>Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPagos.map((pago) => {
                        const boleta = getBoleta(pago);
                        return (
                        <TableRow key={pago.id}>
                          <TableCell>
                            {formatDateTime(pago.fechaPago)}
                          </TableCell>
                          <TableCell className="font-medium">
                            {boleta?.numeroBoleta ? (
                              `#${boleta.numeroBoleta}`
                            ) : (
                              <span className="text-gray-400 italic text-xs">Sin boleta</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{boleta?.socio?.nombres || 'N/A'}</p>
                              <p className="text-sm text-gray-500">{boleta?.socio?.codigoSocio || 'N/A'}</p>
                            </div>
                          </TableCell>
                          <TableCell className="font-semibold">
                            {formatCurrency(pago.monto)}
                          </TableCell>
                          <TableCell>
                            {getMetodoBadge(pago.metodoPago)}
                          </TableCell>
                          <TableCell>
                            {getEstadoBadge(pago.estadoPago)}
                          </TableCell>
                          <TableCell>
                            <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                              {pago.transactionId || 'N/A'}
                            </code>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onViewPago(pago.id)}
                            >
                              <Eye size={14} />
                            </Button>
                          </TableCell>
                        </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}