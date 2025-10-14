import React, { useEffect, useState } from 'react';
import { useSocket } from '@/hooks/useSocket';

export const SocketTestComponent: React.FC = () => {
  const [token, setToken] = useState<string | null>(null);
  const [socketStatus, setSocketStatus] = useState<string>('Inicializando...');

  useEffect(() => {
    const authToken = localStorage.getItem('token');
    setToken(authToken);
    console.log('🔌 SocketTest - Token from localStorage:', authToken ? `${authToken.substring(0, 20)}...` : 'null');
  }, []);

  const { socket, isConnected } = useSocket(token || undefined);

  useEffect(() => {
    if (socket) {
      setSocketStatus(`Socket creado - Conectado: ${isConnected}`);
      console.log('🔌 SocketTest - Socket object:', socket);
      console.log('🔌 SocketTest - Socket methods available:', Object.getOwnPropertyNames(socket));

      // Test básico de socket.on
      try {
        socket.on('test_event', () => {
          console.log('🔌 SocketTest - socket.on funciona correctamente');
        });
        setSocketStatus(`Socket funcionando - Conectado: ${isConnected}`);
      } catch (error) {
        console.error('🔌 SocketTest - Error usando socket.on:', error);
        setSocketStatus(`Error en socket.on: ${error}`);
      }

      return () => {
        try {
          socket.off('test_event');
        } catch (error) {
          console.error('🔌 SocketTest - Error removiendo listener:', error);
        }
      };
    } else {
      setSocketStatus('Socket is null');
    }
  }, [socket, isConnected]);

  return (
    <div className="p-4 border rounded-lg bg-gray-50">
      <h3 className="font-bold mb-2">Socket Test Component</h3>
      <div className="space-y-2 text-sm">
        <div>Token: {token ? `${token.substring(0, 20)}...` : 'No token'}</div>
        <div>Status: {socketStatus}</div>
        <div>Connected: {isConnected ? '✅' : '❌'}</div>
        <div>Socket object: {socket ? '✅ Present' : '❌ Null'}</div>
      </div>
    </div>
  );
};

export default SocketTestComponent;