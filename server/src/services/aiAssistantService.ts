import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import {
  AIAssistantConfig,
  AIConversation,
  AIMessage,
  AIUsageLimit,
  IAIAssistantConfig,
  IAIConversation,
  IAIMessage
} from '../models/AIAssistant';
import { User } from '../models';
import Boleta from '../models/Boleta';
import Pago from '../models/Pago';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface SendMessageRequest {
  conversationId?: string;
  message: string;
  userId: string;
  conversationTitle?: string;
}

interface SendMessageResponse {
  success: boolean;
  conversationId: string;
  response: string;
  tokens: number;
  processingTime: number;
  remainingDaily: number;
  remainingMonthly: number;
  error?: string;
}

export class AIAssistantService {
  private openai: OpenAI | null = null;
  private anthropic: Anthropic | null = null;
  private config: IAIAssistantConfig | null = null;

  constructor() {
    this.initializeConfig();
  }

  private async initializeConfig(): Promise<void> {
    try {
      let config = await AIAssistantConfig.findOne();
      if (!config) {
        const defaultPrompt = `Eres un asistente virtual especializado del Portal APR (Agua Potable Rural).

Tu función es ayudar a los usuarios con consultas relacionadas con:
- Estado y gestión de boletas de agua
- Información sobre pagos y métodos de pago
- Consultas sobre consumo de agua
- Datos personales y de contacto
- Información general sobre servicios APR
- Procesos administrativos del sistema

IMPORTANTES DIRECTRICES:
1. Mantén un tono profesional pero amigable
2. Usa los datos específicos del usuario cuando estén disponibles
3. Si no tienes información específica, sugiere contactar a la administración
4. Responde SOLO sobre temas relacionados con APR y servicios de agua
5. No proporciones información de otros usuarios
6. Guía a los usuarios paso a paso cuando sea necesario`;

        config = await AIAssistantConfig.create({
          systemPrompt: defaultPrompt,
          isActive: true,
          dailyLimit: 50,
          monthlyLimit: 1000,
          maxTokensPerMessage: 800,
          temperature: 0.7,
          aiProvider: 'anthropic',
          aiModel: 'claude-3-haiku-20240307'
        });
      } else {
        // Si ya existe config pero está en OpenAI y no hay API key, cambiar a Claude
        if (config.aiProvider === 'openai' && !config.apiKey && !process.env.OPENAI_API_KEY) {
          config.aiProvider = 'anthropic';
          config.aiModel = 'claude-3-haiku-20240307';
          await config.save();
        }
      }
      
      this.config = config;
      
      if (config.aiProvider === 'openai') {
        // Usar API key de la configuración o de variables de entorno
        const apiKey = config.apiKey || process.env.OPENAI_API_KEY;
        console.log('Initializing OpenAI with key present:', !!apiKey);
        if (apiKey) {
          this.openai = new OpenAI({
            apiKey: apiKey
          });
        }
      } else if (config.aiProvider === 'anthropic') {
        // Usar API key de la configuración o de variables de entorno
        const apiKey = config.apiKey || process.env.ANTHROPIC_API_KEY;
        console.log('Initializing Claude with key present:', !!apiKey);
        if (apiKey) {
          this.anthropic = new Anthropic({
            apiKey: apiKey
          });
        }
      }
      
      console.log('AI Assistant initialized:', {
        provider: config.aiProvider,
        model: config.aiModel,
        hasOpenAI: !!this.openai,
        hasAnthropic: !!this.anthropic
      });
    } catch (error) {
      console.error('Error initializing AI Assistant config:', error);
    }
  }

  async checkUsageLimits(userId: string): Promise<{
    canSend: boolean;
    dailyUsed: number;
    monthlyUsed: number;
    dailyLimit: number;
    monthlyLimit: number;
  }> {
    if (!this.config) {
      await this.initializeConfig();
    }

    const today = new Date().toISOString().split('T')[0];
    const thisMonth = today.substring(0, 7); // YYYY-MM

    // Obtener o crear límites de uso
    let usage = await AIUsageLimit.findOne({ userId, date: today });
    if (!usage) {
      usage = await AIUsageLimit.create({
        userId,
        date: today,
        dailyMessages: 0,
        monthlyMessages: 0,
        totalTokens: 0
      });
    }

    // Calcular uso mensual
    const monthlyUsages = await AIUsageLimit.find({
      userId,
      date: { $regex: `^${thisMonth}` }
    });
    const monthlyUsage = monthlyUsages.reduce((sum, usage) => sum + usage.dailyMessages, 0);

    const canSend = usage.dailyMessages < this.config!.dailyLimit && 
                   monthlyUsage < this.config!.monthlyLimit;

    return {
      canSend,
      dailyUsed: usage.dailyMessages,
      monthlyUsed: monthlyUsage,
      dailyLimit: this.config!.dailyLimit,
      monthlyLimit: this.config!.monthlyLimit
    };
  }

  private async getUserSpecificData(userId: string) {
    try {
      // Obtener datos del usuario
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('Usuario no encontrado');
      }

      // Obtener boletas del usuario (últimas 5)
      const boletas = await Boleta.find({ socioId: userId })
        .sort({ fechaEmision: -1 })
        .limit(5)
        .select('numeroBoleta fechaEmision fechaVencimiento montoTotal estado consumoM3');

      // Obtener pagos del usuario (últimos 5)
      const pagos = await Pago.find({ socioId: userId })
        .sort({ fechaPago: -1 })
        .limit(5)
        .select('monto fechaPago metodoPago estado');

      // Calcular estadísticas del usuario
      const totalBoletas = await Boleta.countDocuments({ socioId: userId });
      const boletasPendientes = await Boleta.countDocuments({
        socioId: userId,
        estado: 'pendiente'
      });
      const totalPagado = await Pago.aggregate([
        { $match: { socioId: user._id, estado: 'completado' } },
        { $group: { _id: null, total: { $sum: '$monto' } } }
      ]);

      return {
        usuario: {
          nombres: user.nombres,
          apellidos: user.apellidos,
          rut: user.rut,
          email: user.email,
          codigoSocio: user.codigoSocio,
          saldoActual: user.saldoActual || 0,
          deudaTotal: user.deudaTotal || 0,
          categoriaUsuario: user.categoriaUsuario || 'residencial',
          fechaIngreso: user.fechaIngreso,
          direccion: user.direccion || 'No especificada',
          telefono: user.telefono || 'No especificado'
        },
        boletas: boletas.map(b => ({
          numero: b.numeroBoleta,
          fechaEmision: b.fechaEmision,
          fechaVencimiento: b.fechaVencimiento,
          monto: b.montoTotal,
          estado: b.estado,
          consumo: b.consumoM3
        })),
        pagos: pagos.map(p => ({
          monto: p.monto,
          fecha: p.fechaPago,
          metodo: p.metodoPago,
          estado: p.estadoPago
        })),
        estadisticas: {
          totalBoletas,
          boletasPendientes,
          totalPagado: totalPagado[0]?.total || 0
        }
      };
    } catch (error) {
      console.error('Error getting user specific data:', error);
      return null;
    }
  }

  private createPersonalizedSystemPrompt(userData: any, basePrompt: string): string {
    if (!userData) {
      return basePrompt || 'Eres un asistente virtual útil para el portal de APR.';
    }

    const currentDate = new Date().toLocaleDateString('es-CL');

    return `Eres un asistente virtual especializado del Portal APR (Agua Potable Rural). Tu trabajo es ayudar específicamente al usuario ${userData.usuario.nombres} ${userData.usuario.apellidos}.

INFORMACIÓN DEL USUARIO:
- Nombre: ${userData.usuario.nombres} ${userData.usuario.apellidos}
- RUT: ${userData.usuario.rut}
- Código de Socio: ${userData.usuario.codigoSocio || 'No asignado'}
- Email: ${userData.usuario.email}
- Dirección: ${userData.usuario.direccion}
- Teléfono: ${userData.usuario.telefono}
- Categoría: ${userData.usuario.categoriaUsuario}
- Saldo Actual: $${userData.usuario.saldoActual?.toLocaleString('es-CL') || '0'}
- Deuda Total: $${userData.usuario.deudaTotal?.toLocaleString('es-CL') || '0'}
- Fecha de Ingreso: ${new Date(userData.usuario.fechaIngreso).toLocaleDateString('es-CL')}

ESTADO ACTUAL DE BOLETAS:
- Total de boletas: ${userData.estadisticas.totalBoletas}
- Boletas pendientes: ${userData.estadisticas.boletasPendientes}
- Total pagado históricamente: $${userData.estadisticas.totalPagado?.toLocaleString('es-CL') || '0'}

BOLETAS RECIENTES:
${userData.boletas.map((b: any) =>
  `• Boleta ${b.numero}: $${b.monto?.toLocaleString('es-CL')} - ${b.estado} (Vence: ${new Date(b.fechaVencimiento).toLocaleDateString('es-CL')}) - Consumo: ${b.consumo}m³`
).join('\n')}

PAGOS RECIENTES:
${userData.pagos.map((p: any) =>
  `• $${p.monto?.toLocaleString('es-CL')} - ${p.metodo} - ${new Date(p.fecha).toLocaleDateString('es-CL')} (${p.estado})`
).join('\n')}

INSTRUCCIONES:
1. Siempre dirígete al usuario por su nombre (${userData.usuario.nombres})
2. Responde SOLO sobre temas relacionados con el servicio de agua potable rural y los datos del usuario
3. Puedes ayudar con consultas sobre:
   - Estado de boletas y pagos del usuario específico
   - Histórico de consumo del usuario
   - Información de contacto y datos personales del usuario
   - Procesos de pago y gestiones administrativas
   - Información general sobre el servicio APR
4. NO respondas preguntas sobre otros usuarios o datos que no correspondan a ${userData.usuario.nombres}
5. Usa los datos específicos del usuario en tus respuestas cuando sea relevante
6. Si no tienes información específica, dile al usuario que puede contactar a la administración
7. Mantén un tono profesional pero amigable
8. Fecha actual: ${currentDate}

${basePrompt ? `\nInstrucciones adicionales del administrador:\n${basePrompt}` : ''}`;
  }

  async sendMessage(request: SendMessageRequest): Promise<SendMessageResponse> {
    const startTime = Date.now();

    try {
      if (!this.config || !this.config.isActive) {
        return {
          success: false,
          conversationId: request.conversationId || '',
          response: '',
          tokens: 0,
          processingTime: 0,
          remainingDaily: 0,
          remainingMonthly: 0,
          error: 'Asistente virtual no disponible'
        };
      }

      // Verificar límites de uso
      const usage = await this.checkUsageLimits(request.userId);
      if (!usage.canSend) {
        return {
          success: false,
          conversationId: request.conversationId || '',
          response: '',
          tokens: 0,
          processingTime: 0,
          remainingDaily: usage.dailyLimit - usage.dailyUsed,
          remainingMonthly: usage.monthlyLimit - usage.monthlyUsed,
          error: 'Límite de mensajes diario o mensual alcanzado'
        };
      }

      // Obtener o crear conversación
      let conversation: IAIConversation | null;
      if (request.conversationId) {
        conversation = await AIConversation.findOne({
          _id: request.conversationId,
          userId: request.userId 
        });
        
        if (!conversation) {
          return {
            success: false,
            conversationId: request.conversationId,
            response: '',
            tokens: 0,
            processingTime: 0,
            remainingDaily: usage.dailyLimit - usage.dailyUsed,
            remainingMonthly: usage.monthlyLimit - usage.monthlyUsed,
            error: 'Conversación no encontrada'
          };
        }
      } else {
        // Crear nueva conversación
        const title = request.conversationTitle || this.generateConversationTitle(request.message);
        conversation = new AIConversation({
          userId: request.userId,
          title,
          isActive: true,
          lastMessageAt: new Date(),
          messageCount: 0
        });
        await conversation.save();
      }

      // Guardar mensaje del usuario
      const userMessage = new AIMessage({
        conversationId: (conversation!._id as any).toString(),
        role: 'user',
        content: request.message,
        tokens: this.estimateTokens(request.message),
        processingTime: 0
      });
      await userMessage.save();

      // Obtener datos específicos del usuario para personalizar el prompt
      const userData = await this.getUserSpecificData(request.userId);

      // Crear prompt personalizado con datos del usuario
      const personalizedPrompt = this.createPersonalizedSystemPrompt(userData, this.config.systemPrompt);

      // Obtener historial de mensajes para contexto
      const recentMessages = await AIMessage.find({
        conversationId: (conversation!._id as any).toString()
      })
      .sort({ createdAt: -1 })
      .limit(10);

      // Preparar mensajes para la API
      const messages: ChatMessage[] = [
        { role: 'system', content: personalizedPrompt }
      ];

      // Añadir mensajes recientes (en orden correcto)
      recentMessages.reverse().forEach(msg => {
        messages.push({
          role: msg.role as 'user' | 'assistant',
          content: msg.content
        });
      });

      // Llamar a la API de OpenAI
      const response = await this.callAI(messages);
      const processingTime = Date.now() - startTime;
      const responseTokens = this.estimateTokens(response);

      // Guardar respuesta del asistente
      const assistantMessage = new AIMessage({
        conversationId: (conversation!._id as any).toString(),
        role: 'assistant',
        content: response,
        tokens: responseTokens,
        processingTime
      });
      await assistantMessage.save();

      // Actualizar conversación
      conversation!.lastMessageAt = new Date();
      conversation!.messageCount = conversation!.messageCount + 2; // user + assistant
      await conversation!.save();

      // Actualizar límites de uso
      await this.updateUsageLimits(request.userId, 1, responseTokens);

      // Recalcular límites restantes
      const updatedUsage = await this.checkUsageLimits(request.userId);

      return {
        success: true,
        conversationId: (conversation!._id as any).toString(),
        response,
        tokens: responseTokens,
        processingTime,
        remainingDaily: updatedUsage.dailyLimit - updatedUsage.dailyUsed,
        remainingMonthly: updatedUsage.monthlyLimit - updatedUsage.monthlyUsed
      };

    } catch (error) {
      console.error('Error sending message to AI:', error);
      return {
        success: false,
        conversationId: request.conversationId || '',
        response: '',
        tokens: 0,
        processingTime: Date.now() - startTime,
        remainingDaily: 0,
        remainingMonthly: 0,
        error: 'Error interno del asistente'
      };
    }
  }

  private async callAI(messages: ChatMessage[]): Promise<string> {
    if (!this.config) {
      throw new Error('AI service not configured');
    }

    if (this.config.aiProvider === 'openai') {
      if (!this.openai) {
        throw new Error('OpenAI service not configured');
      }

      const completion = await this.openai.chat.completions.create({
        model: this.config.aiModel,
        messages: messages,
        max_tokens: this.config.maxTokensPerMessage,
        temperature: this.config.temperature
      });

      return completion.choices[0]?.message?.content || 'Lo siento, no pude generar una respuesta.';
    } 
    else if (this.config.aiProvider === 'anthropic') {
      if (!this.anthropic) {
        throw new Error('Anthropic service not configured');
      }

      // Convertir mensajes al formato de Claude
      const systemMessage = messages.find(m => m.role === 'system');
      const conversationMessages = messages.filter(m => m.role !== 'system');

      const response = await this.anthropic.messages.create({
        model: this.config.aiModel,
        system: systemMessage?.content || '',
        messages: conversationMessages.map(msg => ({
          role: msg.role === 'assistant' ? 'assistant' : 'user',
          content: msg.content
        })),
        max_tokens: this.config.maxTokensPerMessage,
        temperature: this.config.temperature
      });

      return response.content[0]?.type === 'text' 
        ? response.content[0].text 
        : 'Lo siento, no pude generar una respuesta.';
    }

    throw new Error('AI provider not supported');
  }

  private generateConversationTitle(firstMessage: string): string {
    try {
      const message = firstMessage.toLowerCase().trim();

      // Patrones comunes para generar títulos más descriptivos
      const patterns = [
        // Consultas sobre boletas
        { regex: /boleta|factura/i, title: '💰 Consulta sobre Boletas' },
        { regex: /pago|pagar|cancelar/i, title: '💳 Consulta sobre Pagos' },
        { regex: /consumo|medidor|m3|metros/i, title: '📊 Consulta sobre Consumo' },
        { regex: /saldo|deuda|debe/i, title: '💰 Consulta de Saldo/Deuda' },
        { regex: /vencimiento|vence|pendiente/i, title: '⏰ Consulta sobre Vencimientos' },
        { regex: /datos|información|perfil/i, title: '👤 Consulta de Datos Personales' },
        { regex: /contacto|teléfono|dirección/i, title: '📞 Información de Contacto' },
        { regex: /problema|falla|corte|sin agua/i, title: '🚨 Reporte de Problema' },
        { regex: /hola|ayuda|asistencia/i, title: '🤖 Conversación General' },
        { regex: /historial|registro|lista/i, title: '📋 Consulta de Historial' },
        { regex: /método|forma|como.*pag/i, title: '💳 Métodos de Pago' },
        { regex: /tarifa|precio|costo/i, title: '💲 Consulta sobre Tarifas' }
      ];

      // Buscar patrón que coincida
      for (const pattern of patterns) {
        if (pattern.regex.test(message)) {
          return pattern.title;
        }
      }

      // Si no hay patrón específico, usar las primeras palabras
      const words = firstMessage.split(' ').slice(0, 4);
      let title = words.join(' ');

      // Agregar emoji basado en palabras clave
      if (message.includes('?')) {
        title = '❓ ' + title;
      } else if (message.includes('!')) {
        title = '❗ ' + title;
      } else {
        title = '💬 ' + title;
      }

      if (firstMessage.split(' ').length > 4) {
        title += '...';
      }

      return title || '💬 Nueva conversación';
    } catch (error) {
      console.error('Error generating conversation title:', error);
      return '💬 Nueva conversación';
    }
  }

  private estimateTokens(text: string): number {
    // Estimación básica: ~4 caracteres por token
    return Math.ceil(text.length / 4);
  }

  private async updateUsageLimits(userId: string, messages: number, tokens: number): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    
    let usage = await AIUsageLimit.findOne({ userId, date: today });
    if (!usage) {
      usage = new AIUsageLimit({
        userId,
        date: today,
        dailyMessages: 0,
        monthlyMessages: 0,
        totalTokens: 0
      });
    }

    usage.dailyMessages += messages;
    usage.monthlyMessages += messages;
    usage.totalTokens += tokens;
    await usage.save();
  }

  // Métodos para admin
  async updateConfig(config: Partial<IAIAssistantConfig>): Promise<void> {
    if (this.config) {
      Object.assign(this.config, config);
      await this.config.save();
      console.log('Config updated, reinitializing AI service...');
      await this.initializeConfig(); // Reinicializar con nueva configuración
    } else {
      // Si no existe config, crear una nueva
      await AIAssistantConfig.create(config);
      await this.initializeConfig();
    }
  }

  // Método para forzar reinicialización (útil cuando se cambia prompt)
  async reinitialize(): Promise<void> {
    console.log('Force reinitializing AI Assistant...');
    this.openai = null;
    this.anthropic = null;
    await this.initializeConfig();
  }

  async getConfig(): Promise<IAIAssistantConfig | null> {
    return this.config;
  }

  async getUserConversations(userId: string, limit: number = 20, offset: number = 0) {
    try {
      const conversations = await AIConversation.find({ userId })
        .sort({ lastMessageAt: -1 })
        .limit(limit)
        .skip(offset)
        .select('title lastMessageAt messageCount createdAt isHighlighted');

      return conversations.map(conv => ({
        id: conv._id,
        title: conv.title,
        lastMessageAt: conv.lastMessageAt,
        messageCount: conv.messageCount,
        createdAt: (conv as any).createdAt,
        isHighlighted: conv.isHighlighted || false
      }));
    } catch (error) {
      console.error('Error getting user conversations:', error);
      return [];
    }
  }

  async getUserMessages(userId: string, conversationId: string, limit: number = 50, offset: number = 0) {
    try {
      // Verificar que la conversación pertenece al usuario
      const conversation = await AIConversation.findOne({
        _id: conversationId,
        userId
      });

      if (!conversation) {
        throw new Error('Conversación no encontrada o sin acceso');
      }

      const messages = await AIMessage.find({ conversationId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(offset)
        .select('role content createdAt tokens processingTime');

      return {
        conversation: {
          id: conversation._id,
          title: conversation.title,
          lastMessageAt: conversation.lastMessageAt,
          messageCount: conversation.messageCount
        },
        messages: messages.reverse().map(msg => ({
          id: msg._id,
          role: msg.role,
          content: msg.content,
          createdAt: (msg as any).createdAt,
          tokens: msg.tokens,
          processingTime: msg.processingTime
        }))
      };
    } catch (error) {
      console.error('Error getting user messages:', error);
      throw error;
    }
  }

  async deleteUserConversation(userId: string, conversationId: string) {
    try {
      // Verificar que la conversación pertenece al usuario
      const conversation = await AIConversation.findOne({
        _id: conversationId,
        userId
      });

      if (!conversation) {
        throw new Error('Conversación no encontrada o sin acceso');
      }

      // Eliminar todos los mensajes de la conversación
      await AIMessage.deleteMany({ conversationId });

      // Eliminar la conversación
      await AIConversation.findByIdAndDelete(conversationId);

      return { success: true, message: 'Conversación eliminada exitosamente' };
    } catch (error) {
      console.error('Error deleting user conversation:', error);
      throw error;
    }
  }

  async updateConversationTitle(userId: string, conversationId: string, newTitle: string) {
    try {
      // Verificar que la conversación pertenece al usuario
      const conversation = await AIConversation.findOneAndUpdate(
        { _id: conversationId, userId },
        { title: newTitle.trim() },
        { new: true }
      );

      if (!conversation) {
        throw new Error('Conversación no encontrada o sin acceso');
      }

      return {
        id: conversation._id,
        title: conversation.title,
        lastMessageAt: conversation.lastMessageAt,
        messageCount: conversation.messageCount
      };
    } catch (error) {
      console.error('Error updating conversation title:', error);
      throw error;
    }
  }

  async getUsageStats(startDate?: string, endDate?: string) {
    const matchQuery: any = {};
    
    if (startDate && endDate) {
      matchQuery.date = {
        $gte: startDate,
        $lte: endDate
      };
    }

    const stats = await AIUsageLimit.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$date',
          totalMessages: { $sum: '$dailyMessages' },
          totalTokens: { $sum: '$totalTokens' },
          activeUsers: { $addToSet: '$userId' }
        }
      },
      {
        $addFields: {
          date: '$_id',
          activeUsers: { $size: '$activeUsers' }
        }
      },
      { $sort: { date: -1 } }
    ]);

    return stats;
  }
}

export default new AIAssistantService();