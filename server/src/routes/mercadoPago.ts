import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  createMercadoPagoPreference,
  handleMercadoPagoWebhook,
  handleMercadoPagoSuccess
} from '../controllers/mercadoPagoController';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: MercadoPago
 *   description: MercadoPago payment integration endpoints
 */

// Create MercadoPago preference
router.post('/create-preference', authenticate, createMercadoPagoPreference);

// Handle MercadoPago webhook (no authentication needed for webhooks)
router.post('/webhook', handleMercadoPagoWebhook);

// Handle MercadoPago success return
router.post('/payment-success', authenticate, handleMercadoPagoSuccess);

export default router;