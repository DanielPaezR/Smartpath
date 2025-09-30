import { api } from './api';

export interface IStore {
  _id: string;
  name: string;
  address: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  contact: {
    name: string;
    phone: string;
    email?: string;
  };
  optimalVisitWindows: Array<{
    start: string;
    end: string;
    priority: number;
  }>;
  assignedAdvisor?: {
    _id: string;
    name: string;
    email: string;
  };
  priority: number;
  estimatedVisitTime: number;
}

export const storeService = {
  async getStores(): Promise<IStore[]> {
    const response = await api.get('/stores');
    return response.data;
  },

  async assignStore(storeId: string, advisorId: string): Promise<IStore> {
    const response = await api.patch(`/stores/${storeId}/assign`, { advisorId });
    return response.data;
  }
};