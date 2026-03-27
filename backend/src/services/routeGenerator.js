// backend/src/services/routeGenerator.js
import { createConnection } from '../config/database.js';

export const routeGenerator = {
  
  async generateDailyRoutes(date = null) {
    const connection = await createConnection();
    try {
      const targetDate = date || new Date().toISOString().split('T')[0];
      const dayOfWeek = new Date(targetDate).toLocaleDateString('en', { weekday: 'long' }).toLowerCase();
      
      console.log(`📅 Generando rutas para ${targetDate} (${dayOfWeek})`);
      
      // 🆕 LOG PARA DEPURAR
      console.log(`🔍 Fecha: ${targetDate}, Día de la semana calculado: "${dayOfWeek}"`);
      
      const [advisors] = await connection.execute(
        'SELECT id, name FROM users WHERE role = "advisor" AND is_active = 1'
      );
      
      let createdCount = 0;
      let updatedCount = 0;
      
      for (const advisor of advisors) {
        // 🆕 LOG: qué plantilla estamos buscando
        console.log(`🔍 Buscando plantilla para ${advisor.name}: advisor_id=${advisor.id}, day_of_week="${dayOfWeek}"`);
        
        const [template] = await connection.execute(
          `SELECT id, day_of_week FROM route_templates 
           WHERE advisor_id = ? AND day_of_week = ? AND is_active = 1`,
          [advisor.id, dayOfWeek]
        );
        
        console.log(`📋 Resultado plantilla: ${template.length > 0 ? `ID ${template[0].id} (${template[0].day_of_week})` : 'NO ENCONTRADA'}`);
        
        if (template.length === 0) {
          console.log(`⚠️ Asesor ${advisor.name} no tiene plantilla para ${dayOfWeek}`);
          continue;
        }
        
        const [stores] = await connection.execute(`
          SELECT rts.store_id, rts.visit_order, s.name
          FROM route_template_stores rts
          JOIN stores s ON rts.store_id = s.id
          WHERE rts.template_id = ?
          ORDER BY rts.visit_order
        `, [template[0].id]);
        
        console.log(`🏪 ${advisor.name}: ${stores.length} tiendas encontradas en plantilla`);
        
        if (stores.length === 0) {
          console.log(`⚠️ Asesor ${advisor.name} tiene plantilla vacía para ${dayOfWeek}`);
          continue;
        }
        
        // 🆕 Mostrar primeras tiendas para verificar
        console.log(`   Primeras tiendas: ${stores.slice(0, 3).map(s => s.name).join(', ')}...`);
        
        const [existingRoute] = await connection.execute(
          'SELECT id FROM routes WHERE advisor_id = ? AND date = ?',
          [advisor.id, targetDate]
        );
        
        let routeId;
        
        if (existingRoute.length > 0) {
          routeId = existingRoute[0].id;
          await connection.execute(
            `UPDATE routes 
             SET total_stores = ?, status = 'pending', updated_at = NOW()
             WHERE id = ?`,
            [stores.length, routeId]
          );
          await connection.execute('DELETE FROM route_stores WHERE route_id = ?', [routeId]);
          updatedCount++;
          console.log(`🔄 Actualizando ruta existente para ${advisor.name} (ID: ${routeId})`);
        } else {
          const [result] = await connection.execute(
            `INSERT INTO routes (advisor_id, date, total_stores, status, created_at, updated_at)
             VALUES (?, ?, ?, 'pending', NOW(), NOW())`,
            [advisor.id, targetDate, stores.length]
          );
          routeId = result.insertId;
          createdCount++;
          console.log(`✅ Creando nueva ruta para ${advisor.name} (ID: ${routeId}) con ${stores.length} tiendas`);
        }
        
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