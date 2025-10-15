// Cargar variables de entorno PRIMERO
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import path from 'path';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import connectDB from './config/database';
import SocketManager from './socket/socketHandler';

// Importar rutas
import authRoutes from './routes/auth';
import socioRoutes from './routes/socios';
import boletaRoutes from './routes/boletas';
import pagoRoutes from './routes/pagos';
import auditRoutes from './routes/audit';
import smsRoutes from './routes/sms';
import mercadoPagoRoutes from './routes/mercadoPago';
import paypalRoutes from './routes/paypal';
// WhatsApp routes removed
import sociosAdminRoutes from './routes/sociosAdmin';
import chatRoutes from './routes/chat';
import adminRoutes from './routes/admin';
import aiAssistantRoutes from './routes/aiAssistant';
import notificationSimpleRoutes from './routes/notificationsSimple';
import testEmailRoutes from './routes/testEmail';
import userRoutes from './routes/users';
import ingresoRoutes from './routes/ingresoRoutes';
import adminBoletaRoutes from './routes/adminBoletaRoutes';
import reportesRoutes from './routes/reportes';
import tarifasRoutes from './routes/tarifas';
import systemConfigRoutes from './routes/systemConfig';
import backupRoutes from './routes/backup';
import smartMeterRoutes from './routes/smartMeterRoutes';
import meterAlertRoutes from './routes/meterAlertRoutes';
import dataSourceRoutes from './routes/dataSourceRoutes';
import comprobanteRoutes from './routes/comprobanteRoutes';
import testEmailConfiguration from './utils/testEmail';
import { setupSwagger } from './config/swagger';
import BackupService from './services/backupService';
import { setSocketInstance } from './socket/socketInstance';

// Importar middleware
import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';


const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: [
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:5175',
      'http://145.223.26.119',
      'http://145.223.26.119:80',
      process.env.FRONTEND_URL || 'http://localhost:5173'
    ],
    credentials: true,
    methods: ['GET', 'POST']
  },
  transports: ['websocket', 'polling']
});

const PORT = process.env.PORT || 3001;

// Initialize Socket Manager
const socketManager = new SocketManager(io);

// Make socket manager available globally for controllers
declare global {
  var socketManager: SocketManager;
}
global.socketManager = socketManager;

// Set socket instance for other modules to use
setSocketInstance(io);

// Rate limiting - more lenient for development
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '1000'), // increased to 1000 requests per windowMs for development
  message: {
    error: 'Demasiadas solicitudes desde esta IP, intenta nuevamente más tarde.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting for development
  skip: (req) => process.env.NODE_ENV === 'development',
});

// Middleware de seguridad
app.use(helmet());
app.use(compression());

// CORS configuration
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'http://145.223.26.119',
    'http://145.223.26.119:80',
    process.env.FRONTEND_URL || 'http://localhost:5173'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
}));

// Rate limiting
app.use('/api', limiter);

// Setup Swagger documentation
setupSwagger(app);

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Serve static files (for local avatar uploads)
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/socios', socioRoutes);
app.use('/api/boletas', boletaRoutes);
app.use('/api/pagos', pagoRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/sms', smsRoutes);
app.use('/api/mercadopago', mercadoPagoRoutes);
app.use('/api/paypal', paypalRoutes);
// WhatsApp endpoints removed
app.use('/api/admin/socios', sociosAdminRoutes);
app.use('/api/admin/ingresos', ingresoRoutes);
app.use('/api/admin/boletas', adminBoletaRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/ai-assistant', aiAssistantRoutes);
app.use('/api/notifications', notificationSimpleRoutes);
app.use('/api/test-email', testEmailRoutes);
app.use('/api/reportes', reportesRoutes);
app.use('/api/tarifas', tarifasRoutes);
app.use('/api/system', systemConfigRoutes);
app.use('/api/backups', backupRoutes);
app.use('/api/smart-meters', smartMeterRoutes);
app.use('/api/meter-alerts', meterAlertRoutes);
app.use('/api/data-sources', dataSourceRoutes);
app.use('/api/comprobantes', comprobanteRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Portal APR API Server',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      socios: '/api/socios',
      boletas: '/api/boletas',
    },
  });
});

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

// Connect to MongoDB and start server
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();
    
    // Test email configuration only if enabled
    if (process.env.EMAIL_ENABLED === 'true') {
      await testEmailConfiguration();
    } else {
      console.log('📧 Email testing skipped (EMAIL_ENABLED=false)');
    }

    // Initialize backup service and setup automatic backup
    try {
      const backupService = BackupService.getInstance();
      console.log('💾 Backup service initialized');

      // Setup automatic backup based on system configuration
      // This will be configured through the admin panel
    } catch (error) {
      console.warn('⚠️ Error initializing backup service:', error);
    }
    
    // Start server with Socket.IO
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT} `);
      console.log(`📍 Environment: ${process.env.NODE_ENV}`);
      console.log(`🔗 Frontend URL: ${process.env.FRONTEND_URL}`);
      console.log(`🏥 Health check: http://localhost:${PORT}/health`);
      console.log(`🔌 Socket.IO ready for connections`);
      console.log(`🗄️ MongoDB connected successfully`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app; 

