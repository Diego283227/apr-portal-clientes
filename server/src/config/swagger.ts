import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Portal APR API',
      version: '1.0.0',
      description: 'API para el sistema de gestión de Agua Potable Rural',
      contact: {
        name: 'Portal APR Support',
        email: 'support@portal-apr.com'
      }
    },
    servers: [
      {
        url: process.env.BACKEND_URL || 'http://localhost:7779',
        description: 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token obtained from login endpoint'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            rut: { type: 'string' },
            nombres: { type: 'string' },
            apellidos: { type: 'string' },
            email: { type: 'string' },
            telefono: { type: 'string' },
            role: { type: 'string', enum: ['socio', 'super_admin'] },
            codigoSocio: { type: 'string' },
            direccion: { type: 'string' },
            fechaIngreso: { type: 'string', format: 'date-time' },
            saldoActual: { type: 'number' },
            deudaTotal: { type: 'number' }
          }
        },
        Boleta: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            numeroBoleta: { type: 'string' },
            socioId: { type: 'string' },
            fechaEmision: { type: 'string', format: 'date-time' },
            fechaVencimiento: { type: 'string', format: 'date-time' },
            consumoM3: { type: 'number' },
            montoTotal: { type: 'number' },
            estado: { type: 'string', enum: ['pendiente', 'pagada', 'vencida'] },
            periodo: { type: 'string' }
          }
        },
        Pago: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            boletaId: { type: 'string' },
            socioId: { type: 'string' },
            monto: { type: 'number' },
            fechaPago: { type: 'string', format: 'date-time' },
            metodoPago: { type: 'string', enum: ['paypal', 'webpay', 'transferencia', 'efectivo'] },
            estadoPago: { type: 'string', enum: ['pendiente', 'completado', 'fallido', 'reembolsado'] },
            transactionId: { type: 'string' },
            metadata: { type: 'object' }
          }
        },
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string' },
            error: { type: 'string' }
          }
        },
        Success: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: { type: 'object' },
            message: { type: 'string' }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: [
    './src/routes/*.ts',
    './src/controllers/*.ts',
    './src/models/*.ts'
  ]
};

const specs = swaggerJsdoc(options);

export const setupSwagger = (app: Express) => {
  // Swagger page
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Portal APR API Documentation',
    swaggerOptions: {
      docExpansion: 'list',
      filter: true,
      showRequestDuration: true,
      tryItOutEnabled: true,
      persistAuthorization: true
    }
  }));

  // JSON endpoint for raw specs
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(specs);
  });

  console.log('📚 Swagger documentation available at /api-docs');
  console.log('📄 JSON specs available at /api-docs.json');
};

export default specs;