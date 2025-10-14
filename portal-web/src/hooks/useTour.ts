import { useEffect, useState } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';

export const useTour = () => {
  const [isFirstVisit, setIsFirstVisit] = useState(false);

  useEffect(() => {
    const hasSeenTour = localStorage.getItem('socio-tour-completed');
    if (!hasSeenTour) {
      setIsFirstVisit(true);
    }
  }, []);

  const startTour = () => {
    const driverObj = driver({
      showProgress: true,
      nextBtnText: 'Siguiente',
      prevBtnText: 'Anterior',
      doneBtnText: 'Finalizar',
      closeBtnAriaLabel: 'Cerrar',
      stageBackground: '#ffffff',
      progressText: '{{current}} de {{total}}',
      steps: [
        {
          element: '#socio-sidebar',
          popover: {
            title: '¡Bienvenido al Portal APR! 🎉',
            description: 'Esta es tu barra lateral de navegación. Aquí encontrarás todas las opciones disponibles para gestionar tu cuenta de socio.',
            side: "right",
            align: 'start'
          }
        },
        {
          element: '#nav-dashboard',
          popover: {
            title: 'Panel Principal 🏠',
            description: 'Aquí verás un resumen de tu cuenta: boletas pendientes, estado de pagos y información importante.',
            side: "right",
            align: 'start'
          }
        },
        {
          element: '#nav-boletas',
          popover: {
            title: 'Mis Boletas 📄',
            description: 'Consulta todas tus boletas: pendientes, pagadas y vencidas. Puedes descargarlas en PDF cuando las necesites.',
            side: "right",
            align: 'start'
          }
        },
        {
          element: '#nav-pago',
          popover: {
            title: 'Realizar Pago 💳',
            description: 'Paga tus boletas de forma segura y rápida. Acepta tarjetas de crédito, débito y transferencias.',
            side: "right",
            align: 'start'
          }
        },
        {
          element: '#nav-historial',
          popover: {
            title: 'Historial de Pagos 📊',
            description: 'Revisa todos tus pagos anteriores, descarga comprobantes y mantén un control de tus transacciones.',
            side: "right",
            align: 'start'
          }
        },
        {
          element: '#nav-chat',
          popover: {
            title: 'Soporte y Chat 💬',
            description: '¡Tu línea directa con el equipo! Puedes: ✅ Hacer preguntas sobre tus boletas ✅ Reportar problemas del servicio de agua ✅ Consultar sobre pagos o deudas ✅ Solicitar información general. Los administradores reciben tus mensajes al instante y responden en tiempo real. Ideal para resolver dudas rápidamente.',
            side: "right",
            align: 'start'
          }
        },
        {
          element: '#nav-tutorial',
          popover: {
            title: 'Ver Tutorial 📖',
            description: 'Desde aquí puedes repetir este tutorial cuando quieras. Si alguna vez necesitas recordar cómo funciona algo, simplemente haz clic en "Ver Tutorial" y te guiaremos nuevamente por todas las funciones.',
            side: "right",
            align: 'start'
          }
        },
        {
          element: '#socio-profile',
          popover: {
            title: 'Tu Perfil 👤',
            description: 'Aquí aparece tu información personal. Puedes ver tus datos y configurar tu cuenta.',
            side: "left",
            align: 'start'
          }
        },
        {
          element: '#floating-sidebar-btn',
          popover: {
            title: 'Botón Flotante 🎯',
            description: 'Cuando hagas scroll hacia abajo, aparecerá este botón flotante para mostrar/ocultar la barra lateral fácilmente.',
            side: "left",
            align: 'start'
          }
        },
        {
          element: '#main-content',
          popover: {
            title: 'Área Principal 📱',
            description: 'Aquí se muestra el contenido de la sección que selecciones. Puedes navegar entre las diferentes opciones del menú.',
            side: "top",
            align: 'center'
          }
        },
        {
          element: '#welcome-cards',
          popover: {
            title: '¡Todo Listo! ✅',
            description: 'Ya conoces todas las funciones principales. Recuerda que puedes repetir este tutorial desde "Ver Tutorial" en el menú inferior. Si tienes dudas, usa el Chat de Soporte para contactar directamente con el equipo. ¡Bienvenido a APR!',
            side: "top",
            align: 'center'
          }
        }
      ],
      onDestroyed: () => {
        localStorage.setItem('socio-tour-completed', 'true');
        setIsFirstVisit(false);
      }
    });

    driverObj.drive();
  };

  const resetTour = () => {
    localStorage.removeItem('socio-tour-completed');
    setIsFirstVisit(true);
  };

  return {
    isFirstVisit,
    startTour,
    resetTour
  };
};