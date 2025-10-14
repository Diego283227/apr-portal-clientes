import { Router } from 'express';
import { getIngresos, getResumenIngresos } from '../controllers/ingresoController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Todas las rutas requieren autenticación y permisos de admin
router.use(authenticate);

// GET /api/admin/ingresos - Obtener lista de ingresos con filtros y paginación
router.get('/', getIngresos);

// GET /api/admin/ingresos/resumen - Obtener resumen de ingresos
router.get('/resumen', getResumenIngresos);

export default router;