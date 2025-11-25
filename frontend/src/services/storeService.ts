// frontend/src/services/storeService.ts
import { api } from './api';
import { normalizeStatus, type VisitStatus } from '../utils/statusNormalizer';

// Interfaz para los datos que vienen del backend
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
  priority: string; // En el backend es 'high', 'medium', 'low'
  estimated_visit_time: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  category?: string;
  zone?: string;
  status?: string; // Agregado para normalización
}

// Interfaz para el frontend - NO extiende Store para evitar conflictos
export interface IStore {
  id: number;
  name: string;
  address: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  contact_name: string;
  contact_phone: string;
  contact_email: string | null;
  optimal_visit_windows: string;
  assigned_advisor_id: number | null;
  priority: number; // En el frontend usamos números
  estimated_visit_time: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  category: string;
  zone: string;
  skipReason?: string;
  status?: VisitStatus; // Status normalizado
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
  // Obtener todas las tiendas - CON NORMALIZACIÓN
  async getStores(): Promise<IStore[]> {
    try {
      const response = await api.get('/stores');
      const stores: Store[] = response.data;
      
      return stores.map(store => {
        let priorityNumber = 2;
        if (typeof store.priority === 'string') {
          if (store.priority === 'high') priorityNumber = 3;
          else if (store.priority === 'medium') priorityNumber = 2;
          else if (store.priority === 'low') priorityNumber = 1;
        } else if (typeof store.priority === 'number') {
          priorityNumber = store.priority;
        }
        
        return {
          id: store.id,
          name: store.name,
          address: store.address,
          coordinates: {
            lat: store.lat,
            lng: store.lng
          },
          contact_name: store.contact_name,
          contact_phone: store.contact_phone,
          contact_email: store.contact_email,
          optimal_visit_windows: store.optimal_visit_windows,
          assigned_advisor_id: store.assigned_advisor_id,
          priority: priorityNumber,
          estimated_visit_time: store.estimated_visit_time,
          is_active: store.is_active,
          created_at: store.created_at,
          updated_at: store.updated_at,
          category: store.category || 'supermarket',
          zone: store.zone || 'Centro',
          skipReason: undefined,
          // 🎯 NORMALIZAR EL STATUS SI EXISTE
          status: store.status ? normalizeStatus(store.status) : 'pending'
        };
      });
    } catch (error) {
      console.error('Error obteniendo tiendas:', error);
      throw error;
    }
  },

  // Obtener tienda por ID
  async getStoreById(storeId: number): Promise<IStore> {
    const response = await api.get(`/stores/${storeId}`);
    const store: Store = response.data;
    
    // Convertir de Store a IStore
    let priorityNumber = 2;
    if (typeof store.priority === 'string') {
      if (store.priority === 'high') priorityNumber = 3;
      else if (store.priority === 'medium') priorityNumber = 2;
      else if (store.priority === 'low') priorityNumber = 1;
    }
    
    return {
      id: store.id,
      name: store.name,
      address: store.address,
      coordinates: {
        lat: store.lat,
        lng: store.lng
      },
      contact_name: store.contact_name,
      contact_phone: store.contact_phone,
      contact_email: store.contact_email,
      optimal_visit_windows: store.optimal_visit_windows,
      assigned_advisor_id: store.assigned_advisor_id,
      priority: priorityNumber,
      estimated_visit_time: store.estimated_visit_time,
      is_active: store.is_active,
      created_at: store.created_at,
      updated_at: store.updated_at,
      category: store.category || 'supermarket',
      zone: store.zone || 'Centro',
      skipReason: undefined,
      status: store.status ? normalizeStatus(store.status) : 'pending'
    };
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
  async getStoresByAdvisor(advisorId: number): Promise<IStore[]> {
    const response = await api.get(`/stores/advisor/${advisorId}`);
    const stores: Store[] = response.data;
    
    return stores.map(store => {
      let priorityNumber = 2;
      if (typeof store.priority === 'string') {
        if (store.priority === 'high') priorityNumber = 3;
        else if (store.priority === 'medium') priorityNumber = 2;
        else if (store.priority === 'low') priorityNumber = 1;
      }
      
      return {
        id: store.id,
        name: store.name,
        address: store.address,
        coordinates: {
          lat: store.lat,
          lng: store.lng
        },
        contact_name: store.contact_name,
        contact_phone: store.contact_phone,
        contact_email: store.contact_email,
        optimal_visit_windows: store.optimal_visit_windows,
        assigned_advisor_id: store.assigned_advisor_id,
        priority: priorityNumber,
        estimated_visit_time: store.estimated_visit_time,
        is_active: store.is_active,
        created_at: store.created_at,
        updated_at: store.updated_at,
        category: store.category || 'supermarket',
        zone: store.zone || 'Centro',
        skipReason: undefined,
        status: store.status ? normalizeStatus(store.status) : 'pending'
      };
    });
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
