// backend/src/services/analyticsService.js
import { mlService } from './mlService.js';

// Capa ligera que usa mlService para analytics
export const analyticsService = {
  
  // 🎯 CAPTURAR MÉTRICAS DE VISITA COMPLETADA
  async captureVisitCompletion(routeStoreId, visitData) {
    return await mlService.captureVisitMetrics(routeStoreId, visitData);
  },

  // 🎯 CAPTURAR MÉTRICAS DE TAREAS
  async captureTaskMetrics(routeStoreId, taskData) {
    return await mlService.captureTaskMetrics(routeStoreId, taskData);
  },

  // 🎯 CAPTURAR ANALYTICS DE DAÑOS
  async captureDamageAnalytics(damageReport) {
    return await mlService.captureDamageAnalytics(damageReport);
  },

  // 🎯 OBTENER DATOS PARA EXPORTACIÓN ML
  async exportTrainingData(format = 'csv') {
    // Método para exportar datos limpios para el modelo ML
    return await mlService.exportTrainingData(format);
  },

  // 🎯 GENERAR REPORTES DE ANALYTICS
  async generateAnalyticsReport(advisorId, startDate, endDate) {
    return await mlService.generateAnalyticsReport(advisorId, startDate, endDate);
  }
};

export default analyticsService;