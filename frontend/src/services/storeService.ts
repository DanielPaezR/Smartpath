// frontend/src/services/storeService.ts
import { api } from './api';

export interface Store {
  id: number;
  name: string;
  address: string;
  lat: number;
  lng: number;
  contact_name: string;
  contact_phone: string;
  contact_email: string | null;
  optimal_visit_windows: string;
  assigned_advisor_id: number | null;
  priority: number;
  estimated_visit_time: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Para compatibilidad con tu interfaz existente
export interface IStore extends Store {
  coordinates: {
    lat: number;
    lng: number;
  };
  priority: number; // Ya existe como number
  category: string;
  zone: string;
}

export interface CreateStoreData {
  name: string;
  address: string;
  lat: number;
  lng: number;
  contact_name: string;
  contact_phone: string;
  contact_email?: string;
  optimal_visit_windows?: Array<{start: string; end: string; priority: number}>;
  priority?: number;
  estimated_visit_time?: number;
  category?: string;
  zone?: string;
}

export interface UpdateStoreData extends Partial<CreateStoreData> {}
export type StoreFormData = CreateStoreData;

export const storeService = {
  // Obtener todas las tiendas
  async getStores(): Promise<IStore[]> {
    try {
      const response = await api.get('/stores');
      const stores: Store[] = response.data;
      
      // Convertir a formato IStore para compatibilidad
      return stores.map(store => ({
        ...store,
        coordinates: {
          lat: store.lat,
          lng: store.lng
        },
        // Convertir priority number a string para compatibilidad
        priority: store.priority, // Mantener como number
        category: 'supermarket', // Valor por defecto
        zone: 'Centro' // Valor por defecto
      }));
    } catch (error) {
      console.error('Error obteniendo tiendas:', error);
      throw error;
    }
  },

  // Obtener tienda por ID
  async getStoreById(storeId: number): Promise<Store> {
    const response = await api.get(`/stores/${storeId}`);
    return response.data;
  },

  // Crear tienda
  async createStore(storeData: CreateStoreData): Promise<{ message: string; storeId: number }> {
    const response = await api.post('/stores', storeData);
    return response.data;
  },

  // Actualizar tienda
  async updateStore(storeId: number, storeData: UpdateStoreData): Promise<{ message: string }> {
    const response = await api.put(`/stores/${storeId}`, storeData);
    return response.data;
  },

  // Desactivar tienda
  async deleteStore(storeId: number): Promise<{ message: string }> {
    const response = await api.delete(`/stores/${storeId}`);
    return response.data;
  },

  // Asignar tienda a asesor
  async assignStore(storeId: number, advisorId: number): Promise<{ message: string }> {
    const response = await api.patch(`/stores/${storeId}/assign`, { advisorId });
    return response.data;
  },

  // Obtener tiendas por asesor
  async getStoresByAdvisor(advisorId: number): Promise<Store[]> {
    const response = await api.get(`/stores/advisor/${advisorId}`);
    return response.data;
  },

  // 🆕 Buscar tiendas (para filtros)
  async searchStores(filters: { zone?: string; category?: string }): Promise<IStore[]> {
    try {
      const allStores = await this.getStores();
      
      // Aplicar filtros en el frontend por ahora
      return allStores.filter(store => {
        if (filters.zone && store.zone !== filters.zone) return false;
        if (filters.category && store.category !== filters.category) return false;
        return true;
      });
    } catch (error) {
      console.error('Error buscando tiendas:', error);
      throw error;
    }
  }
};