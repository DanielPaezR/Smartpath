// backend/src/routes/productRoutes.js
import express from 'express';
import productController from '../controllers/productController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Rutas públicas (lectura)
router.get('/', productController.getAllProducts);
router.get('/simple', productController.getAllProducts); // versión simplificada
router.get('/barcode/:barcode', productController.getProductByBarcode);
router.get('/:id', productController.getProductById);

// Rutas de analytics
router.get('/analytics/damage', productController.getDamageAnalytics);
router.get('/analytics/high-risk', productController.getHighRiskProducts);
router.get('/store/:storeId/damage-reports', productController.getStoreDamageReports);

// Rutas de reportes
router.post('/report-damage', productController.reportDamage);

// 🆕 Rutas CRUD solo para admin
router.post('/', requireRole(['admin']), productController.createProduct);
router.put('/:id', requireRole(['admin']), productController.updateProduct);
router.delete('/:id', requireRole(['admin']), productController.deleteProduct);

export default router;