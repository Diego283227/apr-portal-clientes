import express from 'express';
import {
  registrarLectura,
  getLecturas,
  getLecturaById,
  getUltimaLectura,
  cancelarLectura,
  getMisLecturas,
  getMiMedidor
} from '../controllers/consumoController';
import { authenticate, authorize } from '../middleware/auth';

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authenticate);

// IMPORTANTE: Rutas más específicas primero para evitar conflictos
// Rutas para socios - Ver sus propias lecturas y medidor
router.get(
  '/lecturas',
  authorize('socio', 'super_admin', 'admin'),
  getMisLecturas
);

router.get(
  '/medidor',
  authorize('socio', 'super_admin', 'admin'),
  getMiMedidor
);

// Obtener última lectura de un socio específico
router.get(
  '/socio/:socioId/ultima',
  authorize('super_admin', 'admin'),
  getUltimaLectura
);

// Registrar nueva lectura y generar boleta
router.post(
  '/',
  authorize('super_admin', 'admin'),
  registrarLectura
);

// Obtener todas las lecturas con filtros
router.get(
  '/',
  authorize('super_admin', 'admin'),
  getLecturas
);

// Obtener lectura por ID (debe ir después de rutas específicas)
router.get(
  '/:id',
  authorize('super_admin', 'admin'),
  getLecturaById
);

// Cancelar una lectura
router.delete(
  '/:id',
  authorize('super_admin', 'admin'),
  cancelarLectura
);

export default router;
