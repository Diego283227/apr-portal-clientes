import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Circle, Clock } from 'lucide-react';

interface OnlineStatusProps {
  isOnline: boolean;
  lastSeen?: Date;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export default function OnlineStatus({ 
  isOnline, 
  lastSeen, 
  showText = true, 
  size = 'md' 
}: OnlineStatusProps) {
  
  const getTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'hace un momento';
    if (diffInSeconds < 3600) return `hace ${Math.floor(diffInSeconds / 60)} min`;
    if (diffInSeconds < 86400) return `hace ${Math.floor(diffInSeconds / 3600)}h`;
    if (diffInSeconds < 604800) return `hace ${Math.floor(diffInSeconds / 86400)}d`;
    return date.toLocaleDateString('es-CL');
  };

  const getStatusConfig = () => {
    if (isOnline) {
      return {
        color: 'bg-green-500 text-green-100',
        dotColor: 'bg-green-500',
        text: 'En línea',
        icon: Circle
      };
    } else {
      return {
        color: 'bg-red-500 text-red-100',
        dotColor: 'bg-red-500',
        text: lastSeen ? `Visto ${getTimeAgo(lastSeen)}` : 'Desconectado',
        icon: Clock
      };
    }
  };

  const status = getStatusConfig();
  const Icon = status.icon;

  // Solo mostrar el punto de estado
  if (!showText) {
    const dotSize = {
      sm: 'w-2 h-2',
      md: 'w-3 h-3',
      lg: 'w-4 h-4'
    }[size];

    return (
      <div className="relative">
        <div 
          className={`rounded-full ${status.dotColor} ${dotSize} ${isOnline ? 'animate-pulse' : ''}`}
          title={status.text}
        />
        {isOnline && (
          <div className={`absolute inset-0 rounded-full ${status.dotColor} ${dotSize} animate-ping opacity-75`} />
        )}
      </div>
    );
  }

  // Mostrar badge completo con texto
  return (
    <Badge 
      variant={isOnline ? "default" : "secondary"}
      className={`
        ${status.color} 
        ${isOnline ? 'border-green-200' : 'border-red-200'}
        flex items-center gap-1.5 px-2 py-1 text-xs font-medium
        ${isOnline ? 'hover:bg-green-600' : 'hover:bg-red-600'}
      `}
    >
      <div className="relative">
        <div 
          className={`rounded-full ${status.dotColor} w-2 h-2 ${isOnline ? 'animate-pulse' : ''}`}
        />
        {isOnline && (
          <div className="absolute inset-0 rounded-full bg-green-300 w-2 h-2 animate-ping opacity-75" />
        )}
      </div>
      <span className="whitespace-nowrap">{status.text}</span>
    </Badge>
  );
}