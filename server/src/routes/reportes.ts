import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import {
  getReporteFinanciero,
  getReporteSocios,
  getReportePagos,
  getReporteEgresos,
  getDashboardStats
} from '../controllers/reportesController';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Reportes
 *   description: Gestión de reportes administrativos
 */

// Todas las rutas requieren autenticación y rol de administrador
router.use(authenticate);
router.use(authorize('super_admin'));

// Rutas de reportes
router.get('/financiero', getReporteFinanciero);
router.get('/socios', getReporteSocios);
router.get('/pagos', getReportePagos);
router.get('/egresos', getReporteEgresos);
router.get('/dashboard-stats', getDashboardStats);

export default router;