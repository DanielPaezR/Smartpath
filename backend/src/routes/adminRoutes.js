// backend/src/routes/adminRoutes.js
import express from 'express';
import adminController from '../controllers/adminController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Todas las rutas requieren autenticación y rol de admin
router.use(authenticateToken);
router.use(requireRole(['admin']));

// Dashboard routes
router.get('/dashboard/overview', adminController.getDashboardOverview);
router.get('/tracking/live-status', adminController.getLiveAdvisorsStatus);
router.get('/tracking/advisor/:advisorId', adminController.getAdvisorDetail);
router.get('/notifications', adminController.getNotifications);
router.patch('/notifications/:notificationId/read', adminController.markNotificationAsRead);
router.get('/metrics/advanced', adminController.getAdvancedMetrics);

export default router;