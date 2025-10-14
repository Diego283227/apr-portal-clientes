import React from 'react';
import { useSocketContext } from '../../contexts/SocketContext';

export default function SocketDebug() {
  const { socket, isConnected, onlineUsers } = useSocketContext();

  const testConnection = () => {
    console.log('🧪 Testing socket connection...');
    console.log('🧪 Socket exists:', !!socket);
    console.log('🧪 Is connected:', isConnected);
    console.log('🧪 Socket ID:', socket?.id);
    console.log('🧪 Online users:', onlineUsers);
    
    if (socket) {
      socket.emit('test_message', { message: 'Hello from client!' });
    }
  };

  return (
    <div style={{ 
      position: 'fixed', 
      top: '10px', 
      right: '10px', 
      background: 'black', 
      color: 'white', 
      padding: '10px',
      borderRadius: '5px',
      zIndex: 9999
    }}>
      <div>Socket: {socket ? '✅' : '❌'}</div>
      <div>Connected: {isConnected ? '✅' : '❌'}</div>
      <div>ID: {socket?.id || 'N/A'}</div>
      <div>Users: {onlineUsers.length}</div>
      <button 
        onClick={testConnection}
        style={{ 
          marginTop: '5px', 
          padding: '5px', 
          background: 'blue', 
          color: 'white', 
          border: 'none', 
          borderRadius: '3px' 
        }}
      >
        Test Connection
      </button>
    </div>
  );
}