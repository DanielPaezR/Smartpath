// frontend/src/services/routeService.ts - SIN MOCKS
import api from './api';

// frontend/src/services/routeService.ts - ACTUALIZAR INTERFAZ
export interface IStore {
  id: string;
  storeId: {
    id: string;
    name: string;
    address: string;
    coordinates: {
      lat: number;    // Esto mapeará a latitude
      lng: number;    // Esto mapeará a longitude  
    };
    priority: string; // Cambiar a string porque es enum
    category?: string;
    zone?: string;
  };
  status: 'pending' | 'in-progress' | 'completed' | 'skipped';
  visit_order: number;
  plannedArrival?: string;
  actualArrival?: string;
  actualDeparture?: string;
  visitDuration?: number;
  skipReason?: string;
}

export interface IRoute {
  id: string;
  advisor_id: string;
  date: string;
  total_stores: number;
  completed_stores: number;
  total_distance: string;
  estimated_duration: string;
  stores: IStore[];
}

export const routeService = {
  async getCurrentRoute(advisorId: string): Promise<IRoute> {
    try {
      const response = await api.get(`/routes/advisor/${advisorId}/current`);
      
      if (!response.data) {
        throw new Error('No se encontró ruta para el asesor');
      }
      
      console.log('✅ Ruta obtenida de la API:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error obteniendo ruta real:', error);
      throw error; // ❌ ELIMINAMOS FALLBACK MOCK - QUE FALLE SI NO HAY DATOS REALES
    }
  },

  async startVisit(routeId: string, storeVisitId: string) {
    try {
      const response = await api.patch('/routes/start-visit', {
        routeId: routeId,
        storeVisitId: storeVisitId
      });
      return response.data;
    } catch (error) {
      console.error('Error iniciando visita:', error);
      throw error; // ❌ ELIMINAMOS FALLBACK MOCK
    }
  },

  async completeVisit(routeId: string, storeVisitId: string, visitData?: any) {
    try {
      const response = await api.patch('/routes/complete-visit', {
        routeId: routeId,
        storeVisitId: storeVisitId,
        visitData: visitData || {
          duration: 40,
          notes: 'Visita completada exitosamente'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error completando visita:', error);
      throw error; // ❌ ELIMINAMOS FALLBACK MOCK
    }
  }
};