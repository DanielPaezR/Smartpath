  // frontend/src/services/routeService.ts
  import api from './api';

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
    async getCurrentRoute(advisorId: string) {
      try {
        // Por ahora devolvemos datos mock para evitar errores
        return {
          id: 'route-123',
          advisor_id: advisorId,
          date: new Date().toISOString().split('T')[0],
          total_stores: 3,
          completed_stores: 1,
          total_distance: '8.5',
          estimated_duration: '120',
          stores: [
            {
              id: 'store-1',
              name: 'Supermercado Central',
              address: 'Av. Principal 123',
              zone: 'Centro',
              visit_order: 1,
              status: 'completed' as const
            },
            {
              id: 'store-2',
              name: 'MiniMarket Express', 
              address: 'Jr. Comercio 456',
              zone: 'Centro',
              visit_order: 2,
              status: 'in_progress' as const
            },
            {
              id: 'store-3',
              name: 'Bodega Don Pedro',
              address: 'Av. Libertad 789',
              zone: 'Norte', 
              visit_order: 3,
              status: 'pending' as const
            }
          ]
        };
      } catch (error) {
        console.error('Error en getCurrentRoute:', error);
        throw error;
      }
    },

    async startVisit(routeStoreId: string) {
      // Simular API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      return { 
        message: 'Visita iniciada', 
        routeStoreId,
        startedAt: new Date().toISOString()
      };
    },

    async completeVisit(routeStoreId: string) {
      // Simular API call  
      await new Promise(resolve => setTimeout(resolve, 1000));
      return { 
        message: 'Visita completada', 
        routeStoreId,
        completedAt: new Date().toISOString()
      };
    },

    async getStores() {
      // Datos mock
      return [
        {
          id: 'store-1',
          name: 'Supermercado Central',
          address: 'Av. Principal 123', 
          zone: 'Centro'
        },
        {
          id: 'store-2',
          name: 'MiniMarket Express',
          address: 'Jr. Comercio 456',
          zone: 'Centro'
        },
        {
          id: 'store-3', 
          name: 'Bodega Don Pedro',
          address: 'Av. Libertad 789',
          zone: 'Norte'
        }
      ];
    }
  };