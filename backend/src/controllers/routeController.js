// backend/src/controllers/routeController.js - VERSIÓN COMPLETA CORREGIDA
import { createConnection } from '../config/database.js';
import { mlService } from '../services/mlService.js';

// 🎯 NORMALIZADOR INTELIGENTE - Diferencia entre tablas
const normalizeStatus = (status, table = 'route_stores') => {
  if (!status) return 'pending';
  const normalized = status.toLowerCase().trim();
  
  // Para route_stores usa 'in-progress' (con guión)
  if (table === 'route_stores') {
    if (normalized === 'in_progress' || normalized === 'in-progress' || normalized === 'in progress') {
      return 'in-progress';
    }
  } 
  // Para routes usa 'in_progress' (con guión bajo)
  else if (table === 'routes') {
    if (normalized === 'in_progress' || normalized === 'in-progress' || normalized === 'in progress') {
      return 'in_progress';
    }
  }
  
  if (normalized === 'pending' || normalized === 'completed' || normalized === 'skipped') {
    return normalized;
  }
  
  console.warn(`⚠️ Status desconocido: "${status}", usando "pending" por defecto`);
  return 'pending';
};

console.log('🔄 routeController.js CARGADO - VERSIÓN CORREGIDA CON NORMALIZACIÓN INTELIGENTE');

export const routeController = {
  async getCurrentRoute(req, res) {
    console.log('🚨=== INICIANDO getCurrentRoute ===');
    const connection = await createConnection();
    try {
      const { advisorId } = req.params;
      
      console.log('👤 Advisor ID recibido:', advisorId);

      // 1. VERIFICAR SI HAY RUTAS VÁLIDAS PARA HOY
      const [todayRoutes] = await connection.execute(
        `SELECT id, date, total_stores, completed_stores FROM routes 
        WHERE advisor_id = ? AND date = CURDATE()
        ORDER BY id`,
        [advisorId]
      );

      console.log('🎯 Rutas de HOY encontradas:', todayRoutes.length);

      let mainRouteId = null;
      let allStores = [];
      
      // 2. SI NO HAY RUTAS O TODAS ESTÁN VACÍAS, USAR PLANTILLA
      if (todayRoutes.length === 0) {
        console.log('🔄 No hay rutas para hoy, usando plantillas...');
        return await getTemplateRoute(connection, advisorId, res);
      }

      // 3. BUSCAR LA MEJOR RUTA PARA USAR (la que tenga más tiendas)
      let bestRoute = null;
      let maxStores = 0;
      
      for (const route of todayRoutes) {
        const [storesCount] = await connection.execute(
          `SELECT COUNT(*) as count FROM route_stores WHERE route_id = ?`,
          [route.id]
        );
        
        const storesInRoute = storesCount[0].count;
        console.log(`🏪 Ruta ${route.id} tiene ${storesInRoute} tiendas`);
        
        if (storesInRoute > maxStores) {
          maxStores = storesInRoute;
          bestRoute = route;
        }
        
        // ELIMINAR RUTAS VACÍAS
        if (storesInRoute === 0) {
          console.log(`🗑️ Eliminando ruta vacía ${route.id}...`);
          await connection.execute(`DELETE FROM routes WHERE id = ?`, [route.id]);
        }
      }

      // 4. SI NO HAY RUTAS VÁLIDAS DESPUÉS DE LIMPIAR
      if (!bestRoute || maxStores === 0) {
        console.log('🔄 Todas las rutas estaban vacías, usando plantilla...');
        return await getTemplateRoute(connection, advisorId, res);
      }

      mainRouteId = bestRoute.id;
      console.log(`🎯 Usando ruta principal: ${mainRouteId} con ${maxStores} tiendas`);

      // 5. OBTENER TODAS LAS TIENDAS DE LA RUTA PRINCIPAL
      const [stores] = await connection.execute(
        `SELECT 
            rs.*, 
            s.name, 
            s.address,
            s.latitude,
            s.longitude,
            s.zone,
            s.category,
            s.priority
        FROM route_stores rs 
        JOIN stores s ON rs.store_id = s.id 
        WHERE rs.route_id = ? ORDER BY rs.visit_order`,
        [mainRouteId]
      );

      console.log('🏪 Tiendas en ruta principal:', stores.length);

      // 6. VERIFICAR SI FALTAN TIENDAS DE LA PLANTILLA
      if (stores.length < 10) { // 10 es el número esperado según la plantilla
        console.log(`⚠️ Faltan tiendas: ${stores.length}/10, verificando plantilla...`);
        
        // OBTENER PLANTILLA DEL DÍA
        const currentDay = new Date().toLocaleDateString('en', { weekday: 'long' }).toLowerCase();
        const [templates] = await connection.execute(
          `SELECT rt.id, COUNT(rts.id) as total_stores
          FROM route_templates rt
          LEFT JOIN route_template_stores rts ON rt.id = rts.template_id
          WHERE rt.advisor_id = ? AND rt.day_of_week = ? AND rt.is_active = TRUE
          GROUP BY rt.id
          LIMIT 1`,
          [advisorId, currentDay]
        );
        
        if (templates.length > 0 && templates[0].total_stores > stores.length) {
          console.log(`🔄 Agregando ${templates[0].total_stores - stores.length} tiendas faltantes...`);
          
          // AGREGAR TIENDAS FALTANTES DE LA PLANTILLA
          await connection.execute(`
            INSERT INTO route_stores (route_id, store_id, visit_order, status)
            SELECT 
              ? as route_id,
              rts.store_id,
              rts.visit_order,
              'pending' as status
            FROM route_template_stores rts
            WHERE rts.template_id = ?
              AND rts.store_id NOT IN (
                SELECT store_id FROM route_stores WHERE route_id = ?
              )
            ORDER BY rts.visit_order
          `, [mainRouteId, templates[0].id, mainRouteId]);
          
          // VOLVER A OBTENER TIENDAS ACTUALIZADAS
          const [updatedStores] = await connection.execute(
            `SELECT 
                rs.*, 
                s.name, 
                s.address,
                s.latitude,
                s.longitude,
                s.zone,
                s.category,
                s.priority
            FROM route_stores rs 
            JOIN stores s ON rs.store_id = s.id 
            WHERE rs.route_id = ? ORDER BY rs.visit_order`,
            [mainRouteId]
          );
          
          allStores = updatedStores;
          console.log(`✅ Tiendas actualizadas: ${updatedStores.length}`);
        } else {
          allStores = stores;
        }
      } else {
        allStores = stores;
      }

      // 7. ACTUALIZAR total_stores EN LA RUTA
      await connection.execute(
        `UPDATE routes SET total_stores = ? WHERE id = ?`,
        [allStores.length, mainRouteId]
      );

      // 8. CONSTRUIR RESPUESTA
      const response = {
        id: mainRouteId.toString(),
        advisor_id: advisorId,
        date: bestRoute.date,
        total_stores: allStores.length,
        completed_stores: bestRoute.completed_stores || 0,
        total_distance: '15 km',
        estimated_duration: '120 min',
        stores: allStores.map((store, index) => ({
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
            category: store.category,
            priority: store.priority
          },
          status: store.status,
          visit_order: store.visit_order,
          route_id: mainRouteId
        }))
      };

      console.log('🚀 ENVIANDO AL FRONTEND - RUTA COMPLETA');
      console.log(`📊 Total tiendas enviadas: ${response.stores.length}`);
      res.json(response);

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
        
        // 🎯 PRIMERO BUSCAR SI YA EXISTE UNA RUTA PARA HOY
        let existingRouteId = null;
        let isNewRoute = false;
        
        const [existingRoutes] = await connection.execute(
          `SELECT id FROM routes 
          WHERE advisor_id = ? AND date = CURDATE()
          ORDER BY id LIMIT 1`,
          [req.user?.id || '8']
        );

        if (existingRoutes.length > 0) {
          // 🎯 USAR RUTA EXISTENTE
          existingRouteId = existingRoutes[0].id;
          console.log('🎯 Usando ruta existente:', existingRouteId);
          
          // Verificar si la tienda ya existe en esta ruta
          const [existingStore] = await connection.execute(
            `SELECT id FROM route_stores WHERE route_id = ? AND store_id = ?`,
            [existingRouteId, storeData.store_id]
          );
          
          if (existingStore.length > 0) {
            // Si la tienda ya existe, usar esa visita
            console.log('🔄 Tienda ya existe en ruta, usando visita existente');
            const existingVisitId = existingStore[0].id;
            
            // 🎯 VERIFICAR SI ESTÁ SKIPPED PARA REINICIAR
            const [visitDetails] = await connection.execute(
              `SELECT status FROM route_stores WHERE id = ?`,
              [existingVisitId]
            );
            
            if (visitDetails.length > 0 && visitDetails[0].status === 'skipped') {
              console.log('🔄 Reiniciando tienda previamente saltada desde plantilla...');
              
              const storeStatus = normalizeStatus('in-progress', 'route_stores');
              const [result] = await connection.execute(
                `UPDATE route_stores 
                SET status = ?, 
                    start_time = NOW(),
                    end_time = NULL,
                    skip_reason = NULL,
                    updated_at = NOW()
                WHERE id = ?`,
                [storeStatus, existingVisitId]
              );
              
              if (result.affectedRows === 0) {
                return res.status(500).json({
                  success: false,
                  message: 'No se pudo reiniciar la visita saltada'
                });
              }
              
              console.log('✅ Tienda saltada reiniciada exitosamente');
              return res.json({
                success: true,
                message: 'Visita saltada reiniciada exitosamente',
                visitId: existingVisitId,
                routeId: existingRouteId.toString(),
                startTime: new Date().toISOString(),
                isTemplate: true,
                wasSkipped: true
              });
            }
          } else {
            // Si no existe, actualizar total_stores
            await connection.execute(
              `UPDATE routes SET total_stores = total_stores + 1 WHERE id = ?`,
              [existingRouteId]
            );
          }
        } else {
          // 🎯 CREAR NUEVA RUTA SOLO SI NO EXISTE
          console.log('🆕 Creando nueva ruta...');
          const routeStatus = normalizeStatus('in-progress', 'routes');
          console.log('🔄 Status normalizado para ROUTES:', routeStatus);
          
          const [routeResult] = await connection.execute(
            `INSERT INTO routes (advisor_id, date, total_stores, completed_stores, total_distance, estimated_duration, status) 
            VALUES (?, CURDATE(), 1, 0, 15.00, 120.00, ?)`,
            [req.user?.id || '8', routeStatus]
          );
          
          existingRouteId = routeResult.insertId;
          isNewRoute = true;
          console.log('✅ Nueva ruta creada con ID:', existingRouteId);
        }

        // 🎯 INSERTAR EN ROUTE_STORES CON STATUS NORMALIZADO PARA ROUTE_STORES
        console.log('🔄 Insertando tienda en route_stores...');
        const storeStatus = normalizeStatus('in-progress', 'route_stores');
        console.log('🔄 Status normalizado para ROUTE_STORES:', storeStatus);

        let result;
        let visitId;

        // Verificar nuevamente si la tienda ya existe
        const [checkStore] = await connection.execute(
          `SELECT id, status FROM route_stores WHERE route_id = ? AND store_id = ?`,
          [existingRouteId, storeData.store_id]
        );

        if (checkStore.length > 0) {
          // Actualizar visita existente
          visitId = checkStore[0].id;
          const currentStatus = checkStore[0].status;
          
          // 🎯 VERIFICAR SI ESTÁ SKIPPED
          if (currentStatus === 'skipped') {
            console.log('🔄 Reiniciando tienda saltada:', visitId);
            
            [result] = await connection.execute(
              `UPDATE route_stores 
              SET status = ?, 
                  start_time = NOW(),
                  end_time = NULL,
                  skip_reason = NULL,
                  updated_at = NOW()
              WHERE id = ?`,
              [storeStatus, visitId]
            );
          } else {
            console.log('🔄 Actualizando visita existente:', visitId);
            
            [result] = await connection.execute(
              `UPDATE route_stores SET status = ?, start_time = NOW() WHERE id = ?`,
              [storeStatus, visitId]
            );
          }
        } else {
          // Insertar nueva visita
          console.log('📤 Datos de inserción:', {
            route_id: existingRouteId,
            store_id: storeData.store_id,
            visit_order: storeData.visit_order,
            status: storeStatus
          });

          [result] = await connection.execute(
            `INSERT INTO route_stores (route_id, store_id, visit_order, status, start_time) 
            VALUES (?, ?, ?, ?, NOW())`,
            [existingRouteId, storeData.store_id, storeData.visit_order, storeStatus]
          );
          
          visitId = result.insertId;
        }

        console.log('📊 Resultado de inserción en route_stores:', {
          insertId: result.insertId,
          affectedRows: result.affectedRows,
          changedRows: result.changedRows
        });

        if (result.affectedRows === 0) {
          console.log('❌ No se pudo crear/actualizar la visita en route_stores');
          return res.status(500).json({
            success: false,
            message: 'No se pudo crear/actualizar la visita'
          });
        }

        console.log('✅ Visita de plantilla iniciada exitosamente');
        return res.json({
          success: true,
          message: 'Visita de plantilla iniciada exitosamente',
          visitId: visitId,
          routeId: existingRouteId.toString(),
          startTime: new Date().toISOString(),
          isTemplate: true,
          isNewRoute: isNewRoute
        });

      } else {
        // 🎯 RUTA REAL
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

        const currentStatus = existingVisit[0].status;
        
        // 🎯 PERMITIR REINICIAR TIENDAS SALTADAS
        if (currentStatus === 'skipped') {
          console.log('🔄 Reiniciando tienda previamente saltada...');
          
          const status = normalizeStatus('in-progress', 'route_stores');
          const [result] = await connection.execute(
            `UPDATE route_stores 
            SET status = ?, 
                start_time = NOW(),
                end_time = NULL,
                skip_reason = NULL,
                updated_at = NOW()
            WHERE id = ? AND route_id = ?`,
            [status, storeVisitId, routeId]
          );
          
          if (result.affectedRows === 0) {
            return res.status(500).json({
              success: false,
              message: 'No se pudo reiniciar la visita saltada'
            });
          }
          
          console.log('✅ Tienda saltada reiniciada exitosamente');
          return res.json({
            success: true,
            message: 'Visita saltada reiniciada exitosamente',
            visitId: storeVisitId,
            routeId: routeId,
            startTime: new Date().toISOString(),
            isTemplate: false,
            wasSkipped: true
          });
        }

        // 🎯 SI YA ESTÁ EN PROGRESO O COMPLETADA
        if (currentStatus === 'in-progress' || currentStatus === 'in_progress' || currentStatus === 'completed') {
          console.log('ℹ️ La visita ya está en estado:', currentStatus);
          
          if (currentStatus === 'completed') {
            return res.status(400).json({
              success: false,
              message: 'Esta visita ya fue completada y no puede reiniciarse'
            });
          }
          
          // Si ya está en progreso, solo devolver éxito
          return res.json({
            success: true,
            message: 'La visita ya está en progreso',
            visitId: storeVisitId,
            routeId: routeId,
            startTime: new Date().toISOString(),
            isTemplate: false,
            alreadyInProgress: true
          });
        }

        // 🎯 INICIAR VISITA NORMALMENTE
        const status = normalizeStatus('in-progress', 'route_stores');
        console.log('🔄 Status normalizado para ruta real:', status);

        const [result] = await connection.execute(
          `UPDATE route_stores SET status = ?, start_time = NOW() WHERE id = ? AND route_id = ?`,
          [status, storeVisitId, routeId]
        );

        console.log('📊 Resultado de actualización:', {
          affectedRows: result.affectedRows,
          changedRows: result.changedRows
        });

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
          routeId: routeId,
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
      console.log('📦 visitData recibido:', visitData);

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

      // 🎯 USAR STATUS NORMALIZADO PARA COMPLETAR
      const status = normalizeStatus('completed', 'route_stores');
      console.log('🔄 Status normalizado para completar:', status);

      // 🎯 PREPARAR DATOS PARA PRODUCTS_DAMAGED (debe ser JSON válido o null)
      let productsDamagedValue = null;
      if (visitData?.productsDamaged !== undefined && visitData?.productsDamaged !== null) {
        // Si es un número, convertirlo a objeto JSON
        if (typeof visitData.productsDamaged === 'number') {
          productsDamagedValue = JSON.stringify({
            count: visitData.productsDamaged,
            reports: visitData?.damageReports || []
          });
        } else if (typeof visitData.productsDamaged === 'object') {
          // Si ya es un objeto, stringificarlo
          productsDamagedValue = JSON.stringify(visitData.productsDamaged);
        }
      }
      
      console.log('🔍 productsDamaged preparado:', productsDamagedValue);

      // 🎯 QUERY CORREGIDA
      const [result] = await connection.execute(
        `UPDATE route_stores 
        SET status = ?, end_time = NOW(),
            actual_duration = ?, notes = ?,
            before_photo_url = ?, after_photo_url = ?,
            products_damaged = ?, signature_url = ?, barcode_data = ?,
            tasks_completed = ?
        WHERE id = ? AND route_id = ?`,
        [
          status,
          duration,
          visitData?.notes || '',
          visitData?.beforePhoto || null,
          visitData?.afterPhoto || null,
          productsDamagedValue,  // ✅ Ahora es JSON válido o null
          visitData?.signature || null,
          visitData?.barcodeData || null,
          visitData?.tasksCompleted || 0,
          storeVisitId,
          routeId
        ]
      );

      console.log('📊 Resultado de actualización:', {
        affectedRows: result.affectedRows,
        changedRows: result.changedRows
      });

      if (result.affectedRows === 0) {
        return res.status(404).json({ 
          success: false,
          message: 'Visita no encontrada' 
        });
      }

      // Actualizar contador de tiendas completadas
      await connection.execute(
        `UPDATE routes SET completed_stores = completed_stores + 1 WHERE id = ?`,
        [routeId]
      );

      console.log('✅ Visita completada exitosamente en BD');

      // 🎯 CAPTURAR ANALYTICS
      try {
        await mlService.captureVisitMetrics(storeVisitId, {
          duration: duration,
          tasksCompleted: visitData?.tasksCompleted || 0,
          totalTasks: 10,
          damageReportsCount: visitData?.productsDamaged || 0,
          travelTime: 0
        });
        console.log('📊 Analytics capturados exitosamente');
      } catch (analyticsError) {
        console.error('❌ Error en analytics (no crítico):', analyticsError);
      }

      return res.json({
        success: true,
        message: 'Visita completada exitosamente',
        visitId: storeVisitId,
        duration: duration
      });

    } catch (error) {
      console.error('❌ Error completando visita:', error);
      console.error('📋 Detalles del error:', {
        message: error.message,
        code: error.code,
        sql: error.sql,
        sqlState: error.sqlState
      });
      
      res.status(500).json({
        success: false,
        message: 'Error completando visita',
        error: error.message
      });
    } finally {
      await connection.end();
      console.log('🚨=== FINALIZANDO completeStoreVisit ===');
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
        const templateId = routeId.replace('template_', '');
        console.log('📋 Template ID:', templateId);
        console.log('🏪 Store Visit ID:', storeVisitId);

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
        
        // 🎯 PRIMERO BUSCAR SI YA EXISTE UNA RUTA PARA HOY
        let existingRouteId = null;
        let isNewRoute = false;
        
        const [existingRoutes] = await connection.execute(
          `SELECT id FROM routes 
          WHERE advisor_id = ? AND date = CURDATE()
          ORDER BY id LIMIT 1`,
          [req.user?.id || '8']
        );

        if (existingRoutes.length > 0) {
          // 🎯 USAR RUTA EXISTENTE
          existingRouteId = existingRoutes[0].id;
          console.log('🎯 Usando ruta existente:', existingRouteId);
        } else {
          // 🎯 CREAR NUEVA RUTA SOLO SI NO EXISTE
          console.log('🆕 Creando nueva ruta...');
          const routeStatus = normalizeStatus('in-progress', 'routes');
          const [routeResult] = await connection.execute(
            `INSERT INTO routes (advisor_id, date, total_stores, completed_stores, total_distance, estimated_duration, status) 
            VALUES (?, CURDATE(), 1, 0, 15.00, 120.00, ?)`,
            [req.user?.id || '8', routeStatus]
          );
          existingRouteId = routeResult.insertId;
          isNewRoute = true;
          console.log('✅ Nueva ruta creada:', existingRouteId);
        }

        // 🎯 USAR STATUS NORMALIZADO PARA PLANTILLA
        const storeStatus = normalizeStatus('skipped', 'route_stores');
        console.log('🔄 Status normalizado para route_stores:', storeStatus);

        // Verificar si la tienda ya existe en esta ruta
        const [existingStore] = await connection.execute(
          `SELECT id FROM route_stores WHERE route_id = ? AND store_id = ?`,
          [existingRouteId, storeData.store_id]
        );

        let result;
        let visitId;

        if (existingStore.length === 0) {
          // Insertar nueva tienda saltada
          console.log('🆕 Insertando nueva tienda saltada...');
          
          [result] = await connection.execute(
            `INSERT INTO route_stores (route_id, store_id, visit_order, status, skip_reason, start_time, end_time) 
            VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
            [existingRouteId, storeData.store_id, storeData.visit_order, storeStatus, skipReason || 'Tienda cerrada']
          );
          
          visitId = result.insertId;
          
          // Actualizar total_stores de la ruta
          await connection.execute(
            `UPDATE routes SET total_stores = total_stores + 1 WHERE id = ?`,
            [existingRouteId]
          );
          
          console.log('✅ Nueva tienda saltada agregada a ruta:', existingRouteId);
        } else {
          // Actualizar tienda existente
          visitId = existingStore[0].id;
          console.log('🔄 Actualizando tienda existente como saltada:', visitId);
          
          [result] = await connection.execute(
            `UPDATE route_stores 
            SET status = ?, skip_reason = ?, end_time = NOW()
            WHERE id = ? AND route_id = ?`,
            [storeStatus, skipReason || 'Tienda cerrada', visitId, existingRouteId]
          );
          
          console.log('✅ Tienda existente actualizada como saltada');
        }

        console.log('📊 Resultado de operación:', {
          insertId: result?.insertId,
          affectedRows: result.affectedRows,
          changedRows: result.changedRows
        });

        if (result.affectedRows === 0) {
          console.log('❌ No se pudo procesar la visita skipped');
          return res.status(500).json({ 
            success: false,
            message: 'No se pudo saltar la visita' 
          });
        }

        console.log('✅ Visita de plantilla saltada exitosamente');
        return res.json({
          success: true,
          message: 'Visita saltada exitosamente',
          visitId: visitId,
          routeId: existingRouteId.toString(),
          isTemplate: true,
          isNewRoute: isNewRoute
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
          console.log('❌ Visita no encontrada en ruta real');
          return res.status(404).json({ 
            success: false,
            message: 'Visita no encontrada en la ruta' 
          });
        }

        // 🎯 USAR STATUS NORMALIZADO PARA RUTA REAL
        const status = normalizeStatus('skipped', 'route_stores');
        console.log('🔄 Status normalizado para ruta real:', status);

        console.log('🔄 Actualizando visita a skipped...');
        const [result] = await connection.execute(
          `UPDATE route_stores 
          SET status = ?, 
              skip_reason = ?, 
              end_time = NOW(),
              updated_at = NOW()
          WHERE id = ? AND route_id = ?`,
          [status, skipReason || 'Tienda cerrada', storeVisitId, routeId]
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

      // 🎯 CAPTURAR ANALYTICS DE TAREAS
      try {
        await mlService.captureTaskMetrics(visitId, {
          type: 'batch_update',
          key: 'multiple_tasks',
          tasksCompleted: taskData.tasksCompleted || 0,
          photosCount: (taskData.beforePhoto ? 1 : 0) + (taskData.afterPhoto ? 1 : 0)
        });
        console.log('📊 Analytics de tareas capturados');
      } catch (analyticsError) {
        console.error('❌ Error en analytics de tareas:', analyticsError);
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
  },

  async optimizeRoute(req, res) {
    try {
      const { stores, advisor, constraints } = req.body;

      console.log('🧠 Solicitando optimización de ruta con ML');

      const optimizedRoute = await mlService.optimizeRoute(stores, advisor, constraints);

      res.json({
        success: true,
        message: 'Ruta optimizada exitosamente',
        data: optimizedRoute
      });
    } catch (error) {
      console.error('❌ Error optimizando ruta:', error);
      res.status(500).json({
        success: false,
        message: 'Error optimizando ruta',
        error: error.message
      });
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