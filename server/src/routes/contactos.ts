import express from 'express';
import {
  crearContacto,
  obtenerContactos,
  actualizarContacto,
  eliminarContacto,
} from '../controllers/contactosController';
import { authenticate, authorize } from '../middleware/auth';

const router = express.Router();

// Ruta pública para crear contacto desde homepage
router.post('/', crearContacto);

// Rutas protegidas para admin y super_admin
router.get('/', authenticate, authorize('admin', 'super_admin'), obtenerContactos);
router.patch('/:id', authenticate, authorize('admin', 'super_admin'), actualizarContacto);
router.delete('/:id', authenticate, authorize('admin', 'super_admin'), eliminarContacto);

export default router;
