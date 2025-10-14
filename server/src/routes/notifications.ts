import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { 
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getNotificationCounts,
  deleteNotification,
  sendNotificationToUser
} from '../controllers/notificationController';

const router = Router();

// Protect all routes - require authentication
router.use(authenticate);

// User routes
router.get('/', getUserNotifications);
router.get('/counts', getNotificationCounts);
router.put('/:notificationId/read', markNotificationAsRead);
router.put('/mark-all-read', markAllNotificationsAsRead);
router.delete('/:notificationId', deleteNotification);

// Admin routes
router.post('/send', authorize('super_admin'), sendNotificationToUser);

export default router;