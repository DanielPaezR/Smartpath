// backend/src/services/routeGenerator.js
import { createConnection } from '../config/database.js';

export const routeGenerator = {
  
  // Generar rutas para un día específico (por defecto hoy)
  async generateDailyRoutes(date = null) {
    const connection = await createConnection();
    try {
      const targetDate = date || new Date().toISOString().split('T')[0];
      const dayOfWeek = new Date(targetDate).getDay();
      const dayNumber = dayOfWeek === 0 ? 7 : dayOfWeek;
      
      console.log(`📅 Generando rutas para ${targetDate} (día ${dayNumber})`);
      
      // Obtener todos los asesores activos
      const [advisors] = await connection.execute(
        'SELECT id, name, vehicle_type FROM users WHERE role = "advisor" AND is_active = 1'
      );
      
      let createdCount = 0;
      let updatedCount = 0;
      
      for (const advisor of advisors) {
        // Obtener la configuración semanal del asesor para este día
        const [schedule] = await connection.execute(
          `SELECT s.*, aws.visit_order
           FROM advisor_weekly_schedule aws
           JOIN stores s ON aws.store_id = s.id
           WHERE aws.advisor_id = ? AND aws.day_of_week = ? AND aws.is_active = 1
           ORDER BY aws.visit_order ASC`,
          [advisor.id, dayNumber]
        );
        
        if (schedule.length === 0) {
          console.log(`⚠️ Asesor ${advisor.name} no tiene tiendas asignadas para ${targetDate}`);
          continue;
        }
        
        // Calcular métricas estimadas
        const totalDistance = schedule.length * 5; // 5km por tienda
        const estimatedDuration = schedule.reduce((sum, store) => sum + (store.estimated_visit_duration || 40), 0);
        
        // Verificar si ya existe una ruta para esa fecha
        const [existingRoute] = await connection.execute(
          'SELECT id FROM daily_routes WHERE user_id = ? AND DATE(route_date) = ?',
          [advisor.id, targetDate]
        );
        
        let routeId;
        
        if (existingRoute.length > 0) {
          // Actualizar ruta existente
          routeId = existingRoute[0].id;
          
          await connection.execute(
            `UPDATE daily_routes 
             SET total_stores = ?, total_distance = ?, estimated_duration = ?, status = 'pending', updated_at = NOW()
             WHERE id = ?`,
            [schedule.length, totalDistance, estimatedDuration, routeId]
          );
          
          // Eliminar tiendas anteriores
          await connection.execute('DELETE FROM route_stores WHERE route_id = ?', [routeId]);
          
          updatedCount++;
          console.log(`🔄 Actualizando ruta existente para ${advisor.name}`);
        } else {
          // Crear nueva ruta
          const [result] = await connection.execute(
            `INSERT INTO daily_routes 
             (user_id, route_date, status, total_stores, completed_stores, total_distance, estimated_duration, created_at)
             VALUES (?, ?, 'pending', 0, 0, ?, ?, NOW())`,
            [advisor.id, targetDate, totalDistance, estimatedDuration]
          );
          routeId = result.insertId;
          createdCount++;
          console.log(`✅ Creando nueva ruta para ${advisor.name} con ${schedule.length} tiendas`);
        }
        
        // Insertar las tiendas en orden
        for (let i = 0; i < schedule.length; i++) {
          const store = schedule[i];
          await connection.execute(
            `INSERT INTO route_stores 
             (route_id, store_id, visit_order, status, estimated_duration, start_date)
             VALUES (?, ?, ?, 'pending', ?, NOW())`,
            [routeId, store.id, i + 1, store.estimated_visit_duration || 40]
          );
        }
        
        console.log(`   ✅ ${schedule.length} tiendas asignadas a ${advisor.name}`);
      }
      
      console.log(`📊 Resumen: ${createdCount} rutas creadas, ${updatedCount} actualizadas`);
      return { 
        success: true, 
        message: `Rutas generadas para ${targetDate}`,
        created: createdCount,
        updated: updatedCount
      };
      
    } catch (error) {
      console.error('❌ Error generando rutas:', error);
      return { success: false, error: error.message };
    } finally {
      await connection.end();
    }
  },
  
  // Generar rutas para toda la semana (opcional)
  async generateWeekRoutes() {
    const results = [];
    const today = new Date();
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      
      console.log(`📅 Generando para ${dateStr}...`);
      const result = await this.generateDailyRoutes(dateStr);
      results.push({ date: dateStr, ...result });
    }
    
    return results;
  }
};