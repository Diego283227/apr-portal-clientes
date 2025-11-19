import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  createFlowPayment,
  handleFlowWebhook,
  getFlowPaymentStatus
} from '../controllers/flowController';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Flow
 *   description: Flow payment integration endpoints
 */

// Create Flow payment
router.post('/create-payment', authenticate, createFlowPayment);

// Handle Flow webhook (no authentication needed for webhooks)
router.post('/webhook', handleFlowWebhook);

// Get Flow payment status
router.get('/payment-status/:token', authenticate, getFlowPaymentStatus);

export default router;
