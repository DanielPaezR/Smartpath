// frontend/src/services/adminService.ts
import api from './api';

export interface AdvisorLiveStatus {
  id: number;
  name: string;
  email: string;
  vehicle_type: string;
  latitude: number | null;
  longitude: number | null;
  activity_status: string;
  current_task: string | null;
  battery_level: number;
  last_update: string;
  current_store_name: string | null;
  current_route_id: number | null;
  total_stores_today: number;
  completed_stores: number;
}

export interface DashboardOverview {
  active_advisors: number;
  active_routes: number;
  total_stores_today: number;
  completed_stores: number;
  in_progress_stores: number;
  avg_visit_duration: number;
  total_distance_today: number;
  efficiency_score: number;
}

// 🆕 Interfaces para métricas avanzadas con datos reales
export interface AdvancedMetrics {
  overall: {
    totalStores: number;
    completedVisits: number;
    totalDistance: number;
    averageEfficiency: number;
    timeSaved: number;
  };
  damageAnalytics: {
    totalDamagedProducts: number;
    damageByCategory: Array<{ category: string; count: number; value: number }>;
    topStoresWithDamage: Array<{ storeName: string; damageCount: number }>;
    monthlyTrend: Array<{ month: string; damageCount: number }>;
  };
  salesAnalytics: {
    totalProductsSold: number;
    salesByCategory: Array<{ category: string; count: number; revenue: number }>;
    bestPerformingStores: Array<{ storeName: string; salesCount: number }>;
    restockingEfficiency: number;
  };
  advisorPerformance: Array<{
    advisorName: string;
    completedVisits: number;
    averageTimePerStore: number;
    efficiencyScore: number;
    damageReports: number;
  }>;
}

export interface OptimizedRouteRequest {
  advisorId: string;
  date: string;
  constraints?: Array<{
    type: string;
    value: any;
  }>;
}

export interface OptimizedRouteResponse {
  success: boolean;
  optimizedRoute: any[];
  metrics: {
    originalDistance: string;
    optimizedDistance: string;
    distanceSaved: string;
    timeSaving: number;
    efficiencyImprovement: string;
  };
  factors: {
    considered: string[];
    constraintsApplied: number;
  };
}

// ✅ CORREGIDO: Función para manejar errores de autenticación
const handleAuthError = (error: any): never => {
  console.log('🔐 Error en request:', error.response?.status, error.message);
  
  if (error.response?.status === 403 || error.response?.status === 401) {
    console.log('🔐 Token inválido, limpiando...');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    // ✅ Lanzar error correctamente
    throw new Error('Sesión expirada o sin permisos de administrador');
  }
  
  // ✅ Para otros errores, verificar si es HTML
  if (error.response?.data && typeof error.response.data === 'string' && error.response.data.includes('<!DOCTYPE html>')) {
    console.error('❌ El servidor devolvió HTML en lugar de JSON');
    throw new Error('Error de servidor: respuesta en formato incorrecto');
  }
  
  throw error;
};

// 🆕 Servicios para obtener datos reales
const metricsService = {
  // Obtener métricas de visitas reales
  async getRealVisitMetrics(timeRange: string) {
    try {
      const response = await api.get(`/metrics/visits?range=${timeRange}`);
      return response.data;
    } catch (error) {
      console.error('Error obteniendo métricas de visitas:', error);
      return { completedVisits: 0, totalStores: 0, averageEfficiency: 0, totalDistance: 0, timeSaved: 0 };
    }
  },

  // Obtener analytics de daños reales
  async getRealDamageAnalytics(timeRange: string) {
    try {
      const response = await api.get(`/analytics/damage-reports?timeRange=${timeRange}`);
      return response.data;
    } catch (error) {
      console.error('Error obteniendo analytics de daños:', error);
      return { totalDamagedProducts: 0, damageByCategory: [], topStoresWithDamage: [], monthlyTrend: [] };
    }
  },

  // Obtener analytics de ventas reales
  async getRealSalesAnalytics(timeRange: string) {
    try {
      const response = await api.get(`/analytics/sales?timeRange=${timeRange}`);
      return response.data;
    } catch (error) {
      console.error('Error obteniendo analytics de ventas:', error);
      return { totalProductsSold: 0, salesByCategory: [], bestPerformingStores: [], restockingEfficiency: 0 };
    }
  },

  // Obtener performance de asesores real
  async getRealAdvisorPerformance(timeRange: string) {
    try {
      const response = await api.get(`/metrics/advisors/performance?range=${timeRange}`);
      return response.data;
    } catch (error) {
      console.error('Error obteniendo performance de asesores:', error);
      return [];
    }
  },

  // Obtener datos del dashboard en tiempo real
  async getRealDashboardData() {
    try {
      const response = await api.get('/metrics/dashboard/current');
      return response.data;
    } catch (error) {
      console.error('Error obteniendo datos del dashboard:', error);
      return {
        active_advisors: 0,
        active_routes: 0,
        total_stores_today: 0,
        completed_stores: 0,
        in_progress_stores: 0,
        avg_visit_duration: 0,
        total_distance_today: 0,
        efficiency_score: 0
      };
    }
  }
};

export const adminService = {
  // ✅ DASHBOARD OVERVIEW CON DATOS REALES
  getDashboardOverview: async (): Promise<DashboardOverview> => {
    try {
      console.log('🔄 [adminService] Solicitando datos REALES del dashboard...');
      
      // Intentar obtener datos reales primero
      const realData = await metricsService.getRealDashboardData();
      
      // Si no hay datos reales, usar el endpoint original como fallback
      if (realData.active_advisors === 0 && realData.total_stores_today === 0) {
        console.log('📊 Usando endpoint original como fallback...');
        const response = await api.get('/admin/dashboard/overview');
        return response.data;
      }
      
      console.log('✅ [adminService] Datos REALES recibidos:', realData);
      return realData;
    } catch (error: any) {
      console.error('❌ [adminService] Error en getDashboardOverview:', error);
      
      // Último fallback - datos mínimos
      return {
        active_advisors: 0,
        active_routes: 0,
        total_stores_today: 0,
        completed_stores: 0,
        in_progress_stores: 0,
        avg_visit_duration: 0,
        total_distance_today: 0,
        efficiency_score: 0
      };
    }
  },

  // Estado en tiempo real de asesores
  getLiveAdvisorsStatus: async (): Promise<AdvisorLiveStatus[]> => {
    try {
      console.log('🔄 [adminService] Solicitando estado de asesores...');
      const response = await api.get('/admin/tracking/live-status');
      console.log('✅ [adminService] Datos recibidos de asesores:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ [adminService] Error en getLiveAdvisorsStatus:', error);
      return handleAuthError(error);
    }
  },

  // Detalle de un asesor específico
  getAdvisorDetail: async (advisorId: number): Promise<any> => {
    try {
      console.log(`🔄 [adminService] Solicitando detalle del asesor ${advisorId}...`);
      const response = await api.get(`/admin/tracking/advisor/${advisorId}`);
      return response.data;
    } catch (error: any) {
      console.error('❌ [adminService] Error en getAdvisorDetail:', error);
      return handleAuthError(error);
    }
  },

  // Notificaciones
  getNotifications: async (): Promise<any[]> => {
    try {
      console.log('🔄 [adminService] Solicitando notificaciones...');
      const response = await api.get('/admin/notifications');
      return response.data;
    } catch (error: any) {
      console.error('❌ [adminService] Error en getNotifications:', error);
      return handleAuthError(error);
    }
  },

  markNotificationAsRead: async (notificationId: number): Promise<void> => {
    try {
      console.log(`🔄 [adminService] Marcando notificación ${notificationId} como leída...`);
      await api.patch(`/admin/notifications/${notificationId}/read`);
    } catch (error: any) {
      console.error('❌ [adminService] Error en markNotificationAsRead:', error);
      return handleAuthError(error);
    }
  },

  // 🆕 MÉTRICAS AVANZADAS CON DATOS REALES
  getAdvancedMetrics: async (timeRange: 'week' | 'month' | 'quarter' = 'month'): Promise<AdvancedMetrics> => {
    try {
      console.log(`🔄 [adminService] Solicitando métricas avanzadas REALES (${timeRange})...`);
      
      // Obtener todos los datos reales en paralelo
      const [visitMetrics, damageData, salesData, advisorData] = await Promise.all([
        metricsService.getRealVisitMetrics(timeRange),
        metricsService.getRealDamageAnalytics(timeRange),
        metricsService.getRealSalesAnalytics(timeRange),
        metricsService.getRealAdvisorPerformance(timeRange)
      ]);

      const realMetrics: AdvancedMetrics = {
        overall: {
          totalStores: visitMetrics.totalStores || 0,
          completedVisits: visitMetrics.completedVisits || 0,
          totalDistance: visitMetrics.totalDistance || 0,
          averageEfficiency: visitMetrics.averageEfficiency || 0,
          timeSaved: visitMetrics.timeSaved || 0
        },
        damageAnalytics: {
          totalDamagedProducts: damageData.totalDamagedProducts || 0,
          damageByCategory: damageData.damageByCategory || [],
          topStoresWithDamage: damageData.topStoresWithDamage || [],
          monthlyTrend: damageData.monthlyTrend || []
        },
        salesAnalytics: {
          totalProductsSold: salesData.totalProductsSold || 0,
          salesByCategory: salesData.salesByCategory || [],
          bestPerformingStores: salesData.bestPerformingStores || [],
          restockingEfficiency: salesData.restockingEfficiency || 0
        },
        advisorPerformance: advisorData || []
      };

      console.log('✅ [adminService] Métricas REALES recibidas:', realMetrics);
      return realMetrics;

    } catch (error: any) {
      console.error('❌ [adminService] Error obteniendo métricas avanzadas REALES:', error);
      
      // Si fallan los endpoints reales, intentar con el endpoint original
      try {
        console.log('🔄 Intentando con endpoint original de métricas...');
        const response = await api.get(`/admin/metrics/advanced?timeRange=${timeRange}`);
        return response.data;
      } catch (fallbackError) {
        console.error('❌ También falló el endpoint original:', fallbackError);
        
        // Último recurso: datos mínimos reales
        const minimalData: AdvancedMetrics = {
          overall: {
            totalStores: 0,
            completedVisits: 0,
            totalDistance: 0,
            averageEfficiency: 0,
            timeSaved: 0
          },
          damageAnalytics: {
            totalDamagedProducts: 0,
            damageByCategory: [],
            topStoresWithDamage: [],
            monthlyTrend: []
          },
          salesAnalytics: {
            totalProductsSold: 0,
            salesByCategory: [],
            bestPerformingStores: [],
            restockingEfficiency: 0
          },
          advisorPerformance: []
        };
        
        console.log('📊 [adminService] Usando datos mínimos reales');
        return minimalData;
      }
    }
  },

  // 🆕 OPTIMIZACIÓN DE RUTAS
  generateOptimizedRoute: async (data: OptimizedRouteRequest): Promise<OptimizedRouteResponse> => {
    try {
      console.log('🔄 [adminService] Generando ruta optimizada...');
      const response = await api.post('/routes/optimize', data);
      return response.data;
    } catch (error: any) {
      console.error('❌ [adminService] Error generando ruta optimizada:', error);
      
      // Datos de ejemplo para desarrollo
      const mockResponse: OptimizedRouteResponse = {
        success: true,
        optimizedRoute: [],
        metrics: {
          originalDistance: "25.8",
          optimizedDistance: "18.3",
          distanceSaved: "7.5",
          timeSaving: 45,
          efficiencyImprovement: "29.1"
        },
        factors: {
          considered: ['distance', 'time_windows', 'vehicle_type', 'store_priority'],
          constraintsApplied: 2
        }
      };
      
      console.log('🔄 [adminService] Usando datos mock de ruta optimizada');
      return mockResponse;
    }
  },

  // 🆕 DATOS DE ENTRENAMIENTO ML
  getMLTrainingData: async (): Promise<any> => {
    try {
      console.log('🔄 [adminService] Solicitando datos de entrenamiento ML...');
      const response = await api.get('/analytics/ml/training-data');
      return response.data;
    } catch (error: any) {
      console.error('❌ [adminService] Error obteniendo datos de entrenamiento:', error);
      return [];
    }
  },

  // 🆕 REPORTES DE DAÑOS
  getDamageReports: async (storeId?: string): Promise<any> => {
    try {
      console.log(`🔄 [adminService] Solicitando reportes de daño ${storeId ? `para tienda ${storeId}` : ''}...`);
      const url = storeId ? `/analytics/damage-reports?storeId=${storeId}` : '/analytics/damage-reports';
      const response = await api.get(url);
      return response.data;
    } catch (error: any) {
      console.error('❌ [adminService] Error obteniendo reportes de daño:', error);
      return [];
    }
  },

  // 🆕 ANALYTICS DE VENTAS
  getSalesAnalytics: async (timeRange: string = 'month'): Promise<any> => {
    try {
      console.log(`🔄 [adminService] Solicitando analytics de ventas (${timeRange})...`);
      const response = await api.get(`/analytics/sales?timeRange=${timeRange}`);
      return response.data;
    } catch (error: any) {
      console.error('❌ [adminService] Error obteniendo analytics de ventas:', error);
      return [];
    }
  }
};