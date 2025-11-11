import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  ArrowLeft,
  Search,
  Filter,
  Edit,
  Eye,
  Download,
  CheckCircle,
  AlertCircle,
  Trash2,
} from 'lucide-react';
import type { Boleta } from '@/types';

interface BoletasAdminViewProps {
  boletas: Boleta[];
  isLoading?: boolean;
  error?: any;
  onBack: () => void;
  onEditBoleta: (boletaId: string) => void;
  onViewBoleta: (boletaId: string) => void;
  onMarkAsPaid: (boletaId: string) => void;
  onDownloadPDF: (boletaId: string) => void;
  onExportData: () => void;
  onRefresh?: () => void;
  onDeleteBoleta?: (boletaId: string) => void;
}

export default function BoletasAdminView({
  boletas,
  isLoading,
  error,
  onBack,
  onEditBoleta,
  onViewBoleta,
  onMarkAsPaid,
  onDownloadPDF,
  onExportData,
  onRefresh,
  onDeleteBoleta
}: BoletasAdminViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEstado, setFilterEstado] = useState<'all' | 'pendiente' | 'pagada' | 'vencida'>('all');
  const [filterPeriodo, setFilterPeriodo] = useState<string>('all');

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
    const matchesSearch = 
      boleta.numeroBoleta.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${boleta.socio.nombres} ${boleta.socio.apellidos}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      boleta.socio.rut.includes(searchTerm) ||
      boleta.socio.codigoSocio.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesEstado = filterEstado === 'all' || boleta.estado === filterEstado;
    const matchesPeriodo = filterPeriodo === 'all' || boleta.periodo === filterPeriodo;
    
    return matchesSearch && matchesEstado && matchesPeriodo;
  });

  const periodos = [...new Set(boletas.map(b => b.periodo))].sort().reverse();

  const stats = {
    total: filteredBoletas.length,
    pendientes: filteredBoletas.filter(b => b.estado === 'pendiente').length,
    pagadas: filteredBoletas.filter(b => b.estado === 'pagada').length,
    vencidas: filteredBoletas.filter(b => b.estado === 'vencida').length,
    montoTotal: filteredBoletas.reduce((sum, b) => sum + b.montoTotal, 0)
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
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
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center py-4">
              <Button variant="ghost" size="sm" onClick={onBack} className="mr-4">
                <ArrowLeft size={16} />
              </Button>
              <h1 className="text-2xl font-bold text-gray-900">Gestión de Boletas</h1>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card>
            <CardContent className="pt-8 pb-8 text-center">
              <div className="text-red-500 mb-4">
                <AlertCircle size={48} className="mx-auto" />
              </div>
              <h3 className="text-lg font-semibold text-gray-600 mb-2">
                Error al cargar las boletas
              </h3>
              <p className="text-gray-500 mb-4">
                {error?.message || 'Ocurrió un error al obtener las boletas'}
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

  return (
    <div className="min-h-screen bg-gray-50">
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
                <h1 className="text-2xl font-bold text-gray-900">Gestión de Boletas</h1>
                <p className="text-sm text-gray-600">
                  Administrar todas las boletas del sistema
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={onExportData}
              >
                <Download size={16} className="mr-1" />
                Exportar
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <Card>
            <CardContent className="pt-4">
              <div className="text-center">
                <p className="text-sm text-gray-600">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-center">
                <p className="text-sm text-gray-600">Pendientes</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pendientes}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-center">
                <p className="text-sm text-gray-600">Pagadas</p>
                <p className="text-2xl font-bold text-green-600">{stats.pagadas}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-center">
                <p className="text-sm text-gray-600">Vencidas</p>
                <p className="text-2xl font-bold text-red-600">{stats.vencidas}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-center">
                <p className="text-sm text-gray-600">Monto Total</p>
                <p className="text-lg font-bold text-blue-600">
                  {formatCurrency(stats.montoTotal)}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <Input
                  placeholder="Buscar por boleta, socio, RUT..."
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
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="pendiente">Pendientes</SelectItem>
                  <SelectItem value="pagada">Pagadas</SelectItem>
                  <SelectItem value="vencida">Vencidas</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterPeriodo} onValueChange={setFilterPeriodo}>
                <SelectTrigger>
                  <SelectValue placeholder="Período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los períodos</SelectItem>
                  {periodos.map(periodo => (
                    <SelectItem key={periodo} value={periodo}>{periodo}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm('');
                  setFilterEstado('all');
                  setFilterPeriodo('all');
                }}
              >
                <Filter size={16} className="mr-1" />
                Limpiar Filtros
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tabla de Boletas */}
        <Card>
          <CardHeader>
            <CardTitle>Boletas ({stats.total})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>N° Boleta</TableHead>
                    <TableHead>Socio</TableHead>
                    <TableHead>Período</TableHead>
                    <TableHead>Consumo</TableHead>
                    <TableHead>Monto</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Vencimiento</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBoletas.map((boleta) => (
                    <TableRow key={boleta.id}>
                      <TableCell className="font-medium">
                        {boleta.numeroBoleta}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{boleta.socio.nombres} {boleta.socio.apellidos}</p>
                          <p className="text-sm text-gray-500">
                            {boleta.socio.codigoSocio} - {boleta.socio.rut}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{boleta.periodo}</TableCell>
                      <TableCell>{boleta.consumoM3} m³</TableCell>
                      <TableCell className="font-semibold">
                        {formatCurrency(boleta.montoTotal)}
                      </TableCell>
                      <TableCell>
                        {getEstadoBadge(boleta.estado)}
                      </TableCell>
                      <TableCell>
                        <span className={
                          new Date(boleta.fechaVencimiento) < new Date() && boleta.estado !== 'pagada'
                            ? 'text-red-600 font-medium'
                            : ''
                        }>
                          {formatDate(boleta.fechaVencimiento)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onViewBoleta(boleta.id)}
                          >
                            <Eye size={14} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onEditBoleta(boleta.id)}
                          >
                            <Edit size={14} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onDownloadPDF(boleta.id)}
                          >
                            <Download size={14} />
                          </Button>
                          {boleta.estado !== 'pagada' && (
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-green-600"
                                >
                                  <CheckCircle size={14} />
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Marcar como Pagada</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <p>
                                    ¿Estás seguro de que quieres marcar la boleta #{boleta.numeroBoleta} 
                                    como pagada? Esta acción registrará un pago manual.
                                  </p>
                                  <div className="flex justify-end gap-2">
                                    <Button variant="outline">Cancelar</Button>
                                    <Button 
                                      className="bg-green-600 hover:bg-green-700"
                                      onClick={() => onMarkAsPaid(boleta.id)}
                                    >
                                      Confirmar Pago
                                    </Button>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                          )}
                          {onDeleteBoleta && (
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-600"
                                >
                                  <Trash2 size={14} />
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Eliminar Boleta</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <p>
                                    ¿Estás seguro de que quieres eliminar la boleta #{boleta.numeroBoleta}? 
                                    Esta acción no se puede deshacer.
                                  </p>
                                  <div className="flex justify-end gap-2">
                                    <Button variant="outline">Cancelar</Button>
                                    <Button 
                                      variant="destructive"
                                      onClick={() => onDeleteBoleta(boleta.id)}
                                    >
                                      Eliminar
                                    </Button>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {filteredBoletas.length === 0 && (
              <div className="text-center py-8">
                <AlertCircle size={48} className="mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-600 mb-2">
                  No se encontraron boletas
                </h3>
                <p className="text-gray-500">
                  {searchTerm || filterEstado !== 'all' || filterPeriodo !== 'all'
                    ? 'Prueba ajustando los filtros de búsqueda'
                    : 'No hay boletas registradas en el sistema'
                  }
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}