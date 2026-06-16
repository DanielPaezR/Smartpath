import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { routeController } from '../controllers/routeController.js';
import trackingRoutes from './trackingRoutes.js';
import { productController } from '../controllers/productController.js';
import { handlePhotoUpload } from '../middleware/upload.js';
import multer from 'multer';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });


router.post('/generate', routeController.generateDailyRoute);
router.get('/advisor/:advisorId/current', routeController.getCurrentRoute);
router.patch('/start-visit', routeController.startStoreVisit);
router.post('/complete-visit', authenticateToken, handlePhotoUpload, routeController.completeStoreVisit);
router.post('/complete-visit', authenticateToken, upload.fields([
  { name: 'beforePhoto', maxCount: 1 },
  { name: 'afterPhoto', maxCount: 1 },
  { name: 'signature', maxCount: 1 }
]), routeController.completeStoreVisit);
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