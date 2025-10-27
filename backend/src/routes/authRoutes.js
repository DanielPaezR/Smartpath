import express from 'express';
import { login, getProfile } from '../controllers/authController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Ruta de login (pública)
router.post('/login', login);

// Ruta para obtener perfil (protegida)
router.get('/profile', authenticateToken, getProfile);

export default router;