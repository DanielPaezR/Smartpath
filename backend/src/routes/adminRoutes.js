import express from 'express';
import adminController from '../controllers/adminController';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { advancedAdminController } from '../controllers/advancedAdminController.js';

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

// ✅ MÉTRICAS AVANZADAS - UNA SOLA VEZ, usando adminController
router.get('/metrics/advanced', adminController.getAdvancedMetrics);

// Rutas de advancedAdminController
router.post('/routes/optimize', advancedAdminController.generateOptimizedRoute);
router.get('/reports/damage', advancedAdminController.getDamageReports);

export default router;