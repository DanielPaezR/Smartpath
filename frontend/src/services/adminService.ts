// frontend/src/services/adminService.ts
import api from './api';

export interface AdvisorLiveStatus {
  id: number;  // ← cambiar a number para coincidir con backend
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

// Función para manejar errores de autenticación
const handleAuthError = (error: any) => {
  console.log('🔐 Error en request:', error.response?.status, error.message);
  
  if (error.response?.status === 403 || error.response?.status === 401) {
    console.log('🔐 Token inválido, limpiando...');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    // No redirigir automáticamente, dejar que el componente maneje el error
    throw new Error('Sesión expirada');
  }
  throw error;
};

export const adminService = {
  // Dashboard overview
  getDashboardOverview: async (): Promise<DashboardOverview> => {
    try {
      const response = await api.get('/admin/dashboard/overview');
      return response.data;
    } catch (error) {
      return handleAuthError(error);
    }
  },

  // Estado en tiempo real de asesores
  getLiveAdvisorsStatus: async (): Promise<AdvisorLiveStatus[]> => {
    try {
      const response = await api.get('/admin/tracking/live-status');
      console.log('📊 Datos recibidos de asesores:', response.data);
      return response.data;
    } catch (error) {
      return handleAuthError(error);
    }
  },

  // Detalle de un asesor específico
  getAdvisorDetail: async (advisorId: number): Promise<any> => {
    try {
      const response = await api.get(`/admin/tracking/advisor/${advisorId}`);
      return response.data;
    } catch (error) {
      return handleAuthError(error);
    }
  },

  // Notificaciones
  getNotifications: async (): Promise<any[]> => {
    try {
      const response = await api.get('/admin/notifications');
      return response.data;
    } catch (error) {
      return handleAuthError(error);
    }
  },

  markNotificationAsRead: async (notificationId: number): Promise<void> => {
    try {
      await api.patch(`/admin/notifications/${notificationId}/read`);
    } catch (error) {
      return handleAuthError(error);
    }
  }
};