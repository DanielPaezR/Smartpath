// backend/src/routes/trackingRoutes.js
import express from 'express';
import { trackingController } from '../controllers/trackingController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Rutas protegidas - requieren autenticación
router.post('/update-location', authenticateToken, trackingController.updateLocation);
router.get('/history/:advisorId', authenticateToken, trackingController.getLocationHistory);

export default router;