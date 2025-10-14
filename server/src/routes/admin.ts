import express from 'express';
import { authenticate, authorize } from '../middleware/auth';
import {
  getSystemConfiguration,
  updateSystemConfiguration,
  getSuperAdminProfile,
  updateSuperAdminProfile,
  getDashboardStats,
  syncUserDebtManual,
  getDebtStatisticsEndpoint
} from '../controllers/adminController';

const router = express.Router();

// All routes require authentication and super_admin role
router.use(authenticate);
router.use(authorize('super_admin'));

// Dashboard stats route
router.get('/dashboard/stats', getDashboardStats);

// System configuration routes
router.get('/configuracion', getSystemConfiguration);
router.put('/configuracion', updateSystemConfiguration);

// Super admin profile routes
router.get('/profile', getSuperAdminProfile);
router.put('/profile', updateSuperAdminProfile);

// Debt management routes
router.get('/debt/statistics', getDebtStatisticsEndpoint);
router.post('/debt/sync', syncUserDebtManual);

export default router;