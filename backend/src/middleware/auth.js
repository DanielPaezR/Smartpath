// backend/src/middleware/auth.js
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';

export const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ message: 'Token requerido' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'smartpath_secret');
    const user = await User.findById(decoded.id);
    
    if (!user) {
      return res.status(403).json({ message: 'Usuario no válido' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Error verificando token:', error);
    return res.status(403).json({ message: 'Token inválido' });
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