import { Router } from 'express';
import { DataSourceController } from '../controllers/dataSourceController';
import { authenticate, authorize } from '../middleware/auth';
import multer from 'multer';

const router = Router();
const dataSourceController = new DataSourceController();

// Configurar multer para upload de archivos CSV
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.mimetype === 'application/vnd.ms-excel') {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos CSV'));
    }
  }
});

/**
 * @swagger
 * /api/data-sources/generate-simulation:
 *   post:
 *     summary: Generar datos simulados realistas
 *     tags: [Data Sources]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               meterId:
 *                 type: string
 *                 description: ID del medidor (opcional, si no se especifica genera para todos)
 *               startDate:
 *                 type: string
 *                 format: date-time
 *                 description: Fecha de inicio
 *               endDate:
 *                 type: string
 *                 format: date-time
 *                 description: Fecha de fin
 *               profileType:
 *                 type: string
 *                 enum: [residential, commercial, rural]
 *                 default: residential
 *               intensity:
 *                 type: string
 *                 enum: [low, medium, high]
 *                 default: medium
 *               seasonality:
 *                 type: boolean
 *                 default: true
 *               includeAnomalies:
 *                 type: boolean
 *                 default: false
 *               replaceExisting:
 *                 type: boolean
 *                 default: false
 *     responses:
 *       200:
 *         description: Datos simulados generados exitosamente
 */
router.post('/generate-simulation', authenticate, authorize('super_admin'), dataSourceController.generateSimulatedData);

/**
 * @swagger
 * /api/data-sources/manual-reading:
 *   post:
 *     summary: Agregar lectura manual
 *     tags: [Data Sources]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - meterId
 *               - currentReading
 *             properties:
 *               meterId:
 *                 type: string
 *               currentReading:
 *                 type: number
 *               timestamp:
 *                 type: string
 *                 format: date-time
 *               notes:
 *                 type: string
 *               photo:
 *                 type: string
 *                 description: Base64 encoded photo
 *     responses:
 *       200:
 *         description: Lectura manual registrada exitosamente
 */
router.post('/manual-reading', authenticate, dataSourceController.addManualReading);

// CSV upload temporalmente deshabilitado por problemas de tipos
// router.post('/upload-csv', authenticate, authorize('super_admin'), upload.single('file'), dataSourceController.uploadCSVData);

/**
 * @swagger
 * /api/data-sources/stats:
 *   get:
 *     summary: Obtener estadísticas de fuentes de datos
 *     tags: [Data Sources]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 30
 *         description: Días hacia atrás para estadísticas
 *     responses:
 *       200:
 *         description: Estadísticas obtenidas exitosamente
 */
router.get('/stats', authenticate, authorize('super_admin'), dataSourceController.getDataSourceStats);

/**
 * @swagger
 * /api/data-sources/clean:
 *   post:
 *     summary: Limpiar datos de un período específico
 *     tags: [Data Sources]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               startDate:
 *                 type: string
 *                 format: date-time
 *               endDate:
 *                 type: string
 *                 format: date-time
 *               meterId:
 *                 type: string
 *               source:
 *                 type: string
 *     responses:
 *       200:
 *         description: Datos eliminados exitosamente
 */
router.post('/clean', authenticate, authorize('super_admin'), dataSourceController.cleanDataPeriod);

export default router;