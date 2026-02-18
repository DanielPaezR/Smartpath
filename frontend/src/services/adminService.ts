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
  total_distance_today?: number;
  efficiency_score?: number;
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
}

export const adminService = {
  async getDashboardOverview(): Promise<DashboardOverview> {
    try {
      console.log('🔄 [adminService] Solicitando datos del dashboard...');
      const response = await api.get('/admin/dashboard/overview');
      return response.data;
    } catch (error: any) {
      console.error('❌ [adminService] Error en getDashboardOverview:', error);
      throw error;
    }
  },

  async getLiveAdvisorsStatus(): Promise<AdvisorLiveStatus[]> {
    try {
      console.log('🔄 [adminService] Solicitando estado de asesores...');
      const response = await api.get('/admin/tracking/live-status');
      return response.data;
    } catch (error: any) {
      console.error('❌ [adminService] Error en getLiveAdvisorsStatus:', error);
      throw error;
    }
  },

  async getAdvancedMetrics(timeRange: 'week' | 'month' | 'quarter' = 'month'): Promise<AdvancedMetrics> {
    try {
      console.log(`🔄 [adminService] Solicitando métricas avanzadas (${timeRange})...`);
      const response = await api.get(`/admin/metrics/advanced?timeRange=${timeRange}`);
      return response.data;
    } catch (error: any) {
      console.error('❌ [adminService] Error en getAdvancedMetrics:', error);
      throw error;
    }
  },

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
  }
};