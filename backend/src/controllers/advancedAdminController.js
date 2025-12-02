// backend/src/controllers/advancedAdminController.js - VERSIÓN FUNCIONAL
import { createConnection } from '../config/database.js';

// ✅ FUNCIÓN CALCULATE DATE RANGE
const calculateDateRange = (timeRange) => {
  const now = new Date();
  let start = new Date();
  let end = new Date();

  switch (timeRange) {
    case 'week':
      start.setDate(now.getDate() - 7);
      break;
    case 'month':
      start.setMonth(now.getMonth() - 1);
      break;
    case 'quarter':
      start.setMonth(now.getMonth() - 3);
      break;
    default:
      start.setMonth(now.getMonth() - 1);
  }

  return { 
    start: start.toISOString().split('T')[0] + ' 00:00:00', 
    end: end.toISOString().split('T')[0] + ' 23:59:59' 
  };
};

// ✅ FUNCIÓN PARA MAPEAR PRODUCTOS A CATEGORÍAS
const mapProductToCategory = (productName) => {
  if (!productName) return 'Otros';
  
  const name = productName.toLowerCase();
  
  if (name.includes('vitagranola')) return 'Vitagranola';
  if (name.includes('nutrinola')) return 'Nutrinola';
  if (name.includes('vitayum')) return 'Vitayum';
  if (name.includes('vitao') || name.includes('avena')) return 'VITAO Avena';
  if (name.includes('sunshine')) return 'SUNSHINE';
  if ((name.includes('hojuela') && name.includes('maíz')) || (name.includes('hojuela') && name.includes('maiz'))) return 'Cereales de Maíz';
  if (name.includes('arroz')) return 'Arroz';
  if (name.includes('aritos') || name.includes('aros')) return 'Cereales Frutados';
  if (name.includes('granola')) return 'Granola';
  if (name.includes('cereal')) return 'Cereal';
  
  return 'Otros';
};

// ✅ Función auxiliar para generar tendencia mensual (MOVIDA AFUERA)
const generateMonthlyTrend = (damageReports) => {
  if (!damageReports || damageReports.length === 0) {
    return [
      { month: 'Ene', damageCount: 0 },
      { month: 'Feb', damageCount: 0 },
      { month: 'Mar', damageCount: 0 },
      { month: 'Abr', damageCount: 0 }
    ];
  }

  const monthlyCount = {};
  const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  
  damageReports.forEach(report => {
    if (report.created_at) {
      const date = new Date(report.created_at);
      const monthIndex = date.getMonth();
      const monthKey = monthNames[monthIndex];
      
      if (!monthlyCount[monthKey]) {
        monthlyCount[monthKey] = 0;
      }
      monthlyCount[monthKey] += 1;
    }
  });

  // Tomar últimos 4 meses con datos
  const trend = [];
  const currentMonth = new Date().getMonth();
  
  for (let i = 3; i >= 0; i--) {
    const monthIndex = (currentMonth - i + 12) % 12;
    const monthName = monthNames[monthIndex];
    trend.push({
      month: monthName,
      damageCount: monthlyCount[monthName] || 0
    });
  }

  return trend;
};

export const advancedAdminController = {
  async getAdvancedMetrics(req, res) {
    const connection = await createConnection();
    try {
      const { timeRange = 'month' } = req.query;
      const dateRange = calculateDateRange(timeRange);
      
      console.log('📊 Obteniendo métricas avanzadas REALES para rango:', dateRange);

      // ✅ 1. MÉTRICAS GENERALES
      const [totalStoresResult] = await connection.execute(
        `SELECT COUNT(DISTINCT id) as total FROM stores`
      );
      
      const [completedVisitsResult] = await connection.execute(
        `SELECT COUNT(DISTINCT rs.id) as completed 
         FROM route_stores rs
         WHERE rs.status = 'completed' 
           AND rs.end_time BETWEEN ? AND ?`,
        [dateRange.start, dateRange.end]
      );
      
      // ✅ Distancia total
      const [distanceResult] = await connection.execute(
        `SELECT COALESCE(SUM(total_distance), 0) as total_distance
         FROM daily_routes
         WHERE route_date BETWEEN ? AND ?`,
        [dateRange.start.split(' ')[0], dateRange.end.split(' ')[0]]
      );
      
      // ✅ Tiempo ahorrado
      const [timeSavedResult] = await connection.execute(
        `SELECT COALESCE(SUM(estimated_time_saving_minutes), 0) as time_saved
         FROM optimized_routes
         WHERE route_date BETWEEN ? AND ?`,
        [dateRange.start.split(' ')[0], dateRange.end.split(' ')[0]]
      );

      // ✅ 2. ANÁLISIS DE DAÑOS - VERSIÓN SIMPLIFICADA (SIN JOIN)
      const [damageReportsResult] = await connection.execute(
        `SELECT 
          id,
          product_name,
          product_category,
          store_id,
          severity,
          created_at
         FROM damage_reports
         WHERE created_at BETWEEN ? AND ?
         ORDER BY created_at DESC`,
        [dateRange.start, dateRange.end]
      );

      // Procesar daños por categoría
      const damageByCategory = {};
      const storeDamageCount = {};
      
      damageReportsResult.forEach(report => {
        // Categoría del producto
        const category = report.product_category || mapProductToCategory(report.product_name);
        if (!damageByCategory[category]) {
          damageByCategory[category] = { 
            category: category, 
            count: 0, 
            value: 0,
            severity: { low: 0, medium: 0, high: 0 }
          };
        }
        damageByCategory[category].count += 1;
        damageByCategory[category].value += 10000; // Valor estimado
        damageByCategory[category].severity[report.severity || 'low'] += 1;
        
        // Conteo por tienda
        if (report.store_id) {
          const storeKey = report.store_id;
          if (!storeDamageCount[storeKey]) {
            storeDamageCount[storeKey] = {
              storeId: report.store_id,
              storeName: `Tienda ${report.store_id}`, // Solo ID por ahora
              damageCount: 0,
              severity: { low: 0, medium: 0, high: 0 }
            };
          }
          storeDamageCount[storeKey].damageCount += 1;
          storeDamageCount[storeKey].severity[report.severity || 'low'] += 1;
        }
      });

      // Ordenar tiendas por daños
      const topStoresWithDamage = Object.values(storeDamageCount)
        .sort((a, b) => b.damageCount - a.damageCount)
        .slice(0, 5);

      // ✅ 3. PERFORMANCE DE ASESORES
      const [advisorPerformanceResult] = await connection.execute(
        `SELECT 
          u.id,
          u.name as advisor_name,
          u.email,
          u.vehicle_type,
          COUNT(DISTINCT rs.id) as completed_visits,
          COALESCE(AVG(TIMESTAMPDIFF(MINUTE, rs.start_time, rs.end_time)), 35) as avg_time_per_store,
          COUNT(DISTINCT dr.id) as damage_reports_count
         FROM users u
         LEFT JOIN daily_routes drt ON u.id = drt.user_id
         LEFT JOIN route_stores rs ON drt.id = rs.route_id 
           AND rs.status = 'completed'
           AND rs.end_time BETWEEN ? AND ?
         LEFT JOIN damage_reports dr ON u.id = dr.reported_by 
           AND dr.created_at BETWEEN ? AND ?
         WHERE u.role = 'advisor'
           AND u.is_active = 1
         GROUP BY u.id, u.name, u.email, u.vehicle_type
         ORDER BY completed_visits DESC`,
        [dateRange.start, dateRange.end, dateRange.start, dateRange.end]
      );

      // Calcular eficiencia para cada asesor
      const advisorPerformance = advisorPerformanceResult.map(advisor => {
        // Fórmula de eficiencia mejorada
        const baseEfficiency = 75;
        const visitBonus = Math.min(20, advisor.completed_visits * 2);
        const timePenalty = advisor.avg_time_per_store > 60 ? 10 : 0;
        const damagePenalty = Math.min(15, advisor.damage_reports_count * 3);
        const efficiencyScore = Math.min(100, Math.max(60, baseEfficiency + visitBonus - timePenalty - damagePenalty));
        
        return {
          advisorName: advisor.advisor_name || 'Asesor sin nombre',
          completedVisits: advisor.completed_visits || 0,
          averageTimePerStore: Math.round(advisor.avg_time_per_store) || 35,
          efficiencyScore: Math.round(efficiencyScore),
          damageReports: advisor.damage_reports_count || 0,
          vehicleType: advisor.vehicle_type || 'car'
        };
      });

      // Calcular promedio de eficiencia
      const averageEfficiency = advisorPerformance.length > 0 
        ? Math.round(advisorPerformance.reduce((sum, a) => sum + a.efficiencyScore, 0) / advisorPerformance.length)
        : 75;

      // ✅ 4. DATOS DE VENTAS ESTIMADOS
      const [salesData] = await connection.execute(
        `SELECT 
          COUNT(DISTINCT rs.id) * 25 as estimated_sales,
          COUNT(DISTINCT rs.store_id) as stores_with_sales
         FROM route_stores rs
         WHERE rs.status = 'completed' 
           AND rs.end_time BETWEEN ? AND ?`,
        [dateRange.start, dateRange.end]
      );

      // ✅ 5. CONSTRUIR RESPUESTA FINAL
      const metrics = {
        overall: {
          totalStores: totalStoresResult[0]?.total || 0,
          completedVisits: completedVisitsResult[0]?.completed || 0,
          totalDistance: Math.round(distanceResult[0]?.total_distance || 0),
          averageEfficiency: averageEfficiency,
          timeSaved: timeSavedResult[0]?.time_saved || 0
        },
        damageAnalytics: {
          totalDamagedProducts: damageReportsResult.length || 0,
          damageByCategory: Object.values(damageByCategory).map(item => ({
            category: item.category,
            count: item.count
          })),
          topStoresWithDamage: topStoresWithDamage.map(store => ({
            storeName: store.storeName,
            damageCount: store.damageCount
          })),
          monthlyTrend: generateMonthlyTrend(damageReportsResult) // ✅ CORREGIDO: usar función directamente
        },
        salesAnalytics: {
          totalProductsSold: salesData[0]?.estimated_sales || 0,
          salesByCategory: [
            { category: 'Cereales', count: Math.round((salesData[0]?.estimated_sales || 0) * 0.6) },
            { category: 'Galletas', count: Math.round((salesData[0]?.estimated_sales || 0) * 0.3) },
            { category: 'Snacks', count: Math.round((salesData[0]?.estimated_sales || 0) * 0.1) }
          ],
          bestPerformingStores: topStoresWithDamage.slice(0, 3).map(store => ({
            storeName: store.storeName,
            performanceScore: 100 - (store.damageCount * 10)
          })),
          restockingEfficiency: 85
        },
        advisorPerformance: advisorPerformance
      };

      // Log para debug
      console.log('✅ Métricas REALES generadas:');
      console.log('- Total tiendas:', metrics.overall.totalStores);
      console.log('- Visitas completadas:', metrics.overall.completedVisits);
      console.log('- Distancia total:', metrics.overall.totalDistance, 'km');
      console.log('- Tiempo ahorrado:', metrics.overall.timeSaved, 'min');
      console.log('- Reportes de daño:', metrics.damageAnalytics.totalDamagedProducts);
      console.log('- Asesores activos:', metrics.advisorPerformance.length);
      
      // Debug detallado
      console.log('🔍 Detalles:');
      console.log('  - Tabla stores tiene:', totalStoresResult[0]?.total, 'registros');
      console.log('  - Tabla route_stores tiene', completedVisitsResult[0]?.completed, 'visitas completadas');
      console.log('  - Tabla damage_reports tiene', damageReportsResult.length, 'reportes');
      console.log('  - Tabla users tiene', advisorPerformanceResult.length, 'asesores activos');
      console.log('  - Tabla optimized_routes tiempo ahorrado:', timeSavedResult[0]?.time_saved, 'min');
      console.log('  - Categorías de daño encontradas:', Object.keys(damageByCategory).length);
      
      res.json(metrics);
    } catch (error) {
      console.error('❌ Error en getAdvancedMetrics:', error);
      console.error('❌ Detalle completo del error:', {
        message: error.message,
        sqlState: error.sqlState,
        sqlMessage: error.sqlMessage,
        sql: error.sql,
        stack: error.stack
      });
      
      // Enviar error específico para debug
      res.status(500).json({ 
        success: false,
        message: 'Error obteniendo métricas de la base de datos',
        error: error.message,
        sqlState: error.sqlState,
        sqlMessage: error.sqlMessage,
        suggestion: 'Verifica que las tablas route_stores, damage_reports, users y stores existan'
      });
    } finally {
      await connection.end();
    }
  },

  // ✅ Otras funciones del controlador...
  async generateOptimizedRoute(req, res) {
    const connection = await createConnection();
    try {
      const { advisorId, date } = req.body;

      console.log('🧠 Generando ruta optimizada para asesor:', advisorId);

      // Obtener información del asesor
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

      // Obtener tiendas asignadas para esa fecha
      const [stores] = await connection.execute(
        `SELECT s.* 
         FROM stores s
         WHERE s.assigned_advisor_id = ?
         ORDER BY s.priority DESC, s.name ASC`,
        [advisorId]
      );

      // Simular optimización (en producción usarías un algoritmo real)
      const optimizedStores = stores.map((store, index) => ({
        id: store.id,
        storeId: {
          id: store.id,
          name: store.name,
          address: store.address,
          coordinates: {
            lat: parseFloat(store.latitude) || 6.2476, // Coordenadas de Medellín
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

      // Calcular métricas simuladas
      const totalStores = optimizedStores.length;
      const totalDistance = totalStores * 5; // 5km promedio entre tiendas
      const totalTime = optimizedStores.reduce((sum, store) => sum + (store.estimated_duration || 40), 0);
      const timeSaved = Math.round(totalTime * 0.15); // 15% de ahorro estimado

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
  },

  async getDamageReports(req, res) {
    const connection = await createConnection();
    try {
      const { storeId, severity, startDate, endDate } = req.query;
      
      // Versión simplificada sin JOIN
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
};