// backend/src/controllers/trackingController.js
import { createConnection } from '../config/database.js';

class TrackingController {
  
  // Actualizar ubicación de un asesor
  async updateLocation(req, res) {
    const connection = await createConnection();
    try {
      const userId = req.user.id; // Del token JWT
      const { latitude, longitude, activity_status, current_store_id, battery_level } = req.body;
      
      console.log(`📍 Actualizando ubicación para asesor ID: ${userId}`);
      console.log(`   Lat: ${latitude}, Lng: ${longitude}`);
      console.log(`   Estado: ${activity_status || 'traveling'}`);
      
      // Insertar o actualizar ubicación en tiempo real
      await connection.execute(
        `INSERT INTO real_time_tracking 
         (user_id, latitude, longitude, activity_status, current_store_id, battery_level, last_update)
         VALUES (?, ?, ?, ?, ?, ?, NOW())
         ON DUPLICATE KEY UPDATE
         latitude = VALUES(latitude),
         longitude = VALUES(longitude),
         activity_status = VALUES(activity_status),
         current_store_id = VALUES(current_store_id),
         battery_level = VALUES(battery_level),
         last_update = VALUES(last_update)`,
        [userId, latitude, longitude, activity_status || 'traveling', current_store_id || null, battery_level || null]
      );
      
      console.log(`✅ Ubicación guardada para asesor ${userId}`);
      
      res.json({ 
        success: true, 
        message: 'Ubicación actualizada',
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('❌ Error actualizando ubicación:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error al actualizar ubicación',
        error: error.message 
      });
    } finally {
      await connection.end();
    }
  }
}

export default new TrackingController();