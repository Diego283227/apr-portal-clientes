import { Router } from 'express';
import { SmartMeterController } from '../controllers/smartMeterController';
import { MeterReadingController } from '../controllers/meterReadingController';
import { MeterAlertController } from '../controllers/meterAlertController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

const smartMeterController = new SmartMeterController();
const meterReadingController = new MeterReadingController();
const meterAlertController = new MeterAlertController();

/**
 * @swagger
 * /api/smart-meters:
 *   get:
 *     summary: Obtener todos los medidores inteligentes
 *     tags: [Smart Meters]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Número de página
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Elementos por página
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive, maintenance, error]
 *         description: Filtrar por estado
 *     responses:
 *       200:
 *         description: Lista de medidores obtenida exitosamente
 */
router.get('/', authenticate, authorize('super_admin'), smartMeterController.getMeters);

/**
 * @swagger
 * /api/smart-meters:
 *   post:
 *     summary: Crear nuevo medidor inteligente
 *     tags: [Smart Meters]
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
 *               - socioId
 *               - serialNumber
 *               - model
 *               - manufacturer
 *               - communicationType
 *             properties:
 *               meterId:
 *                 type: string
 *               socioId:
 *                 type: string
 *               serialNumber:
 *                 type: string
 *               model:
 *                 type: string
 *               manufacturer:
 *                 type: string
 *               communicationType:
 *                 type: string
 *                 enum: [lorawan, nbiot, wifi, zigbee, cellular]
 *     responses:
 *       201:
 *         description: Medidor creado exitosamente
 */
router.post('/', authenticate, authorize('super_admin'), smartMeterController.createMeter);

/**
 * @swagger
 * /api/smart-meters/statistics:
 *   get:
 *     summary: Obtener estadísticas de medidores
 *     tags: [Smart Meters]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Estadísticas obtenidas exitosamente
 */
router.get('/statistics', authenticate, authorize('super_admin'), smartMeterController.getMeterStatistics);

/**
 * @swagger
 * /api/smart-meters/user/{userId}:
 *   get:
 *     summary: Obtener medidores de un usuario específico
 *     tags: [Smart Meters]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del usuario
 *     responses:
 *       200:
 *         description: Medidores del usuario obtenidos exitosamente
 */
router.get('/user/:userId', authenticate, smartMeterController.getMetersByUser);

/**
 * @swagger
 * /api/smart-meters/readings:
 *   get:
 *     summary: Obtener lecturas de medidores
 *     tags: [Meter Readings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: meterId
 *         schema:
 *           type: string
 *         description: ID del medidor
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Fecha de inicio
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Fecha de fin
 *     responses:
 *       200:
 *         description: Lecturas obtenidas exitosamente
 */
router.get('/readings', authenticate, meterReadingController.getReadings);

/**
 * @swagger
 * /api/smart-meters/readings:
 *   post:
 *     summary: Agregar nueva lectura de medidor
 *     tags: [Meter Readings]
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
 *               flowRate:
 *                 type: number
 *               temperature:
 *                 type: number
 *               pressure:
 *                 type: number
 *               batteryLevel:
 *                 type: integer
 *               signalStrength:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Lectura agregada exitosamente
 */
router.post('/readings', authenticate, meterReadingController.addReading);

/**
 * @swagger
 * /api/smart-meters/readings/bulk:
 *   post:
 *     summary: Agregar múltiples lecturas de medidores
 *     tags: [Meter Readings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - readings
 *             properties:
 *               readings:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       201:
 *         description: Lecturas agregadas exitosamente
 */
router.post('/readings/bulk', authenticate, authorize('super_admin'), meterReadingController.bulkAddReadings);

/**
 * @swagger
 * /api/smart-meters/readings/{meterId}/recent:
 *   get:
 *     summary: Obtener lecturas recientes de un medidor
 *     tags: [Meter Readings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: meterId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del medidor
 *       - in: query
 *         name: hours
 *         schema:
 *           type: integer
 *           default: 24
 *         description: Horas hacia atrás
 *     responses:
 *       200:
 *         description: Lecturas recientes obtenidas exitosamente
 */
router.get('/readings/:meterId/recent', authenticate, meterReadingController.getRecentReadings);

/**
 * @swagger
 * /api/smart-meters/readings/{meterId}/chart:
 *   get:
 *     summary: Obtener datos para gráfico de consumo
 *     tags: [Meter Readings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: meterId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del medidor
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [hour, day, week]
 *           default: day
 *         description: Período de agrupación
 *     responses:
 *       200:
 *         description: Datos del gráfico obtenidos exitosamente
 */
router.get('/readings/:meterId/chart', authenticate, meterReadingController.getConsumptionChart);

/**
 * @swagger
 * /api/smart-meters/{id}:
 *   get:
 *     summary: Obtener medidor por ID
 *     tags: [Smart Meters]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del medidor
 *     responses:
 *       200:
 *         description: Medidor obtenido exitosamente
 *       404:
 *         description: Medidor no encontrado
 */
router.get('/:id', authenticate, smartMeterController.getMeterById);

/**
 * @swagger
 * /api/smart-meters/{id}:
 *   put:
 *     summary: Actualizar medidor
 *     tags: [Smart Meters]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del medidor
 *     responses:
 *       200:
 *         description: Medidor actualizado exitosamente
 */
router.put('/:id', authenticate, authorize('super_admin'), smartMeterController.updateMeter);

/**
 * @swagger
 * /api/smart-meters/{id}:
 *   delete:
 *     summary: Eliminar medidor
 *     tags: [Smart Meters]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del medidor
 *     responses:
 *       200:
 *         description: Medidor eliminado exitosamente
 */
router.delete('/:id', authenticate, authorize('super_admin'), smartMeterController.deleteMeter);

export default router;