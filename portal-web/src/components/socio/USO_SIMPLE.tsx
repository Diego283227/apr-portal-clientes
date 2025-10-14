// TUTORIAL BÁSICO - SOLO UNA PRESENTACIÓN SIMPLE

import React from 'react';
import BasicTutorial, { useBasicTutorial } from './BasicTutorial';

// IMPLEMENTACIÓN SÚPER SIMPLE - COPY/PASTE
const MiDashboard = () => {
  const tutorial = useBasicTutorial();
  
  return (
    <div>
      {/* TODO TU CÓDIGO ACTUAL DEL DASHBOARD */}
      
      {/* TUTORIAL SIMPLE - SOLO AÑADIR ESTO */}
      {tutorial.showTutorial && (
        <BasicTutorial 
          userName="Diego"
          onClose={tutorial.hideTutorial}
        />
      )}
    </div>
  );
};

// EJEMPLO CON BOTÓN MANUAL
const ConBotonManual = () => {
  const tutorial = useBasicTutorial();
  
  return (
    <div>
      {/* Tu contenido actual */}
      
      {/* Botón simple para mostrar tutorial */}
      <button 
        onClick={tutorial.startTutorial}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          backgroundColor: '#3b82f6',
          color: 'white',
          padding: '12px 20px',
          borderRadius: '25px',
          border: 'none',
          cursor: 'pointer',
          fontWeight: 'bold',
          boxShadow: '0 4px 15px rgba(59, 130, 246, 0.3)'
        }}
      >
        📖 Ver Tutorial
      </button>
      
      {/* Tutorial */}
      {tutorial.showTutorial && (
        <BasicTutorial 
          userName="Diego"
          onClose={tutorial.hideTutorial}
        />
      )}
    </div>
  );
};

export default MiDashboard;