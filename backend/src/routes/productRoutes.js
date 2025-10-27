// backend/src/routes/productRoutes.js
import express from 'express';
import { productController } from '../controllers/productController.js';

const router = express.Router();

router.get('/barcode/:barcode', productController.getProductByBarcode);
router.post('/report-damage', productController.reportDamage);
router.get('/damage-reports/store/:storeId', productController.getStoreDamageReports);

export default router;