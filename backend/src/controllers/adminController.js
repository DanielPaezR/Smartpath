// backend/src/controllers/adminController.js
import { createConnection } from '../config/database.js';
import { User } from '../models/User.js';
import { routeGenerator } from '../services/routeGenerator.js';
import { spawn } from 'child_process';

// Función auxiliar para métricas vacías de reposición
const emptyRestockMetrics = () => ({
  totalItems: 0,
  totalValue: 0,
  uniqueProducts: 0,
  averageItemsPerVisit: 0,
  topRestockedProducts: [],
  topRestockedCategories: [],
  restockByAdvisor: [],
  restockByStore: [],
  dailyRestockTrend: []
});

class AdminController {
  
  // Obtener resumen general del dashboard - USANDO PLANTILLAS
  async getDashboardOverview(req, res) {
    const connection = await createConnection();
    try {
      console.log('📊 getDashboardOverview llamado - MySQL');
      const dayOfWeek = new Date().toLocaleDateString('en', { weekday: 'long' }).toLowerCase();

      // Asesores activos
      const [activeAdvisorsRows] = await connection.execute(
        'SELECT COUNT(*) as count FROM users WHERE role = ? AND is_active = TRUE',
        ['advisor']
      );
      const activeAdvisors = activeAdvisorsRows[0].count;

      // Plantillas activas para hoy
      const [activeTemplatesRows] = await connection.execute(
        `SELECT COUNT(*) as count FROM route_templates 
         WHERE day_of_week = ? AND is_active = TRUE`,
        [dayOfWeek]
      );
      const activeTemplates = activeTemplatesRows[0].count;

      // Tiendas totales en plantillas de hoy
      const [storesStatsRows] = await connection.execute(
        `SELECT 
          COUNT(*) as totalStores,
          0 as completedStores,
          0 as inProgressStores
         FROM route_templates rt
         JOIN route_template_stores rts ON rt.id = rts.template_id
         WHERE rt.day_of_week = ? AND rt.is_active = 1`,
        [dayOfWeek]
      );

      const stats = storesStatsRows[0] || { 
        totalStores: 0, 
        completedStores: 0, 
        inProgressStores: 0 
      };

      const overview = {
        active_advisors: activeAdvisors,
        active_routes: activeTemplates,
        total_stores_today: stats.totalStores,
        completed_stores: 0,
        in_progress_stores: 0,
        avg_visit_duration: 35
      };

      console.log('✅ Datos REALES de MySQL (desde plantillas):', overview);
      res.json(overview);

    } catch (error) {
      console.error('❌ Error en getDashboardOverview:', error);
      
      const fallbackOverview = {
        active_advisors: 6,
        active_routes: 5,
        total_stores_today: 45,
        completed_stores: 0,
        in_progress_stores: 0,
        avg_visit_duration: 35
      };
      
      console.log('📊 Enviando datos de respaldo:', fallbackOverview);
      res.json(fallbackOverview);
    } finally {
      await connection.end();
    }
  }

  // Obtener estado en tiempo real de todos los asesores
  async getLiveAdvisorsStatus(req, res) {
    const connection = await createConnection();
    try {
      const advisors = await User.findAllAdvisors();

      const advisorsWithStatus = await Promise.all(
        advisors.map(async (advisor) => {
          const [trackingRows] = await connection.execute(
            `SELECT * FROM real_time_tracking 
            WHERE user_id = ? 
            ORDER BY last_update DESC LIMIT 1`,
            [advisor.id]
          );
          const tracking = trackingRows[0];

          const today = new Date().toISOString().split('T')[0];

          const [routeRows] = await connection.execute(
            `SELECT * FROM daily_routes 
             WHERE user_id = ? AND DATE(route_date) = ?`,
            [advisor.id, today]
          );
          const todayRoute = routeRows[0];

          let totalStores = 0;
          let completedStores = 0;

          if (todayRoute) {
            const [storeStatsRows] = await connection.execute(
              `SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
              FROM route_stores 
              WHERE route_id = ?`,
              [todayRoute.id]
            );
            totalStores = storeStatsRows[0]?.total || 0;
            completedStores = storeStatsRows[0]?.completed || 0;
          }

          return {
            id: advisor.id,
            name: advisor.name,
            email: advisor.email,
            vehicle_type: advisor.vehicle_type,
            latitude: tracking?.latitude || null,
            longitude: tracking?.longitude || null,
            activity_status: tracking?.activity_status || 'offline',
            current_task: tracking?.current_task || null,
            battery_level: tracking?.battery_level || null,
            last_update: tracking?.last_update || null,
            current_store_name: tracking?.current_store_name || null,
            current_route_id: todayRoute?.id || null,
            total_stores_today: totalStores,
            completed_stores: completedStores
          };
        })
      );

      res.json(advisorsWithStatus);
    } catch (error) {
      console.error('Error en getLiveAdvisorsStatus:', error);
      res.status(500).json({ error: 'Error al obtener estado de asesores' });
    } finally {
      await connection.end();
    }
  }

  // Obtener detalle de un asesor específico
  async getAdvisorDetail(req, res) {
    const connection = await createConnection();
    try {
      const { advisorId } = req.params;

      const advisor = await User.findById(advisorId);
      if (!advisor || advisor.role !== 'advisor') {
        return res.status(404).json({ error: 'Asesor no encontrado' });
      }

      const [trackingRows] = await connection.execute(
        `SELECT * FROM real_time_tracking 
         WHERE user_id = ? 
         ORDER BY timestamp DESC LIMIT 1`,
        [advisorId]
      );
      const tracking = trackingRows[0];

      const today = new Date().toISOString().split('T')[0];

      const [routeRows] = await connection.execute(
        `SELECT dr.*, rs.* 
         FROM daily_routes dr
         LEFT JOIN route_stores rs ON dr.id = rs.route_id
         WHERE dr.user_id = ? AND DATE(dr.route_date) = ?
         ORDER BY rs.store_order`,
        [advisorId, today]
      );

      const stores = [];
      let todayRoute = null;

      if (routeRows.length > 0) {
        todayRoute = {
          id: routeRows[0].route_id,
          route_date: routeRows[0].route_date,
          status: routeRows[0].status
        };

        routeRows.forEach(row => {
          if (row.store_id) {
            stores.push({
              id: row.store_id,
              name: row.store_name,
              address: row.store_address,
              visit_status: row.visit_status,
              visit_time: row.visit_time,
              store_order: row.store_order
            });
          }
        });
      }

      res.json({
        advisor: {
          id: advisor.id,
          name: advisor.name,
          email: advisor.email,
          vehicle_type: advisor.vehicle_type,
          latitude: tracking?.latitude || null,
          longitude: tracking?.longitude || null,
          activity_status: tracking?.activity_status || 'offline',
          current_task: tracking?.current_task || null,
          battery_level: tracking?.battery_level || null,
          last_update: tracking?.timestamp || null
        },
        stores: stores
      });
    } catch (error) {
      console.error('Error en getAdvisorDetail:', error);
      res.status(500).json({ error: 'Error al obtener detalle del asesor' });
    } finally {
      await connection.end();
    }
  }

  // FUNCIÓN: Obtener métricas de reposición
  async getRestockMetrics(timeRange, connection) {
    try {
      console.log(`📦 [getRestockMetrics] Obteniendo datos para: ${timeRange}`);
      
      let timeCondition = '';
      switch(timeRange) {
        case 'week':
          timeCondition = "AND ri.reported_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)";
          break;
        case 'month':
          timeCondition = "AND ri.reported_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)";
          break;
        case 'quarter':
          timeCondition = "AND ri.reported_at >= DATE_SUB(NOW(), INTERVAL 90 DAY)";
          break;
        default:
          timeCondition = "AND ri.reported_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)";
      }

      const [tableCheck] = await connection.execute(`
        SELECT COUNT(*) as count FROM information_schema.tables 
        WHERE table_schema = DATABASE() AND table_name = 'restock_items'
      `);
      
      if (tableCheck[0].count === 0) {
        console.log('⚠️ Tabla restock_items no existe');
        return emptyRestockMetrics();
      }

      const [generalMetrics] = await connection.execute(`
        SELECT 
          COALESCE(SUM(ri.quantity), 0) as totalItems,
          COALESCE(SUM(ri.quantity * ri.unit_price), 0) as totalValue,
          COUNT(DISTINCT ri.product_barcode) as uniqueProducts,
          COUNT(DISTINCT ri.route_store_id) as visitsWithRestock,
          COALESCE(SUM(ri.quantity) / NULLIF(COUNT(DISTINCT ri.route_store_id), 0), 0) as averageItemsPerVisit
        FROM restock_items ri
        WHERE 1=1 ${timeCondition}
      `);

      const [topProducts] = await connection.execute(`
        SELECT 
          ri.product_name as productName,
          ri.product_barcode as productBarcode,
          SUM(ri.quantity) as quantity,
          SUM(ri.quantity * ri.unit_price) as totalValue
        FROM restock_items ri
        WHERE 1=1 ${timeCondition}
        GROUP BY ri.product_barcode, ri.product_name
        ORDER BY quantity DESC
        LIMIT 10
      `);

      const [topCategories] = await connection.execute(`
        SELECT 
          COALESCE(ri.product_category, 'Sin categoría') as category,
          SUM(ri.quantity) as quantity,
          (SUM(ri.quantity) * 100.0 / NULLIF((SELECT SUM(quantity) FROM restock_items WHERE 1=1 ${timeCondition}), 0)) as percentage
        FROM restock_items ri
        WHERE 1=1 ${timeCondition}
        GROUP BY category
        ORDER BY quantity DESC
      `);

      const [restockByAdvisor] = await connection.execute(`
        SELECT 
          u.name as advisorName,
          COALESCE(SUM(ri.quantity), 0) as totalRestocks
        FROM restock_items ri
        JOIN route_stores rs ON ri.route_store_id = rs.id
        JOIN routes r ON rs.route_id = r.id
        JOIN users u ON r.advisor_id = u.id
        WHERE u.role = 'advisor'
          AND ri.reported_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        GROUP BY u.id, u.name
      `);

      const [restockByStore] = await connection.execute(`
        SELECT 
          s.id as storeId,
          s.name as storeName,
          COALESCE(SUM(ri.quantity), 0) as totalItems,
          COALESCE(SUM(ri.quantity * ri.unit_price), 0) as totalValue,
          COUNT(DISTINCT ri.route_store_id) as visits
        FROM stores s
        LEFT JOIN restock_items ri ON s.id = ri.store_id ${timeCondition.replace('ri.', '')}
        WHERE s.is_active = 1
        GROUP BY s.id, s.name
        HAVING totalItems > 0
        ORDER BY totalItems DESC
        LIMIT 10
      `);

      const [dailyTrend] = await connection.execute(`
        SELECT 
          DATE(ri.reported_at) as date,
          SUM(ri.quantity) as items,
          SUM(ri.quantity * ri.unit_price) as value
        FROM restock_items ri
        WHERE 1=1 ${timeCondition}
        GROUP BY DATE(ri.reported_at)
        ORDER BY date DESC
        LIMIT 30
      `);

      return {
        totalItems: parseInt(generalMetrics[0]?.totalItems || 0),
        totalValue: parseFloat(generalMetrics[0]?.totalValue || 0),
        uniqueProducts: parseInt(generalMetrics[0]?.uniqueProducts || 0),
        averageItemsPerVisit: parseFloat(generalMetrics[0]?.averageItemsPerVisit || 0),
        topRestockedProducts: topProducts.map(p => ({
          productName: p.productName,
          productBarcode: p.productBarcode,
          quantity: parseInt(p.quantity),
          totalValue: parseFloat(p.totalValue || 0)
        })),
        topRestockedCategories: topCategories.map(c => ({
          category: c.category,
          quantity: parseInt(c.quantity),
          percentage: parseFloat(c.percentage || 0)
        })),
        restockByAdvisor: restockByAdvisor.map(a => ({
          advisorId: a.advisorId,
          advisorName: a.advisorName,
          totalItems: parseInt(a.totalItems),
          totalValue: parseFloat(a.totalValue),
          averagePerVisit: parseFloat(a.averagePerVisit || 0)
        })),
        restockByStore: restockByStore.map(s => ({
          storeId: s.storeId,
          storeName: s.storeName,
          totalItems: parseInt(s.totalItems),
          totalValue: parseFloat(s.totalValue || 0),
          visits: parseInt(s.visits)
        })),
        dailyRestockTrend: dailyTrend.map(d => ({
          date: d.date,
          items: parseInt(d.items),
          value: parseFloat(d.value || 0)
        }))
      };
    } catch (error) {
      console.error('❌ Error en getRestockMetrics:', error);
      return emptyRestockMetrics();
    }
  }

  async getAdvancedMetrics(req, res) {
    const connection = await createConnection();
    
    try {
      const { timeRange = 'month' } = req.query;
      
      console.log(`📡 Obteniendo métricas avanzadas para: ${timeRange}`);
      
      // Determinar las condiciones de tiempo para cada tabla
      let timeCondition = '';
      let damageTimeCondition = '';
      let restockTimeCondition = '';
      
      switch(timeRange) {
        case 'day':
          timeCondition = "AND rs.end_time >= CURDATE()";
          damageTimeCondition = "AND dr.created_at >= CURDATE()";
          restockTimeCondition = "AND ri.reported_at >= CURDATE()";
          break;
        case 'week':
          timeCondition = "AND rs.end_time >= DATE_SUB(NOW(), INTERVAL 7 DAY)";
          damageTimeCondition = "AND dr.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)";
          restockTimeCondition = "AND ri.reported_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)";
          break;
        case 'month':
          timeCondition = "AND rs.end_time >= DATE_SUB(NOW(), INTERVAL 30 DAY)";
          damageTimeCondition = "AND dr.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)";
          restockTimeCondition = "AND ri.reported_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)";
          break;
        case 'quarter':
          timeCondition = "AND rs.end_time >= DATE_SUB(NOW(), INTERVAL 90 DAY)";
          damageTimeCondition = "AND dr.created_at >= DATE_SUB(NOW(), INTERVAL 90 DAY)";
          restockTimeCondition = "AND ri.reported_at >= DATE_SUB(NOW(), INTERVAL 90 DAY)";
          break;
        default:
          timeCondition = "AND rs.end_time >= DATE_SUB(NOW(), INTERVAL 30 DAY)";
          damageTimeCondition = "AND dr.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)";
          restockTimeCondition = "AND ri.reported_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)";
      }

      // 1. Métricas generales
      const [overall] = await connection.execute(`
        SELECT 
          (SELECT COUNT(*) FROM stores) as totalStores,
          COUNT(DISTINCT rs.id) as completedVisits,
          COALESCE(AVG(CASE WHEN rs.actual_duration > 0 THEN rs.actual_duration END), 0) as avgVisitDuration,
          (SELECT COUNT(*) FROM damage_reports dr WHERE 1=1 ${damageTimeCondition}) as totalDamages,
          COALESCE(SUM(r.total_distance), 0) as totalDistance,
          (SELECT COALESCE(SUM(ri.quantity), 0) FROM restock_items ri WHERE 1=1 ${restockTimeCondition}) as totalRestocks
        FROM route_stores rs
        LEFT JOIN routes r ON rs.route_id = r.id
        WHERE rs.status = 'completed' ${timeCondition}
      `);

      // 2. Daños por categoría
      const [damageByCategory] = await connection.execute(`
        SELECT 
          COALESCE(dr.product_category, 'Sin categoría') as category,
          COUNT(*) as count
        FROM damage_reports dr
        WHERE 1=1 ${damageTimeCondition}
        GROUP BY category
        ORDER BY count DESC
      `);

      // 3. Tiendas con más daños
      const [topStoresWithDamage] = await connection.execute(`
        SELECT 
          s.name as storeName,
          COUNT(*) as damageCount
        FROM damage_reports dr
        JOIN stores s ON dr.store_id = s.id
        WHERE 1=1 ${damageTimeCondition}
        GROUP BY s.id, s.name
        ORDER BY damageCount DESC
        LIMIT 5
      `);

      // 4. Performance de asesores (sin daños ni reposiciones)
      const [advisorPerformance] = await connection.execute(`
        SELECT 
          u.name as advisorName,
          COUNT(DISTINCT rs.id) as completedVisits,
          COALESCE(AVG(rs.actual_duration), 0) as averageTimePerStore,
          COALESCE(
            (COUNT(DISTINCT CASE WHEN rs.actual_duration <= 40 THEN rs.id END) * 100.0) / 
            NULLIF(COUNT(DISTINCT rs.id), 0), 0
          ) as efficiencyScore
        FROM users u
        LEFT JOIN routes r ON u.id = r.advisor_id
        LEFT JOIN route_stores rs ON r.id = rs.route_id 
          AND rs.status = 'completed' 
          ${timeCondition}
        WHERE u.role = 'advisor'
        GROUP BY u.id, u.name
        HAVING completedVisits > 0
        ORDER BY efficiencyScore DESC
      `);

      // 5. Daños por asesor (consulta separada)
      const [damageByAdvisor] = await connection.execute(`
        SELECT 
          u.name as advisorName,
          COUNT(DISTINCT dr.id) as totalDamages
        FROM damage_reports dr
        JOIN route_stores rs ON dr.store_id = rs.store_id
        JOIN routes r ON rs.route_id = r.id
        JOIN users u ON r.advisor_id = u.id
        WHERE u.role = 'advisor'
          ${damageTimeCondition}
        GROUP BY u.id, u.name
      `);

      // 6. Reposiciones por asesor (consulta separada)
      const [restockByAdvisor] = await connection.execute(`
        SELECT 
          u.name as advisorName,
          COALESCE(SUM(ri.quantity), 0) as totalRestocks
        FROM restock_items ri
        JOIN route_stores rs ON ri.route_store_id = rs.id
        JOIN routes r ON rs.route_id = r.id
        JOIN users u ON r.advisor_id = u.id
        WHERE u.role = 'advisor'
          ${restockTimeCondition}
        GROUP BY u.id, u.name
      `);

      // Combinar datos de performance con daños y reposiciones
      const advisorPerformanceComplete = advisorPerformance.map(advisor => {
        const damageData = damageByAdvisor.find(d => d.advisorName === advisor.advisorName);
        const restockData = restockByAdvisor.find(r => r.advisorName === advisor.advisorName);
        
        return {
          advisorName: advisor.advisorName,
          completedVisits: parseInt(advisor.completedVisits),
          averageTimePerStore: Math.round(advisor.averageTimePerStore),
          efficiencyScore: Math.round(advisor.efficiencyScore),
          damageReports: damageData ? parseInt(damageData.totalDamages) : 0,
          totalRestocks: restockData ? parseInt(restockData.totalRestocks) : 0
        };
      });

      // Calcular eficiencia promedio
      let averageEfficiency = 85;
      if (advisorPerformanceComplete.length > 0) {
        const totalEfficiency = advisorPerformanceComplete.reduce((sum, a) => sum + a.efficiencyScore, 0);
        averageEfficiency = Math.round(totalEfficiency / advisorPerformanceComplete.length);
      } else if (overall[0]?.avgVisitDuration && overall[0].avgVisitDuration > 0) {
        averageEfficiency = Math.max(0, Math.min(100, 100 - ((overall[0].avgVisitDuration - 30) * 2)));
      }

      const totalRestocks = overall[0]?.totalRestocks || 0;
      const totalVisits = overall[0]?.completedVisits || 0;

      const metrics = {
        overall: {
          totalStores: parseInt(overall[0]?.totalStores || 0),
          completedVisits: parseInt(overall[0]?.completedVisits || 0),
          averageEfficiency: Math.round(averageEfficiency),
          totalDistance: parseFloat(overall[0]?.totalDistance || 0).toFixed(1)
        },
        damageAnalytics: {
          totalDamagedProducts: parseInt(overall[0]?.totalDamages || 0),
          damageByCategory: damageByCategory.map(d => ({
            category: d.category,
            count: parseInt(d.count)
          })),
          topStoresWithDamage: topStoresWithDamage.map(s => ({
            storeName: s.storeName,
            damageCount: parseInt(s.damageCount)
          }))
        },
        advisorPerformance: advisorPerformanceComplete,
        restockMetrics: {
          totalItems: totalRestocks,
          totalValue: 0,
          uniqueProducts: 0,
          averageItemsPerVisit: totalVisits > 0 ? parseFloat((totalRestocks / totalVisits).toFixed(1)) : 0,
          topRestockedProducts: [],
          topRestockedCategories: [],
          restockByAdvisor: restockByAdvisor.map(r => ({
            advisorId: 0,
            advisorName: r.advisorName,
            totalItems: parseInt(r.totalRestocks),
            totalValue: 0,
            averagePerVisit: 0
          })),
          restockByStore: [],
          dailyRestockTrend: []
        }
      };

      console.log('✅ Métricas avanzadas obtenidas correctamente');
      console.log('📊 Reposiciones totales:', totalRestocks);
      console.log('📊 Daños totales:', metrics.damageAnalytics.totalDamagedProducts);
      console.log('📊 Daños por asesor:', damageByAdvisor);
      console.log('📊 Reposiciones por asesor:', restockByAdvisor);
      
      res.json(metrics);

    } catch (error) {
      console.error('❌ Error en getAdvancedMetrics:', error);
      res.status(500).json({ 
        message: 'Error obteniendo métricas avanzadas',
        error: error.message 
      });
    } finally {
      await connection.end();
    }
  }

  // FUNCIÓN: Obtener reportes de daño
  async getDamageReports(req, res) {
    const connection = await createConnection();
    try {
      const { storeId, severity, startDate, endDate } = req.query;
      
      let query = `
        SELECT 
          dr.*,
          u.name as reporter_name
        FROM damage_reports dr
        LEFT JOIN users u ON dr.reported_by = u.id
        WHERE 1=1
      `;
      
      const params = [];
      
      if (storeId) {
        query += ' AND dr.store_id = ?';
        params.push(storeId);
      }
      
      if (severity) {
        query += ' AND dr.severity = ?';
        params.push(severity);
      }
      
      if (startDate) {
        query += ' AND dr.created_at >= ?';
        params.push(startDate + ' 00:00:00');
      }
      
      if (endDate) {
        query += ' AND dr.created_at <= ?';
        params.push(endDate + ' 23:59:59');
      }
      
      query += ' ORDER BY dr.created_at DESC LIMIT 100';
      
      const [reports] = await connection.execute(query, params);
      
      res.json({
        success: true,
        total: reports.length,
        reports: reports
      });
    } catch (error) {
      console.error('❌ Error obteniendo reportes de daño:', error);
      res.status(500).json({ 
        success: false,
        message: 'Error obteniendo reportes de daño',
        error: error.message 
      });
    } finally {
      await connection.end();
    }
  }

  // FUNCIÓN: Generar ruta optimizada
  async generateOptimizedRoute(req, res) {
    const connection = await createConnection();
    try {
      const { advisorId, date } = req.body;

      console.log('🧠 Generando ruta optimizada para asesor:', advisorId);

      const [advisors] = await connection.execute(
        `SELECT * FROM users WHERE id = ? AND role = 'advisor'`,
        [advisorId]
      );

      if (advisors.length === 0) {
        return res.status(404).json({ 
          success: false,
          message: 'Asesor no encontrado o no tiene permisos' 
        });
      }

      const [stores] = await connection.execute(
        `SELECT s.* 
         FROM stores s
         WHERE s.assigned_advisor_id = ?
         ORDER BY s.priority DESC, s.name ASC`,
        [advisorId]
      );

      const optimizedStores = stores.map((store, index) => ({
        id: store.id,
        storeId: {
          id: store.id,
          name: store.name,
          address: store.address,
          coordinates: {
            lat: parseFloat(store.latitude) || 6.2476,
            lng: parseFloat(store.longitude) || -75.5658
          },
          priority: store.priority || 'medium',
          category: store.category || 'supermarket',
          zone: store.zone || 'Zona Norte'
        },
        status: 'pending',
        visit_order: index + 1,
        estimated_duration: store.estimated_visit_duration || 40
      }));

      const totalStores = optimizedStores.length;
      const totalDistance = totalStores * 5;
      const totalTime = optimizedStores.reduce((sum, store) => sum + (store.estimated_duration || 40), 0);
      const timeSaved = Math.round(totalTime * 0.15);

      res.json({
        success: true,
        optimizedRoute: optimizedStores,
        advisorInfo: {
          id: advisors[0].id,
          name: advisors[0].name,
          vehicleType: advisors[0].vehicle_type || 'car'
        },
        metrics: {
          totalStores: totalStores,
          totalDistance: totalDistance,
          totalTime: totalTime,
          timeSaved: timeSaved,
          efficiencyImprovement: '15%'
        }
      });

    } catch (error) {
      console.error('❌ Error generando ruta optimizada:', error);
      res.status(500).json({ 
        success: false,
        message: 'Error optimizando ruta',
        error: error.message 
      });
    } finally {
      await connection.end();
    }
  }

  // Obtener notificaciones
  async getNotifications(req, res) {
    const connection = await createConnection();
    try {
      const [notifications] = await connection.execute(
        `SELECT * FROM admin_notifications 
         ORDER BY created_at DESC 
         LIMIT 50`
      );
      res.json(notifications);
    } catch (error) {
      console.error('Error en getNotifications:', error);
      res.status(500).json({ error: 'Error al obtener notificaciones' });
    } finally {
      await connection.end();
    }
  }

  // Marcar notificación como leída
  async markNotificationAsRead(req, res) {
    const connection = await createConnection();
    try {
      const { notificationId } = req.params;
      
      await connection.execute(
        'UPDATE admin_notifications SET is_read = TRUE WHERE id = ?',
        [notificationId]
      );
      
      res.json({ 
        message: 'Notificación marcada como leída',
        notificationId: notificationId
      });
    } catch (error) {
      console.error('Error en markNotificationAsRead:', error);
      res.status(500).json({ error: 'Error al actualizar notificación' });
    } finally {
      await connection.end();
    }
  }

  async getAllAdvisors(req, res) {
    const connection = await createConnection();
    try {
      const [advisors] = await connection.execute(
        `SELECT id, name, email, vehicle_type, license_plate, assigned_zone, 
                work_start_time, work_end_time, is_active, created_at
         FROM users 
         WHERE role = 'advisor' 
         ORDER BY name ASC`
      );
      
      res.json({ success: true, advisors });
    } catch (error) {
      console.error('Error al obtener asesores:', error);
      res.status(500).json({ success: false, message: error.message });
    } finally {
      await connection.end();
    }
  }

  async getAdvisorById(req, res) {
    const connection = await createConnection();
    try {
      const { id } = req.params;
      const [advisors] = await connection.execute(
        `SELECT id, name, email, vehicle_type, license_plate, assigned_zone, 
                work_start_time, work_end_time, is_active
         FROM users 
         WHERE id = ? AND role = 'advisor'`,
        [id]
      );
      
      if (advisors.length === 0) {
        return res.status(404).json({ success: false, message: 'Asesor no encontrado' });
      }
      
      res.json({ success: true, advisor: advisors[0] });
    } catch (error) {
      console.error('Error al obtener asesor:', error);
      res.status(500).json({ success: false, message: error.message });
    } finally {
      await connection.end();
    }
  }

  async createAdvisor(req, res) {
    const connection = await createConnection();
    try {
      const { 
        name, email, password, vehicle_type, license_plate, 
        assigned_zone, work_start_time, work_end_time 
      } = req.body;
      
      const [existing] = await connection.execute(
        'SELECT id FROM users WHERE email = ?',
        [email]
      );
      
      if (existing.length > 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'Ya existe un usuario con este email' 
        });
      }
      
      const bcrypt = await import('bcrypt');
      const hashedPassword = await bcrypt.hash(password, 10);
      
      const [result] = await connection.execute(
        `INSERT INTO users 
         (name, email, password, role, vehicle_type, license_plate, assigned_zone, work_start_time, work_end_time, is_active)
         VALUES (?, ?, ?, 'advisor', ?, ?, ?, ?, ?, 1)`,
        [name, email, hashedPassword, vehicle_type, license_plate || null, assigned_zone || null, work_start_time || '08:00:00', work_end_time || '17:00:00']
      );
      
      res.json({ 
        success: true, 
        message: 'Asesor creado exitosamente',
        advisorId: result.insertId
      });
    } catch (error) {
      console.error('Error al crear asesor:', error);
      res.status(500).json({ success: false, message: error.message });
    } finally {
      await connection.end();
    }
  }

  async updateAdvisor(req, res) {
    const connection = await createConnection();
    try {
      const { id } = req.params;
      const { 
        name, email, vehicle_type, license_plate, 
        assigned_zone, work_start_time, work_end_time, is_active 
      } = req.body;
      
      const [existing] = await connection.execute(
        'SELECT id FROM users WHERE id = ? AND role = "advisor"',
        [id]
      );
      
      if (existing.length === 0) {
        return res.status(404).json({ success: false, message: 'Asesor no encontrado' });
      }
      
      if (email) {
        const [duplicate] = await connection.execute(
          'SELECT id FROM users WHERE email = ? AND id != ?',
          [email, id]
        );
        
        if (duplicate.length > 0) {
          return res.status(400).json({ 
            success: false, 
            message: 'Ya existe otro usuario con este email' 
          });
        }
      }
      
      await connection.execute(
        `UPDATE users SET 
          name = ?, email = ?, vehicle_type = ?, license_plate = ?, 
          assigned_zone = ?, work_start_time = ?, work_end_time = ?, is_active = ?
         WHERE id = ?`,
        [name, email, vehicle_type, license_plate || null, assigned_zone || null, work_start_time, work_end_time, is_active, id]
      );
      
      res.json({ success: true, message: 'Asesor actualizado exitosamente' });
    } catch (error) {
      console.error('Error al actualizar asesor:', error);
      res.status(500).json({ success: false, message: error.message });
    } finally {
      await connection.end();
    }
  }

  async deleteAdvisor(req, res) {
    const connection = await createConnection();
    try {
      const { id } = req.params;
      
      const [existing] = await connection.execute(
        'SELECT id FROM users WHERE id = ? AND role = "advisor"',
        [id]
      );
      
      if (existing.length === 0) {
        return res.status(404).json({ success: false, message: 'Asesor no encontrado' });
      }
      
      await connection.execute('DELETE FROM users WHERE id = ?', [id]);
      
      res.json({ success: true, message: 'Asesor eliminado exitosamente' });
    } catch (error) {
      console.error('Error al eliminar asesor:', error);
      res.status(500).json({ success: false, message: error.message });
    } finally {
      await connection.end();
    }
  }

  // ✅ FUNCIONES CORREGIDAS - USANDO route_templates

  async getAdvisorSchedule(req, res) {
    const connection = await createConnection();
    try {
      const { advisorId } = req.params;
      
      const [advisor] = await connection.execute(
        'SELECT id, name FROM users WHERE id = ? AND role = "advisor"',
        [advisorId]
      );
      
      if (advisor.length === 0) {
        return res.status(404).json({ success: false, message: 'Asesor no encontrado' });
      }
      
      // Obtener plantillas del asesor
      const [templates] = await connection.execute(`
        SELECT id, day_of_week, template_name, total_stores
        FROM route_templates
        WHERE advisor_id = ? AND is_active = 1
      `, [advisorId]);
      
      const daysMap = { monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6, sunday: 7 };
      const dayNames = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
      const schedule = {};
      
      for (let i = 1; i <= 7; i++) {
        schedule[i] = { dayName: dayNames[i], dayNumber: i, stores: [] };
      }
      
      for (const template of templates) {
        const dayNum = daysMap[template.day_of_week];
        
        const [stores] = await connection.execute(`
          SELECT rts.id, rts.store_id, rts.visit_order, s.name as store_name, s.address, s.priority
          FROM route_template_stores rts
          JOIN stores s ON rts.store_id = s.id
          WHERE rts.template_id = ?
          ORDER BY rts.visit_order
        `, [template.id]);
        
        schedule[dayNum].stores = stores.map(store => ({
          id: store.id,
          store_id: store.store_id,
          store_name: store.store_name,
          address: store.address,
          priority: store.priority,
          visit_order: store.visit_order
        }));
      }
      
      res.json({ success: true, advisor: advisor[0], schedule });
      
    } catch (error) {
      console.error('Error al obtener configuración de rutas:', error);
      res.status(500).json({ success: false, message: error.message });
    } finally {
      await connection.end();
    }
  }
  
  // ✅ AGREGAR TIENDA A PLANTILLA
  async addStoreToSchedule(req, res) {
    const connection = await createConnection();
    try {
      const { advisorId } = req.params;
      const { day_of_week, store_id, visit_order } = req.body;
      
      const dayNames = { 1: 'monday', 2: 'tuesday', 3: 'wednesday', 4: 'thursday', 5: 'friday', 6: 'saturday', 7: 'sunday' };
      const dayName = dayNames[day_of_week];
      
      if (!dayName) {
        return res.status(400).json({ success: false, message: 'Día inválido' });
      }
      
      const [store] = await connection.execute('SELECT id FROM stores WHERE id = ?', [store_id]);
      if (store.length === 0) {
        return res.status(404).json({ success: false, message: 'Tienda no encontrada' });
      }
      
      const [template] = await connection.execute(
        `SELECT id FROM route_templates WHERE advisor_id = ? AND day_of_week = ? AND is_active = 1`,
        [advisorId, dayName]
      );
      
      if (template.length === 0) {
        return res.status(404).json({ success: false, message: 'No existe plantilla para este día' });
      }
      
      const templateId = template[0].id;
      
      const [maxOrder] = await connection.execute(
        `SELECT COALESCE(MAX(visit_order), 0) as max_order FROM route_template_stores WHERE template_id = ?`,
        [templateId]
      );
      
      const newOrder = visit_order || maxOrder[0].max_order + 1;
      
      await connection.execute(`
        INSERT INTO route_template_stores (template_id, store_id, visit_order)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE visit_order = VALUES(visit_order)
      `, [templateId, store_id, newOrder]);
      
      await connection.execute(`
        UPDATE route_templates 
        SET total_stores = (SELECT COUNT(*) FROM route_template_stores WHERE template_id = ?)
        WHERE id = ?
      `, [templateId, templateId]);
      
      res.json({ success: true, message: 'Tienda agregada a la ruta' });
      
    } catch (error) {
      console.error('Error al agregar tienda:', error);
      res.status(500).json({ success: false, message: error.message });
    } finally {
      await connection.end();
    }
  }
  
  // ✅ ELIMINAR TIENDA DE PLANTILLA
  async removeStoreFromSchedule(req, res) {
    const connection = await createConnection();
    try {
      const { advisorId, scheduleId } = req.params;
      
      const [storeInfo] = await connection.execute(
        `SELECT template_id FROM route_template_stores WHERE id = ?`,
        [scheduleId]
      );
      
      if (storeInfo.length === 0) {
        return res.status(404).json({ success: false, message: 'Tienda no encontrada' });
      }
      
      const templateId = storeInfo[0].template_id;
      
      await connection.execute('DELETE FROM route_template_stores WHERE id = ?', [scheduleId]);
      
      await connection.execute(`
        UPDATE route_templates 
        SET total_stores = (SELECT COUNT(*) FROM route_template_stores WHERE template_id = ?)
        WHERE id = ?
      `, [templateId, templateId]);
      
      res.json({ success: true, message: 'Tienda eliminada de la ruta' });
      
    } catch (error) {
      console.error('Error al eliminar tienda:', error);
      res.status(500).json({ success: false, message: error.message });
    } finally {
      await connection.end();
    }
  }
  
  async updateScheduleOrder(req, res) {
    const connection = await createConnection();
    try {
      const { advisorId } = req.params;
      const { updates } = req.body;
      
      for (const update of updates) {
        await connection.execute(
          'UPDATE route_template_stores SET visit_order = ? WHERE id = ?',
          [update.visit_order, update.id]
        );
      }
      
      res.json({ success: true, message: 'Orden actualizado' });
      
    } catch (error) {
      console.error('Error al actualizar orden:', error);
      res.status(500).json({ success: false, message: error.message });
    } finally {
      await connection.end();
    }
  }
  
  async getAllStoresSimple(req, res) {
    const connection = await createConnection();
    try {
      const [stores] = await connection.execute(
        'SELECT id, name, address, priority FROM stores ORDER BY name ASC'
      );
      res.json({ success: true, stores });
    } catch (error) {
      console.error('Error al obtener tiendas:', error);
      res.status(500).json({ success: false, message: error.message });
    } finally {
      await connection.end();
    }
  }

  async generateDailyRoutes(req, res) {
    try {
      const { date } = req.body;
      const result = await routeGenerator.generateDailyRoutes(date);
      res.json(result);
    } catch (error) {
      console.error('Error generando rutas:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
  
  async generateWeekRoutes(req, res) {
    try {
      const results = await routeGenerator.generateWeekRoutes();
      res.json({ success: true, results });
    } catch (error) {
      console.error('Error generando rutas semanales:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getWeeklyPattern(req, res) {
    const connection = await createConnection();
    try {
      const { advisorId } = req.params;
      
      console.log(`📋 Obteniendo plantillas para asesor ${advisorId}`);
      
      const [templates] = await connection.execute(`
        SELECT id, day_of_week, template_name, total_stores
        FROM route_templates
        WHERE advisor_id = ? AND is_active = 1
        ORDER BY FIELD(day_of_week, 'monday', 'tuesday', 'wednesday', 'thursday', 'friday')
      `, [advisorId]);
      
      const daysOfWeek = {
        'monday': 1, 'tuesday': 2, 'wednesday': 3, 'thursday': 4, 
        'friday': 5, 'saturday': 6, 'sunday': 7
      };
      const dayNames = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
      
      const schedule = {};
      for (let i = 1; i <= 7; i++) {
        schedule[i] = { dayName: dayNames[i], dayNumber: i, stores: [] };
      }
      
      for (const template of templates) {
        const dayNum = daysOfWeek[template.day_of_week];
        
        const [stores] = await connection.execute(`
          SELECT 
            rts.id, rts.store_id, rts.visit_order,
            s.name as store_name, s.address, s.priority,
            s.latitude, s.longitude
          FROM route_template_stores rts
          JOIN stores s ON rts.store_id = s.id
          WHERE rts.template_id = ?
          ORDER BY rts.visit_order ASC
        `, [template.id]);
        
        schedule[dayNum].stores = stores.map(store => ({
          id: store.id,
          store_id: store.store_id,
          store_name: store.store_name,
          address: store.address,
          priority: store.priority,
          visit_order: store.visit_order,
          coordinates: {
            lat: parseFloat(store.latitude) || null,
            lng: parseFloat(store.longitude) || null
          }
        }));
      }
      
      const [advisorInfo] = await connection.execute(
        'SELECT id, name FROM users WHERE id = ?',
        [advisorId]
      );
      
      res.json({ 
        success: true, 
        schedule, 
        advisor: advisorInfo[0] || { id: advisorId, name: 'Asesor' }
      });
      
    } catch (error) {
      console.error('❌ Error obteniendo plantillas:', error);
      res.status(500).json({ success: false, error: error.message });
    } finally {
      await connection.end();
    }
  }

  async getAdvisorMetrics(req, res) {
    const connection = await createConnection();
    try {
      const advisorId = req.user.id;
      const { period = 'weekly' } = req.query;
      
      console.log(`📊 Obteniendo métricas para asesor ${advisorId}, período: ${period}`);
      
      // Determinar rango de fechas
      let dateCondition = '';
      if (period === 'daily') {
        dateCondition = "AND r.date = CURDATE()";
      } else if (period === 'weekly') {
        dateCondition = "AND r.date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)";
      } else {
        dateCondition = "AND r.date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)";
      }
      
      // 1. Visitas completadas
      const [visitsResult] = await connection.execute(`
        SELECT COUNT(DISTINCT rs.id) as total_visits
        FROM routes r
        JOIN route_stores rs ON r.id = rs.route_id
        WHERE r.advisor_id = ? 
          AND rs.status = 'completed'
          ${dateCondition}
      `, [advisorId]);
      
      // 2. Tiempo promedio
      const [timeResult] = await connection.execute(`
        SELECT COALESCE(AVG(rs.actual_duration), 0) as avg_time
        FROM routes r
        JOIN route_stores rs ON r.id = rs.route_id
        WHERE r.advisor_id = ? 
          AND rs.status = 'completed'
          AND rs.actual_duration > 0
          ${dateCondition}
      `, [advisorId]);
      
      // 3. Productos repuestos
      const [restockResult] = await connection.execute(`
        SELECT COALESCE(SUM(ri.quantity), 0) as total_restocks
        FROM routes r
        JOIN route_stores rs ON r.id = rs.route_id
        JOIN restock_items ri ON rs.id = ri.route_store_id
        WHERE r.advisor_id = ? 
          AND rs.status = 'completed'
          ${dateCondition}
      `, [advisorId]);
      
      // 4. Productos dañados
      const [damageResult] = await connection.execute(`
        SELECT COUNT(DISTINCT dr.id) as total_damages
        FROM routes r
        JOIN route_stores rs ON r.id = rs.route_id
        JOIN damage_reports dr ON rs.store_id = dr.store_id
        WHERE r.advisor_id = ? 
          AND rs.status = 'completed'
          ${dateCondition}
      `, [advisorId]);
      
      // 5. Distancia total
      const [distanceResult] = await connection.execute(`
        SELECT COALESCE(SUM(r.total_distance), 0) as total_distance
        FROM routes r
        WHERE r.advisor_id = ? 
          ${dateCondition}
      `, [advisorId]);
      
      // 6. Eficiencia
      const [efficiencyResult] = await connection.execute(`
        SELECT 
          COUNT(CASE WHEN rs.actual_duration <= 40 THEN 1 END) as efficient_visits,
          COUNT(rs.id) as total_visits_with_time
        FROM routes r
        JOIN route_stores rs ON r.id = rs.route_id
        WHERE r.advisor_id = ? 
          AND rs.status = 'completed'
          AND rs.actual_duration > 0
          ${dateCondition}
      `, [advisorId]);
      
      // 🆕 7. Ranking de tiendas por tiempo (las que más demoran)
      const [slowStores] = await connection.execute(`
        SELECT 
          s.name as store_name,
          AVG(rs.actual_duration) as avg_time,
          COUNT(rs.id) as visits_count
        FROM routes r
        JOIN route_stores rs ON r.id = rs.route_id
        JOIN stores s ON rs.store_id = s.id
        WHERE r.advisor_id = ? 
          AND rs.status = 'completed'
          AND rs.actual_duration > 0
          ${dateCondition}
        GROUP BY s.id, s.name
        ORDER BY avg_time DESC
        LIMIT 5
      `, [advisorId]);
      
      // 🆕 8. Recomendaciones personalizadas
      const recommendations = [];
      
      // Verificar tiendas lentas
      if (slowStores.length > 0 && slowStores[0].avg_time > 40) {
        recommendations.push(`⏱️ La tienda "${slowStores[0].store_name}" te toma ${Math.round(slowStores[0].avg_time)} minutos en promedio (${slowStores[0].visits_count} visitas). Intenta optimizar tu tiempo allí.`);
      }
      
      // Verificar eficiencia general
      const totalWithTime = efficiencyResult[0]?.total_visits_with_time || 0;
      const efficientVisits = efficiencyResult[0]?.efficient_visits || 0;
      const efficiency = totalWithTime > 0 ? Math.round((efficientVisits / totalWithTime) * 100) : 0;
      
      if (efficiency < 70 && totalWithTime > 2) {
        recommendations.push(`📊 Tu eficiencia actual es del ${efficiency}%. El objetivo es 80%. Revisa las tiendas que te toman más tiempo.`);
      }
      
      // Verificar reposiciones
      const restocks = restockResult[0]?.total_restocks || 0;
      const totalVisits = visitsResult[0]?.total_visits || 0;
      const avgRestocks = totalVisits > 0 ? (restocks / totalVisits).toFixed(1) : 0;
      
      if (avgRestocks > 0) {
        recommendations.push(`📦 En promedio repones ${avgRestocks} productos por visita. ¡Buen trabajo!`);
      }
      
      // Verificar daños
      const damages = damageResult[0]?.total_damages || 0;
      if (damages > restocks * 0.1) {
        recommendations.push(`⚠️ Has reportado ${damages} productos dañados. Revisa con cuidado el estado de los productos en bodega.`);
      }
      
      if (recommendations.length === 0) {
        recommendations.push('✅ ¡Excelente trabajo! Sigue así.');
      }
      
      const totalVisitsCount = visitsResult[0]?.total_visits || 0;
      const avgTime = Math.round(timeResult[0]?.avg_time || 0);
      const restocksTotal = restockResult[0]?.total_restocks || 0;
      const damagesTotal = damageResult[0]?.total_damages || 0;
      const totalDistance = Math.round(distanceResult[0]?.total_distance || 0);
      
      const efficientVisitsCount = efficiencyResult[0]?.efficient_visits || 0;
      const totalWithTimeCount = efficiencyResult[0]?.total_visits_with_time || 0;
      const efficiencyScore = totalWithTimeCount > 0 ? Math.round((efficientVisitsCount / totalWithTimeCount) * 100) : 0;
      
      const currentData = {
        visits: totalVisitsCount,
        completed: totalVisitsCount,
        avgTime: avgTime,
        restocks: restocksTotal,
        damages: damagesTotal
      };
      
      const result = {
        daily: currentData,
        weekly: {
          ...currentData,
          efficiency: efficiencyScore
        },
        monthly: {
          ...currentData,
          efficiency: efficiencyScore,
          totalDistance: totalDistance
        },
        trends: {
          dailyVisits: [],
          efficiencyTrend: []
        },
        slowStores: slowStores.map(s => ({
          name: s.store_name,
          avgTime: Math.round(s.avg_time),
          visits: s.visits_count
        })),
        recommendations: recommendations
      };
      
      console.log(`📊 Resultados para asesor ${advisorId}:`, {
        visitas: totalVisitsCount,
        reposiciones: restocksTotal,
        daños: damagesTotal,
        tiendasLentas: slowStores.length
      });
      
      res.json(result);
      
    } catch (error) {
      console.error('❌ Error obteniendo métricas del asesor:', error);
      res.status(500).json({ error: error.message });
    } finally {
      await connection.end();
    }
  }

  async getMLMetrics(req, res) {
    const connection = await createConnection();
    try {
      const { period = 'month' } = req.query;
      
      console.log(`🤖 Obteniendo métricas ML para período: ${period}`);
      
      // Determinar condición de fecha
      let dateCondition = '';
      if (period === 'week') {
        dateCondition = "AND rs.end_time >= DATE_SUB(NOW(), INTERVAL 7 DAY)";
      } else if (period === 'month') {
        dateCondition = "AND rs.end_time >= DATE_SUB(NOW(), INTERVAL 30 DAY)";
      } else {
        dateCondition = "AND rs.end_time >= DATE_SUB(NOW(), INTERVAL 90 DAY)";
      }
      
      // 1. Resumen general
      const [summary] = await connection.execute(`
        SELECT 
          COUNT(DISTINCT rs.id) as totalVisits,
          COALESCE(AVG(rs.actual_duration), 0) as avgDuration,
          (SELECT COALESCE(SUM(ri.quantity), 0) FROM restock_items ri WHERE ri.reported_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)) as totalRestocks,
          (SELECT COUNT(*) FROM damage_reports dr WHERE dr.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)) as totalDamages,
          COALESCE(
            (SUM(CASE WHEN rs.actual_duration <= 40 THEN 1 ELSE 0 END) * 100.0) / 
            NULLIF(COUNT(rs.id), 0), 0
          ) as efficiencyScore,
          (SELECT COUNT(*) FROM routes) as routesOptimized
        FROM route_stores rs
        WHERE rs.status = 'completed' ${dateCondition}
      `);
      
      // 2. Datos de visitas (sin estimated_duration)
      const [visitsData] = await connection.execute(`
        SELECT 
          rs.id,
          s.name as storeName,
          rs.visit_order as visitOrder,
          COALESCE(rs.actual_duration, 0) as actualDuration,
          40 as estimatedDuration,
          0 as timeDifference,
          rs.end_time as date
        FROM route_stores rs
        JOIN stores s ON rs.store_id = s.id
        WHERE rs.status = 'completed' AND rs.actual_duration > 0 ${dateCondition}
        ORDER BY rs.end_time DESC
        LIMIT 50
      `);
      
      // 3. Tiendas más lentas
      const [slowestStores] = await connection.execute(`
        SELECT 
          s.name,
          AVG(rs.actual_duration) as avgTime,
          COUNT(*) as visits
        FROM route_stores rs
        JOIN stores s ON rs.store_id = s.id
        WHERE rs.status = 'completed' AND rs.actual_duration > 0 ${dateCondition}
        GROUP BY s.id, s.name
        ORDER BY avgTime DESC
        LIMIT 5
      `);
      
      // 4. Mejores rutas
      const [bestRoutes] = await connection.execute(`
        SELECT 
          r.id as routeId,
          COUNT(rs.id) as stores,
          COALESCE(
            (SUM(CASE WHEN rs.actual_duration <= 40 THEN 1 ELSE 0 END) * 100.0) / 
            NULLIF(COUNT(rs.id), 0), 0
          ) as efficiency
        FROM routes r
        JOIN route_stores rs ON r.id = rs.route_id
        WHERE rs.status = 'completed' AND rs.actual_duration > 0 ${dateCondition}
        GROUP BY r.id
        HAVING stores >= 2
        ORDER BY efficiency DESC
        LIMIT 5
      `);
      
      // 5. Patrones de daños
      const [damagePatterns] = await connection.execute(`
        SELECT 
          COALESCE(dr.product_category, 'Otros') as category,
          COUNT(*) as count,
          (COUNT(*) * 100.0 / (SELECT COUNT(*) FROM damage_reports WHERE 1=1 ${dateCondition.replace('rs.end_time', 'dr.created_at')})) as percentage
        FROM damage_reports dr
        WHERE 1=1 ${dateCondition.replace('rs.end_time', 'dr.created_at')}
        GROUP BY category
        ORDER BY count DESC
        LIMIT 5
      `);
      
      // 6. Recomendaciones
      const recommendations = [];
      const summaryData = summary[0] || {};
      const avgDuration = parseFloat(summaryData.avgDuration) || 0;
      const totalRestocks = parseInt(summaryData.totalRestocks) || 0;
      const totalDamages = parseInt(summaryData.totalDamages) || 0;
      
      if (avgDuration > 40) {
        recommendations.push('⏱️ El tiempo promedio por tienda es superior a 40 minutos. Se recomienda optimizar las rutas.');
      }
      if (totalDamages > totalRestocks * 0.1 && totalRestocks > 0) {
        recommendations.push('⚠️ Los productos dañados representan más del 10% de las reposiciones. Revisar manejo de inventario.');
      }
      if (slowestStores.length > 0 && slowestStores[0].avgTime > 60) {
        recommendations.push(`🐌 La tienda "${slowestStores[0].name}" toma ${Math.round(slowestStores[0].avgTime)} minutos en promedio. Considerar reasignación de prioridad.`);
      }
      if (bestRoutes.length > 0 && bestRoutes[0].efficiency > 85) {
        recommendations.push(`🏆 La ruta #${bestRoutes[0].routeId} tiene ${Math.round(bestRoutes[0].efficiency)}% de eficiencia. Usar como modelo para optimización.`);
      }
      if (recommendations.length === 0) {
        recommendations.push('✅ Los datos actuales son buenos. Continúa recolectando más información para mejorar el modelo.');
      }
      
      // Manejar damagePatterns cuando no hay datos
      const processedDamagePatterns = damagePatterns.length > 0 ? damagePatterns : [
        { category: 'Sin datos', count: 0, percentage: 0 }
      ];
      
      const result = {
        summary: {
          totalVisits: parseInt(summaryData.totalVisits || 0),
          avgDuration: Math.round(avgDuration),
          totalRestocks: totalRestocks,
          totalDamages: totalDamages,
          efficiencyScore: Math.round(summaryData.efficiencyScore || 0),
          routesOptimized: parseInt(summaryData.routesOptimized || 0)
        },
        visitsData: visitsData.map(v => ({
          id: v.id,
          storeName: v.storeName,
          visitOrder: v.visitOrder,
          actualDuration: v.actualDuration,
          estimatedDuration: v.estimatedDuration,
          timeDifference: v.timeDifference,
          date: v.date
        })),
        distancesData: [],
        patterns: {
          slowestStores: slowestStores.map(s => ({
            name: s.name,
            avgTime: Math.round(s.avgTime),
            visits: s.visits
          })),
          bestRoutes: bestRoutes.map(r => ({
            routeId: r.routeId,
            efficiency: Math.round(r.efficiency),
            stores: r.stores
          })),
          damagePatterns: processedDamagePatterns.map(d => ({
            category: d.category,
            count: d.count,
            percentage: parseFloat(d.percentage) || 0
          }))
        },
        recommendations: recommendations
      };
      
      console.log('✅ Métricas ML obtenidas correctamente');
      res.json(result);
      
    } catch (error) {
      console.error('❌ Error obteniendo métricas ML:', error);
      res.status(500).json({ error: error.message });
    } finally {
      await connection.end();
    }
  }

  async getVisitNotes(req, res) {
    const connection = await createConnection();
    try {
      const advisorId = req.user.id;
      const { period = 'week' } = req.query;
      
      let dateCondition = '';
      if (period === 'week') {
        dateCondition = "AND r.date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)";
      } else if (period === 'month') {
        dateCondition = "AND r.date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)";
      } else {
        dateCondition = "AND r.date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)";
      }
      
      const [notes] = await connection.execute(`
        SELECT 
          rs.notes,
          s.name as store_name,
          r.date,
          rs.end_time,
          rs.actual_duration
        FROM route_stores rs
        JOIN routes r ON rs.route_id = r.id
        JOIN stores s ON rs.store_id = s.id
        WHERE r.advisor_id = ? 
          AND rs.notes IS NOT NULL 
          AND rs.notes != ''
          ${dateCondition}
        ORDER BY r.date DESC, rs.end_time DESC
      `, [advisorId]);
      
      res.json({
        success: true,
        notes: notes,
        total: notes.length
      });
    } catch (error) {
      console.error('Error obteniendo notas:', error);
      res.status(500).json({ success: false, error: error.message });
    } finally {
      await connection.end();
    }
  }

  async getSystemMetrics(req, res) {
    const connection = await createConnection();
    try {
      const { period = 'month' } = req.query;
      
      let dateCondition = '';
      if (period === 'week') {
        dateCondition = "AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)";
      } else if (period === 'month') {
        dateCondition = "AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)";
      } else if (period === 'quarter') {
        dateCondition = "AND created_at >= DATE_SUB(NOW(), INTERVAL 90 DAY)";
      }
      
      // 1. Tiempo promedio de visita (sin rs. porque no hay alias)
      const [avgVisitTime] = await connection.execute(`
        SELECT 
          AVG(actual_duration) as avg_duration,
          COUNT(*) as total_visits,
          AVG(CASE WHEN actual_duration <= 40 THEN actual_duration END) as efficient_avg,
          SUM(CASE WHEN actual_duration <= 40 THEN 1 ELSE 0 END) as efficient_visits
        FROM route_stores
        WHERE status = 'completed' AND actual_duration > 0 ${dateCondition}
      `);
      
      // 2. Tiempo promedio por tarea
      const [taskMetrics] = await connection.execute(`
        SELECT 
          AVG(tasks_completed) as avg_tasks_completed,
          AVG(actual_duration / NULLIF(tasks_completed, 0)) as avg_time_per_task
        FROM route_stores
        WHERE status = 'completed' AND tasks_completed > 0 ${dateCondition}
      `);
      
      // 3. Eficiencia por asesor
      const [advisorEfficiency] = await connection.execute(`
        SELECT 
          u.name,
          COUNT(rs.id) as visits,
          AVG(rs.actual_duration) as avg_time,
          AVG(rs.tasks_completed) as avg_tasks,
          ROUND((SUM(CASE WHEN rs.actual_duration <= 40 THEN 1 ELSE 0 END) * 100.0) / NULLIF(COUNT(rs.id), 0), 2) as efficiency
        FROM route_stores rs
        JOIN routes r ON rs.route_id = r.id
        JOIN users u ON r.advisor_id = u.id
        WHERE rs.status = 'completed' AND rs.actual_duration > 0 ${dateCondition.replace(/created_at/g, 'rs.created_at')}
        GROUP BY u.id, u.name
        ORDER BY efficiency DESC
      `);
      
      // 4. Actividad diaria
      const [dailyActivity] = await connection.execute(`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as visits_completed,
          AVG(actual_duration) as avg_duration
        FROM route_stores
        WHERE status = 'completed' AND actual_duration > 0 ${dateCondition}
        GROUP BY DATE(created_at)
        ORDER BY date DESC
        LIMIT 30
      `);
      
      res.json({
        success: true,
        metrics: {
          visits: {
            total: avgVisitTime[0]?.total_visits || 0,
            efficient: avgVisitTime[0]?.efficient_visits || 0,
            efficiency_rate: avgVisitTime[0]?.total_visits > 0 
              ? ((avgVisitTime[0].efficient_visits / avgVisitTime[0].total_visits) * 100).toFixed(2)
              : 0,
            avg_duration: Math.round(avgVisitTime[0]?.avg_duration || 0),
            efficient_avg: Math.round(avgVisitTime[0]?.efficient_avg || 0)
          },
          tasks: {
            avg_completed: parseFloat(taskMetrics[0]?.avg_tasks_completed || 0).toFixed(1),
            avg_time_per_task: Math.round(taskMetrics[0]?.avg_time_per_task || 0)
          },
          offline: {
            total_sync_operations: 0,
            avg_retries: 0
          },
          advisor_performance: advisorEfficiency,
          daily_trend: dailyActivity
        }
      });
      
    } catch (error) {
      console.error('Error obteniendo métricas del sistema:', error);
      res.status(500).json({ success: false, error: error.message });
    } finally {
      await connection.end();
    }
  }

  // Obtener fotos - VERSIÓN ULTRA SIMPLIFICADA
  async getPhotos(req, res) {
    const connection = await createConnection();
    try {
      const { type, advisorId, storeId, startDate, endDate, limit = 50 } = req.query;
      
      console.log('📸 Filtros:', { type, advisorId, storeId, startDate, endDate });
      
      let sql = `
        SELECT 
          rs.id as visit_id,
          rs.before_photo_url,
          rs.after_photo_url,
          s.name as store_name,
          u.name as advisor_name,
          r.date,
          rs.created_at
        FROM route_stores rs
        JOIN routes r ON rs.route_id = r.id
        JOIN stores s ON rs.store_id = s.id
        JOIN users u ON r.advisor_id = u.id
        WHERE 1=1
      `;
      
      // Filtros
      if (advisorId && advisorId !== '') {
        sql += ` AND u.id = ${parseInt(advisorId)}`;
      }
      
      if (storeId && storeId !== '') {
        sql += ` AND s.id = ${parseInt(storeId)}`;
      }
      
      if (startDate && startDate !== '') {
        sql += ` AND r.date >= '${startDate}'`;
      }
      
      if (endDate && endDate !== '') {
        sql += ` AND r.date <= '${endDate}'`;
      }
      
      sql += ` ORDER BY rs.created_at DESC LIMIT ${parseInt(limit)}`;
      
      console.log('📸 SQL:', sql);
      
      const [photos] = await connection.execute(sql);
      
      console.log(`📸 Encontradas ${photos.length} filas`);
      
      // Procesar fotos - CADA FOTO ES UN ELEMENTO INDEPENDIENTE
      const processedPhotos = [];
      const baseUrl = 'https://ingenieria.unac.edu.co/~daniel.paez/smartpath';
      
      for (const photo of photos) {
        // Si el filtro es 'before' o no hay filtro, agregar foto de before
        if ((!type || type === 'all' || type === 'before') && photo.before_photo_url && photo.before_photo_url.trim()) {
          let url = photo.before_photo_url;
          if (!url.startsWith('http')) {
            url = baseUrl + (url.startsWith('/') ? url : '/' + url);
          }
          processedPhotos.push({
            id: photo.visit_id,
            type: 'before',
            photo_url: url,
            store_name: photo.store_name,
            advisor_name: photo.advisor_name,
            date: photo.date,
            created_at: photo.created_at
          });
        }
        
        // Si el filtro es 'after' o no hay filtro, agregar foto de after
        if ((!type || type === 'all' || type === 'after') && photo.after_photo_url && photo.after_photo_url.trim()) {
          let url = photo.after_photo_url;
          if (!url.startsWith('http')) {
            url = baseUrl + (url.startsWith('/') ? url : '/' + url);
          }
          processedPhotos.push({
            id: photo.visit_id,
            type: 'after',
            photo_url: url,
            store_name: photo.store_name,
            advisor_name: photo.advisor_name,
            date: photo.date,
            created_at: photo.created_at
          });
        }
      }
      
      console.log(`📸 Total fotos procesadas: ${processedPhotos.length}`);
      
      res.json({
        success: true,
        photos: processedPhotos,
        total: processedPhotos.length
      });
      
    } catch (error) {
      console.error('❌ Error:', error);
      res.status(500).json({ success: false, error: error.message });
    } finally {
      await connection.end();
    }
  }

  // Obtener métricas de rendimiento del sistema
  async getPerformanceMetrics(req, res) {
    const connection = await createConnection();
    try {
      // 1. Métricas del servidor
      const serverMetrics = {
        uptime: process.uptime(),
        memory: {
          rss: process.memoryUsage().rss,
          heapTotal: process.memoryUsage().heapTotal,
          heapUsed: process.memoryUsage().heapUsed
        },
        node_version: process.version,
        platform: process.platform
      };
      
      // 2. Métricas de la base de datos
      let dbSize = 0;
      let tableCounts = {};
      
      try {
        // Tamaño de la BD
        const [sizeResult] = await connection.execute(`
          SELECT ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) as size_mb
          FROM information_schema.tables
          WHERE table_schema = DATABASE()
        `);
        dbSize = sizeResult[0]?.size_mb || 0;
        
        // Conteo de registros por tabla
        const tables = ['users', 'stores', 'routes', 'route_stores', 'restock_items', 'damage_reports'];
        for (const table of tables) {
          try {
            const [result] = await connection.execute(`SELECT COUNT(*) as count FROM ${table}`);
            tableCounts[table] = result[0]?.count || 0;
          } catch (e) {
            tableCounts[table] = 0;
          }
        }
      } catch (dbError) {
        console.error('Error consultando BD:', dbError.message);
      }
      
      res.json({
        success: true,
        metrics: {
          server: serverMetrics,
          database: {
            size_mb: dbSize,
            tables: tableCounts
          },
          timestamp: new Date().toISOString()
        }
      });
      
    } catch (error) {
      console.error('Error obteniendo métricas:', error);
      res.status(500).json({ success: false, error: error.message });
    } finally {
      await connection.end();
    }
  }

  // Ejecutar optimización de rutas
  async runOptimization(req, res) {
    try {
      console.log('🚀 Ejecutando optimización de rutas...');

      // Usar la ruta completa de python3
      const pythonPath = '/usr/bin/python3';
      const scriptPath = '/home/daniel.paez/Smartpath/backend/ml/optimizer.py';
      
      const { spawn } = await import('child_process');
      const pythonProcess = spawn(pythonPath, [scriptPath], {
        cwd: '/home/daniel.paez/Smartpath/backend'
      });

      let stdout = '';
      let stderr = '';

      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      pythonProcess.on('close', (code) => {
        if (code === 0) {
          console.log('✅ Optimización completada exitosamente');
          res.json({
            success: true,
            message: 'Optimización completada',
            output: stdout.trim(),
            error: stderr.trim()
          });
        } else {
          console.error('❌ Error en optimización:', stderr);
          res.status(500).json({
            success: false,
            error: 'Error ejecutando optimización',
            details: stderr.trim(),
            output: stdout.trim()
          });
        }
      });

      pythonProcess.on('error', (error) => {
        console.error('❌ Error ejecutando script Python:', error);
        res.status(500).json({
          success: false,
          error: 'Error ejecutando script Python',
          details: error.message
        });
      });

    } catch (error) {
      console.error('❌ Error en runOptimization:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getOptimizationSummary(req, res) {
    const connection = await createConnection();
    try {
      // Resultados por asesor
      const [byAdvisor] = await connection.execute(`
        SELECT 
          o.advisor_id,
          u.name as advisor_name,
          ROUND(AVG(o.distance_improvement), 2) as mejora_distancia,
          ROUND(AVG(o.time_improvement), 2) as mejora_tiempo,
          COUNT(*) as rutas
        FROM optimization_results o
        JOIN users u ON o.advisor_id = u.id
        WHERE o.advisor_id IN (8,9,10,11)
        GROUP BY o.advisor_id, u.name
        ORDER BY mejora_distancia DESC
      `);

      const [distanceMetrics] = await connection.execute(`
        SELECT 
          ROUND(SUM(original_distance), 2) as distancia_original_total,
          ROUND(SUM(optimized_distance), 2) as distancia_optimizada_total,
          ROUND(SUM(original_distance) - SUM(optimized_distance), 2) as ahorro_km
        FROM optimization_results
        WHERE advisor_id IN (8,9,10,11)
      `);
      
      // Métricas globales
      const [global] = await connection.execute(`
        SELECT 
          ROUND(AVG(distance_improvement), 2) as mejora_promedio,
          COUNT(*) as total_rutas,
          ROUND(MIN(distance_improvement), 2) as mejora_min,
          ROUND(MAX(distance_improvement), 2) as mejora_max,
          ROUND(AVG(confidence_level), 2) as confianza
        FROM optimization_results
        WHERE advisor_id IN (8,9,10,11)
      `);
      
      // Última ejecución
      const [lastExec] = await connection.execute(`
        SELECT MAX(created_at) as last_execution FROM optimization_results
      `);
      
      res.json({
        success: true,
        byAdvisor,
        global: global[0],
        distanceMetrics: distanceMetrics[0],
        lastExecution: lastExec[0]?.last_execution
      });
      
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    } finally {
      await connection.end();
    }
  }
}

export default new AdminController();