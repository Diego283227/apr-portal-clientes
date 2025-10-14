import { Router } from 'express';
import { MeterAlertController } from '../controllers/meterAlertController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
const meterAlertController = new MeterAlertController();

/**
 * @swagger
 * /api/meter-alerts:
 *   get:
 *     summary: Obtener todas las alertas de medidores
 *     tags: [Meter Alerts]
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
 *           enum: [active, resolved, false_positive]
 *         description: Filtrar por estado
 *       - in: query
 *         name: severity
 *         schema:
 *           type: string
 *           enum: [low, medium, high, critical]
 *         description: Filtrar por severidad
 *       - in: query
 *         name: alertType
 *         schema:
 *           type: string
 *           enum: [leak, tamper, low_battery, communication_loss, high_consumption, sensor_error]
 *         description: Filtrar por tipo de alerta
 *       - in: query
 *         name: socioId
 *         schema:
 *           type: string
 *         description: Filtrar por ID de socio
 *     responses:
 *       200:
 *         description: Lista de alertas obtenida exitosamente
 */
router.get('/', authenticate, meterAlertController.getAlerts);

/**
 * @swagger
 * /api/meter-alerts/active:
 *   get:
 *     summary: Obtener alertas activas
 *     tags: [Meter Alerts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: socioId
 *         schema:
 *           type: string
 *         description: Filtrar por ID de socio
 *     responses:
 *       200:
 *         description: Alertas activas obtenidas exitosamente
 */
router.get('/active', authenticate, meterAlertController.getActiveAlerts);

/**
 * @swagger
 * /api/meter-alerts/statistics:
 *   get:
 *     summary: Obtener estadísticas de alertas
 *     tags: [Meter Alerts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Estadísticas de alertas obtenidas exitosamente
 */
router.get('/statistics', authenticate, authorize('super_admin'), meterAlertController.getAlertStatistics);

/**
 * @swagger
 * /api/meter-alerts:
 *   post:
 *     summary: Crear nueva alerta de medidor
 *     tags: [Meter Alerts]
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
 *               - alertType
 *               - severity
 *               - title
 *               - description
 *             properties:
 *               meterId:
 *                 type: string
 *               alertType:
 *                 type: string
 *                 enum: [leak, tamper, low_battery, communication_loss, high_consumption, sensor_error]
 *               severity:
 *                 type: string
 *                 enum: [low, medium, high, critical]
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               metadata:
 *                 type: object
 *     responses:
 *       201:
 *         description: Alerta creada exitosamente
 */
router.post('/', authenticate, authorize('super_admin'), meterAlertController.createAlert);

/**
 * @swagger
 * /api/meter-alerts/{id}/resolve:
 *   put:
 *     summary: Resolver alerta
 *     tags: [Meter Alerts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la alerta
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - resolvedBy
 *             properties:
 *               resolvedBy:
 *                 type: string
 *               resolutionNotes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Alerta resuelta exitosamente
 *       404:
 *         description: Alerta no encontrada
 */
router.put('/:id/resolve', authenticate, authorize('super_admin'), meterAlertController.resolveAlert);

/**
 * @swagger
 * /api/meter-alerts/{id}/false-positive:
 *   put:
 *     summary: Marcar alerta como falso positivo
 *     tags: [Meter Alerts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la alerta
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - resolvedBy
 *             properties:
 *               resolvedBy:
 *                 type: string
 *               resolutionNotes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Alerta marcada como falso positivo exitosamente
 */
router.put('/:id/false-positive', authenticate, authorize('super_admin'), meterAlertController.markAsFalsePositive);

/**
 * @swagger
 * /api/meter-alerts/bulk-resolve:
 *   put:
 *     summary: Resolver múltiples alertas
 *     tags: [Meter Alerts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - alertIds
 *               - resolvedBy
 *             properties:
 *               alertIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               resolvedBy:
 *                 type: string
 *               resolutionNotes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Alertas resueltas exitosamente
 */
router.put('/bulk-resolve', authenticate, authorize('super_admin'), meterAlertController.bulkResolveAlerts);

export default router;