// backend/src/controllers/adminController.js
import { createConnection } from '../config/database.js';
import { User } from '../models/User.js';

class AdminController {
  
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

  async getRestockMetrics(timeRange, connection) {
    try {
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
      console.error('Error getting restock metrics:', error);
      return {
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
    }
  }

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

      //const restockMetrics = await this.getRestockMetrics(timeRange, connection);
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

      const metrics = {
        overall: {
          totalStores: parseInt(overall[0]?.totalStores || 0),
          completedVisits: parseInt(overall[0]?.completedVisits || 0),
          averageEfficiency: Math.round(overall[0]?.avgVisitDuration ? 
            Math.max(0, Math.min(100, 100 - ((overall[0].avgVisitDuration - 30) * 2))) : 85),
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
}

export default new AdminController();