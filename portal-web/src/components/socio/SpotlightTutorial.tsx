import React, { useState, useEffect, useCallback } from 'react';
import { X, ArrowRight, CheckCircle, Target } from 'lucide-react';

interface TutorialStep {
  id: string;
  target: string;
  title: string;
  description: string;
  action: string;
  position: 'top' | 'bottom' | 'left' | 'right';
}

interface TutorialStep {
  id: string;
  target: string;
  title: string;
  description: string;
  action: string;
  position: 'top' | 'bottom' | 'left' | 'right';
  explanationTitle?: string;
  explanationDescription?: string;
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'welcome',
    target: 'body',
    title: '¡Bienvenido al Portal APR!',
    description: 'Te voy a mostrar cómo usar cada parte de la plataforma. Haz clic exactamente donde te indique y después te explico para qué sirve.',
    action: 'Haz clic en "Continuar" para empezar',
    position: 'top'
  },
  {
    id: 'profile',
    target: '#socio-profile',
    title: 'Haz clic en tu Perfil',
    description: 'Primero haz clic en tu perfil para acceder a él.',
    action: 'HAZ CLIC en tu perfil resaltado',
    position: 'right',
    explanationTitle: '✅ Perfecto! Accediste a tu Perfil',
    explanationDescription: 'Excelente! Ahora estás viendo tu perfil personal. En los próximos pasos te voy a mostrar cada elemento específico de esta pantalla: los campos que puedes editar, tu saldo, tu deuda, y cómo funciona el auto-guardado.'
  },
  // Profile sub-steps
  {
    id: 'profile-rut-section',
    target: 'div[id="rut-section"], #rut-section',
    title: 'Sección RUT',
    description: 'Te muestro la sección de tu RUT con funcionalidades especiales.',
    action: 'HAZ CLIC en la sección de tu RUT (campo gris con botones)',
    position: 'right',
    explanationTitle: '✅ Sección RUT con Funcionalidades',
    explanationDescription: 'Esta sección tiene funciones especiales:\n\n• Tu RUT está protegido (no se puede editar)\n• 🔊 BOTÓN DE AUDIO: Reproduce tu RUT en voz alta\n• 👁️ BOTÓN VER PERFIL: Vuelve al inicio del perfil\n• Conversión a palabras para accesibilidad\n• Identificador único y seguro\n\nEsto es útil para personas con dificultades visuales.'
  },
  {
    id: 'profile-edit-button',
    target: 'button[id="edit-profile-btn"], #edit-profile-btn',
    title: 'Botón Editar Perfil',
    description: 'Este botón es clave para editar tu información.',
    action: 'HAZ CLIC en el botón "Editar (Auto-guardado)"',
    position: 'left',
    explanationTitle: '✅ Botón de Edición con Auto-guardado',
    explanationDescription: 'FUNCIONALIDAD PRINCIPAL:\n\n• Activa el modo de edición\n• Una vez activo, CUALQUIER cambio se guarda automáticamente\n• NO necesitas hacer clic en "Guardar"\n• Auto-guardado cada 500ms\n• Aparecerá indicador "Guardando..." cuando trabaje\n• Se desactiva automáticamente después de guardar\n\n¡Es completamente automático!'
  },
  {
    id: 'profile-phone-section', 
    target: 'div[id="telefono-field"], #telefono-field',
    title: 'Campo Teléfono',
    description: 'Campo editable más importante de tu perfil.',
    action: 'HAZ CLIC en la sección del teléfono',
    position: 'right',
    explanationTitle: '✅ Teléfono con Auto-guardado',
    explanationDescription: 'CAMPO EDITABLE:\n\n• Cuando hagas clic en "Editar", este campo se activará\n• Puedes escribir directamente tu nuevo número\n• Se guarda automáticamente cada 500ms\n• No necesitas botón "Guardar"\n• Acepta formato internacional (+56 9 1234 5678)\n• Esencial para recibir notificaciones'
  },
  {
    id: 'profile-address-section',
    target: 'div[id="direccion-field"], #direccion-field',
    title: 'Campo Dirección',
    description: 'Otro campo que puedes editar libremente.',
    action: 'HAZ CLIC en la sección de dirección',
    position: 'right',
    explanationTitle: '✅ Dirección Editable',
    explanationDescription: 'CAMPO DE TEXTO LIBRE:\n\n• También se activa con el botón "Editar"\n• Puedes escribir tu dirección completa\n• Auto-guardado cada 500ms como el teléfono\n• Acepta múltiples líneas\n• Importante para facturación y entregas\n• Mantén tu dirección actualizada'
  },
  {
    id: 'profile-financial-section',
    target: '.bg-green-50.rounded-lg.border-l-4.border-green-500, .bg-green-50:has(.text-green-700)',
    title: 'Estado Financiero',
    description: 'Información de tu saldo y deudas.',
    action: 'HAZ CLIC en la sección financiera (verde)',
    position: 'left',
    explanationTitle: '✅ Información Financiera',
    explanationDescription: 'DATOS FINANCIEROS IMPORTANTES:\n\n• SALDO ACTUAL: Dinero disponible en tu cuenta\n• DEUDA TOTAL: Lo que debes actualmente\n• Colores indicativos:\n  - Verde: Al día o saldo positivo\n  - Amarillo: Deuda moderada\n  - Rojo: Deuda crítica\n• Se actualiza automáticamente con pagos\n• Solo lectura, no editable'
  },
  {
    id: 'boletas',
    target: '#nav-boletas',
    title: 'Haz clic en Mis Boletas',
    description: 'Ahora vamos a ver tus facturas de agua.',
    action: 'HAZ CLIC en "Mis Boletas" resaltado',
    position: 'right',
    explanationTitle: '✅ Excelente! Accediste a tus Boletas',
    explanationDescription: 'Ahora vamos a explorar las funcionalidades de esta sección.'
  },
  // Boletas sub-steps
  {
    id: 'boletas-summary-cards',
    target: '.grid.grid-cols-1.md\\:grid-cols-4.gap-6.mb-8, div:has(.text-sm.font-medium.text-gray-600:contains("Total Boletas"))',
    title: 'Resumen de Boletas',
    description: 'Te muestro las tarjetas de resumen con estadísticas importantes.',
    action: 'HAZ CLIC en las tarjetas de resumen',
    position: 'top',
    explanationTitle: '✅ Tarjetas de Resumen',
    explanationDescription: 'Estas 4 tarjetas muestran información clave:\n\n• TOTAL BOLETAS: Cantidad total de facturas\n• PENDIENTES: Boletas por pagar (amarillo) ⏳\n• VENCIDAS: Boletas atrasadas (rojo) ⚠️\n• DEUDA TOTAL: Monto total que debes\n\n• Se actualizan automáticamente\n• Colores indican urgencia\n• Información en tiempo real'
  },
  {
    id: 'boletas-search-section',
    target: 'input[placeholder*="Buscar por número de boleta"], .relative:has(.Search)',
    title: 'Buscador de Boletas',
    description: 'Campo de búsqueda inteligente para encontrar boletas específicas.',
    action: 'HAZ CLIC en el campo de búsqueda',
    position: 'bottom',
    explanationTitle: '✅ Búsqueda Inteligente',
    explanationDescription: 'FUNCIONALIDAD DE BÚSQUEDA:\n\n• Busca por NÚMERO DE BOLETA\n• Busca por PERÍODO (mes/año)\n• 🔍 Ícono de lupa integrado\n• Búsqueda en tiempo real\n• No distingue mayúsculas/minúsculas\n• Se combina con los filtros\n\nEjemplo: "enero 2024" o "BOL-001"'
  },
  {
    id: 'boletas-filter-section',
    target: '.flex.gap-2:has(button:contains("Todas")), div:has(button:contains("Pendientes"))',
    title: 'Filtros por Estado',
    description: 'Filtros para organizar boletas por su estado de pago.',
    action: 'HAZ CLIC en los filtros de estado',
    position: 'top',
    explanationTitle: '✅ Sistema de Filtros',
    explanationDescription: 'FILTROS DISPONIBLES:\n\n• TODAS: Muestra todas las boletas\n• PENDIENTES ⏳: Solo las por pagar\n• PAGADAS ✅: Solo las ya canceladas  \n• VENCIDAS ⚠️: Solo las atrasadas\n\n• Se combina con la búsqueda\n• Cambia automáticamente las estadísticas\n• Facilita la organización'
  },
  {
    id: 'boletas-table-section',
    target: '.space-y-4:has(.hover\\:shadow-md), div:has(.font-semibold.text-lg:contains("Boleta"))',
    title: 'Lista de Boletas',
    description: 'Lista principal con todas tus boletas y sus detalles.',
    action: 'HAZ CLIC en la lista de boletas',
    position: 'right',
    explanationTitle: '✅ Lista de Boletas Detallada',
    explanationDescription: 'INFORMACIÓN EN CADA TARJETA:\n\n• NÚMERO: Identificador único de la boleta\n• PERÍODO: Mes/año de la facturación\n• FECHA EMISIÓN: Cuándo se emitió\n• FECHA VENCIMIENTO: Hasta cuándo pagar\n• MONTO: Cantidad a pagar\n• ESTADO: Badge de color según estado\n• ACCIONES: Botones para cada boleta'
  },
  {
    id: 'boletas-actions-section',
    target: '.flex.flex-col.sm\\:flex-row.gap-2:has(button), button:has(.Download)',
    title: 'Botones de Acción',
    description: 'Botones para interactuar con cada boleta individual.',
    action: 'HAZ CLIC en un botón de acción',
    position: 'left',
    explanationTitle: '✅ Acciones por Boleta',
    explanationDescription: 'BOTONES DISPONIBLES:\n\n• 📄 VER DETALLE: Información completa de la boleta\n• 📄 DESCARGAR PDF: Guarda la boleta en tu dispositivo\n• 💳 PAGAR: Ir directamente al proceso de pago\n\n• Íconos claros para cada función\n• Acceso rápido y directo\n• Estados dinámicos según boleta'
  },
  {
    id: 'pago',
    target: '#nav-pago',
    title: 'Haz clic en Realizar Pago',
    description: 'Veamos cómo puedes pagar tus deudas.',
    action: 'HAZ CLIC en "Realizar Pago" resaltado',
    position: 'right',
    explanationTitle: '✅ Perfecto! Accediste a Pagos',
    explanationDescription: 'Ahora vamos a ver cómo funciona el sistema de pagos.'
  },
  // Pagos sub-steps
  {
    id: 'pago-bills-selection',
    target: '.lg\\:col-span-2 .space-y-6, div:has(#select-all)',
    title: 'Selección de Boletas',
    description: 'Te muestro la sección donde seleccionas qué boletas pagar.',
    action: 'HAZ CLIC en la sección de selección de boletas',
    position: 'right',
    explanationTitle: '✅ Selección Inteligente de Boletas',
    explanationDescription: 'Esta sección te permite:\n\n• SELECCIONAR TODAS: Checkbox para pagar todas las pendientes\n• SELECCIÓN INDIVIDUAL: Elige boletas específicas con checkbox\n• INFORMACIÓN COMPLETA: Número, período, consumo, vencimiento\n• ESTADO VISUAL: Badges rojas para vencidas, amarillas para pendientes\n• CONTROL TOTAL: Tú decides qué pagar y cuándo\n\n• Optimiza tu flujo de caja\n• Evita pagos innecesarios\n• Gestión financiera inteligente'
  },
  {
    id: 'pago-methods-section',
    target: 'div:has([data-state]), .space-y-3:has(.RadioGroup), div:has(input[type="radio"])',
    title: 'Métodos de Pago',
    description: 'Te muestro los métodos de pago seguros disponibles.',
    action: 'HAZ CLIC en la sección de métodos de pago',
    position: 'left',
    explanationTitle: '✅ Métodos de Pago Seguros',
    explanationDescription: 'Opciones de pago 100% seguras:\n\n• 💳 WEBPAY: Tarjetas crédito y débito Transbank\n• 📱 FLOW: Pago con Flow (múltiples bancos)\n• 🛒 MERCADOPAGO: Plataforma MercadoPago\n• 🏦 TRANSFERENCIA: Transferencia bancaria directa\n\n• Encriptación SSL de datos\n• Certificados de seguridad\n• Sin almacenar información sensible\n• Procesamiento instantáneo y confiable'
  },
  {
    id: 'pago-summary-card',
    target: '.sticky.top-4, div:has(button[class*="bg-green"])',
    title: 'Resumen de Pago',
    description: 'Te muestro el resumen final con el total a pagar.',
    action: 'HAZ CLIC en el resumen de pago',
    position: 'left',
    explanationTitle: '✅ Resumen Inteligente',
    explanationDescription: 'El resumen incluye:\n\n• BOLETAS SELECCIONADAS: Cantidad y detalle\n• DESGLOSE INDIVIDUAL: Cada boleta con su monto\n• TOTAL CALCULADO: Suma automática actualizada\n• TÉRMINOS Y CONDICIONES: Aceptación obligatoria\n• BOTÓN PAGO SEGURO: Con escudo de protección\n• INFO SEGURIDAD: Garantía de encriptación\n\n• Transparencia total en costos\n• Sin cargos ocultos ni sorpresas'
  },
  {
    id: 'pago-security-info',
    target: '.bg-blue-50.border-blue-200, div:has(.text-blue-800)',
    title: 'Información de Seguridad',
    description: 'Te muestro la garantía de seguridad en los pagos.',
    action: 'HAZ CLIC en la información de seguridad',
    position: 'top',
    explanationTitle: '✅ Garantía de Seguridad Total',
    explanationDescription: 'Protección completa garantizada:\n\n• 🔒 ENCRIPTACIÓN SSL: Datos protegidos en tránsito\n• 🛡️ CERTIFICADOS: Validación de seguridad\n• 🚫 SIN ALMACENAMIENTO: No guardamos datos bancarios\n• ⚡ PROCESAMIENTO SEGURO: Directo con proveedores\n• 📱 COMPATIBLE: Funciona en todos los dispositivos\n• 🔐 CUMPLIMIENTO NORMATIVO: Estándares internacionales\n\nTu información está 100% protegida.'
  },
  {
    id: 'chat',
    target: '#nav-chat',
    title: 'Haz clic en Soporte',
    description: 'Ahora veamos el chat de ayuda.',
    action: 'HAZ CLIC en "Soporte" resaltado',
    position: 'right',
    explanationTitle: '✅ Genial! Accediste al Chat',
    explanationDescription: 'Vamos a ver cómo funciona el sistema de soporte.'
  },
  // Chat sub-steps
  {
    id: 'chat-header-section',
    target: '.bg-white.border-b, div:has(.text-lg.font-semibold)',
    title: 'Header del Chat',
    description: 'Te muestro la información del chat y estado de conexión.',
    action: 'HAZ CLIC en el header del chat',
    position: 'bottom',
    explanationTitle: '✅ Header Inteligente del Chat',
    explanationDescription: 'El header contiene información clave:\n\n• ESTADO DEL CHAT: Activo/Cerrado\n• ADMINISTRADOR ASIGNADO: Quién te atiende\n• MENSAJES NUEVOS: Contador de no leídos\n• ESTADO DE CONEXIÓN: En línea/Desconectado (indicador)\n• FECHA DE INICIO: Cuándo comenzó la conversación\n\n• Información en tiempo real\n• Transparencia total del servicio'
  },
  {
    id: 'chat-messages-area',
    target: '.h-96.overflow-y-auto, div:has(.h-96.overflow-y-auto)',
    title: 'Área de Mensajes',
    description: 'Te muestro donde aparecen todos los mensajes de la conversación.',
    action: 'HAZ CLIC en el área de mensajes',
    position: 'right',
    explanationTitle: '✅ Área de Conversación',
    explanationDescription: 'Funcionalidades del área de mensajes:\n\n• HISTORIAL COMPLETO: Todos los mensajes guardados\n• MENSAJES PROPIOS: En azul a la derecha\n• MENSAJES ADMIN: En gris a la izquierda\n• INDICADORES DE ESTADO: ✓ enviado, ✓✓ leído\n• TIMESTAMPS: Hora de cada mensaje\n• SCROLL AUTOMÁTICO: Se posiciona en el último mensaje\n• INDICADOR ESCRIBIENDO: Puntos animados cuando escriben'
  },
  {
    id: 'chat-input-area',
    target: '.border-t.px-4.py-4, div:has(textarea[placeholder*="mensaje"])',
    title: 'Área de Escritura',
    description: 'Te muestro donde puedes escribir tus mensajes.',
    action: 'HAZ CLIC en el área de escritura',
    position: 'top',
    explanationTitle: '✅ Área de Escritura Avanzada',
    explanationDescription: 'Funcionalidades de escritura:\n\n• TEXTAREA EXPANDIBLE: Se adapta al contenido\n• LÍMITE DE CARACTERES: 1000 caracteres máximo\n• CONTADOR VISIBLE: Muestra caracteres usados\n• ATAJOS DE TECLADO: Enter para enviar, Shift+Enter para nueva línea\n• INDICADOR ESCRIBIENDO: Notifica a los admins cuando escribes\n• ENVÍO INTELIGENTE: Solo se activa con texto\n• ESTADO LOADING: Muestra enviando...'
  },
  {
    id: 'chat-actions-section',
    target: 'button:has(.h-5.w-5), .bg-blue-600.text-white',
    title: 'Botón de Envío',
    description: 'Te muestro el botón para enviar mensajes.',
    action: 'HAZ CLIC en el botón de envío',
    position: 'left',
    explanationTitle: '✅ Botón de Envío Inteligente',
    explanationDescription: 'Características del botón de envío:\n\n• ÍCONO SEND: Claro y reconocible ✈️\n• ESTADO DISABLED: Se desactiva sin texto\n• ANIMACIÓN LOADING: Spinner mientras envía\n• FEEDBACK VISUAL: Cambia color al hover\n• PREVENCIÓN SPAM: No permite envío múltiple\n• ACCESIBILIDAD: Funciona con Enter\n\nEnvío rápido y seguro garantizado.'
  },
  {
    id: 'chat-help-section',
    target: '.px-4.py-2.bg-blue-50, div:has(.text-xs.text-blue-700)',
    title: 'Ayuda de Chat',
    description: 'Te muestro los tips de uso del chat.',
    action: 'HAZ CLIC en la ayuda del chat',
    position: 'top',
    explanationTitle: '✅ Ayuda y Tips Integrados',
    explanationDescription: 'Tips útiles del chat:\n\n• 💡 ENTER: Envía mensaje directamente\n• 💡 SHIFT + ENTER: Salto de línea sin enviar\n• 💡 LÍMITE: Máximo 1000 caracteres por mensaje\n• 💡 TIEMPO REAL: Los mensajes llegan instantáneamente\n• 💡 HISTORIAL: Se guarda toda la conversación\n• 💡 NOTIFICACIONES: Te avisamos de respuestas\n\nUso óptimo y eficiente del sistema.'
  },
  {
    id: 'dashboard',
    target: '#nav-dashboard',
    title: 'Vuelve al Dashboard',
    description: 'Regresemos al panel principal.',
    action: 'HAZ CLIC en "Dashboard" resaltado',
    position: 'right',
    explanationTitle: '✅ Perfecto! Volviste al Dashboard',
    explanationDescription: 'Ahora vamos a ver las funcionalidades del panel principal.'
  },
  // Dashboard sub-steps
  {
    id: 'dashboard-welcome-cards',
    target: '#welcome-cards, div[id="welcome-cards"]',
    title: 'Tarjetas de Resumen Financiero',
    description: 'Te muestro las 3 tarjetas principales con tu estado financiero.',
    action: 'HAZ CLIC en las tarjetas de resumen financiero',
    position: 'top',
    explanationTitle: '✅ Resumen Financiero Completo',
    explanationDescription: 'Las 3 tarjetas principales muestran:\n\n• 💰 SALDO ACTUAL: Crédito disponible en verde\n• ⚠️ DEUDA TOTAL: Monto pendiente en rojo\n• 📊 ESTADO GENERAL: Badge con estado de cuenta\n\n• Colores semáforo para interpretación rápida\n• Íconos descriptivos (DollarSign, AlertCircle, CheckCircle)\n• Actualización automática con cada pago\n• Indicadores de criticidad por colores\n\nVisión financiera instantánea y clara.'
  },
  {
    id: 'dashboard-quick-actions',
    target: '.grid.grid-cols-1.md\\:grid-cols-4.gap-4:has(.h-20), div:has(button.h-20.flex.flex-col)',
    title: 'Botones de Acción Rápida',
    description: 'Te muestro los 4 botones para acceso directo a funciones.',
    action: 'HAZ CLIC en los botones de acción rápida',
    position: 'bottom',
    explanationTitle: '✅ Acciones Rápidas Inteligentes',
    explanationDescription: 'Los 4 botones principales ofrecen:\n\n• 📄 VER MIS BOLETAS: Acceso directo a facturas\n• 💳 PAGAR DEUDA: Botón habilitado solo con deuda\n• 📜 HISTORIAL DE PAGOS: Registro de pagos anteriores\n• 💬 CHAT DE SOPORTE: Ayuda directa en vivo\n\n• Íconos grandes (FileText, CreditCard, History, MessageCircle)\n• Estados dinámicos (habilitado/deshabilitado)\n• Navegación directa a cada sección\n• Altura fija de 20 (h-20) para uniformidad'
  },
  {
    id: 'dashboard-contact-info',
    target: '.grid.grid-cols-1.md\\:grid-cols-2.gap-6:has(.text-sm.text-gray-600), div:has(.text-sm.text-gray-600:contains("Email"))',
    title: 'Información Personal y de Cuenta',
    description: 'Te muestro las tarjetas con tu información personal y de cuenta.',
    action: 'HAZ CLIC en las tarjetas de información',
    position: 'right',
    explanationTitle: '✅ Información Personal Completa',
    explanationDescription: 'Dos tarjetas informativas contienen:\n\n• 📧 INFORMACIÓN DE CONTACTO:\n  - Email registrado\n  - Teléfono (si existe)\n  - Dirección (si existe)\n\n• 🆔 INFORMACIÓN DE CUENTA:\n  - RUT identificador\n  - Fecha de ingreso al sistema\n  - Estado de cuenta (Activo/Inactivo)\n\n• Datos de solo lectura\n• Información siempre actualizada\n• Base para edición en perfil'
  },
  {
    id: 'dashboard-debt-alert',
    target: '.mt-6.border-yellow-200.bg-yellow-50, div:has(.text-yellow-800:contains("Tienes deuda pendiente"))',
    title: 'Alerta de Deuda',
    description: 'Te muestro la alerta que aparece cuando tienes deuda pendiente.',
    action: 'HAZ CLIC en la alerta de deuda (si aparece)',
    position: 'top',
    explanationTitle: '✅ Sistema de Alertas Inteligente',
    explanationDescription: 'La alerta de deuda incluye:\n\n• ⚠️ ÍCONO DE ALERTA: AlertCircle visual llamativo\n• MONTO ESPECÍFICO: Cantidad exacta que debes\n• RECOMENDACIÓN: Pagar pronto para evitar recargos\n• BOTÓN PAGAR AHORA: Acceso directo al pago\n• COLORES AMARILLO: border-yellow-200 bg-yellow-50\n\n• Solo aparece CON deuda pendiente (condicional)\n• Se oculta automáticamente al pagar\n• Previene olvidos y recargos\n• Call-to-action claro y directo'
  },
  {
    id: 'floating-button',
    target: 'body',
    title: 'Botón Flotante Inteligente',
    description: 'FUNCIONALIDAD ESPECIAL: Cuando hagas scroll hacia abajo, aparecerá automáticamente un botón flotante azul en la esquina superior izquierda para acceso rápido al menú.',
    action: 'Haz scroll hacia abajo para ver el botón flotante',
    position: 'top'
  },
  {
    id: 'complete',
    target: 'body',
    title: '¡Tutorial Completado! 🎉',
    description: 'Has completado el recorrido completo por todas las funciones:\n\n✅ Perfil con campos editables y auto-guardado\n✅ Boletas con filtros, lista y descargas PDF\n✅ Pagos seguros con múltiples métodos\n✅ Chat de soporte en vivo\n✅ Dashboard con resumen y acciones rápidas\n✅ Botón flotante inteligente\n\n¡Ya conoces todo el portal!',
    action: 'Haz clic en "Finalizar" para cerrar',
    position: 'top'
  }
];

interface SpotlightTutorialProps {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
}

export default function SpotlightTutorial({ isOpen, onClose, userName }: SpotlightTutorialProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isWaitingForClick, setIsWaitingForClick] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });
  const [isCalculating, setIsCalculating] = useState(false);

  const getCurrentStep = () => TUTORIAL_STEPS[currentStep];
  const isLastStep = currentStep === TUTORIAL_STEPS.length - 1;

  // Handler functions
  const handleNext = useCallback(() => {
    if (showExplanation) {
      // Move to next step after explanation
      setShowExplanation(false);
      if (isLastStep) {
        onClose();
      } else {
        setCurrentStep(prev => prev + 1);
      }
    } else {
      // Regular next step
      if (isLastStep) {
        onClose();
      } else {
        setCurrentStep(prev => prev + 1);
        setIsWaitingForClick(false);
      }
    }
  }, [showExplanation, isLastStep, onClose]);

  const handleSkipStep = useCallback(() => {
    setShowExplanation(false);
    if (isLastStep) {
      onClose();
    } else {
      setCurrentStep(prev => prev + 1);
      setIsWaitingForClick(false);
    }
  }, [isLastStep, onClose]);

  const handleFinishTutorial = useCallback(() => {
    onClose();
  }, [onClose]);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  // Calculate spotlight and popup position
  const calculatePositions = useCallback(() => {
    if (isCalculating) return; // Prevent multiple calculations
    
    const step = getCurrentStep();
    if (!step.target || step.target === 'body') return;

    setIsCalculating(true);
    
    // Use setTimeout to ensure DOM is ready
    setTimeout(() => {
      // Try multiple selectors for better element detection
      const selectors = step.target.split(',').map(s => s.trim());
      let element: HTMLElement | null = null;
      
      for (const selector of selectors) {
        element = document.querySelector(selector) as HTMLElement;
        if (element) break;
      }
    
    // Fallback: try to find elements by common patterns based on current view
    if (!element) {
      // Detect current view by checking which elements exist
      const isInProfileView = document.querySelector('#rut-section') !== null;
      const isInBoletasView = document.querySelector('.grid.grid-cols-1.md\\:grid-cols-4') !== null;
      const isInDashboardView = document.querySelector('#welcome-cards') !== null;
      
      if (step.id.includes('profile') && !isInProfileView) {
        // If asking for profile elements but not in profile view, skip or wait
        return;
      }
      
      if (step.id.includes('boletas') && !isInBoletasView) {
        // If asking for boletas elements but not in boletas view, skip or wait  
        return;
      }
      
      if (step.id.includes('dashboard') && !isInDashboardView) {
        // If asking for dashboard elements but not in dashboard view, skip or wait
        return;
      }
      
      // Try fallback selectors only if in correct view
      const candidates = [
        // Profile elements
        '#rut-section',
        'div[id="rut-section"]',
        '#edit-profile-btn', 
        'button[id="edit-profile-btn"]',
        '#telefono-field',
        'div[id="telefono-field"]',
        '#direccion-field',
        'div[id="direccion-field"]',
        '.bg-green-50.rounded-lg.border-l-4.border-green-500',
        // Dashboard elements
        '#welcome-cards',
        'div[id="welcome-cards"]',
        '.grid.grid-cols-1.md\\:grid-cols-4.gap-4',
        'button.h-20.flex.flex-col',
        // Boletas elements
        '.grid.grid-cols-1.md\\:grid-cols-4.gap-6.mb-8',
        'input[placeholder*="Buscar por número de boleta"]',
        '.flex.gap-2:has(button)',
        '.space-y-4:has(.hover\\:shadow-md)',
        // Chat elements
        '.bg-white.border-b',
        '.h-96.overflow-y-auto',
        'textarea[placeholder*="mensaje"]',
        '.bg-blue-600.text-white',
        // Pago elements  
        '.lg\\:col-span-2',
        'input[type="radio"]',
        '.sticky.top-4'
      ];
      for (const candidate of candidates) {
        const foundElement = document.querySelector(candidate) as HTMLElement;
        if (foundElement) {
          element = foundElement;
          break;
        }
      }
    }
    if (!element && step.id.includes('profile') && !step.id.includes('profile-')) {
      element = document.querySelector('[data-profile], .profile, .perfil') as HTMLElement;
    }
    if (!element && step.id.includes('boletas')) {
      element = document.querySelector('[data-boletas], .boletas, .bills') as HTMLElement;
    }
    if (!element && step.id.includes('pago')) {
      element = document.querySelector('[data-pago], .payment, .pago') as HTMLElement;
    }
    if (!element && step.id.includes('chat')) {
      element = document.querySelector('[data-chat], .chat, .soporte') as HTMLElement;
    }

      if (!element) {
        setIsCalculating(false);
        return;
      }

      const rect = element.getBoundingClientRect();
      setTargetRect(rect);

      // Calculate popup position based on step.position
      let x = rect.left;
      let y = rect.top;

      switch (step.position) {
        case 'right':
          x = rect.right + 20;
          y = rect.top;
          break;
        case 'left':
          x = rect.left - 350;
          y = rect.top;
          break;
        case 'bottom':
          x = rect.left;
          y = rect.bottom + 20;
          break;
        case 'top':
          x = rect.left;
          y = rect.top - 200;
          break;
      }

      // Keep popup within viewport
      const popupWidth = 350;
      const popupHeight = 200;
      
      if (x + popupWidth > window.innerWidth) {
        x = window.innerWidth - popupWidth - 20;
      }
      if (x < 20) x = 20;
      if (y + popupHeight > window.innerHeight) {
        y = window.innerHeight - popupHeight - 20;
      }
      if (y < 20) y = 20;

      setPopupPosition({ x, y });
      setIsCalculating(false);
    }, 50); // Small delay to ensure DOM stability
  }, [currentStep, isCalculating]);


  // Setup spotlight effect
  useEffect(() => {
    if (!isOpen) return;

    const step = getCurrentStep();
    
    // Handle body/welcome steps (no click required)
    if (step.target === 'body' || !step.target) {
      setIsWaitingForClick(false);
      setShowExplanation(false);
      calculatePositions();
      return;
    }

    // If showing explanation, don't set up click listeners
    if (showExplanation) {
      calculatePositions();
      return;
    }

    // Calculate positions first
    calculatePositions();

    // Try multiple selectors for better element detection
    const selectors = step.target.split(',').map(s => s.trim());
    let element: HTMLElement | null = null;
    
    for (const selector of selectors) {
      element = document.querySelector(selector) as HTMLElement;
      if (element) break;
    }
    
    // Fallback: try to find elements by common patterns based on current view
    if (!element) {
      // Detect current view by checking which elements exist
      const isInProfileView = document.querySelector('#rut-section') !== null;
      const isInBoletasView = document.querySelector('.grid.grid-cols-1.md\\:grid-cols-4') !== null;
      const isInDashboardView = document.querySelector('#welcome-cards') !== null;
      
      if (step.id.includes('profile') && !isInProfileView) {
        // If asking for profile elements but not in profile view, auto-advance or wait
        console.warn(`Tutorial: Profile step ${step.id} but not in profile view`);
        return;
      }
      
      if (step.id.includes('boletas') && !isInBoletasView) {
        console.warn(`Tutorial: Boletas step ${step.id} but not in boletas view`);
        return;
      }
      
      if (step.id.includes('dashboard') && !isInDashboardView) {
        console.warn(`Tutorial: Dashboard step ${step.id} but not in dashboard view`);
        return;
      }
      
      const candidates = [
        // Profile elements
        '#rut-section',
        'div[id="rut-section"]',
        '#edit-profile-btn', 
        'button[id="edit-profile-btn"]',
        '#telefono-field',
        'div[id="telefono-field"]',
        '#direccion-field',
        'div[id="direccion-field"]',
        '.bg-green-50.rounded-lg.border-l-4.border-green-500',
        // Dashboard elements
        '#welcome-cards',
        'div[id="welcome-cards"]',
        '.grid.grid-cols-1.md\\:grid-cols-4.gap-4',
        'button.h-20.flex.flex-col',
        // Boletas elements
        '.grid.grid-cols-1.md\\:grid-cols-4.gap-6.mb-8',
        'input[placeholder*="Buscar por número de boleta"]',
        '.flex.gap-2:has(button)',
        '.space-y-4:has(.hover\\:shadow-md)',
        // Chat elements
        '.bg-white.border-b',
        '.h-96.overflow-y-auto',
        'textarea[placeholder*="mensaje"]',
        '.bg-blue-600.text-white',
        // Pago elements  
        '.lg\\:col-span-2',
        'input[type="radio"]',
        '.sticky.top-4'
      ];
      for (const candidate of candidates) {
        const foundElement = document.querySelector(candidate) as HTMLElement;
        if (foundElement) {
          element = foundElement;
          break;
        }
      }
    }
    if (!element && step.id.includes('profile') && !step.id.includes('profile-')) {
      element = document.querySelector('[data-profile], .profile, .perfil, input[name*="nombre"], .user-info') as HTMLElement;
    }
    if (!element && step.id.includes('boletas')) {
      element = document.querySelector('[data-boletas], .boletas, .bills, .facturas') as HTMLElement;
    }
    if (!element && step.id.includes('pago')) {
      element = document.querySelector('[data-pago], .payment, .pago, .pay') as HTMLElement;
    }
    if (!element && step.id.includes('chat')) {
      element = document.querySelector('[data-chat], .chat, .soporte, .support') as HTMLElement;
    }
    
    if (!element) {
      console.warn(`Tutorial: Element not found for step: ${step.id}, target: ${step.target}`);
      // Don't auto-skip, just show error message instead
      setIsWaitingForClick(false);
      return;
    }

    // Set up click detection
    setIsWaitingForClick(true);
    
    // Add click listener with high priority
    const clickHandler = (e: Event) => {
      console.log('Click detected on tutorial element:', element);
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      
      setIsWaitingForClick(false);
      
      // Show explanation after click
      if (step.explanationTitle && step.explanationDescription) {
        setShowExplanation(true);
      } else {
        // If no explanation, move to next step
        setTimeout(() => {
          if (currentStep < TUTORIAL_STEPS.length - 1) {
            setCurrentStep(prev => prev + 1);
          }
        }, 500);
      }
      
      return false;
    };

    element.addEventListener('click', clickHandler, true);
    element.addEventListener('mousedown', clickHandler, true);

    return () => {
      element.removeEventListener('click', clickHandler, true);
      element.removeEventListener('mousedown', clickHandler, true);
    };
  }, [isOpen, currentStep, showExplanation, calculatePositions]);

  // Update positions on scroll/resize with throttling
  useEffect(() => {
    if (!isOpen) return;

    let ticking = false;
    const updatePositions = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          calculatePositions();
          ticking = false;
        });
        ticking = true;
      }
    };
    
    window.addEventListener('scroll', updatePositions, { passive: true });
    window.addEventListener('resize', updatePositions, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', updatePositions);
      window.removeEventListener('resize', updatePositions);
    };
  }, [isOpen, calculatePositions]);



  if (!isOpen) return null;

  const step = getCurrentStep();
  const hasSpotlight = step.target !== 'body' && targetRect && !showExplanation;

  return (
    <>
      {/* Dark Overlay with Spotlight */}
      <div className="fixed inset-0 z-[9999] pointer-events-none">
        {/* Four overlay sections to create spotlight effect */}
        {hasSpotlight ? (
          <>
            {/* Top section */}
            <div
              className="absolute bg-black bg-opacity-30 cursor-not-allowed"
              style={{
                left: 0,
                top: 0,
                width: '100%',
                height: targetRect.top - 8,
                pointerEvents: 'auto'
              }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
            />
            
            {/* Bottom section */}
            <div
              className="absolute bg-black bg-opacity-30 cursor-not-allowed"
              style={{
                left: 0,
                top: targetRect.bottom + 8,
                width: '100%',
                height: `calc(100% - ${targetRect.bottom + 8}px)`,
                pointerEvents: 'auto'
              }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
            />
            
            {/* Left section */}
            <div
              className="absolute bg-black bg-opacity-30 cursor-not-allowed"
              style={{
                left: 0,
                top: targetRect.top - 8,
                width: targetRect.left - 8,
                height: targetRect.height + 16,
                pointerEvents: 'auto'
              }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
            />
            
            {/* Right section */}
            <div
              className="absolute bg-black bg-opacity-30 cursor-not-allowed"
              style={{
                left: targetRect.right + 8,
                top: targetRect.top - 8,
                width: `calc(100% - ${targetRect.right + 8}px)`,
                height: targetRect.height + 16,
                pointerEvents: 'auto'
              }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
            />
          </>
        ) : (
          /* Full overlay for non-spotlight steps */
          <div className="absolute inset-0 bg-black bg-opacity-35 pointer-events-auto" />
        )}

        {/* Highlighted Element Border */}
        {hasSpotlight && (
          <div
            className="absolute border-2 border-blue-500 rounded-lg shadow-lg animate-pulse pointer-events-none transition-all duration-300 ease-in-out"
            style={{
              left: targetRect.left - 4,
              top: targetRect.top - 4,
              width: targetRect.width + 8,
              height: targetRect.height + 8,
              boxShadow: '0 0 0 4px rgba(59, 130, 246, 0.3), 0 0 20px rgba(59, 130, 246, 0.5)'
            }}
          />
        )}
      </div>

      {/* Tutorial Popup */}
      <div
        className="fixed z-[10000] bg-white rounded-xl shadow-2xl w-80"
        style={{
          left: hasSpotlight ? popupPosition.x : '50%',
          top: hasSpotlight ? popupPosition.y : '50%',
          transform: hasSpotlight ? 'none' : 'translate(-50%, -50%)'
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
              <Target className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-sm">Tutorial Interactivo</h2>
              <p className="text-xs text-gray-500">Paso {currentStep + 1} de {TUTORIAL_STEPS.length}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-4 pt-3">
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div 
              className="bg-blue-600 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${((currentStep + 1) / TUTORIAL_STEPS.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="mb-4">
            {step.id === 'complete' ? (
              <div className="text-4xl mb-3 text-center">🎉</div>
            ) : isWaitingForClick ? (
              <div className="text-4xl mb-3 text-center animate-bounce">👆</div>
            ) : (
              <div className="text-4xl mb-3 text-center">🎯</div>
            )}
            
            <h3 className="text-lg font-bold mb-2">
              {showExplanation && step.explanationTitle ? step.explanationTitle : step.title}
            </h3>
            
            <p className="text-sm text-gray-600 leading-relaxed mb-3">
              {showExplanation && step.explanationDescription ? step.explanationDescription : step.description}
            </p>

            {isWaitingForClick && !showExplanation ? (
              <div className="space-y-3">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-blue-700 text-sm font-medium">
                    <div className="animate-bounce">👆</div>
                    <span>{step.action}</span>
                  </div>
                </div>
                
                {/* Manual navigation buttons when waiting for click */}
                <div className="flex gap-2">
                  <button
                    onClick={handleSkipStep}
                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1"
                  >
                    Saltar
                    <ArrowRight className="w-3 h-3" />
                  </button>
                  <button
                    onClick={handleFinishTutorial}
                    className="flex-1 bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1"
                  >
                    <X className="w-3 h-3" />
                    Finalizar
                  </button>
                </div>
              </div>
            ) : showExplanation ? (
              <div className="space-y-3">
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-green-700 text-sm font-medium">
                    <CheckCircle className="w-4 h-4" />
                    <span>¡Clic detectado! Ahora entiendes para qué sirve esta función</span>
                  </div>
                </div>
                
                <button
                  onClick={handleNext}
                  className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {isLastStep ? 'Finalizar Tutorial' : 'Continuar al Siguiente'}
                  <ArrowRight className="w-4 h-4" />
                </button>
                
                <button
                  onClick={handleFinishTutorial}
                  className="w-full bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Finalizar Tutorial Ahora
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <button
                  onClick={handleNext}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {isLastStep ? (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Finalizar Tutorial
                    </>
                  ) : (
                    <>
                      Continuar
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
                
                {/* Manual navigation when not waiting for click */}
                {!isLastStep && (
                  <button
                    onClick={handleFinishTutorial}
                    className="w-full bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <X className="w-4 h-4" />
                    Finalizar Tutorial
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// Hook para usar el tutorial spotlight
export function useSpotlightTutorial() {
  const [showTutorial, setShowTutorial] = useState(false);

  useEffect(() => {
    const hasCompletedTutorial = localStorage.getItem('spotlight-tutorial-completed');
    if (!hasCompletedTutorial) {
      const timer = setTimeout(() => {
        setShowTutorial(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  const startTutorial = () => setShowTutorial(true);
  
  const hideTutorial = () => {
    setShowTutorial(false);
    localStorage.setItem('spotlight-tutorial-completed', 'true');
  };

  const resetTutorial = () => {
    localStorage.removeItem('spotlight-tutorial-completed');
    setShowTutorial(true);
  };

  return {
    showTutorial,
    startTutorial,
    hideTutorial,
    resetTutorial
  };
}