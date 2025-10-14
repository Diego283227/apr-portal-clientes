import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { descargarComprobante, listarPagosConComprobantes } from '../controllers/comprobanteController';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticate);

// Listar pagos con comprobantes disponibles
router.get('/mis-pagos', listarPagosConComprobantes);

// Descargar comprobante específico
router.get('/:pagoId', descargarComprobante);

export default router;
