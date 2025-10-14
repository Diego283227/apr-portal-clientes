// EJEMPLO DE CÓMO INTEGRAR EL NUEVO TUTORIAL EN TU DASHBOARD ACTUAL

// 1. En SocioDashboard.tsx - Añadir al final del componente:

import TutorialIntegration from './TutorialIntegration';

const SocioDashboard = ({ userName }) => {
  return (
    <div className="dashboard-container">
      {/* Todo tu contenido actual del dashboard */}
      
      {/* Asegúrate de que tus elementos tengan estos IDs para que el tutorial los encuentre */}
      <Card id="socio-profile" className="profile-card">
        {/* Tu tarjeta de perfil actual */}
      </Card>
      
      <Card id="boletas-section" data-section="boletas" className="boletas-card">
        {/* Tu sección de boletas actual */}
      </Card>
      
      {/* Menú lateral - asegúrate de que tenga estos IDs */}
      <nav id="socio-sidebar" className="sidebar">
        <Button id="nav-pago" data-nav="pago">Pagos</Button>
        <Button id="nav-chat" data-nav="chat">Chat</Button>
        {/* Resto de tu menú */}
      </nav>
      
      {/* AL FINAL, AÑADIR EL SISTEMA DE TUTORIAL */}
      <TutorialIntegration 
        userName={userName}
        currentPage="/dashboard"
        showAutoPrompt={true}
      />
    </div>
  );
};

// 2. O si prefieres usar el componente wrapper:

import { DashboardWithTutorial } from './TutorialIntegration';

const App = () => {
  return (
    <DashboardWithTutorial userName="Diego">
      {/* Todo tu dashboard actual aquí */}
      <SocioDashboard userName="Diego" />
    </DashboardWithTutorial>
  );
};

// 3. Para usar en otras páginas específicas:

const PerfilPage = ({ userName }) => {
  const tutorial = useTutorialPrompt(userName, 'perfil');
  
  return (
    <div>
      {/* Tu contenido de perfil */}
      
      {/* Botón manual para mostrar tutorial */}
      <Button onClick={tutorial.showTutorial}>
        🎯 Ver Tutorial
      </Button>
      
      {tutorial.shouldShowTutorial && (
        <InteractiveTutorial
          isOpen={true}
          onClose={tutorial.hideTutorial}
          userName={userName}
          currentPage="/perfil"
        />
      )}
    </div>
  );
};

export default ExampleUsage;