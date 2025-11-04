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
}

// 🆕 Interfaces para métricas avanzadas
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

export const adminService = {
  // ✅ CORREGIDO: Dashboard overview con mejor logging
  getDashboardOverview: async (): Promise<DashboardOverview> => {
    try {
      console.log('🔄 [adminService] Solicitando datos del dashboard...');
      const response = await api.get('/admin/dashboard/overview');
      console.log('✅ [adminService] Datos recibidos:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ [adminService] Error en getDashboardOverview:', error);
      return handleAuthError(error);
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

  // 🆕 MÉTRICAS AVANZADAS
  getAdvancedMetrics: async (timeRange: 'week' | 'month' | 'quarter' = 'month'): Promise<AdvancedMetrics> => {
    try {
      console.log(`🔄 [adminService] Solicitando métricas avanzadas (${timeRange})...`);
      const response = await api.get(`/admin/metrics/advanced?timeRange=${timeRange}`);
      return response.data;
    } catch (error: any) {
      console.error('❌ [adminService] Error obteniendo métricas avanzadas:', error);
      
      // Datos de ejemplo para desarrollo mientras se implementa el backend
      const mockData: AdvancedMetrics = {
        overall: {
          totalStores: 15,
          completedVisits: 45,
          totalDistance: 125.5,
          averageEfficiency: 78,
          timeSaved: 240
        },
        damageAnalytics: {
          totalDamagedProducts: 12,
          damageByCategory: [
            { category: 'Lácteos', count: 5, value: 50000 },
            { category: 'Granos', count: 4, value: 40000 },
            { category: 'Enlatados', count: 3, value: 30000 }
          ],
          topStoresWithDamage: [
            { storeName: 'Vitamarket Centro', damageCount: 4 },
            { storeName: 'Vitamarket Norte', damageCount: 3 },
            { storeName: 'Vitamarket Sur', damageCount: 2 }
          ],
          monthlyTrend: [
            { month: 'Ene', damageCount: 8 },
            { month: 'Feb', damageCount: 12 },
            { month: 'Mar', damageCount: 10 }
          ]
        },
        salesAnalytics: {
          totalProductsSold: 1125,
          salesByCategory: [
            { category: 'Lácteos', count: 45, revenue: 450000 },
            { category: 'Granos', count: 35, revenue: 350000 },
            { category: 'Enlatados', count: 25, revenue: 250000 }
          ],
          bestPerformingStores: [
            { storeName: 'Vitamarket Centro', salesCount: 300 },
            { storeName: 'Vitamarket Norte', salesCount: 275 },
            { storeName: 'Vitamarket Sur', salesCount: 250 }
          ],
          restockingEfficiency: 85
        },
        advisorPerformance: [
          {
            advisorName: 'Carlos Rodríguez',
            completedVisits: 12,
            averageTimePerStore: 32,
            efficiencyScore: 88,
            damageReports: 2
          },
          {
            advisorName: 'María González',
            completedVisits: 10,
            averageTimePerStore: 35,
            efficiencyScore: 82,
            damageReports: 1
          },
          {
            advisorName: 'Javier López',
            completedVisits: 8,
            averageTimePerStore: 38,
            efficiencyScore: 79,
            damageReports: 3
          }
        ]
      };
      
      console.log('📊 [adminService] Usando datos mock de métricas avanzadas');
      return mockData;
    }
  },

  // 🆕 OPTIMIZACIÓN DE RUTAS
  generateOptimizedRoute: async (data: OptimizedRouteRequest): Promise<OptimizedRouteResponse> => {
    try {
      console.log('🔄 [adminService] Generando ruta optimizada...');
      const response = await api.post('/admin/routes/optimize', data);
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
      const response = await api.get('/admin/ml/training-data');
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
      const url = storeId ? `/admin/reports/damage?storeId=${storeId}` : '/admin/reports/damage';
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
      const response = await api.get(`/admin/analytics/sales?timeRange=${timeRange}`);
      return response.data;
    } catch (error: any) {
      console.error('❌ [adminService] Error obteniendo analytics de ventas:', error);
      return [];
    }
  }
};