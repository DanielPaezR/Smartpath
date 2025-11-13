// frontend/src/services/routeService.ts - CORREGIDO
import { api } from './api';

export interface IStore {
  id: string;
  name: string;
  address: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  zone?: string;
  category?: string;
  priority?: string;
  skipReason?: string;
  
}

export interface IStoreVisit {
  id: string;
  storeId: IStore;
  status: 'pending' | 'in-progress' | 'completed' | 'skipped';
  visit_order: number;
  skipReason?: string;
  start_time?: string; // 🎯 AGREGADO
  end_time?: string;
}

export interface IRoute {
  id: string;
  advisor_id: string;
  date: string;
  total_stores: number;
  completed_stores: number;
  total_distance: string;
  estimated_duration: string;
  status: string;
  stores: IStoreVisit[];
}

export interface VisitData {
  duration?: number;
  notes?: string;
  beforePhoto?: string;
  afterPhoto?: string;
  productsDamaged?: number;
  signature?: string;
  barcodeData?: string;
  damageReports?: any[];
}

export const routeService = {
  // 🎯 CORREGIDO: Usar la ruta correcta /advisor/:advisorId/current
  async getCurrentRoute(advisorId: string): Promise<IRoute> {
    try {
      console.log('🔍 Solicitando ruta para advisor:', advisorId);
      const response = await api.get(`/routes/advisor/${advisorId}/current`);
      console.log('✅ Ruta recibida:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Error obteniendo ruta actual:', error);
      
      // Manejar específicamente el 404
      if (error.response?.status === 404) {
        console.log('📭 No hay ruta para hoy, creando estructura vacía');
        const emptyRoute: IRoute = {
          id: 'no-route-today',
          advisor_id: advisorId,
          date: new Date().toISOString().split('T')[0],
          total_stores: 0,
          completed_stores: 0,
          total_distance: '0 km',
          estimated_duration: '0 min',
          status: 'no-route',
          stores: []
        };
        return emptyRoute;
      }
      
      throw error;
    }
  },

  // Iniciar visita a tienda
  async startVisit(routeId: string, storeVisitId: string): Promise<any> {
    try {
      console.log('🚀 Iniciando visita:', { routeId, storeVisitId });
      
      const response = await api.patch('/routes/start-visit', {
        routeId,
        storeVisitId
      });
      
      console.log('✅ Visita iniciada exitosamente:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error iniciando visita:', error);
      throw error;
    }
  },

  // Completar visita a tienda
  async completeVisit(routeId: string, storeVisitId: string, visitData?: VisitData): Promise<any> {
    try {
      console.log('✅ Completando visita:', { routeId, storeVisitId, visitData });
      
      const response = await api.patch('/routes/complete-visit', {
        routeId,
        storeVisitId,
        visitData
      });
      
      console.log('✅ Visita completada exitosamente:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error completando visita:', error);
      throw error;
    }
  },

  // Saltar visita a tienda
  async skipStoreVisit(routeId: string, storeVisitId: string, skipReason: string): Promise<any> {
    try {
      console.log('⏭️ Saltando visita:', { routeId, storeVisitId, skipReason });
      
      const response = await api.patch('/routes/skip-visit', {
        routeId,
        storeVisitId,
        skipReason
      });
      
      console.log('✅ Visita saltada exitosamente:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error saltando visita:', error);
      throw error;
    }
  },

  // Obtener métricas de rutas
  async getRouteMetrics(advisorId: string, startDate?: string, endDate?: string): Promise<any> {
    try {
      const params: any = { advisorId };
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      
      const response = await api.get('/routes/metrics', { params });
      return response.data;
    } catch (error) {
      console.error('Error obteniendo métricas:', error);
      throw error;
    }
  },

  // Generar ruta diaria
  async generateDailyRoute(advisorId: string, date: string): Promise<any> {
    try {
      const response = await api.post('/routes/generate', {
        advisorId,
        date
      });
      return response.data;
    } catch (error) {
      console.error('Error generando ruta diaria:', error);
      throw error;
    }
  },

  // Obtener plantillas de ruta
  async getRouteTemplates(advisorId: string): Promise<any[]> {
    try {
      const response = await api.get(`/routes/templates/${advisorId}`);
      return response.data;
    } catch (error) {
      console.error('Error obteniendo plantillas:', error);
      throw error;
    }
  },

  // Actualizar tareas de visita
  async updateStoreTasks(visitId: string, taskData: any): Promise<any> {
    try {
      const response = await api.patch('/routes/update-tasks', {
        visitId,
        taskData
      });
      return response.data;
    } catch (error) {
      console.error('Error actualizando tareas:', error);
      throw error;
    }
  }
};