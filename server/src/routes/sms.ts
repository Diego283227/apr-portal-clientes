import express from 'express';
import { authenticate, authorize } from '../middleware/auth';
import {
  getSMSSettings,
  updateSMSSettings,
  sendTestSMS,
  verifyPhone,
  getSMSServiceStatus,
  getAllUsersWithSMS,
  sendSMSToUser,
  sendBulkSMS,
  updateSMSPrefix
} from '../controllers/smsController';

const router = express.Router();

// All SMS routes require authentication
router.use(authenticate);

// User SMS settings routes
router.get('/settings', getSMSSettings);
router.put('/settings', updateSMSSettings);
router.post('/test', sendTestSMS);
router.post('/verify-phone', verifyPhone);

// Admin only routes
router.get('/service-status', authorize('super_admin'), getSMSServiceStatus);
router.get('/users', authorize('super_admin'), getAllUsersWithSMS);
router.post('/send/:userId', authorize('super_admin'), sendSMSToUser);
router.post('/send-bulk', authorize('super_admin'), sendBulkSMS);
router.put('/prefix', authorize('super_admin'), updateSMSPrefix);

export default router;