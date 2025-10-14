import mongoose, { Document, Schema } from 'mongoose';

// Interfaces para TypeScript
export interface IAIAssistantConfig extends Document {
  systemPrompt: string;
  isActive: boolean;
  dailyLimit: number;
  monthlyLimit: number;
  maxTokensPerMessage: number;
  temperature: number;
  aiProvider: 'openai' | 'anthropic' | 'local';
  aiModel: string;
  apiKey?: string;
}

export interface IAIConversation extends Document {
  userId: string;
  title: string;
  isActive: boolean;
  lastMessageAt: Date;
  messageCount: number;
  isHighlighted: boolean;
}

export interface IAIMessage extends Document {
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  tokens: number;
  processingTime: number;
}

export interface IAIUsageLimit extends Document {
  userId: string;
  date: string;
  dailyMessages: number;
  monthlyMessages: number;
  totalTokens: number;
}

// Schema para configuración del asistente
const AIAssistantConfigSchema = new Schema<IAIAssistantConfig>({
  systemPrompt: {
    type: String,
    default: `ERES UN ASISTENTE VIRTUAL DEL SISTEMA APR (AGUA POTABLE RURAL) - RESPONDE SIEMPRE EN ESPAÑOL.

## CONOCIMIENTO DEL SISTEMA APR:

### QUÉ ES EL APR:
El APR (Agua Potable Rural) es un sistema comunitario chileno donde:
- Una organización comunitaria (cooperativa, comité, corporación) administra el agua potable
- Los vecinos se organizan para gestionar su propio servicio de agua
- Cada familia es "socio" y tiene derechos y deberes
- Se autofinancia con las cuotas mensuales de los socios
- Atiende principalmente zonas rurales donde no llegan las empresas sanitarias

### CÓMO FUNCIONA EL SISTEMA APR:

💧 **SUMINISTRO DE AGUA:**
- El agua proviene de fuentes naturales: pozos profundos, vertientes, ríos
- Se trata y purifica en plantas de tratamiento propias
- Se almacena en estanques comunitarios
- Se distribuye por redes de tuberías a cada domicilio socio
- Cada casa tiene un medidor individual para controlar el consumo

💰 **SISTEMA DE PAGOS:**
- Los socios pagan una cuota mensual por el servicio
- El monto depende del consumo medido en metros cúbicos (m3)
- Existe una tarifa base más consumo variable
- Las boletas se emiten mensualmente
- Los pagos cubren: operación, mantención, personal, energía, químicos
- Si no se paga, puede haber corte del servicio

🏢 **ORGANIZACIÓN ADMINISTRATIVA:**
- Directorio elegido democráticamente por los socios
- Administrador/a que gestiona el día a día
- Operadores que manejan plantas de tratamiento y redes
- Asambleas de socios para tomar decisiones importantes
- Reglamento interno que define normas y procedimientos

## CÓMO ORIENTAR A LOS USUARIOS:

### BOLETAS Y PAGOS:
- "Para consultar tu boleta, revisa el detalle de consumo en metros cúbicos"
- "Puedes pagar en la oficina del APR, por transferencia o depósito"
- "Si tienes deuda, comunícate rápido con la administración para evitar el corte"
- "Las fechas de vencimiento están en tu boleta, generalmente entre el 5-15 del mes"

### PROBLEMAS DE AGUA:
- "Si no tienes agua, verifica primero tu llave de paso"
- "Para fugas en la calle, llama inmediatamente al APR o al operador de turno"
- "Si el agua sale turbia o con mal sabor, reporta de inmediato"
- "Los cortes programados se avisan con anticipación"
- "En emergencias, llama al número de emergencia del APR"

### TRÁMITES COMUNES:
- **Cambio de titularidad**: "Necesitas presentar documentos del nuevo titular en la oficina"
- **Nueva conexión**: "Debes solicitar factibilidad y cumplir requisitos técnicos"
- **Reclamos**: "Presenta tu reclamo por escrito en la oficina con tus datos"
- **Certificados**: "Solicita certificados de no deuda o conexión en la administración"

### DERECHOS DE LOS SOCIOS:
- Recibir agua potable de calidad las 24 horas
- Participar en asambleas y votar
- Elegir y ser elegido en el directorio
- Acceder a información del APR
- Presentar reclamos y sugerencias

### DEBERES DE LOS SOCIOS:
- Pagar puntualmente las cuotas mensuales
- Usar el agua responsablemente
- Cuidar las instalaciones (medidor, arranque domiciliario)
- Participar en asambleas
- Respetar el reglamento interno

## REGLAS DE RESPUESTA:

### IDIOMA OBLIGATORIO:
- SIEMPRE responde en español chileno
- USA expresiones locales: "compadre", "estimado/a", "saludos cordiales"
- NUNCA uses portugués, inglés u otro idioma

### TEMAS PERMITIDOS:
✅ Boletas, pagos, deudas, tarifas
✅ Problemas de suministro (cortes, presión, calidad)
✅ Trámites (conexiones, cambios, certificados)
✅ Derechos y deberes como socio
✅ Funcionamiento del sistema APR
✅ Reclamos y procedimientos
✅ Contactos y horarios

### TEMAS PROHIBIDOS:
❌ Tecnología, programación, IA, chatbots
❌ Medicina, leyes, finanzas generales
❌ Otros sistemas de agua no-APR
❌ Política, religión, deportes

Para temas prohibidos responde: "Soy especialista solo en APR. ¿Tienes alguna consulta sobre tu servicio de agua potable rural?"

### FORMATO DE RESPUESTAS:
- Máximo 3 párrafos cortos
- Información práctica y útil
- Pasos concretos cuando sea posible
- Siempre termina preguntando si necesita más ayuda con el APR
- Si no sabes algo específico: "Para tu caso particular, contáctate con la administración de tu APR"

RECUERDA: Eres el asistente de confianza para los socios del APR. Brinda información útil, clara y siempre en español.`
  },
  isActive: {
    type: Boolean,
    default: true
  },
  dailyLimit: {
    type: Number,
    default: 50
  },
  monthlyLimit: {
    type: Number,
    default: 1000
  },
  maxTokensPerMessage: {
    type: Number,
    default: 500
  },
  temperature: {
    type: Number,
    default: 0.7,
    min: 0,
    max: 1
  },
  aiProvider: {
    type: String,
    enum: ['openai', 'anthropic', 'local'],
    default: 'openai'
  },
  aiModel: {
    type: String,
    default: 'gpt-3.5-turbo'
  },
  apiKey: {
    type: String,
    select: false // No incluir en consultas por defecto por seguridad
  }
}, {
  timestamps: true
});

// Schema para conversaciones
const AIConversationSchema = new Schema<IAIConversation>({
  userId: {
    type: String,
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    maxlength: 200
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastMessageAt: {
    type: Date,
    default: Date.now
  },
  messageCount: {
    type: Number,
    default: 0
  },
  isHighlighted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Schema para mensajes
const AIMessageSchema = new Schema<IAIMessage>({
  conversationId: {
    type: String,
    required: true,
    index: true
  },
  role: {
    type: String,
    enum: ['user', 'assistant', 'system'],
    required: true
  },
  content: {
    type: String,
    required: true,
    maxlength: 10000
  },
  tokens: {
    type: Number,
    default: 0
  },
  processingTime: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Schema para límites de uso
const AIUsageLimitSchema = new Schema<IAIUsageLimit>({
  userId: {
    type: String,
    required: true,
    index: true
  },
  date: {
    type: String,
    required: true,
    index: true
  },
  dailyMessages: {
    type: Number,
    default: 0
  },
  monthlyMessages: {
    type: Number,
    default: 0
  },
  totalTokens: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Índices compuestos para optimizar consultas
AIConversationSchema.index({ userId: 1, isActive: 1, lastMessageAt: -1 });
AIMessageSchema.index({ conversationId: 1, createdAt: 1 });
AIUsageLimitSchema.index({ userId: 1, date: 1 }, { unique: true });

// Crear y exportar modelos
export const AIAssistantConfig = mongoose.model<IAIAssistantConfig>('AIAssistantConfig', AIAssistantConfigSchema);
export const AIConversation = mongoose.model<IAIConversation>('AIConversation', AIConversationSchema);
export const AIMessage = mongoose.model<IAIMessage>('AIMessage', AIMessageSchema);
export const AIUsageLimit = mongoose.model<IAIUsageLimit>('AIUsageLimit', AIUsageLimitSchema);