import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';

export const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Token requerido' });
  }

  try {
    console.log('🔍 Verificando token...');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'smartpath_super_secret_key_2024_vitamarket');
    console.log('✅ Token decodificado:', decoded);
    
    // ✅ CORREGIDO: Buscar por 'id' (como está en el token del authController)
    const user = await User.findById(decoded.id); // ← CAMBIAR de userId a id
    
    if (!user) {
      return res.status(403).json({ message: 'Usuario no válido' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('❌ Error verificando token:', error.message);
    return res.status(403).json({ message: 'Token inválido: ' + error.message });
  }
};

export const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'No autenticado' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'No autorizado' });
    }

    next();
  };
};