import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  createPayPalPayment,
  executePayPalPayment,
  getPayPalOrderStatus
} from '../controllers/paypalController';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: PayPal
 *   description: PayPal payment integration endpoints
 */

// Create PayPal payment
router.post('/create-payment', authenticate, createPayPalPayment);

// Execute PayPal payment
router.post('/execute-payment', authenticate, executePayPalPayment);

// Get PayPal order status
router.get('/order-status/:orderId', authenticate, getPayPalOrderStatus);

export default router;