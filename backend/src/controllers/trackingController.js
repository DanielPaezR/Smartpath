// backend/src/controllers/trackingController.js
import { createConnection } from '../config/database.js';

export const trackingController = {
  // Actualizar ubicación del asesor
  async updateLocation(req, res) {
    const connection = await createConnection();
    try {
      const userId = req.user?.id; // Del middleware de autenticación
      const { latitude, longitude, currentStoreId, activityStatus, batteryLevel } = req.body;

      if (!userId) {
        return res.status(401).json({ message: 'Usuario no autenticado' });
      }

      console.log('📍 Actualizando ubicación para usuario:', userId, {
        latitude, longitude, currentStoreId, activityStatus, batteryLevel
      });

      // Insertar o actualizar tracking
      await connection.execute(
        `INSERT INTO real_time_tracking 
         (user_id, latitude, longitude, current_store_id, activity_status, battery_level, last_update)
         VALUES (?, ?, ?, ?, ?, ?, NOW())
         ON DUPLICATE KEY UPDATE
         latitude = VALUES(latitude),
         longitude = VALUES(longitude),
         current_store_id = VALUES(current_store_id),
         activity_status = VALUES(activity_status),
         battery_level = VALUES(battery_level),
         last_update = NOW()`,
        [userId, latitude, longitude, currentStoreId || null, activityStatus, batteryLevel]
      );

      res.json({ 
        message: 'Ubicación actualizada exitosamente',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error actualizando ubicación:', error);
      res.status(500).json({ message: 'Error actualizando ubicación' });
    } finally {
      await connection.end();
    }
  },

  // Obtener historial de ubicaciones de un asesor
  async getLocationHistory(req, res) {
    const connection = await createConnection();
    try {
      const { advisorId } = req.params;
      const { startDate, endDate } = req.query;

      let query = `
        SELECT * FROM real_time_tracking 
        WHERE user_id = ? 
      `;
      const params = [advisorId];

      if (startDate && endDate) {
        query += ` AND DATE(last_update) BETWEEN ? AND ?`;
        params.push(startDate, endDate);
      }

      query += ` ORDER BY last_update DESC LIMIT 100`;

      const [rows] = await connection.execute(query, params);
      
      res.json(rows);
    } catch (error) {
      console.error('Error obteniendo historial:', error);
      res.status(500).json({ message: 'Error obteniendo historial de ubicaciones' });
    } finally {
      await connection.end();
    }
  }
};