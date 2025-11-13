// backend/src/models/User.js
import { createConnection } from '../config/database.js';
import bcrypt from 'bcrypt';

export class User {
  // Obtener usuario por email
  static async findByEmail(email) {
    const connection = await createConnection();
    try {
      const [rows] = await connection.execute(
        'SELECT * FROM users WHERE email = ? AND is_active = TRUE',
        [email]
      );
      return rows[0] || null;
    } finally {
      await connection.end();
    }
  }

  // Obtener usuario por ID
  static async findById(id) {
    const connection = await createConnection();
    try {
      const [rows] = await connection.execute(
        'SELECT id, email, name, role, vehicle_type, license_plate, assigned_zone, is_active FROM users WHERE id = ? AND is_active = TRUE',
        [id]
      );
      return rows[0] || null;
    } finally {
      await connection.end();
    }
  }

  // Crear nuevo usuario
  static async create(userData) {
    const connection = await createConnection();
    try {
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      const [result] = await connection.execute(
        `INSERT INTO users 
         (email, password, name, role, vehicle_type, license_plate, assigned_zone, work_start_time, work_end_time) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userData.email,
          hashedPassword,
          userData.name,
          userData.role,
          userData.vehicleType || null,
          userData.licensePlate || null,
          userData.assignedZone || null,
          userData.workStartTime || '08:00:00',
          userData.workEndTime || '17:00:00'
        ]
      );
      
      return result.insertId;
    } finally {
      await connection.end();
    }
  }

  // Verificar contraseña
  static async verifyPassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  // Actualizar usuario
  static async update(id, userData) {
    const connection = await createConnection();
    try {
      let query = 'UPDATE users SET ';
      const values = [];
      const updates = [];
      
      if (userData.name) {
        updates.push('name = ?');
        values.push(userData.name);
      }
      if (userData.vehicleType) {
        updates.push('vehicle_type = ?');
        values.push(userData.vehicleType);
      }
      if (userData.licensePlate) {
        updates.push('license_plate = ?');
        values.push(userData.licensePlate);
      }
      if (userData.assignedZone) {
        updates.push('assigned_zone = ?');
        values.push(userData.assignedZone);
      }
      if (userData.workStartTime) {
        updates.push('work_start_time = ?');
        values.push(userData.workStartTime);
      }
      if (userData.workEndTime) {
        updates.push('work_end_time = ?');
        values.push(userData.workEndTime);
      }
      
      if (updates.length === 0) {
        throw new Error('No fields to update');
      }
      
      query += updates.join(', ') + ' WHERE id = ?';
      values.push(id);
      
      const [result] = await connection.execute(query, values);
      return result.affectedRows > 0;
    } finally {
      await connection.end();
    }
  }

  // Obtener todos los asesores activos
  static async findAllAdvisors() {
    const connection = await createConnection();
    try {
      const [rows] = await connection.execute(
        `SELECT id, email, name, vehicle_type, license_plate, assigned_zone, 
                work_start_time, work_end_time, created_at 
         FROM users 
         WHERE role = 'advisor' AND is_active = TRUE 
         ORDER BY name`
      );
      return rows;
    } finally {
      await connection.end();
    }
  }

  // Desactivar usuario (soft delete)
  static async deactivate(id) {
    const connection = await createConnection();
    try {
      const [result] = await connection.execute(
        'UPDATE users SET is_active = FALSE WHERE id = ?',
        [id]
      );
      return result.affectedRows > 0;
    } finally {
      await connection.end();
    }
  }

  // Cambiar contraseña
  static async changePassword(id, newPassword) {
    const connection = await createConnection();
    try {
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      const [result] = await connection.execute(
        'UPDATE users SET password = ? WHERE id = ?',
        [hashedPassword, id]
      );
      return result.affectedRows > 0;
    } finally {
      await connection.end();
    }
  }
}