import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Settings, Shield } from 'lucide-react';

interface ConfiguracionViewProps {
  onBack: () => void;
}

const ConfiguracionView: React.FC<ConfiguracionViewProps> = ({ onBack }) => {
  return (
    <div className="p-6 space-y-6 bg-white min-h-screen">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="outline"
          size="sm"
          onClick={onBack}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
          <p className="text-gray-600">Gestiona tu cuenta en Portal APR</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Seguridad */}
        <Card className="border border-gray-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Seguridad
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              variant="outline"
              className="w-full justify-start"
            >
              Cambiar Contraseña
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
            >
              Historial de Sesiones
            </Button>
          </CardContent>
        </Card>

        {/* Preferencias */}
        <Card className="border border-gray-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Preferencias
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Notificaciones por Email</span>
              <div className="text-sm text-gray-500">Habilitado</div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Notificaciones SMS</span>
              <div className="text-sm text-gray-500">Habilitado</div>
            </div>
          </CardContent>
        </Card>
      </div>

    </div>
  );
};

export default ConfiguracionView;