// frontend/src/services/routeService.ts - CON DEBUG COMPLETO
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
  start_time?: string;
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
  // 🎯 VERSIÓN CON DEBUG COMPLETO
  async getCurrentRoute(advisorId: string): Promise<IRoute> {
    try {
      console.log('🔍 [routeService] === INICIANDO getCurrentRoute ===');
      console.log('📡 Advisor ID recibido:', advisorId, 'Tipo:', typeof advisorId);
      
      // 🆕 VERIFICAR QUE EL ID NO ESTÉ VACÍO
      if (!advisorId || advisorId === 'undefined' || advisorId === 'null') {
        console.error('❌ [routeService] Advisor ID inválido:', advisorId);
        throw new Error('ID de asesor inválido');
      }

      console.log('🌐 [routeService] Construyendo URL...');
      const url = `/routes/advisor/${advisorId}/current`;
      console.log('🔗 [routeService] URL final:', url);

      console.log('📞 [routeService] Haciendo petición a API...');
      const response = await api.get(url);
      
      console.log('✅ [routeService] Respuesta recibida del backend:');
      console.log('   - Status:', response.status);
      console.log('   - Datos:', response.data);
      
      return response.data;
      
    } catch (error: any) {
      console.error('❌ [routeService] Error obteniendo ruta actual:');
      console.error('   - Mensaje:', error.message);
      console.error('   - Status:', error.response?.status);
      console.error('   - Datos error:', error.response?.data);
      console.error('   - URL:', error.config?.url);
      
      // Manejar específicamente el 404
      if (error.response?.status === 404) {
        console.log('📭 [routeService] No hay ruta para hoy (404)');
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

      // Manejar error de autenticación
      if (error.response?.status === 401 || error.response?.status === 403) {
        console.error('🔐 [routeService] Error de autenticación');
        throw new Error('Sesión expirada. Por favor inicia sesión nuevamente.');
      }
      
      throw error;
    }
  },

  // Iniciar visita a tienda
  async startVisit(routeId: string, storeVisitId: string): Promise<any> {
    try {
      console.log('🚀 [routeService] Iniciando visita:', { routeId, storeVisitId });
      
      const response = await api.patch('/routes/start-visit', {
        routeId,
        storeVisitId
      });
      
      console.log('✅ [routeService] Visita iniciada exitosamente:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ [routeService] Error iniciando visita:', error);
      throw error;
    }
  },

  // Completar visita a tienda
  async completeVisit(routeId: string, storeVisitId: string, visitData?: VisitData): Promise<any> {
    try {
      console.log('✅ [routeService] Completando visita:', { routeId, storeVisitId, visitData });
      
      const response = await api.patch('/routes/complete-visit', {
        routeId,
        storeVisitId,
        visitData
      });
      
      console.log('✅ [routeService] Visita completada exitosamente:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ [routeService] Error completando visita:', error);
      throw error;
    }
  },

  // Saltar visita a tienda
  async skipStoreVisit(routeId: string, storeVisitId: string, skipReason: string): Promise<any> {
    try {
      console.log('⏭️ [routeService] Saltando visita:', { routeId, storeVisitId, skipReason });
      
      const response = await api.patch('/routes/skip-visit', {
        routeId,
        storeVisitId,
        skipReason
      });
      
      console.log('✅ [routeService] Visita saltada exitosamente:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ [routeService] Error saltando visita:', error);
      throw error;
    }
  },

  // Obtener métricas de rutas
  async getRouteMetrics(advisorId: string, startDate?: string, endDate?: string): Promise<any> {
    try {
      console.log('📊 [routeService] Obteniendo métricas para:', advisorId);
      
      const params: any = { advisorId };
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      
      const response = await api.get('/routes/metrics', { params });
      return response.data;
    } catch (error) {
      console.error('❌ [routeService] Error obteniendo métricas:', error);
      throw error;
    }
  },

  // Generar ruta diaria
  async generateDailyRoute(advisorId: string, date: string): Promise<any> {
    try {
      console.log('🔄 [routeService] Generando ruta diaria:', { advisorId, date });
      
      const response = await api.post('/routes/generate', {
        advisorId,
        date
      });
      return response.data;
    } catch (error) {
      console.error('❌ [routeService] Error generando ruta diaria:', error);
      throw error;
    }
  },

  // Obtener plantillas de ruta
  async getRouteTemplates(advisorId: string): Promise<any[]> {
    try {
      console.log('🏗️ [routeService] Obteniendo plantillas para:', advisorId);
      
      const response = await api.get(`/routes/templates/${advisorId}`);
      return response.data;
    } catch (error) {
      console.error('❌ [routeService] Error obteniendo plantillas:', error);
      throw error;
    }
  },

  // Actualizar tareas de visita
  async updateStoreTasks(visitId: string, taskData: any): Promise<any> {
    try {
      console.log('📝 [routeService] Actualizando tareas para visita:', visitId);
      
      const response = await api.patch('/routes/update-tasks', {
        visitId,
        taskData
      });
      return response.data;
    } catch (error) {
      console.error('❌ [routeService] Error actualizando tareas:', error);
      throw error;
    }
  }
};