// backend/src/routes/adminRoutes.js
import express from 'express';
import adminController from '../controllers/adminController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();
router.get('/advisor/metrics', authenticateToken, adminController.getAdvisorMetrics);

// Todas las rutas requieren autenticación y rol de admin
router.use(authenticateToken);
router.use(requireRole(['admin']));

// Dashboard routes
router.get('/dashboard/overview', adminController.getDashboardOverview);
router.get('/tracking/live-status', adminController.getLiveAdvisorsStatus);
router.get('/tracking/advisor/:advisorId', adminController.getAdvisorDetail);
router.get('/notifications', adminController.getNotifications);
router.get('/advisors', adminController.getAllAdvisors);
router.get('/advisors/:id', adminController.getAdvisorById);
router.get('/reports/damage', adminController.getDamageReports);
router.get('/metrics/advanced', adminController.getAdvancedMetrics);

router.patch('/notifications/:notificationId/read', adminController.markNotificationAsRead);

// Rutas de optimización y reportes (ahora en adminController)
router.post('/routes/optimize', adminController.generateOptimizedRoute);
router.post('/advisors', adminController.createAdvisor);

router.put('/advisors/:id', adminController.updateAdvisor);
router.delete('/advisors/:id', adminController.deleteAdvisor);

// Configuración de rutas
router.get('/advisors/:advisorId/schedule', adminController.getAdvisorSchedule);
router.post('/advisors/:advisorId/schedule', adminController.addStoreToSchedule);
router.delete('/advisors/:advisorId/schedule/:scheduleId', adminController.removeStoreFromSchedule);
router.put('/advisors/:advisorId/schedule/order', adminController.updateScheduleOrder);
router.get('/stores/simple', adminController.getAllStoresSimple);
router.get('/ml/metrics', adminController.getMLMetrics);
// Agregar esta línea en adminRoutes.js
router.get('/advisor/visit-notes', authenticateToken, adminController.getVisitNotes);
router.get('/advisors/:advisorId/weekly-pattern', adminController.getWeeklyPattern);

// Generar rutas diarias
router.post('/routes/generate-daily', adminController.generateDailyRoutes);
router.post('/routes/generate-week', adminController.generateWeekRoutes);


export default router;