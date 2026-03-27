import express from 'express';
import { login, getProfile, changePassword } from '../controllers/authController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Ruta de login (pública)
router.post('/login', login);

// Ruta para cambiar contraseña (protegida)
router.post('/change-password', authenticateToken, changePassword);

// Ruta para obtener perfil (protegida)
router.get('/profile', authenticateToken, getProfile);

export default router;