// IMPLEMENTACIÓN SÚPER SIMPLE - SOLO COPY/PASTE

import React from 'react';
import SimpleTutorial, { useSimpleTutorial } from './SimpleTutorial';

// EJEMPLO 1: USO BÁSICO - Solo añadir al final de tu componente
const MiDashboard = () => {
  const tutorial = useSimpleTutorial();
  
  return (
    <div>
      {/* TODO TU CÓDIGO ACTUAL AQUÍ */}
      
      {/* AÑADIR SOLO ESTO AL FINAL */}
      {tutorial.showTutorial && (
        <SimpleTutorial 
          userName="Diego"
          onClose={tutorial.hideTutorial}
        />
      )}
    </div>
  );
};

// EJEMPLO 2: CON BOTÓN MANUAL PARA ACTIVAR
const MiDashboardConBoton = () => {
  const tutorial = useSimpleTutorial();
  
  return (
    <div>
      {/* Tu código actual */}
      
      {/* Botón para mostrar tutorial */}
      <button 
        onClick={tutorial.startTutorial}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          backgroundColor: '#3b82f6',
          color: 'white',
          padding: '10px 15px',
          borderRadius: '50px',
          border: 'none',
          cursor: 'pointer',
          zIndex: 1000
        }}
      >
        🎯 Tutorial
      </button>
      
      {/* Tutorial */}
      {tutorial.showTutorial && (
        <SimpleTutorial 
          userName="Diego"
          onClose={tutorial.hideTutorial}
        />
      )}
    </div>
  );
};

// EJEMPLO 3: INTEGRACIÓN DIRECTA
const EjemploDirecto = () => {
  return (
    <div>
      {/* Tu dashboard actual */}
      
      {/* Elementos que debe tener tu dashboard (con IDs o clases) */}
      <div id="socio-profile">Mi Perfil</div>
      <div id="boletas-section">Mis Boletas</div>
      <button id="nav-pago">Pagar</button>
      <button id="nav-chat">Chat</button>
      
      {/* Tutorial - se activa automáticamente */}
      <SimpleTutorial userName="Diego" />
    </div>
  );
};

export default MiDashboard;