// backend/src/services/mlService.js
import { createConnection } from '../config/database.js';

export const mlService = {
  // Recolectar datos para entrenamiento
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

  // Optimizar ruta usando algoritmo genético simple
  async optimizeRoute(stores, advisor, constraints = []) {
    try {
      console.log('🧠 Optimizando ruta con ML...');
      
      // Datos base para la optimización
      const baseStores = stores.map(store => ({
        id: store.storeId.id,
        name: store.storeId.name,
        coordinates: store.storeId.coordinates,
        priority: store.storeId.priority,
        category: store.storeId.category,
        zone: store.storeId.zone,
        estimatedTime: 40, // minutos por defecto
        timeWindows: this.calculateTimeWindows(store.storeId.category, store.storeId.zone)
      }));

      // Aplicar restricciones
      const constrainedStores = this.applyConstraints(baseStores, constraints, advisor.vehicle_type);
      
      // Algoritmo de optimización (versión simple - luego se mejora)
      const optimizedOrder = await this.geneticAlgorithm(constrainedStores, advisor);
      
      // Calcular métricas de mejora
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

  // Algoritmo genético simple para optimización
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

  calculateFitness(individual, advisor) {
    const distance = this.calculateTotalDistance(individual.stores);
    const timeWindowsScore = this.evaluateTimeWindows(individual.stores);
    const priorityScore = this.evaluatePriorityOrder(individual.stores);
    
    return 1 / distance + timeWindowsScore + priorityScore;
  },

  calculateTotalDistance(stores) {
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

  calculateOptimalWindow(arrivalTime) {
    const hour = parseInt(arrivalTime.split(':')[0]);
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

  // ... más métodos de optimización
};