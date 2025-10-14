import { Router } from 'express';
import { updateBoletaStatus } from '../controllers/adminBoletaController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Todas las rutas requieren autenticación y permisos de admin
router.use(authenticate);

/**
 * @swagger
 * /api/admin/boletas/update-status:
 *   patch:
 *     summary: Actualizar estado de boletas (solo admin)
 *     tags: [Admin - Boletas]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - boletaIds
 *               - newStatus
 *             properties:
 *               boletaIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array de IDs de boletas a actualizar
 *               newStatus:
 *                 type: string
 *                 enum: [pendiente, pagada, vencida, anulada]
 *                 description: Nuevo estado para las boletas
 *               reason:
 *                 type: string
 *                 description: Razón del cambio de estado
 *     responses:
 *       200:
 *         description: Estado de boletas actualizado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     updatedCount:
 *                       type: number
 *                     boletas:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           numeroBoleta:
 *                             type: string
 *                           socio:
 *                             type: object
 *                           montoTotal:
 *                             type: number
 *                           oldStatus:
 *                             type: string
 *                           newStatus:
 *                             type: string
 *                 message:
 *                   type: string
 *       400:
 *         description: Datos de entrada inválidos
 *       403:
 *         description: Sin permisos de administrador
 *       404:
 *         description: Boletas no encontradas
 *       500:
 *         description: Error interno del servidor
 */
router.patch('/update-status', updateBoletaStatus);

export default router;