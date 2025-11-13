import express from 'express';
import { routeController } from '../controllers/routeController.js';
import trackingRoutes from './trackingRoutes.js';

const router = express.Router();


router.post('/generate', routeController.generateDailyRoute);
router.get('/advisor/:advisorId/current', routeController.getCurrentRoute);
router.patch('/start-visit', routeController.startStoreVisit);
router.patch('/complete-visit', routeController.completeStoreVisit);
router.patch('/skip-visit', routeController.skipStoreVisit);
router.patch('/update-tasks', routeController.updateStoreTasks);
router.get('/metrics', routeController.getRouteMetrics);
router.use('/tracking', trackingRoutes);
router.get('/products/barcode/:barcode', productController.getProductByBarcode);
router.post('/products/report-damage', productController.reportDamage);
router.get('/stores/:storeId/damage-reports', productController.getStoreDamageReports);
router.get('/analytics/damage-reports', productController.getDamageAnalytics); // 🆕
router.get('/analytics/high-risk-products', productController.getHighRiskProducts);

export default router;