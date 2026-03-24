// backend/src/routes/trackingRoutes.js
import express from 'express';
import trackingController from '../controllers/trackingController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Actualizar ubicación del asesor
router.post('/update-location', trackingController.updateLocation);

export default router;