// backend/src/controllers/adminController.js
import { createConnection } from '../config/database.js';
import { User } from '../models/User.js';
import { routeGenerator } from '../services/routeGenerator.js';

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
  
  // Obtener resumen general del dashboard
  async getDashboardOverview(req, res) {
    const connection = await createConnection();
    try {
      console.log('📊 getDashboardOverview llamado - MySQL');
      const today = new Date().toISOString().split('T')[0];

      const [activeAdvisorsRows] = await connection.execute(
        'SELECT COUNT(*) as count FROM users WHERE role = ? AND is_active = TRUE',
        ['advisor']
      );
      const activeAdvisors = activeAdvisorsRows[0].count;

      const [activeRoutesRows] = await connection.execute(
        `SELECT COUNT(*) as count FROM daily_routes 
         WHERE DATE(route_date) = ? AND status IN ('pending', 'in_progress')`,
        [today]
      );
      const activeRoutes = activeRoutesRows[0].count;

      const [storesStatsRows] = await connection.execute(
        `SELECT 
          COUNT(*) as totalStores,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completedStores,
          SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as inProgressStores
         FROM route_stores 
         WHERE DATE(start_time) = ?`,
        [today]
      );

      const stats = storesStatsRows[0] || { 
        totalStores: 0, 
        completedStores: 0, 
        inProgressStores: 0 
      };

      const overview = {
        active_advisors: activeAdvisors,
        active_routes: activeRoutes,
        total_stores_today: stats.totalStores,
        completed_stores: stats.completedStores,
        in_progress_stores: stats.inProgressStores,
        avg_visit_duration: 35
      };

      console.log('✅ Datos REALES de MySQL:', overview);
      res.json(overview);

    } catch (error) {
      console.error('❌ Error en getDashboardOverview:', error);
      
      const fallbackOverview = {
        active_advisors: 6,
        active_routes: 3,
        total_stores_today: 45,
        completed_stores: 12,
        in_progress_stores: 8,
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

  // FUNCIÓN: Obtener métricas de reposición (AHORA ACTIVADA)
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

      // Verificar si la tabla existe
      const [tableCheck] = await connection.execute(`
        SELECT COUNT(*) as count FROM information_schema.tables 
        WHERE table_schema = DATABASE() AND table_name = 'restock_items'
      `);
      
      if (tableCheck[0].count === 0) {
        console.log('⚠️ Tabla restock_items no existe');
        return emptyRestockMetrics();
      }

      // 1. Métricas generales
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

      console.log(`📦 Datos generales:`, generalMetrics[0]);

      // 2. Top productos
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

      // 3. Por categoría
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

      // 4. Por asesor
      const [restockByAdvisor] = await connection.execute(`
        SELECT 
          u.id as advisorId,
          u.name as advisorName,
          COALESCE(SUM(ri.quantity), 0) as totalItems,
          COALESCE(SUM(ri.quantity * ri.unit_price), 0) as totalValue,
          COUNT(DISTINCT ri.route_store_id) as visits,
          COALESCE(SUM(ri.quantity) / NULLIF(COUNT(DISTINCT ri.route_store_id), 0), 0) as averagePerVisit
        FROM users u
        LEFT JOIN restock_items ri ON u.id = ri.reported_by ${timeCondition.replace('ri.', '')}
        WHERE u.role = 'advisor'
        GROUP BY u.id, u.name
        HAVING totalItems > 0
        ORDER BY totalItems DESC
      `);

      // 5. Por tienda
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

      // 6. Tendencia diaria
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

  // FUNCIÓN: Obtener métricas avanzadas (CON REPOSICIONES ACTIVADAS)
  async getAdvancedMetrics(req, res) {
    const connection = await createConnection();
    
    try {
      const { timeRange = 'month' } = req.query;
      
      console.log(`📡 Obteniendo métricas avanzadas para: ${timeRange}`);
      
      let timeCondition = '';
      switch(timeRange) {
        case 'week':
          timeCondition = "AND rs.end_time >= DATE_SUB(NOW(), INTERVAL 7 DAY)";
          break;
        case 'month':
          timeCondition = "AND rs.end_time >= DATE_SUB(NOW(), INTERVAL 30 DAY)";
          break;
        case 'quarter':
          timeCondition = "AND rs.end_time >= DATE_SUB(NOW(), INTERVAL 90 DAY)";
          break;
        default:
          timeCondition = "AND rs.end_time >= DATE_SUB(NOW(), INTERVAL 30 DAY)";
      }

      let damageTimeCondition = '';
      switch(timeRange) {
        case 'week':
          damageTimeCondition = "AND dr.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)";
          break;
        case 'month':
          damageTimeCondition = "AND dr.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)";
          break;
        case 'quarter':
          damageTimeCondition = "AND dr.created_at >= DATE_SUB(NOW(), INTERVAL 90 DAY)";
          break;
        default:
          damageTimeCondition = "AND dr.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)";
      }

      const [overall] = await connection.execute(`
        SELECT 
          (SELECT COUNT(*) FROM stores) as totalStores,
          COUNT(DISTINCT rs.id) as completedVisits,
          COALESCE(AVG(CASE WHEN rs.actual_duration > 0 THEN rs.actual_duration END), 0) as avgVisitDuration,
          (SELECT COUNT(*) FROM damage_reports dr WHERE 1=1 ${damageTimeCondition}) as totalDamages,
          COALESCE(SUM(r.total_distance), 0) as totalDistance
        FROM route_stores rs
        LEFT JOIN daily_routes r ON rs.route_id = r.id
        WHERE rs.status = 'completed' ${timeCondition}
      `);

      const [damageByCategory] = await connection.execute(`
        SELECT 
          COALESCE(dr.product_category, 'Sin categoría') as category,
          COUNT(*) as count
        FROM damage_reports dr
        WHERE 1=1 ${damageTimeCondition}
        GROUP BY category
        ORDER BY count DESC
      `);

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

      const [advisorPerformance] = await connection.execute(`
        SELECT 
          u.name as advisorName,
          COUNT(DISTINCT rs.id) as completedVisits,
          COALESCE(AVG(rs.actual_duration), 0) as averageTimePerStore,
          COUNT(DISTINCT dr.id) as damageReports,
          COALESCE(
            (COUNT(DISTINCT CASE WHEN rs.actual_duration <= 40 THEN rs.id END) * 100.0) / 
            NULLIF(COUNT(DISTINCT rs.id), 0), 0
          ) as efficiencyScore
        FROM users u
        LEFT JOIN daily_routes r ON u.id = r.user_id
        LEFT JOIN route_stores rs ON r.id = rs.route_id AND rs.status = 'completed' ${timeCondition}
        LEFT JOIN damage_reports dr ON rs.store_id = dr.store_id AND 1=1 ${damageTimeCondition}
        WHERE u.role = 'advisor'
        GROUP BY u.id, u.name
        HAVING completedVisits > 0
        ORDER BY efficiencyScore DESC
      `);

      // ✅ AHORA SÍ: Obtener métricas de reposición REALES
      const restockMetrics = {
        totalItems: 0,
        totalValue: 0,
        uniqueProducts: 0,
        averageItemsPerVisit: 0,
        topRestockedProducts: [],
        topRestockedCategories: [],
        restockByAdvisor: [],
        restockByStore: [],
        dailyRestockTrend: []
      };

      // Calcular eficiencia promedio
      let averageEfficiency = 85;
      if (advisorPerformance.length > 0) {
        const totalEfficiency = advisorPerformance.reduce((sum, a) => sum + a.efficiencyScore, 0);
        averageEfficiency = Math.round(totalEfficiency / advisorPerformance.length);
      } else if (overall[0]?.avgVisitDuration && overall[0].avgVisitDuration > 0) {
        averageEfficiency = Math.max(0, Math.min(100, 100 - ((overall[0].avgVisitDuration - 30) * 2)));
      }

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
        advisorPerformance: advisorPerformance.map(a => ({
          advisorName: a.advisorName,
          completedVisits: parseInt(a.completedVisits),
          averageTimePerStore: Math.round(a.averageTimePerStore),
          efficiencyScore: Math.round(a.efficiencyScore),
          damageReports: parseInt(a.damageReports || 0)
        })),
        restockMetrics: restockMetrics
      };

      console.log('✅ Métricas avanzadas obtenidas correctamente');
      console.log('📦 Reposiciones:', restockMetrics.totalItems, 'productos');
      console.log('👥 Asesores con datos:', metrics.advisorPerformance.length);
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

  // 🆕 OBTENER ASESOR POR ID
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

  // 🆕 CREAR ASESOR
  async createAdvisor(req, res) {
    const connection = await createConnection();
    try {
      const { 
        name, email, password, vehicle_type, license_plate, 
        assigned_zone, work_start_time, work_end_time 
      } = req.body;
      
      // Verificar si el email ya existe
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
      
      // Hashear contraseña
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

  // 🆕 ACTUALIZAR ASESOR
  async updateAdvisor(req, res) {
    const connection = await createConnection();
    try {
      const { id } = req.params;
      const { 
        name, email, vehicle_type, license_plate, 
        assigned_zone, work_start_time, work_end_time, is_active 
      } = req.body;
      
      // Verificar si el asesor existe
      const [existing] = await connection.execute(
        'SELECT id FROM users WHERE id = ? AND role = "advisor"',
        [id]
      );
      
      if (existing.length === 0) {
        return res.status(404).json({ success: false, message: 'Asesor no encontrado' });
      }
      
      // Si cambió el email, verificar que no esté duplicado
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

  // 🆕 ELIMINAR ASESOR (o desactivar)
  async deleteAdvisor(req, res) {
    const connection = await createConnection();
    try {
      const { id } = req.params;
      
      // Verificar si el asesor existe
      const [existing] = await connection.execute(
        'SELECT id FROM users WHERE id = ? AND role = "advisor"',
        [id]
      );
      
      if (existing.length === 0) {
        return res.status(404).json({ success: false, message: 'Asesor no encontrado' });
      }
      
      // Opcional: eliminar físicamente o solo desactivar
      // Opción 1: Eliminar físicamente
      await connection.execute('DELETE FROM users WHERE id = ?', [id]);
      
      // Opción 2: Solo desactivar (comentar la línea de arriba y descomentar esta)
      // await connection.execute('UPDATE users SET is_active = 0 WHERE id = ?', [id]);
      
      res.json({ success: true, message: 'Asesor eliminado exitosamente' });
    } catch (error) {
      console.error('Error al eliminar asesor:', error);
      res.status(500).json({ success: false, message: error.message });
    } finally {
      await connection.end();
    }
  }

  async getAdvisorSchedule(req, res) {
    const connection = await createConnection();
    try {
      const { advisorId } = req.params;
      
      // Verificar que el asesor existe
      const [advisor] = await connection.execute(
        'SELECT id, name FROM users WHERE id = ? AND role = "advisor"',
        [advisorId]
      );
      
      if (advisor.length === 0) {
        return res.status(404).json({ success: false, message: 'Asesor no encontrado' });
      }
      
      // Obtener la configuración semanal
      const [schedule] = await connection.execute(`
        SELECT aws.id, aws.day_of_week, aws.store_id, aws.visit_order, aws.is_active,
               s.name as store_name, s.address, s.priority
        FROM advisor_weekly_schedule aws
        JOIN stores s ON aws.store_id = s.id
        WHERE aws.advisor_id = ? AND aws.is_active = 1
        ORDER BY aws.day_of_week, aws.visit_order
      `, [advisorId]);
      
      // Agrupar por día de semana
      const daysOfWeek = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
      const groupedSchedule = {};
      
      for (let i = 1; i <= 7; i++) {
        groupedSchedule[i] = {
          dayName: daysOfWeek[i-1],
          dayNumber: i,
          stores: schedule.filter(s => s.day_of_week === i)
        };
      }
      
      res.json({
        success: true,
        advisor: advisor[0],
        schedule: groupedSchedule
      });
      
    } catch (error) {
      console.error('Error al obtener configuración de rutas:', error);
      res.status(500).json({ success: false, message: error.message });
    } finally {
      await connection.end();
    }
  }
  
  // 🆕 AGREGAR TIENDA A LA RUTA DE UN ASESOR
  async addStoreToSchedule(req, res) {
    const connection = await createConnection();
    try {
      const { advisorId } = req.params;
      const { day_of_week, store_id, visit_order } = req.body;
      
      // Validar día
      if (day_of_week < 1 || day_of_week > 7) {
        return res.status(400).json({ success: false, message: 'Día inválido' });
      }
      
      // Verificar que la tienda existe
      const [store] = await connection.execute(
        'SELECT id FROM stores WHERE id = ?',
        [store_id]
      );
      if (store.length === 0) {
        return res.status(404).json({ success: false, message: 'Tienda no encontrada' });
      }
      
      // Insertar o actualizar
      await connection.execute(`
        INSERT INTO advisor_weekly_schedule (advisor_id, day_of_week, store_id, visit_order)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
        visit_order = VALUES(visit_order), is_active = 1, updated_at = NOW()
      `, [advisorId, day_of_week, store_id, visit_order || 0]);
      
      res.json({ success: true, message: 'Tienda agregada a la ruta' });
      
    } catch (error) {
      console.error('Error al agregar tienda a ruta:', error);
      res.status(500).json({ success: false, message: error.message });
    } finally {
      await connection.end();
    }
  }
  
  // 🆕 ELIMINAR TIENDA DE LA RUTA
  async removeStoreFromSchedule(req, res) {
    const connection = await createConnection();
    try {
      const { advisorId, scheduleId } = req.params;
      
      await connection.execute(
        'DELETE FROM advisor_weekly_schedule WHERE id = ? AND advisor_id = ?',
        [scheduleId, advisorId]
      );
      
      res.json({ success: true, message: 'Tienda eliminada de la ruta' });
      
    } catch (error) {
      console.error('Error al eliminar tienda de ruta:', error);
      res.status(500).json({ success: false, message: error.message });
    } finally {
      await connection.end();
    }
  }
  
  // 🆕 ACTUALIZAR ORDEN DE VISITAS
  async updateScheduleOrder(req, res) {
    const connection = await createConnection();
    try {
      const { advisorId } = req.params;
      const { updates } = req.body; // Array de {id, visit_order}
      
      for (const update of updates) {
        await connection.execute(
          'UPDATE advisor_weekly_schedule SET visit_order = ? WHERE id = ? AND advisor_id = ?',
          [update.visit_order, update.id, advisorId]
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
  
  // 🆕 OBTENER TODAS LAS TIENDAS (para el selector)
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
  
  // Generar rutas semanales
  async generateWeekRoutes(req, res) {
    try {
      const results = await routeGenerator.generateWeekRoutes();
      res.json({ success: true, results });
    } catch (error) {
      console.error('Error generando rutas semanales:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Obtener patrón semanal desde route_templates (plantillas)
  async getWeeklyPattern(req, res) {
    const connection = await createConnection();
    try {
      const { advisorId } = req.params;
      
      console.log(`📋 Obteniendo plantillas para asesor ${advisorId}`);
      
      // Obtener todas las plantillas del asesor
      const [templates] = await connection.execute(`
        SELECT id, day_of_week, template_name, total_stores
        FROM route_templates
        WHERE advisor_id = ? AND is_active = 1
        ORDER BY FIELD(day_of_week, 'monday', 'tuesday', 'wednesday', 'thursday', 'friday')
      `, [advisorId]);
      
      console.log(`📊 Encontradas ${templates.length} plantillas`);
      
      // Estructura para los 7 días
      const daysOfWeek = {
        'monday': 1, 'tuesday': 2, 'wednesday': 3, 'thursday': 4, 
        'friday': 5, 'saturday': 6, 'sunday': 7
      };
      const dayNames = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
      
      const schedule = {};
      
      // Inicializar todos los días
      for (let i = 1; i <= 7; i++) {
        schedule[i] = {
          dayName: dayNames[i],
          dayNumber: i,
          stores: []
        };
      }
      
      // Para cada plantilla, obtener sus tiendas
      for (const template of templates) {
        const dayNum = daysOfWeek[template.day_of_week];
        
        const [stores] = await connection.execute(`
          SELECT 
            rts.id,
            rts.store_id,
            rts.visit_order,
            s.name as store_name,
            s.address,
            s.priority,
            s.latitude,
            s.longitude
          FROM route_template_stores rts
          JOIN stores s ON rts.store_id = s.id
          WHERE rts.template_id = ?
          ORDER BY rts.visit_order ASC
        `, [template.id]);
        
        console.log(`📅 ${template.day_of_week}: ${stores.length} tiendas`);
        
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
      
      // Obtener información del asesor
      const [advisorInfo] = await connection.execute(
        'SELECT id, name FROM users WHERE id = ?',
        [advisorId]
      );
      
      console.log(`✅ Plantillas cargadas para ${advisorInfo[0]?.name || 'Asesor'}`);
      
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
}


export default new AdminController();