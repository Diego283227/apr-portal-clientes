import React, { useEffect, useState } from 'react';
import { apiClient } from '@/services/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface Comunicado {
  id: string;
  descripcion: string;
  contenido?: any;
  enviadoPor?: string;
  timestamp: string;
}

export default function ComunicadosView() {
  const [comunicados, setComunicados] = useState<Comunicado[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchComunicados();
  }, []);

  const fetchComunicados = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/chat/comunicados');
      if (res.data && res.data.data && Array.isArray(res.data.data.comunicados)) {
        setComunicados(res.data.data.comunicados);
      }
    } catch (error) {
      console.error('Error fetching comunicados', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Comunicados</h2>
        <div>
          <Button size="sm" onClick={fetchComunicados} className="ml-2">Refrescar</Button>
        </div>
      </div>

      {loading && <div className="text-sm text-muted-foreground">Cargando...</div>}

      {!loading && comunicados.length === 0 && (
        <div className="text-sm text-muted-foreground">No hay comunicados recientes.</div>
      )}

      <div className="grid grid-cols-1 gap-3">
        {comunicados.map(c => (
          <Card key={c.id} className="!bg-white dark:!bg-gray-800">
            <CardHeader>
                <CardTitle className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">{c.subject || c.descripcion}</div>
                  {c.subject && <div className="text-xs text-muted-foreground">{c.descripcion}</div>}
                </div>
                <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(c.timestamp), { addSuffix: true, locale: es })}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-foreground mb-2">
                {c.subject && (
                  <div className="font-semibold mb-1">{c.subject}</div>
                )}
                <div>{typeof c.contenido === 'string' ? c.contenido : JSON.stringify(c.contenido)}</div>
              </div>
              {c.enviadoPor && <div className="text-xs text-muted-foreground">Enviado por: {c.enviadoPor}</div>}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
