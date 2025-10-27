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
}

export interface UpdateStoreData extends Partial<CreateStoreData> {}

export const storeService = {
  // Obtener todas las tiendas
  async getStores(): Promise<Store[]> {
    const response = await api.get('/stores');
    return response.data;
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
  async deactivateStore(storeId: number): Promise<{ message: string }> {
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
  }
};