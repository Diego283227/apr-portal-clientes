import { useEffect } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';

interface SidebarTutorialProps {
  userName: string;
}

export const useSidebarTutorial = () => {
  const resetTutorial = () => {
    localStorage.removeItem('sidebar-tutorial-completed');
    console.log('Tutorial reseteado - se mostrará en el próximo inicio de sesión');
  };

  const startSidebarTutorial = (userName: string) => {
    console.log('🎬 Iniciando tutorial para:', userName);
    
    // Función helper para preparar elementos (no bloquea el tutorial)
    const prepareElement = async (selector: string) => {
      console.log(`🔧 Preparando: ${selector}`);

      // Para la nueva estructura de sidebar personalizada, no necesitamos manejar collapse/expand
      // porque el tutorial debe funcionar independientemente del estado de la sidebar

      // Scroll inmediato hacia el elemento
      setTimeout(() => {
        const element = document.querySelector(selector);
        if (element) {
          element.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            inline: 'center'
          });
        } else {
          console.warn(`⚠️ Elemento no encontrado: ${selector}`);
        }
      }, 100);
    };
    
    // Define todos los pasos posibles
    const allSteps = [
        {
          element: '#socio-profile',
          popover: {
            title: `¡Hola ${userName}! 👋`,
            description: `
              <div style="text-align: left;">
                <p><strong>Tu Perfil Personal</strong></p>
                <p>• Aquí ves tu información básica</p>
                <p>• <span style="color: #10b981;">Saldo actual</span> disponible</p>
                <p>• <span style="color: #ef4444;">Deuda pendiente</span> si la tienes</p>
                <p>• Haz clic para <strong>editar tu información</strong></p>
                <br/>
                <p>💡 <em>Tip: Puedes actualizar teléfono y dirección</em></p>
              </div>
            `,
            side: 'right',
            align: 'center'
          }
        },
        {
          element: '[data-sidebar="trigger"]',
          popover: {
            title: '☰ Menú de Navegación',
            description: `
              <div style="text-align: left;">
                <p><strong>Acceso Rápido al Menú</strong></p>
                <p>• Botón para abrir/cerrar el menú lateral</p>
                <p>• Acceso desde cualquier vista</p>
                <p>• También disponible con scroll</p>
                <br/>
                <p>💡 <em>Siempre visible en la parte superior</em></p>
              </div>
            `,
            side: 'bottom',
            align: 'start'
          }
        },
        {
          element: '#nav-dashboard',
          popover: {
            title: '🏠 Dashboard Principal',
            description: `
              <div style="text-align: left;">
                <p><strong>Tu Centro de Control</strong></p>
                <p>• Resumen financiero completo</p>
                <p>• Tarjetas con saldo y deudas</p>
                <p>• Acciones rápidas disponibles</p>
                <p>• Vista general de tu cuenta</p>
                <br/>
                <p>💡 <em>Desde aquí accedes a todo</em></p>
              </div>
            `,
            side: 'right',
            align: 'center'
          }
        },
        {
          element: '#nav-boletas',
          popover: {
            title: '📄 Mis Boletas',
            description: `
              <div style="text-align: left;">
                <p><strong>Gestión de Facturas</strong></p>
                <p>• Ver todas tus boletas de agua</p>
                <p>• Filtrar por: Pendientes, Pagadas, Vencidas</p>
                <p>• Buscar por número o período</p>
                <p>• <strong>Descargar PDF</strong> de cada boleta</p>
                <br/>
                <p>💡 <em>Mantén control de tus facturas</em></p>
              </div>
            `,
            side: 'right',
            align: 'center'
          }
        },
        {
          element: '#nav-pago',
          popover: {
            title: '💳 Realizar Pago',
            description: `
              <div style="text-align: left;">
                <p><strong>Pagos 100% Seguros</strong></p>
                <p>• Pagar con tarjeta de crédito/débito</p>
                <p>• Transferencia bancaria</p>
                <p>• Múltiples métodos disponibles</p>
                <p>• <strong>Encriptación SSL</strong> garantizada</p>
                <br/>
                <p>💡 <em>Solo se activa si tienes deuda</em></p>
              </div>
            `,
            side: 'right',
            align: 'center'
          }
        },
        {
          element: '#nav-historial',
          popover: {
            title: '📜 Historial de Pagos',
            description: `
              <div style="text-align: left;">
                <p><strong>Registro Completo</strong></p>
                <p>• Todos tus pagos anteriores</p>
                <p>• Fechas y montos detallados</p>
                <p>• Comprobantes disponibles</p>
                <p>• Seguimiento de transacciones</p>
                <br/>
                <p>💡 <em>Tu historial financiero completo</em></p>
              </div>
            `,
            side: 'right',
            align: 'center'
          }
        },
        {
          element: '#nav-chat',
          popover: {
            title: '💬 Chat de Soporte',
            description: `
              <div style="text-align: left;">
                <p><strong>Ayuda en Tiempo Real</strong></p>
                <p>• Chat directo con administradores</p>
                <p>• Consultas sobre facturas</p>
                <p>• Reportar problemas de agua</p>
                <p>• <strong>Soporte personalizado</strong></p>
                <br/>
                <p>💡 <em>¿Tienes dudas? ¡Pregúntanos!</em></p>
              </div>
            `,
            side: 'right',
            align: 'center'
          }
        },
        {
          element: '#floating-chatbot-btn',
          popover: {
            title: '🤖 Asistente Virtual',
            description: `
              <div style="text-align: left;">
                <p><strong>Tu Ayudante Inteligente</strong></p>
                <p>• Respuestas automáticas 24/7</p>
                <p>• Consultas sobre pagos y boletas</p>
                <p>• Información de procedimientos</p>
                <p>• <strong>¡100% operativo y funcional!</strong></p>
                <br/>
                <p>🚀 <em>Chatbot completamente activo</em></p>
                <p>💡 <em>Botón flotante siempre visible</em></p>
              </div>
            `,
            side: 'left',
            align: 'center'
          }
        },
        {
          element: '#header-tutorial-button',
          popover: {
            title: '📚 Tutorial del Sistema',
            description: `
              <div style="text-align: left;">
                <p><strong>¿Necesitas ayuda nuevamente?</strong></p>
                <p>• Haz clic aquí para repetir este tutorial</p>
                <p>• Disponible en cualquier momento</p>
                <p>• Guía paso a paso completa</p>
                <p>• <strong>Siempre accesible</strong></p>
                <br/>
                <p>💡 <em>En el menú inferior de herramientas</em></p>
              </div>
            `,
            side: 'right',
            align: 'center'
          }
        },
        {
          element: '#header-logout-button',
          popover: {
            title: '🚪 Cerrar Sesión',
            description: `
              <div style="text-align: left;">
                <p><strong>Finalizar tu Sesión</strong></p>
                <p>• Cierra sesión de forma segura</p>
                <p>• Protege tu información personal</p>
                <p>• Disponible en el menú inferior</p>
                <p>• <strong>Siempre accesible</strong></p>
                <br/>
                <p>🔒 <em>Recuerda cerrar sesión al terminar</em></p>
                <p>💡 <em>Especialmente en equipos compartidos</em></p>
              </div>
            `,
            side: 'right',
            align: 'center'
          }
        }
    ];

    // Filtrar solo los pasos cuyos elementos existen en el DOM y están habilitados
    const availableSteps = allSteps.filter(step => {
      const element = document.querySelector(step.element);
      const isAvailable = element !== null;
      
      if (!isAvailable) {
        console.log(`❌ Elemento no encontrado: ${step.element}`);
        return false;
      }
      
      // Verificar si está deshabilitado
      const isDisabled = element.hasAttribute('disabled') || 
                        element.classList.contains('disabled') ||
                        element.classList.contains('opacity-50') ||
                        (element as HTMLButtonElement).disabled;
      
      if (isDisabled) {
        console.log(`⚠️ Elemento deshabilitado omitido: ${step.element}`);
        if (step.element === '#nav-pago') {
          console.log('💳 Botón de pago deshabilitado - probablemente no hay deuda pendiente');
        }
        return false;
      }
      
      console.log(`✅ Elemento disponible: ${step.element}`);
      return true;
    });

    console.log(`Tutorial iniciado con ${availableSteps.length} de ${allSteps.length} pasos disponibles`);
    
    // Mostrar lista de pasos disponibles
    console.log('📋 Pasos disponibles:', availableSteps.map(step => step.element));

    // Solo iniciar el tutorial si tenemos al menos 3 pasos
    if (availableSteps.length >= 3) {
      console.log('🚀 Creando driver.js con', availableSteps.length, 'pasos');
      
      const driverObj = driver({
        showProgress: true,
        showButtons: ['next', 'previous', 'close'],
        nextBtnText: 'Siguiente →',
        prevBtnText: '← Anterior',
        doneBtnText: '✅ Finalizar',
        closeBtnText: '✕',
        progressText: 'Paso {{current}} de {{total}}',
        
        steps: availableSteps,
        
        onHighlighted: (element) => {
          const elementId = element?.id || '';
          console.log('🎯 Elemento destacado:', elementId);
          
          // Solo hacer scroll para elementos específicos que lo necesiten
          if (elementId === 'nav-boletas' || elementId === 'nav-pago' || elementId === 'nav-historial') {
            console.log('📜 Aplicando scroll para elemento:', elementId);
            setTimeout(() => {
              handleSidebarScroll(element);
            }, 200);
          }
        },
        
        onDestroyed: () => {
          localStorage.setItem('sidebar-tutorial-completed', 'true');
          console.log('✅ Tutorial completado');
        }
      });

      console.log('▶️ Iniciando tutorial...');
      driverObj.drive();
      
      // Función para manejar scroll específico del sidebar
      const handleSidebarScroll = (targetElement: Element) => {
        const elementId = targetElement.id;
        console.log('📜 Manejando scroll del sidebar para:', elementId);
        
        // Elementos que requieren scroll especial
        const sidebarNavElements = ['nav-dashboard', 'nav-boletas', 'nav-pago', 'nav-historial', 'nav-chat'];
        const isSidebarNavElement = sidebarNavElements.some(id => elementId.includes(id));
        
        // Primero asegurar que el sidebar esté abierto
        const sidebar = document.querySelector('[data-sidebar="sidebar"]');
        const isCollapsed = sidebar?.getAttribute('data-state') === 'collapsed';
        
        if (isCollapsed) {
          const trigger = document.querySelector('[data-sidebar="trigger"]') as HTMLButtonElement;
          if (trigger) {
            console.log('🔧 Abriendo sidebar automáticamente');
            trigger.click();
            
            // Esperar más tiempo para elementos del sidebar
            const delay = isSidebarNavElement ? 600 : 400;
            setTimeout(() => scrollToElementInSidebar(targetElement), delay);
            return;
          }
        }
        
        // Si el sidebar ya está abierto, hacer scroll con timing apropiado
        const delay = isSidebarNavElement ? 200 : 100;
        setTimeout(() => scrollToElementInSidebar(targetElement), delay);
      };
      
      const scrollToElementInSidebar = (targetElement: Element) => {
        const elementId = targetElement.id;
        
        // Elementos que están en el sidebar y necesitan scroll interno
        const sidebarElements = ['nav-dashboard', 'nav-boletas', 'nav-pago', 'nav-historial', 'nav-chat', 'socio-profile'];
        
        console.log('🔍 Verificando elemento:', elementId, 'en lista:', sidebarElements);
        
        if (sidebarElements.some(id => elementId.includes(id))) {
          console.log('🎯 Elemento del sidebar detectado:', elementId);
          
          // Obtener el contenedor del sidebar
          const sidebarContent = document.querySelector('[data-sidebar="content"]');
          if (sidebarContent) {
            
            // Scroll directo dentro del sidebar primero
            console.log('📜 Scroll inicial dentro del sidebar');
            targetElement.scrollIntoView({
              behavior: 'smooth',
              block: 'center',
              inline: 'nearest'
            });
            
            // Verificar después de un momento si necesita ajuste adicional
            setTimeout(() => {
              const rect = targetElement.getBoundingClientRect();
              const windowHeight = window.innerHeight;
              const windowWidth = window.innerWidth;
              
              console.log(`📐 Elemento posición: top=${rect.top}, bottom=${rect.bottom}, ventana=${windowHeight}`);
              
              // Si el elemento aún no está bien visible, hacer scroll global
              if (rect.bottom > windowHeight - 100 || rect.top < 100 || 
                  rect.left < 0 || rect.right > windowWidth) {
                console.log('🌐 Ajuste final del scroll global necesario');
                
                window.scrollTo({
                  top: window.scrollY + rect.top - (windowHeight / 2) + (rect.height / 2),
                  left: window.scrollX + rect.left - (windowWidth / 2) + (rect.width / 2),
                  behavior: 'smooth'
                });
              } else {
                console.log('✅ Elemento ahora visible correctamente');
              }
            }, 400);
          }
        } else {
          // Para elementos fuera del sidebar, scroll normal
          console.log('🌐 Scroll normal para elemento externo');
          targetElement.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            inline: 'center'
          });
        }
      };

      console.log('✅ Tutorial iniciado con scroll proactivo para elementos específicos');
    } else {
      console.log('No hay suficientes elementos disponibles para el tutorial');
    }
  };

  return { startSidebarTutorial, resetTutorial };
};

export default function SidebarTutorial({ userName }: SidebarTutorialProps) {
  const { startSidebarTutorial } = useSidebarTutorial();

  useEffect(() => {
    const hasCompletedTutorial = localStorage.getItem('sidebar-tutorial-completed');
    if (!hasCompletedTutorial) {
      // Start tutorial after a small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        // Verificar los elementos esenciales del tutorial
        const essentialElements = [
          '#socio-profile',
          '#nav-dashboard', 
          '#nav-boletas',
          '#nav-chat'
        ];
        
        const essentialReady = essentialElements.every(selector => {
          const element = document.querySelector(selector);
          return element !== null;
        });
        
        if (essentialReady) {
          console.log('Iniciando tutorial de primera visita para:', userName);
          startSidebarTutorial(userName);
        } else {
          console.log('Elementos esenciales del tutorial no están listos, reintentando...');
          // Reintentar después de otros 2 segundos
          const retryTimer = setTimeout(() => {
            const retryCheck = essentialElements.every(selector => {
              const element = document.querySelector(selector);
              return element !== null;
            });
            
            if (retryCheck) {
              startSidebarTutorial(userName);
            } else {
              console.log('Elementos del tutorial aún no están listos - iniciando tutorial simplificado');
              // Iniciar con los elementos disponibles
              startSidebarTutorial(userName);
            }
          }, 2000);
          return () => clearTimeout(retryTimer);
        }
      }, 3000); // Aumentado a 3 segundos para mayor estabilidad
      return () => clearTimeout(timer);
    } else {
      console.log('Tutorial ya completado anteriormente');
    }
  }, [userName, startSidebarTutorial]);

  return null; // This component doesn't render anything, just manages the tutorial
}