// frontend/src/services/routeConfigService.ts
import api from './api';

export interface ScheduleStore {
  id: number;
  day_of_week: number;
  store_id: number;
  store_name: string;
  address: string;
  priority: string;
  visit_order: number;
  is_active: boolean;
}

export interface DaySchedule {
  dayName: string;
  dayNumber: number;
  stores: ScheduleStore[];
}

export interface AdvisorSchedule {
  advisor: { id: number; name: string };
  schedule: Record<number, DaySchedule>;
}

export const routeConfigService = {
  async getAdvisorSchedule(advisorId: number): Promise<AdvisorSchedule> {
    const response = await api.get(`/admin/advisors/${advisorId}/schedule`);
    return response.data;
  },
  
  async addStoreToSchedule(advisorId: number, day_of_week: number, store_id: number, visit_order: number = 0) {
    const response = await api.post(`/admin/advisors/${advisorId}/schedule`, {
      day_of_week, store_id, visit_order
    });
    return response.data;
  },
  
  async removeStoreFromSchedule(advisorId: number, scheduleId: number) {
    const response = await api.delete(`/admin/advisors/${advisorId}/schedule/${scheduleId}`);
    return response.data;
  },
  
  async updateScheduleOrder(advisorId: number, updates: { id: number; visit_order: number }[]) {
    const response = await api.put(`/admin/advisors/${advisorId}/schedule/order`, { updates });
    return response.data;
  },
  
  async getAllStoresSimple(): Promise<{ id: number; name: string; address: string; priority: string }[]> {
    const response = await api.get('/admin/stores/simple');
    return response.data.stores;
  }
};