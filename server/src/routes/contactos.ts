import express from 'express';
import {
  crearContacto,
  obtenerContactos,
  actualizarContacto,
  eliminarContacto,
} from '../controllers/contactosController';
import { authenticateSuperAdmin } from '../middleware/auth';

const router = express.Router();

// Ruta pública para crear contacto desde homepage
router.post('/', crearContacto);

// Rutas protegidas para admin
router.get('/', authenticateSuperAdmin, obtenerContactos);
router.patch('/:id', authenticateSuperAdmin, actualizarContacto);
router.delete('/:id', authenticateSuperAdmin, eliminarContacto);

export default router;
