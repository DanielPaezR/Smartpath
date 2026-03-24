// backend/src/services/routeGenerator.js
import { createConnection } from '../config/database.js';

export const routeGenerator = {
  
  // Generar rutas para un día específico (por defecto hoy)
  async generateDailyRoutes(date = null) {
    const connection = await createConnection();
    try {
      const targetDate = date || new Date().toISOString().split('T')[0];
      const dayOfWeek = new Date(targetDate).toLocaleDateString('en', { weekday: 'long' }).toLowerCase();
      
      console.log(`📅 Generando rutas para ${targetDate} (${dayOfWeek})`);
      
      // Obtener todos los asesores activos
      const [advisors] = await connection.execute(
        'SELECT id, name FROM users WHERE role = "advisor" AND is_active = 1'
      );
      
      let createdCount = 0;
      let updatedCount = 0;
      
      for (const advisor of advisors) {
        // Obtener la plantilla del asesor para este día (desde route_templates)
        const [template] = await connection.execute(
          `SELECT id FROM route_templates 
           WHERE advisor_id = ? AND day_of_week = ? AND is_active = 1`,
          [advisor.id, dayOfWeek]
        );
        
        if (template.length === 0) {
          console.log(`⚠️ Asesor ${advisor.name} no tiene plantilla para ${dayOfWeek}`);
          continue;
        }
        
        // Obtener las tiendas de la plantilla
        const [stores] = await connection.execute(`
          SELECT rts.store_id, rts.visit_order, s.name
          FROM route_template_stores rts
          JOIN stores s ON rts.store_id = s.id
          WHERE rts.template_id = ?
          ORDER BY rts.visit_order
        `, [template[0].id]);
        
        if (stores.length === 0) {
          console.log(`⚠️ Asesor ${advisor.name} tiene plantilla vacía para ${dayOfWeek}`);
          continue;
        }
        
        // Verificar si ya existe una ruta para esta fecha en daily_routes
        const [existingRoute] = await connection.execute(
          'SELECT id FROM daily_routes WHERE user_id = ? AND DATE(route_date) = ?',
          [advisor.id, targetDate]
        );
        
        let routeId;
        
        if (existingRoute.length > 0) {
          routeId = existingRoute[0].id;
          // Eliminar tiendas anteriores
          await connection.execute('DELETE FROM route_stores WHERE route_id = ?', [routeId]);
          updatedCount++;
          console.log(`🔄 Actualizando ruta para ${advisor.name}`);
        } else {
          const [result] = await connection.execute(
            `INSERT INTO daily_routes (user_id, route_date, status, total_stores)
             VALUES (?, ?, 'pending', ?)`,
            [advisor.id, targetDate, stores.length]
          );
          routeId = result.insertId;
          createdCount++;
          console.log(`✅ Creando nueva ruta para ${advisor.name} con ${stores.length} tiendas`);
        }
        
        // Insertar las tiendas
        for (const store of stores) {
          await connection.execute(
            `INSERT INTO route_stores (route_id, store_id, visit_order, status)
             VALUES (?, ?, ?, 'pending')`,
            [routeId, store.store_id, store.visit_order]
          );
        }
        
        console.log(`   ✅ ${stores.length} tiendas asignadas a ${advisor.name}`);
      }
      
      console.log(`📊 Resumen: ${createdCount} rutas creadas, ${updatedCount} actualizadas`);
      return { success: true, created: createdCount, updated: updatedCount };
      
    } catch (error) {
      console.error('❌ Error generando rutas:', error);
      return { success: false, error: error.message };
    } finally {
      await connection.end();
    }
  }
};