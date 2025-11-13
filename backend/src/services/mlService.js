// backend/src/services/mlService.js - VERSIÓN COMPLETA CON ANALYTICS
import { createConnection } from '../config/database.js';

export const mlService = {
  // ========== DATOS PARA ENTRENAMIENTO ==========
  async collectTrainingData(routeId, visitData) {
    const connection = await createConnection();
    try {
      const {
        userId,
        storeId,
        visitDate,
        visitOrder,
        travelTime,
        visitDuration,
        arrivalTime,
        vehicleType,
        storeZone,
        storeCategory,
        productsSold,
        productsDamaged,
        tasksCompleted,
        totalTimeSpent
      } = visitData;

      // Calcular ventana óptima de llegada
      const optimalWindow = this.calculateOptimalWindow(arrivalTime);
      
      // Calcular score de eficiencia
      const efficiencyScore = this.calculateEfficiencyScore(
        visitDuration,
        tasksCompleted,
        productsSold
      );

      await connection.execute(
        `INSERT INTO ml_training_data 
         (route_id, user_id, store_id, visit_date, day_of_week, visit_order,
          travel_time_minutes, visit_duration_minutes, actual_arrival_time,
          optimal_arrival_window, traffic_conditions, weather_conditions,
          vehicle_type, store_zone, store_category, store_priority,
          products_sold_count, products_damaged_count, tasks_completed_count,
          total_time_spent, efficiency_score)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          routeId, userId, storeId, visitDate, new Date(visitDate).getDay(), visitOrder,
          travelTime, visitDuration, arrivalTime, optimalWindow, 'medium', 'sunny',
          vehicleType, storeZone, storeCategory, 'medium', productsSold, productsDamaged,
          tasksCompleted, totalTimeSpent, efficiencyScore
        ]
      );

      console.log('✅ Datos de entrenamiento guardados para ML');
    } catch (error) {
      console.error('Error guardando datos de entrenamiento:', error);
    } finally {
      await connection.end();
    }
  },

  // ========== ANALYTICS EN TIEMPO REAL ==========
  async captureVisitMetrics(routeStoreId, visitData) {
    const connection = await createConnection();
    try {
      console.log('📈 Capturando métricas de visita:', routeStoreId);

      // Obtener información adicional
      const [visitInfo] = await connection.execute(
        `SELECT rs.*, s.name as store_name, s.zone, s.category, 
                u.name as advisor_name, u.vehicle_type
         FROM route_stores rs
         JOIN stores s ON rs.store_id = s.id
         JOIN users u ON rs.route_id IN (SELECT id FROM routes WHERE advisor_id = u.id)
         WHERE rs.id = ?`,
        [routeStoreId]
      );

      if (visitInfo.length === 0) {
        console.warn('⚠️ No se encontró información de la visita:', routeStoreId);
        return;
      }

      const visit = visitInfo[0];
      
      // Calcular métricas
      const duration = visitData.duration || this.calculateVisitDuration(visit);
      const timeOfDay = this.getTimeOfDay(visit.start_time);
      const dayOfWeek = new Date(visit.start_time).toLocaleDateString('es', { weekday: 'long' });

      const metrics = {
        route_store_id: routeStoreId,
        advisor_id: visit.advisor_id || this.extractAdvisorId(visit),
        store_id: visit.store_id,
        date: new Date(visit.start_time).toISOString().split('T')[0],
        total_visit_duration: duration,
        travel_time_to_store: visitData.travelTime || 0,
        tasks_completed: visitData.tasksCompleted || visit.tasks_completed || 0,
        total_tasks: visitData.totalTasks || 10,
        completion_rate: this.calculateCompletionRate(visitData, visit),
        damage_reports_count: visitData.damageReportsCount || visit.products_damaged || 0,
        time_of_day: timeOfDay,
        day_of_week: dayOfWeek,
        store_zone: visit.zone,
        store_category: visit.category,
        vehicle_type: visit.vehicle_type
      };

      // Guardar en store_visit_metrics
      await connection.execute(
        `INSERT INTO store_visit_metrics 
         (route_store_id, advisor_id, store_id, date, total_visit_duration, 
          travel_time_to_store, tasks_completed, total_tasks, completion_rate, 
          damage_reports_count, time_of_day, day_of_week, store_zone, store_category, vehicle_type)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        Object.values(metrics)
      );

      // También guardar para entrenamiento ML
      await this.collectTrainingData(
        visit.route_id,
        {
          userId: metrics.advisor_id,
          storeId: metrics.store_id,
          visitDate: metrics.date,
          visitOrder: visit.visit_order,
          travelTime: metrics.travel_time_to_store,
          visitDuration: metrics.total_visit_duration,
          arrivalTime: visit.start_time,
          vehicleType: metrics.vehicle_type,
          storeZone: metrics.store_zone,
          storeCategory: metrics.store_category,
          productsSold: 0, // Puedes agregar esto después
          productsDamaged: metrics.damage_reports_count,
          tasksCompleted: metrics.tasks_completed,
          totalTimeSpent: metrics.total_visit_duration
        }
      );

      console.log('✅ Métricas de visita guardadas para ML y Analytics');

    } catch (error) {
      console.error('❌ Error capturando métricas:', error);
    } finally {
      await connection.end();
    }
  },

  async captureTaskMetrics(routeStoreId, taskData) {
    const connection = await createConnection();
    try {
      const taskMetrics = {
        route_store_id: routeStoreId,
        task_type: taskData.type || 'unknown',
        task_key: taskData.key || taskData.id,
        start_time: taskData.startTime || null,
        end_time: taskData.endTime || null,
        duration_minutes: taskData.duration || 0,
        photos_taken: taskData.photosCount || 0,
        requires_approval: taskData.requiresApproval || false,
        was_approved: taskData.wasApproved || false
      };

      await connection.execute(
        `INSERT INTO task_performance_metrics 
         (route_store_id, task_type, task_key, start_time, end_time, 
          duration_minutes, photos_taken, requires_approval, was_approved)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        Object.values(taskMetrics)
      );

      console.log('✅ Métricas de tarea guardadas');

    } catch (error) {
      console.error('❌ Error capturando métricas de tarea:', error);
    } finally {
      await connection.end();
    }
  },

  async captureDamageAnalytics(damageReport) {
    const connection = await createConnection();
    try {
      console.log('📦 Capturando analytics de daño:', damageReport.barcode);

      const [productInfo] = await connection.execute(
        `SELECT * FROM products WHERE barcode = ? LIMIT 1`,
        [damageReport.barcode]
      );

      const analytics = {
        barcode: damageReport.barcode,
        product_name: damageReport.product?.name || productInfo[0]?.name || 'Desconocido',
        product_brand: damageReport.product?.brand || productInfo[0]?.brand || 'Desconocido',
        product_category: damageReport.product?.category || productInfo[0]?.category || 'Desconocido',
        damage_type: damageReport.damageType,
        severity: damageReport.severity || 'medium',
        description: damageReport.description || '',
        photos_count: damageReport.photos?.length || 0,
        store_id: damageReport.storeId,
        reported_by: damageReport.reportedBy,
        reported_at: new Date()
      };

      await connection.execute(
        `INSERT IGNORE INTO damage_reports 
         (barcode, product_name, product_brand, product_category, damage_type, 
          description, photos, severity, store_id, reported_by, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          analytics.barcode,
          analytics.product_name,
          analytics.product_brand,
          analytics.product_category,
          analytics.damage_type,
          analytics.description,
          JSON.stringify(analytics.photos_count > 0 ? ['photo_exists'] : []),
          analytics.severity,
          analytics.store_id,
          analytics.reported_by,
          analytics.reported_at
        ]
      );

      console.log('✅ Analytics de daño guardados');

    } catch (error) {
      console.error('❌ Error capturando analytics de daño:', error);
    } finally {
      await connection.end();
    }
  },

  // ========== OPTIMIZACIÓN DE RUTAS ==========
  async optimizeRoute(stores, advisor, constraints = []) {
    try {
      console.log('🧠 Optimizando ruta con ML...');
      
      const baseStores = stores.map(store => ({
        id: store.storeId.id,
        name: store.storeId.name,
        coordinates: store.storeId.coordinates,
        priority: store.storeId.priority,
        category: store.storeId.category,
        zone: store.storeId.zone,
        estimatedTime: 40,
        timeWindows: this.calculateTimeWindows(store.storeId.category, store.storeId.zone)
      }));

      const constrainedStores = this.applyConstraints(baseStores, constraints, advisor.vehicle_type);
      const optimizedOrder = await this.geneticAlgorithm(constrainedStores, advisor);
      
      const originalDistance = this.calculateTotalDistance(baseStores);
      const optimizedDistance = this.calculateTotalDistance(optimizedOrder);
      const timeSaving = this.calculateTimeSaving(originalDistance, optimizedDistance, advisor.vehicle_type);

      return {
        optimizedStores: optimizedOrder,
        metrics: {
          originalDistance: originalDistance.toFixed(2),
          optimizedDistance: optimizedDistance.toFixed(2),
          distanceSaved: (originalDistance - optimizedDistance).toFixed(2),
          timeSaving: timeSaving,
          efficiencyImprovement: ((1 - optimizedDistance / originalDistance) * 100).toFixed(1)
        },
        factors: {
          considered: ['distance', 'time_windows', 'vehicle_type', 'store_priority'],
          constraintsApplied: constraints.length
        }
      };
    } catch (error) {
      console.error('Error en optimización ML:', error);
      return { optimizedStores: stores, metrics: null, factors: null };
    }
  },

  // ========== MÉTODOS AUXILIARES ==========
  calculateVisitDuration(visit) {
    if (!visit.start_time || !visit.end_time) return 0;
    const start = new Date(visit.start_time);
    const end = new Date(visit.end_time);
    return Math.round((end - start) / (1000 * 60));
  },

  getTimeOfDay(dateTime) {
    if (!dateTime) return 'unknown';
    const hour = new Date(dateTime).getHours();
    if (hour < 12) return 'morning';
    if (hour < 18) return 'afternoon';
    return 'evening';
  },

  extractAdvisorId(visit) {
    return visit.advisor_id || (visit.route_id ? this.getAdvisorFromRoute(visit.route_id) : null);
  },

  async getAdvisorFromRoute(routeId) {
    const connection = await createConnection();
    try {
      const [routes] = await connection.execute(
        'SELECT advisor_id FROM routes WHERE id = ?',
        [routeId]
      );
      return routes[0]?.advisor_id || null;
    } finally {
      await connection.end();
    }
  },

  calculateCompletionRate(visitData, visit) {
    const completed = visitData.tasksCompleted || visit.tasks_completed || 0;
    const total = visitData.totalTasks || 10;
    return total > 0 ? (completed / total) * 100 : 0;
  },

  calculateOptimalWindow(arrivalTime) {
    if (!arrivalTime) return 'unknown';
    const hour = new Date(arrivalTime).getHours();
    if (hour < 11) return 'morning';
    if (hour < 14) return 'midday';
    return 'afternoon';
  },

  calculateEfficiencyScore(visitDuration, tasksCompleted, productsSold) {
    const baseScore = 100;
    const timePenalty = Math.max(0, (visitDuration - 40) / 40) * 30;
    const taskBonus = (tasksCompleted / 9) * 20;
    const salesBonus = Math.min(productsSold / 50, 10);
    
    return Math.max(0, baseScore - timePenalty + taskBonus + salesBonus);
  },

  // ========== ALGORITMO GENÉTICO ==========
  async geneticAlgorithm(stores, advisor, generations = 100) {
    let population = this.initializePopulation(stores, 50);
    
    for (let gen = 0; gen < generations; gen++) {
      // Evaluar fitness
      population.forEach(individual => {
        individual.fitness = this.calculateFitness(individual, advisor);
      });
      
      // Ordenar por fitness
      population.sort((a, b) => b.fitness - a.fitness);
      
      // Selección y cruce
      const newPopulation = [];
      for (let i = 0; i < population.length; i++) {
        if (i < 10) {
          // Mantener los mejores
          newPopulation.push(population[i]);
        } else {
          // Cruce entre padres aleatorios
          const parent1 = population[Math.floor(Math.random() * 10)];
          const parent2 = population[Math.floor(Math.random() * 10)];
          const child = this.crossover(parent1, parent2);
          newPopulation.push(child);
        }
      }
      
      population = newPopulation;
    }
    
    return population[0].stores; // Mejor individuo
  },

  initializePopulation(stores, size) {
    const population = [];
    for (let i = 0; i < size; i++) {
      const shuffledStores = [...stores].sort(() => Math.random() - 0.5);
      population.push({ stores: shuffledStores, fitness: 0 });
    }
    return population;
  },

  calculateFitness(individual, advisor) {
    const distance = this.calculateTotalDistance(individual.stores);
    const timeWindowsScore = this.evaluateTimeWindows(individual.stores);
    const priorityScore = this.evaluatePriorityOrder(individual.stores);
    
    return 1 / distance + timeWindowsScore + priorityScore;
  },

  crossover(parent1, parent2) {
    // Implementación simple de cruce
    const crossoverPoint = Math.floor(parent1.stores.length / 2);
    const childStores = [
      ...parent1.stores.slice(0, crossoverPoint),
      ...parent2.stores.slice(crossoverPoint)
    ];
    
    return { stores: childStores, fitness: 0 };
  },

  calculateTotalDistance(stores) {
    if (stores.length < 2) return 0;
    
    let total = 0;
    for (let i = 0; i < stores.length - 1; i++) {
      const store1 = stores[i];
      const store2 = stores[i + 1];
      total += this.haversineDistance(
        store1.coordinates.lat, store1.coordinates.lng,
        store2.coordinates.lat, store2.coordinates.lng
      );
    }
    return total;
  },

  haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radio de la Tierra en km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  },

  evaluateTimeWindows(stores) {
    // Evaluar cumplimiento de ventanas de tiempo
    let score = 0;
    stores.forEach((store, index) => {
      if (store.timeWindows && this.isWithinTimeWindow(store, index)) {
        score += 0.1;
      }
    });
    return score;
  },

  evaluatePriorityOrder(stores) {
    // Dar mayor puntuación a tiendas prioritarias al principio
    let score = 0;
    stores.forEach((store, index) => {
      if (store.priority === 'high' && index < 3) {
        score += 0.2;
      } else if (store.priority === 'medium' && index < 5) {
        score += 0.1;
      }
    });
    return score;
  },

  isWithinTimeWindow(store, visitOrder) {
    // Lógica simplificada para ventanas de tiempo
    const estimatedArrival = visitOrder * 45; // 45 minutos por tienda
    return estimatedArrival >= 480 && estimatedArrival <= 1020; // 8:00 AM - 5:00 PM
  },

  calculateTimeWindows(category, zone) {
    // Ventanas de tiempo basadas en categoría y zona
    const windows = {
      supermarket: { start: 8, end: 12 },
      convenience: { start: 10, end: 16 },
      pharmacy: { start: 9, end: 15 }
    };
    return windows[category] || { start: 8, end: 17 };
  },

  applyConstraints(stores, constraints, vehicleType) {
    let filteredStores = [...stores];
    
    constraints.forEach(constraint => {
      if (constraint.constraint_type === 'pico_placa') {
        filteredStores = this.applyPicoPlaca(filteredStores, constraint.constraint_value, vehicleType);
      } else if (constraint.constraint_type === 'time_window') {
        filteredStores = this.applyTimeWindows(filteredStores, constraint.constraint_value);
      }
    });
    
    return filteredStores;
  },

  applyPicoPlaca(stores, restriction, vehicleType) {
    // Lógica simplificada de pico y placa
    return stores.filter(store => {
      return !restriction.appliesTo.includes(vehicleType);
    });
  },

  calculateTimeSaving(originalDistance, optimizedDistance, vehicleType) {
    const avgSpeed = vehicleType === 'motorcycle' ? 30 : 20; // km/h
    const originalTime = (originalDistance / avgSpeed) * 60; // minutos
    const optimizedTime = (optimizedDistance / avgSpeed) * 60;
    return Math.round(originalTime - optimizedTime);
  },

  // ========== EXPORTACIÓN DE DATOS ==========
  async exportTrainingData(format = 'csv') {
    const connection = await createConnection();
    try {
      const [data] = await connection.execute(
        `SELECT * FROM ml_training_data WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`
      );

      if (format === 'csv') {
        return this.convertToCSV(data);
      } else {
        return data;
      }
    } catch (error) {
      console.error('Error exportando datos:', error);
      return null;
    } finally {
      await connection.end();
    }
  },

  convertToCSV(data) {
    if (!data.length) return '';
    
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(row => 
      Object.values(row).map(value => 
        `"${String(value).replace(/"/g, '""')}"`
      ).join(',')
    );
    
    return [headers, ...rows].join('\n');
  }
};

export default mlService;