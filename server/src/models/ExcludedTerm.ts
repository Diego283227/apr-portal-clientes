import mongoose, { Document, Schema } from 'mongoose';

export interface IExcludedTerm extends Document {
  term: string;
  reason?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ExcludedTermSchema = new Schema<IExcludedTerm>({
  term: {
    type: String,
    required: true,
    trim: true,
    unique: true,
    maxlength: 200
  },
  reason: {
    type: String,
    trim: true,
    maxlength: 500
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Índices para mejorar performance
ExcludedTermSchema.index({ term: 1 });
ExcludedTermSchema.index({ isActive: 1 });
ExcludedTermSchema.index({ createdAt: -1 });

// Método estático para verificar si un mensaje contiene términos excluidos
ExcludedTermSchema.statics.validateMessage = async function(message: string): Promise<{
  isValid: boolean;
  foundTerm?: IExcludedTerm;
  error?: string;
}> {
  try {
    const activeTerms = await this.find({ isActive: true });
    const messageText = message.toLowerCase().trim();

    for (const term of activeTerms) {
      const termText = term.term.toLowerCase();

      if (messageText.includes(termText)) {
        return {
          isValid: false,
          foundTerm: term,
          error: `El término "${term.term}" no está permitido${term.reason ? `: ${term.reason}` : ''}.`
        };
      }
    }

    return { isValid: true };
  } catch (error) {
    console.error('Error validating message:', error);
    return { isValid: true }; // En caso de error, permitir el mensaje
  }
};

export default mongoose.model<IExcludedTerm>('ExcludedTerm', ExcludedTermSchema);