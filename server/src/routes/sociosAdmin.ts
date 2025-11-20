import express from 'express';
import { authenticate, authorize } from '../middleware/auth';
import {
  getAllSocios,
  getSocioDetails,
  toggleSocioStatus,
  deleteSocio,
  sendSMSToSocio,
  updateSocio,
  getUltimosSociosActivos
} from '../controllers/sociosController';

const router = express.Router();

// All routes require authentication and admin or super_admin role
router.use(authenticate);
router.use(authorize('super_admin', 'admin'));

// Socios management routes
router.get('/', getAllSocios);
router.get('/ultimos-activos', getUltimosSociosActivos);
router.get('/:socioId', getSocioDetails);
router.put('/:socioId', updateSocio);
router.patch('/:socioId/status', toggleSocioStatus);
router.delete('/:socioId', deleteSocio);

// SMS routes for socios
router.post('/:socioId/sms', sendSMSToSocio);

export default router;