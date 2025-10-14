import express from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { getAuditLogs, getAuditStats, exportAuditLogs } from '../controllers/auditController';

const router = express.Router();

// All audit routes require super admin authentication
router.use(authenticate);
router.use(authorize('super_admin'));

// GET /api/audit/logs - Get audit logs with pagination and filters
router.get('/logs', getAuditLogs);

// GET /api/audit/stats - Get audit statistics
router.get('/stats', getAuditStats);

// GET /api/audit/export - Export audit logs
router.get('/export', exportAuditLogs);

export default router;