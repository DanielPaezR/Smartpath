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
        // Obtener la plantilla del asesor para este día
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
        
        // ✅ USAR ROUTES (porque route_stores tiene FK a routes.id)
        const [existingRoute] = await connection.execute(
          'SELECT id FROM routes WHERE advisor_id = ? AND date = ?',
          [advisor.id, targetDate]
        );
        
        let routeId;
        
        if (existingRoute.length > 0) {
          // Actualizar ruta existente
          routeId = existingRoute[0].id;
          await connection.execute(
            `UPDATE routes 
             SET total_stores = ?, status = 'pending', updated_at = NOW()
             WHERE id = ?`,
            [stores.length, routeId]
          );
          
          // Eliminar tiendas anteriores
          await connection.execute('DELETE FROM route_stores WHERE route_id = ?', [routeId]);
          updatedCount++;
          console.log(`🔄 Actualizando ruta existente para ${advisor.name} (ID: ${routeId})`);
        } else {
          // Crear nueva ruta en routes
          const [result] = await connection.execute(
            `INSERT INTO routes (advisor_id, date, total_stores, status, created_at, updated_at)
             VALUES (?, ?, ?, 'pending', NOW(), NOW())`,
            [advisor.id, targetDate, stores.length]
          );
          routeId = result.insertId;
          createdCount++;
          console.log(`✅ Creando nueva ruta para ${advisor.name} (ID: ${routeId}) con ${stores.length} tiendas`);
        }
        
        // Insertar las tiendas en route_stores
        for (let i = 0; i < stores.length; i++) {
          const store = stores[i];
          await connection.execute(
            `INSERT INTO route_stores 
             (route_id, store_id, visit_order, status, created_at, updated_at)
             VALUES (?, ?, ?, 'pending', NOW(), NOW())`,
            [routeId, store.store_id, i + 1]
          );
        }
        
        console.log(`   ✅ ${stores.length} tiendas asignadas a ${advisor.name}`);
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
  
  // Generar rutas para toda la semana
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