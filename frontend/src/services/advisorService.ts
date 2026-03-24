// frontend/src/services/advisorService.ts
import api from './api';

export interface Advisor {
  id: number;
  name: string;
  email: string;
  vehicle_type: 'car' | 'motorcycle' | 'bicycle';
  license_plate: string | null;
  assigned_zone: string | null;
  work_start_time: string;
  work_end_time: string;
  is_active: boolean;
  created_at: string;
}

export const advisorService = {
  // Obtener todos los asesores
  async getAllAdvisors(): Promise<Advisor[]> {
    try {
      const response = await api.get('/admin/advisors');
      return response.data.advisors;
    } catch (error) {
      console.error('Error al obtener asesores:', error);
      throw error;
    }
  },

  // Obtener asesor por ID
  async getAdvisorById(id: number): Promise<Advisor> {
    try {
      const response = await api.get(`/admin/advisors/${id}`);
      return response.data.advisor;
    } catch (error) {
      console.error('Error al obtener asesor:', error);
      throw error;
    }
  },

  // Crear asesor
  async createAdvisor(advisor: Omit<Advisor, 'id' | 'created_at'> & { password: string }): Promise<any> {
    try {
      const response = await api.post('/admin/advisors', advisor);
      return response.data;
    } catch (error) {
      console.error('Error al crear asesor:', error);
      throw error;
    }
  },

  // Actualizar asesor
  async updateAdvisor(id: number, advisor: Partial<Advisor>): Promise<any> {
    try {
      const response = await api.put(`/admin/advisors/${id}`, advisor);
      return response.data;
    } catch (error) {
      console.error('Error al actualizar asesor:', error);
      throw error;
    }
  },

  // Eliminar asesor
  async deleteAdvisor(id: number): Promise<any> {
    try {
      const response = await api.delete(`/admin/advisors/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error al eliminar asesor:', error);
      throw error;
    }
  }
};