import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle } from 'lucide-react';
import { Button } from './button';
import AIAssistantChat from '../socio/AIAssistantChat';

interface FloatingChatbotProps {
  className?: string;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

interface Position {
  x: number;
  y: number;
}

export default function FloatingChatbot({
  className = '',
  isOpen: externalIsOpen,
  onOpenChange: externalOnOpenChange
}: FloatingChatbotProps) {
  const [internalShowChat, setInternalShowChat] = useState(false);

  // Use external control if provided, otherwise use internal state
  const showChat = externalIsOpen !== undefined ? externalIsOpen : internalShowChat;
  const setShowChat = (open: boolean) => {
    if (externalOnOpenChange) {
      externalOnOpenChange(open);
    } else {
      setInternalShowChat(open);
    }
  };
  const [position, setPosition] = useState<Position>({ x: 0, y: 0 }); // Will be set properly on mount
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Load saved position from localStorage or set default
  useEffect(() => {
    const savedPositionStr = localStorage.getItem('floating-chatbot-position');
    let initialPosition;
    
    if (savedPositionStr) {
      try {
        const savedPosition = JSON.parse(savedPositionStr);
        if (savedPosition.x !== undefined && savedPosition.y !== undefined) {
          initialPosition = savedPosition;
        }
      } catch (error) {
      }
    }
    
    // If no saved position, use default bottom-right
    if (!initialPosition) {
      initialPosition = {
        x: window.innerWidth - 80, // 56px button width + 24px padding
        y: window.innerHeight - 80  // 56px button height + 24px padding
      };
    }
    
    setPosition(initialPosition);

    // Update position on window resize
    const handleResize = () => {
      setPosition(prev => ({
        x: Math.min(prev.x, window.innerWidth - 80),
        y: Math.min(prev.y, window.innerHeight - 80)
      }));
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Save position to localStorage
  const savePosition = (newPosition: Position) => {
    setPosition(newPosition);
    localStorage.setItem('floating-chatbot-position', JSON.stringify(newPosition));
  };

  // Handle mouse down - start dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left mouse button
    
    e.preventDefault();
    setIsDragging(true);
    
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) {
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }
    
  };

  // Handle mouse move - dragging
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      
      e.preventDefault();
      
      // Calculate new position relative to viewport
      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;
      
      // Constrain to viewport bounds (with some padding)
      const maxX = window.innerWidth - 56; // Button width
      const maxY = window.innerHeight - 56; // Button height
      
      const constrainedPosition = {
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY))
      };
      
      setPosition(constrainedPosition);
    };

    const handleMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
        savePosition(position);
      }
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = 'none'; // Prevent text selection while dragging
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.userSelect = '';
      };
    }
  }, [isDragging, dragOffset, position]);

  const handleChatbotClick = (e: React.MouseEvent) => {
    if (!isDragging) {
      setShowChat(true);
    }
  };

  return (
    <>
      {/* Draggable Floating Button */}
      <div 
        className="fixed z-40"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          right: 'auto',
          bottom: 'auto'
        }}
      >
        <Button
          ref={buttonRef}
          id="floating-chatbot-btn"
          onClick={handleChatbotClick}
          onMouseDown={handleMouseDown}
          className={`w-14 h-14 rounded-full shadow-lg bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 border-2 border-white transition-all duration-300 ${
            isDragging ? 'cursor-grabbing scale-110' : 'cursor-grab'
          }`}
          size="icon"
          title="Asistente Virtual APR - Arrastra para mover"
        >
          <div className="relative">
            <MessageCircle className="h-6 w-6 text-white" />
            {/* Animated pulse dot */}
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse">
              <div className="absolute inset-0 w-3 h-3 bg-green-400 rounded-full animate-ping"></div>
            </div>
          </div>
        </Button>
      </div>

      {/* AI Assistant Chat Modal */}
      {showChat && (
        <AIAssistantChat onClose={() => setShowChat(false)} />
      )}
    </>
  );
}