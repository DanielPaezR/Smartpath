// frontend/src/services/adminService.ts - SIN DATOS MOCK
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
  total_distance_today?: number;
  efficiency_score?: number;
}

export interface RestockMetrics {
  totalItems: number;
  totalValue: number;
  uniqueProducts: number;
  averageItemsPerVisit: number;
  topRestockedProducts: {
    productName: string;
    productBarcode: string;
    quantity: number;
    totalValue: number;
  }[];
  topRestockedCategories: {
    category: string;
    quantity: number;
    percentage: number;
  }[];
  restockByAdvisor: {
    advisorId: number;
    advisorName: string;
    totalItems: number;
    totalValue: number;
    averagePerVisit: number;
  }[];
  restockByStore: {
    storeId: number;
    storeName: string;
    totalItems: number;
    totalValue: number;
    visits: number;
  }[];
  dailyRestockTrend: {
    date: string;
    items: number;
    value: number;
  }[];
}

export interface AdvancedMetrics {
  overall: {
    totalStores: number;
    completedVisits: number;
    averageEfficiency: number;
    totalDistance: number;
  };
  damageAnalytics: {
    totalDamagedProducts: number;
    damageByCategory: {
      category: string;
      count: number;
    }[];
    topStoresWithDamage: {
      storeName: string;
      damageCount: number;
    }[];
  };
  advisorPerformance: {
    advisorName: string;
    completedVisits: number;
    averageTimePerStore: number;
    efficiencyScore: number;
    damageReports: number;
  }[];
  restockMetrics: RestockMetrics;
}

export const adminService = {
  // 🎯 DASHBOARD OVERVIEW - SOLO ENDPOINTS REALES
  async getDashboardOverview(): Promise<DashboardOverview> {
    try {
      console.log('🔄 [adminService] Solicitando datos del dashboard...');
      
      const response = await api.get('/admin/dashboard/overview');
      console.log('✅ [adminService] Datos recibidos:', response.data);
      
      // Asegurar estructura correcta
      const data = response.data;
      return {
        active_advisors: data.active_advisors || 0,
        active_routes: data.active_routes || 0,
        total_stores_today: data.total_stores_today || 0,
        completed_stores: data.completed_stores || 0,
        in_progress_stores: data.in_progress_stores || 0,
        avg_visit_duration: data.avg_visit_duration || 0,
        total_distance_today: data.total_distance_today || 0,
        efficiency_score: data.efficiency_score || 0
      };
      
    } catch (error: any) {
      console.error('❌ [adminService] Error en getDashboardOverview:', error);
      
      // 🚫 NO DATOS MOCK - Lanzar error para manejar en el componente
      if (error.response?.status === 404) {
        throw new Error('Endpoint /admin/dashboard/overview no encontrado. Verifica el backend.');
      }
      throw error;
    }
  },

  // 🎯 ESTADO EN TIEMPO REAL DE ASESORES
  async getLiveAdvisorsStatus(): Promise<AdvisorLiveStatus[]> {
    try {
      console.log('🔄 [adminService] Solicitando estado de asesores...');
      
      const response = await api.get('/admin/tracking/live-status');
      console.log('✅ [adminService] Datos recibidos:', response.data);
      
      return response.data;
      
    } catch (error: any) {
      console.error('❌ [adminService] Error en getLiveAdvisorsStatus:', error);
      
      // 🚫 NO DATOS MOCK - Lanzar error
      if (error.response?.status === 404) {
        throw new Error('Endpoint /admin/tracking/live-status no encontrado. Verifica el backend.');
      }
      throw error;
    }
  },

  // 🎯 MÉTRICAS AVANZADAS
  async getAdvancedMetrics(timeRange: 'week' | 'month' | 'quarter' = 'month'): Promise<AdvancedMetrics> {
    try {
      console.log(`🔄 [adminService] Solicitando métricas avanzadas (${timeRange})...`);
      
      const response = await api.get(`/admin/metrics/advanced?timeRange=${timeRange}`);
      console.log('✅ [adminService] Métricas recibidas:', response.data);
      
      return response.data;
      
    } catch (error: any) {
      console.error('❌ [adminService] Error en getAdvancedMetrics:', error);
      
      // 🚫 NO DATOS MOCK - Lanzar error
      if (error.response?.status === 404) {
        throw new Error('Endpoint /admin/metrics/advanced no encontrado. Verifica el backend.');
      }
      throw error;
    }
  },

  // OTRAS FUNCIONES
  async getAdvisorDetail(advisorId: number): Promise<any> {
    try {
      const response = await api.get(`/admin/tracking/advisor/${advisorId}`);
      return response.data;
    } catch (error: any) {
      console.error('Error obteniendo detalle del asesor:', error);
      throw error;
    }
  },

  async getNotifications(): Promise<any[]> {
    try {
      const response = await api.get('/admin/notifications');
      return response.data;
    } catch (error: any) {
      console.error('Error obteniendo notificaciones:', error);
      throw error;
    }
  },

  async markNotificationAsRead(notificationId: number): Promise<void> {
    try {
      await api.patch(`/admin/notifications/${notificationId}/read`);
    } catch (error: any) {
      console.error('Error marcando notificación como leída:', error);
      throw error;
    }
  },

  // 🎯 FUNCIÓN PARA VERIFICAR ENDPOINTS DISPONIBLES
  async checkAvailableEndpoints(): Promise<Record<string, boolean>> {
    const endpoints = [
      '/admin/dashboard/overview',
      '/admin/tracking/live-status',
      '/admin/metrics/advanced',
      '/admin/notifications'
    ];
    
    const results: Record<string, boolean> = {};
    
    for (const endpoint of endpoints) {
      try {
        await api.head(endpoint);
        results[endpoint] = true;
      } catch {
        results[endpoint] = false;
      }
    }
    
    console.log('🔍 Endpoints disponibles:', results);
    return results;
  }
};