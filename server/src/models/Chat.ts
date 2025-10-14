import mongoose, { Document, Schema } from 'mongoose';

export interface IMessage extends Document {
  conversationId: string;
  senderId: string;
  senderType: 'socio' | 'super_admin';
  senderName: string;
  content: string;
  timestamp: Date;
  read: boolean;
  messageType: 'text' | 'system';
  edited?: boolean;
  editedAt?: Date;
  replyTo?: {
    messageId: string;
    content: string;
    senderName: string;
    senderType: 'socio' | 'super_admin';
  };
  forwarded?: boolean;
  originalSender?: string;
}

export interface IConversation extends Document {
  socioId: string;
  socioName: string;
  adminId?: string;
  adminName?: string;
  status: 'active' | 'closed';
  lastMessage?: string;
  lastMessageTime?: Date;
  unreadCount: {
    socio: number;
    admin: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema<IMessage>({
  conversationId: {
    type: String,
    required: true
  },
  senderId: {
    type: String,
    required: true
  },
  senderType: {
    type: String,
    required: true,
    enum: ['socio', 'super_admin']
  },
  senderName: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  read: {
    type: Boolean,
    default: false,
    index: true
  },
  messageType: {
    type: String,
    default: 'text',
    enum: ['text', 'system']
  },
  edited: {
    type: Boolean,
    default: false
  },
  editedAt: {
    type: Date
  },
  replyTo: {
    messageId: {
      type: String
    },
    content: {
      type: String
    },
    senderName: {
      type: String
    },
    senderType: {
      type: String,
      enum: ['socio', 'super_admin']
    }
  },
  forwarded: {
    type: Boolean,
    default: false
  },
  originalSender: {
    type: String
  }
}, {
  timestamps: false,
  collection: 'messages'
});

const ConversationSchema = new Schema<IConversation>({
  socioId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  socioName: {
    type: String,
    required: true
  },
  adminId: {
    type: String,
    index: true
  },
  adminName: {
    type: String
  },
  status: {
    type: String,
    default: 'active',
    enum: ['active', 'closed'],
    index: true
  },
  lastMessage: {
    type: String,
    maxlength: 200
  },
  lastMessageTime: {
    type: Date,
    index: true
  },
  unreadCount: {
    socio: {
      type: Number,
      default: 0
    },
    admin: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true,
  collection: 'conversations'
});

// Indexes for better performance
MessageSchema.index({ conversationId: 1, timestamp: -1 });
MessageSchema.index({ senderId: 1, timestamp: -1 });
ConversationSchema.index({ socioId: 1, status: 1 });
ConversationSchema.index({ status: 1, lastMessageTime: -1 });

export const Message = mongoose.model<IMessage>('Message', MessageSchema);
export const Conversation = mongoose.model<IConversation>('Conversation', ConversationSchema);