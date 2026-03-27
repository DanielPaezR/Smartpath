// backend/src/controllers/authController.js
import { User } from '../models/User.js';
import { createConnection } from '../config/database.js';
import jwt from 'jsonwebtoken';

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Logs de debug
    console.log('📧 Email recibido:', email);
    console.log('🔐 Password recibido:', password ? '***' : 'undefined');
    console.log('🔍 Buscando usuario en la base de datos...');

    // Buscar usuario por email
    const user = await User.findByEmail(email);
    console.log('👤 Usuario encontrado:', user ? `Sí (${user.email})` : 'NO ENCONTRADO');
    
    if (user) {
      console.log('📋 Datos del usuario:', {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        is_active: user.is_active
      });
    }

    if (!user) {
      console.log('❌ Usuario no existe en la base de datos');
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    // Verificar contraseña
    console.log('🔑 Verificando contraseña...');
    const isValidPassword = await User.verifyPassword(password, user.password);
    console.log('✅ Contraseña válida:', isValidPassword);

    if (!isValidPassword) {
      console.log('❌ Contraseña incorrecta');
      console.log('💡 Hash en BD:', user.password);
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    console.log('🎯 Login exitoso, generando token...');

    // Generar token JWT
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        role: user.role,
        name: user.name 
      },
      process.env.JWT_SECRET || 'smartpath_super_secret_key_2024_vitamarket',
      { expiresIn: '24h' }
    );

    // Devolver usuario sin password
    const { password: _, ...userWithoutPassword } = user;
    
    console.log('🚀 Login completado exitosamente para:', user.email);
    
    res.json({
      message: 'Login exitoso',
      token,
      user: userWithoutPassword
    });
  } catch (error) {
    console.error('🔥 Error en login:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    res.json(user);
  } catch (error) {
    console.error('Error obteniendo perfil:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// 🆕 FUNCIÓN PARA CAMBIAR CONTRASEÑA
export const changePassword = async (req, res) => {
  const connection = await createConnection();
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    // Validaciones
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ 
        success: false, 
        message: 'Debes ingresar tu contraseña actual y la nueva contraseña' 
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: 'La nueva contraseña debe tener al menos 6 caracteres' 
      });
    }

    // Obtener el usuario de la base de datos
    const [users] = await connection.execute(
      'SELECT id, password FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Usuario no encontrado' 
      });
    }

    const user = users[0];

    // Verificar la contraseña actual
    const bcrypt = await import('bcrypt');
    const isValid = await bcrypt.compare(currentPassword, user.password);

    if (!isValid) {
      return res.status(401).json({ 
        success: false, 
        message: 'Contraseña actual incorrecta' 
      });
    }

    // Hashear la nueva contraseña
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Actualizar la contraseña
    await connection.execute(
      'UPDATE users SET password = ?, updated_at = NOW() WHERE id = ?',
      [hashedPassword, userId]
    );

    console.log(`🔐 Contraseña actualizada para usuario ID: ${userId}`);
    
    res.json({ 
      success: true, 
      message: 'Contraseña actualizada exitosamente' 
    });

  } catch (error) {
    console.error('❌ Error cambiando contraseña:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al cambiar la contraseña',
      error: error.message 
    });
  } finally {
    await connection.end();
  }
};