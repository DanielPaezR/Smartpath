// backend/src/controllers/routeController.js - VERSIÓN COMPLETA CON STATUS ESTANDARIZADO
import { createConnection } from '../config/database.js';

console.log('🔄 routeController.js CARGADO - VERSIÓN COMPLETA CON STATUS ESTANDARIZADO');

export const routeController = {
  async getCurrentRoute(req, res) {
    console.log('🚨=== INICIANDO getCurrentRoute ===');
    const connection = await createConnection();
    try {
      const { advisorId } = req.params;
      
      console.log('👤 Advisor ID recibido:', advisorId);

      // 1. PRIMERO BUSCAR EN RUTAS EXISTENTES PARA HOY
      const [todayRoutes] = await connection.execute(
        `SELECT id, date, total_stores, completed_stores FROM routes 
         WHERE advisor_id = ? AND date = CURDATE()`,
        [advisorId]
      );
      console.log('🎯 Ruta de HOY en tabla routes:', todayRoutes);

      // 🎯 SI HAY RUTA PERO NO TIENE TIENDAS, ELIMINARLA Y USAR PLANTILLA
      if (todayRoutes.length > 0) {
        const routeId = todayRoutes[0].id;
        
        // VERIFICAR SI HAY TIENDAS EN ROUTE_STORES
        const [storesCount] = await connection.execute(
          `SELECT COUNT(*) as count FROM route_stores WHERE route_id = ?`,
          [routeId]
        );
        
        console.log('🔢 Número de tiendas en route_stores:', storesCount[0].count);

        // 🚨 SI NO HAY TIENDAS, ELIMINAR LA RUTA Y USAR PLANTILLA
        if (storesCount[0].count === 0) {
          console.log('🗑️ Ruta existe pero sin tiendas, eliminando ruta', routeId);
          await connection.execute(`DELETE FROM routes WHERE id = ?`, [routeId]);
          console.log('🔄 Continuando con plantilla...');
          return await getTemplateRoute(connection, advisorId, res);
        }

        // 🎯 SI HAY TIENDAS, CONTINUAR NORMALMENTE
        const [stores] = await connection.execute(
          `SELECT 
              rs.*, 
              s.name, 
              s.address,
              s.latitude,
              s.longitude,
              s.zone,
              s.category
           FROM route_stores rs 
           JOIN stores s ON rs.store_id = s.id 
           WHERE rs.route_id = ? ORDER BY rs.visit_order`,
          [routeId]
        );

        console.log('🏪 Tiendas REALES en BD:', stores.length);

        const response = {
          id: routeId.toString(),
          advisor_id: advisorId,
          date: todayRoutes[0].date,
          total_stores: todayRoutes[0].total_stores,
          completed_stores: todayRoutes[0].completed_stores || 0,
          total_distance: '15 km',
          estimated_duration: '120 min',
          stores: stores.map(store => ({
            id: store.id.toString(),
            storeId: {
              id: store.store_id.toString(),
              name: store.name,
              address: store.address,
              coordinates: {
                lat: parseFloat(store.latitude) || 6.244203,
                lng: parseFloat(store.longitude) || -75.581211
              },
              zone: store.zone,
              category: store.category
            },
            status: store.status,
            visit_order: store.visit_order
          }))
        };

        console.log('🚀 ENVIANDO AL FRONTEND - RUTA EXISTENTE CON TIENDAS');
        res.json(response);
        return;
      }

      // 2. SI NO HAY RUTA PARA HOY, USAR PLANTILLAS
      console.log('🔄 No hay ruta para hoy, usando PLANTILLAS del día actual');
      return await getTemplateRoute(connection, advisorId, res);

    } catch (error) {
      console.error('❌ ERROR en getCurrentRoute:', error);
      res.status(500).json({ 
        success: false,
        message: 'Error interno del servidor',
        error: error.message 
      });
    } finally {
      await connection.end();
      console.log('🚨=== FINALIZANDO getCurrentRoute ===');
    }
  },

  async startStoreVisit(req, res) {
    console.log('🚨=== INICIANDO startStoreVisit ===');
    const connection = await createConnection();
    try {
      const { routeId, storeVisitId } = req.body;

      console.log('🎯 START STORE VISIT - DATOS RECIBIDOS:', {
        routeId,
        storeVisitId,
        tipoRouteId: typeof routeId,
        tipoStoreVisitId: typeof storeVisitId
      });

      if (!routeId || !storeVisitId) {
        console.log('❌ Faltan parámetros requeridos');
        return res.status(400).json({ 
          success: false,
          message: 'routeId y storeVisitId requeridos' 
        });
      }

      const isTemplateRoute = routeId.startsWith('template_');
      console.log('🔍 Tipo de ruta:', isTemplateRoute ? 'PLANTILLA' : 'REAL');

      if (isTemplateRoute) {
        const templateId = routeId.replace('template_', '');
        console.log('📋 Template ID:', templateId);
        console.log('🏪 Store Visit ID:', storeVisitId);

        if (isNaN(storeVisitId)) {
          console.log('❌ ERROR: storeVisitId no es numérico:', storeVisitId);
          return res.status(400).json({
            success: false,
            message: 'ID de visita inválido - debe ser numérico',
            details: `Se recibió: ${storeVisitId} (tipo: ${typeof storeVisitId})`
          });
        }

        const numericStoreVisitId = parseInt(storeVisitId);
        console.log('🔢 Store Visit ID numérico:', numericStoreVisitId);

        // VERIFICAR QUE EXISTE EN PLANTILLA
        const [existingVisit] = await connection.execute(
          `SELECT id FROM route_template_stores WHERE id = ? AND template_id = ?`,
          [numericStoreVisitId, templateId]
        );

        console.log('🔍 Visita encontrada en plantilla:', existingVisit);

        if (existingVisit.length === 0) {
          console.log('❌ Visita no encontrada en plantilla');
          return res.status(404).json({
            success: false,
            message: 'Visita no encontrada en la plantilla'
          });
        }

        // OBTENER INFORMACIÓN COMPLETA DE LA TIENDA
        const [storeInfo] = await connection.execute(
          `SELECT rts.store_id, rts.visit_order, s.name, s.address 
           FROM route_template_stores rts
           JOIN stores s ON rts.store_id = s.id
           WHERE rts.id = ? AND rts.template_id = ?`,
          [numericStoreVisitId, templateId]
        );

        console.log('🏪 Información completa de tienda:', storeInfo);

        if (storeInfo.length === 0) {
          return res.status(404).json({
            success: false,
            message: 'Información de tienda no encontrada'
          });
        }

        const storeData = storeInfo[0];
        console.log('📦 Datos de tienda a insertar:', {
          store_id: storeData.store_id,
          visit_order: storeData.visit_order,
          name: storeData.name
        });
        
        // 🎯 CREAR NUEVA RUTA
        console.log('🆕 Creando nueva ruta con AUTO_INCREMENT...');
        
        const [routeResult] = await connection.execute(
          `INSERT INTO routes (advisor_id, date, total_stores, completed_stores, total_distance, estimated_duration, status) 
           VALUES (?, CURDATE(), 1, 0, 15.00, 120.00, 'in-progress')`,
          [req.user?.id || '8']
        );

        const tempRouteId = routeResult.insertId;
        console.log('✅ Ruta creada con ID:', tempRouteId);

        // INSERTAR EN ROUTE_STORES
        console.log('🔄 Insertando tienda en route_stores...');
        console.log('📤 Datos de inserción:', {
          route_id: tempRouteId,
          store_id: storeData.store_id,
          visit_order: storeData.visit_order
        });

        const [result] = await connection.execute(
          `INSERT INTO route_stores (route_id, store_id, visit_order, status, start_time) 
           VALUES (?, ?, ?, 'in-progress', NOW())`,
          [tempRouteId, storeData.store_id, storeData.visit_order]
        );

        console.log('📊 Resultado de inserción en route_stores:', {
          insertId: result.insertId,
          affectedRows: result.affectedRows
        });

        if (result.affectedRows === 0) {
          console.log('❌ No se pudo crear la visita en route_stores');
          return res.status(500).json({
            success: false,
            message: 'No se pudo crear la visita'
          });
        }

        // VERIFICAR QUE REALMENTE SE INSERTÓ
        const [verify] = await connection.execute(
          `SELECT * FROM route_stores WHERE id = ?`,
          [result.insertId]
        );
        console.log('🔍 Verificación de inserción:', verify);

        console.log('✅ Visita de plantilla iniciada exitosamente');
        return res.json({
          success: true,
          message: 'Visita de plantilla iniciada exitosamente',
          visitId: result.insertId,
          routeId: tempRouteId.toString(),
          startTime: new Date().toISOString(),
          isTemplate: true
        });

      } else {
        console.log('🛣️ Ruta REAL - ID:', routeId);
        console.log('🏪 Store Visit ID:', storeVisitId);

        const [existingVisit] = await connection.execute(
          `SELECT id, status FROM route_stores WHERE id = ? AND route_id = ?`,
          [storeVisitId, routeId]
        );

        console.log('🔍 Visita encontrada en ruta real:', existingVisit);

        if (existingVisit.length === 0) {
          return res.status(404).json({
            success: false,
            message: 'Visita no encontrada en la ruta'
          });
        }

        const [result] = await connection.execute(
          `UPDATE route_stores SET status = 'in-progress', start_time = NOW() WHERE id = ? AND route_id = ?`,
          [storeVisitId, routeId]
        );

        console.log('📊 Resultado de actualización:', result);

        if (result.affectedRows === 0) {
          return res.status(500).json({
            success: false,
            message: 'No se pudo actualizar la visita en la ruta real'
          });
        }

        console.log('✅ Visita real iniciada exitosamente');
        return res.json({
          success: true,
          message: 'Visita iniciada exitosamente',
          visitId: storeVisitId,
          startTime: new Date().toISOString(),
          isTemplate: false
        });
      }

    } catch (error) {
      console.error('❌ ERROR CRÍTICO en startStoreVisit:', error);
      console.error('📋 Detalles completos del error:', {
        message: error.message,
        code: error.code,
        errno: error.errno,
        sql: error.sql,
        sqlState: error.sqlState
      });

      res.status(500).json({
        success: false,
        message: 'Error interno del servidor al iniciar visita',
        error: process.env.NODE_ENV === 'development' ? {
          message: error.message,
          code: error.code,
          sql: error.sql
        } : undefined
      });
    } finally {
      await connection.end();
      console.log('🚨=== FINALIZANDO startStoreVisit ===');
    }
  },

  async completeStoreVisit(req, res) {
    console.log('🚨=== INICIANDO completeStoreVisit ===');
    const connection = await createConnection();
    try {
      const { routeId, storeVisitId, visitData } = req.body;

      console.log('✅ COMPLETE STORE VISIT - DATOS:', { routeId, storeVisitId });

      if (!routeId || !storeVisitId) {
        return res.status(400).json({ 
          success: false,
          message: 'routeId y storeVisitId requeridos' 
        });
      }

      let duration = visitData?.duration;
      if (!duration) {
        const [visitInfo] = await connection.execute(
          `SELECT TIMESTAMPDIFF(MINUTE, start_time, NOW()) as calculated_duration
           FROM route_stores WHERE id = ? AND route_id = ?`,
          [storeVisitId, routeId]
        );
        duration = visitInfo[0]?.calculated_duration || 0;
      }

      const [result] = await connection.execute(
        `UPDATE route_stores 
         SET status = 'completed', end_time = NOW(),
             actual_duration = ?, notes = ?,
             before_photo_url = ?, after_photo_url = ?,
             products_damaged = ?, signature_url = ?, barcode_data = ?
         WHERE id = ? AND route_id = ?`,
        [
          duration,
          visitData?.notes || '',
          visitData?.beforePhoto || null,
          visitData?.afterPhoto || null,
          visitData?.productsDamaged || 0,
          visitData?.signature || null,
          visitData?.barcodeData || null,
          storeVisitId,
          routeId
        ]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ 
          success: false,
          message: 'Visita no encontrada' 
        });
      }

      await connection.execute(
        `UPDATE routes SET completed_stores = completed_stores + 1 WHERE id = ?`,
        [routeId]
      );

      return res.json({
        success: true,
        message: 'Visita completada exitosamente',
        visitId: storeVisitId,
        duration: duration
      });

    } catch (error) {
      console.error('❌ Error completando visita:', error);
      res.status(500).json({
        success: false,
        message: 'Error completando visita',
        error: error.message
      });
    } finally {
      await connection.end();
    }
  },

  async skipStoreVisit(req, res) {
    console.log('🚨=== INICIANDO skipStoreVisit ===');
    const connection = await createConnection();
    try {
      const { routeId, storeVisitId, skipReason } = req.body;

      console.log('⏭️ SALTANDO VISITA - DATOS RECIBIDOS:', { 
        routeId, 
        storeVisitId, 
        skipReason,
        body: req.body 
      });

      if (!routeId || !storeVisitId) {
        console.log('❌ Faltan parámetros requeridos');
        return res.status(400).json({ 
          success: false,
          message: 'routeId y storeVisitId requeridos' 
        });
      }

      const isTemplateRoute = routeId.startsWith('template_');
      console.log('🔍 Tipo de ruta:', isTemplateRoute ? 'PLANTILLA' : 'REAL');

      if (isTemplateRoute) {
        // 🎯 MANEJAR PLANTILLA - Crear ruta temporal y marcar como skipped
        const templateId = routeId.replace('template_', '');
        console.log('📋 Template ID:', templateId);
        console.log('🏪 Store Visit ID:', storeVisitId);

        // OBTENER INFORMACIÓN DE LA TIENDA DE LA PLANTILLA
        const [storeInfo] = await connection.execute(
          `SELECT store_id, visit_order FROM route_template_stores WHERE id = ? AND template_id = ?`,
          [storeVisitId, templateId]
        );

        console.log('🔍 Información de tienda en plantilla:', storeInfo);

        if (storeInfo.length === 0) {
          console.log('❌ Visita no encontrada en plantilla');
          return res.status(404).json({ 
            success: false,
            message: 'Visita no encontrada en la plantilla' 
          });
        }

        const storeData = storeInfo[0];
        
        // 🎯 CREAR RUTA TEMPORAL
        const [routeResult] = await connection.execute(
          `INSERT INTO routes (advisor_id, date, total_stores, completed_stores, total_distance, estimated_duration, status) 
           VALUES (?, CURDATE(), 1, 0, 15.00, 120.00, 'in-progress')`,
          [req.user?.id || '8']
        );

        const tempRouteId = routeResult.insertId;
        console.log('✅ Ruta temporal creada con ID:', tempRouteId);

        // INSERTAR VISITA COMO SKIPPED
        const [result] = await connection.execute(
          `INSERT INTO route_stores (route_id, store_id, visit_order, status, skip_reason, start_time, end_time) 
           VALUES (?, ?, ?, 'skipped', ?, NOW(), NOW())`,
          [tempRouteId, storeData.store_id, storeData.visit_order, skipReason || 'Tienda cerrada']
        );

        console.log('📊 Resultado de inserción:', {
          insertId: result.insertId,
          affectedRows: result.affectedRows
        });

        if (result.affectedRows === 0) {
          console.log('❌ No se pudo insertar la visita skipped');
          return res.status(500).json({ 
            success: false,
            message: 'No se pudo saltar la visita' 
          });
        }

        console.log('✅ Visita de plantilla saltada exitosamente');
        return res.json({
          success: true,
          message: 'Visita saltada exitosamente',
          visitId: result.insertId,
          routeId: tempRouteId.toString(),
          isTemplate: true
        });

      } else {
        // 🎯 MANEJAR RUTA REAL
        console.log('🛣️ Ruta REAL - ID:', routeId);
        console.log('🏪 Store Visit ID:', storeVisitId);

        // 🎯 VERIFICAR SI LA VISITA EXISTE
        const [existingVisit] = await connection.execute(
          `SELECT id, status FROM route_stores WHERE id = ? AND route_id = ?`,
          [storeVisitId, routeId]
        );

        console.log('🔍 Visita encontrada en ruta real:', existingVisit);

        if (existingVisit.length === 0) {
          console.log('❌ Visita no encontrada en ruta real');
          return res.status(404).json({ 
            success: false,
            message: 'Visita no encontrada en la ruta' 
          });
        }

        // 🎯 ACTUALIZAR STATUS A 'skipped'
        console.log('🔄 Actualizando visita a skipped...');
        const [result] = await connection.execute(
          `UPDATE route_stores 
           SET status = 'skipped', 
               skip_reason = ?, 
               end_time = NOW(),
               updated_at = NOW()
           WHERE id = ? AND route_id = ?`,
          [skipReason || 'Tienda cerrada', storeVisitId, routeId]
        );

        console.log('📊 Resultado de actualización en BD:', {
          affectedRows: result.affectedRows,
          changedRows: result.changedRows
        });

        if (result.affectedRows === 0) {
          console.log('❌ No se pudo actualizar la visita en BD');
          return res.status(500).json({ 
            success: false,
            message: 'No se pudo actualizar la visita en la base de datos' 
          });
        }

        console.log('✅ Visita real saltada exitosamente');
        return res.json({
          success: true,
          message: 'Visita saltada exitosamente',
          visitId: storeVisitId,
          routeId: routeId,
          skipReason: skipReason,
          isTemplate: false
        });
      }

    } catch (error) {
      console.error('❌ ERROR CRÍTICO saltando visita:', error);
      console.error('📋 Detalles del error:', {
        message: error.message,
        code: error.code,
        sql: error.sql
      });

      res.status(500).json({
        success: false,
        message: 'Error interno del servidor al saltar visita',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    } finally {
      await connection.end();
      console.log('🚨=== FINALIZANDO skipStoreVisit ===');
    }
  },

  async updateStoreTasks(req, res) {
    const connection = await createConnection();
    try {
      const { visitId, taskData } = req.body;

      if (!visitId || !taskData) {
        return res.status(400).json({ message: 'visitId y taskData requeridos' });
      }

      console.log('📝 Actualizando tareas para visita:', visitId);

      const [result] = await connection.execute(
        `UPDATE route_stores 
         SET tasks_completed = ?, before_photo_url = ?, after_photo_url = ?,
             products_damaged = ?, signature_url = ?, barcode_data = ?,
             notes = ?
         WHERE id = ?`,
        [
          taskData.tasksCompleted || 0,
          taskData.beforePhoto || null,
          taskData.afterPhoto || null,
          taskData.productsDamaged || 0,
          taskData.signature || null,
          taskData.barcodeData || null,
          taskData.notes || '',
          visitId
        ]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Visita no encontrada' });
      }

      console.log('✅ Tareas actualizadas exitosamente');
      res.json({ 
        message: 'Tareas actualizadas exitosamente',
        visitId: visitId
      });
    } catch (error) {
      console.error('❌ Error actualizando tareas:', error);
      res.status(500).json({ 
        message: 'Error actualizando tareas',
        error: error.message 
      });
    } finally {
      await connection.end();
    }
  },

  async getRouteMetrics(req, res) {
    const connection = await createConnection();
    try {
      const { advisorId, startDate, endDate } = req.query;

      console.log('📊 Obteniendo métricas:', { advisorId, startDate, endDate });

      let query = `
        SELECT 
          COUNT(*) as total_routes,
          SUM(completed_stores) as total_completed_stores,
          SUM(total_stores) as total_assigned_stores,
          AVG(total_distance) as avg_distance,
          AVG(estimated_duration) as avg_duration,
          ROUND((SUM(completed_stores) / SUM(total_stores)) * 100, 2) as completion_rate
        FROM routes 
        WHERE 1=1
      `;
      
      const params = [];

      if (advisorId) {
        query += ' AND advisor_id = ?';
        params.push(advisorId);
      }

      if (startDate) {
        query += ' AND DATE(date) >= ?';
        params.push(startDate);
      }

      if (endDate) {
        query += ' AND DATE(date) <= ?';
        params.push(endDate);
      }

      const [metrics] = await connection.execute(query, params);

      console.log('✅ Métricas obtenidas:', metrics[0]);
      res.json(metrics[0] || {});
    } catch (error) {
      console.error('❌ Error obteniendo métricas:', error);
      res.status(500).json({ 
        message: 'Error obteniendo métricas',
        error: error.message 
      });
    } finally {
      await connection.end();
    }
  },

  async generateDailyRoute(req, res) {
    const connection = await createConnection();
    try {
      const { advisorId, date } = req.body;

      if (!advisorId || !date) {
        return res.status(400).json({ message: 'advisorId y date requeridos' });
      }

      console.log('🔄 Generando ruta diaria para:', { advisorId, date });
      
      await connection.execute('CALL GenerateDailyRoutes()');
      
      res.json({ 
        message: 'Rutas diarias generadas exitosamente',
        advisorId,
        date
      });
    } catch (error) {
      console.error('❌ Error generando ruta:', error);
      res.status(500).json({ 
        message: 'Error generando ruta',
        error: error.message 
      });
    } finally {
      await connection.end();
    }
  },

  async getRouteTemplates(req, res) {
    const connection = await createConnection();
    try {
      const { advisorId } = req.params;

      console.log('🏗️ Obteniendo plantillas para asesor:', advisorId);

      const [templates] = await connection.execute(
        `SELECT rt.*, u.name as advisor_name
         FROM route_templates rt
         JOIN users u ON rt.advisor_id = u.id
         WHERE rt.advisor_id = ? AND rt.is_active = TRUE
         ORDER BY FIELD(rt.day_of_week, 'monday', 'tuesday', 'wednesday', 'thursday', 'friday')`,
        [advisorId]
      );

      console.log('✅ Plantillas obtenidas:', templates.length);
      res.json(templates);
    } catch (error) {
      console.error('❌ Error obteniendo plantillas:', error);
      res.status(500).json({ 
        message: 'Error obteniendo plantillas',
        error: error.message 
      });
    } finally {
      await connection.end();
    }
  }
};

// 🎯 FUNCIÓN AUXILIAR PARA OBTENER PLANTILLA
async function getTemplateRoute(connection, advisorId, res) {
  const currentDay = new Date().toLocaleDateString('en', { weekday: 'long' }).toLowerCase();
  console.log('📅 Buscando plantilla para día:', currentDay);

  const [templates] = await connection.execute(
    `SELECT rt.id, rt.template_name, COUNT(rts.id) as total_stores
     FROM route_templates rt
     LEFT JOIN route_template_stores rts ON rt.id = rts.template_id
     WHERE rt.advisor_id = ? AND rt.day_of_week = ? AND rt.is_active = TRUE
     GROUP BY rt.id, rt.template_name
     LIMIT 1`,
    [advisorId, currentDay]
  );

  console.log('🏗️ Plantillas encontradas:', templates);

  if (templates.length === 0) {
    console.log('❌ No hay plantilla para hoy');
    return res.status(404).json({ 
      success: false,
      message: 'No tienes ruta asignada para hoy y no hay plantilla configurada' 
    });
  }

  const template = templates[0];
  console.log('✅ Usando plantilla:', template.template_name);

  const [stores] = await connection.execute(
    `SELECT 
        rts.id as template_store_id,
        rts.visit_order,
        s.id as store_id,
        s.name, 
        s.address,
        s.latitude,
        s.longitude,
        s.zone,
        s.category,
        s.priority
     FROM route_template_stores rts
     JOIN stores s ON rts.store_id = s.id
     WHERE rts.template_id = ?
     ORDER BY rts.visit_order`,
    [template.id]
  );

  console.log('🏪 Tiendas de PLANTILLA:', stores.length);

  const response = {
    id: `template_${template.id}`,
    advisor_id: advisorId,
    date: new Date().toISOString().split('T')[0],
    total_stores: template.total_stores,
    completed_stores: 0,
    total_distance: '15 km',
    estimated_duration: '120 min',
    status: 'in-progress',
    stores: stores.map(store => ({
      id: store.template_store_id.toString(),
      storeId: {
        id: store.store_id.toString(),
        name: store.name,
        address: store.address,
        coordinates: {
          lat: parseFloat(store.latitude) || 6.244203,
          lng: parseFloat(store.longitude) || -75.581211
        },
        zone: store.zone,
        category: store.category,
        priority: store.priority
      },
      status: 'pending',
      visit_order: store.visit_order
    }))
  };

  console.log('🚀 ENVIANDO AL FRONTEND - DATOS DE PLANTILLA');
  res.json(response);
}

export default routeController;