// frontend/src/services/offlineStorage.ts
import { openDB, DBSchema, IDBPDatabase } from 'idb';

// Definir la estructura de la base de datos
interface MyDB extends DBSchema {
  visits: {
    key: string;
    value: {
      id: string;
      routeStoreId: number;
      storeId: number;
      storeName: string;
      startTime: string;
      lastUpdate: string;
      timeInStore: number;
      status: 'pending' | 'in-progress' | 'completed' | 'skipped';
      tasks: any[];
      damageReports: any[];
      restockItems: any[];
      notes: string;
      photos: any[];
      signature?: string;
      synced: boolean;
    };
    indexes: {
      'by-synced': string;
    };
  };
  pendingSync: {
    key: string;
    value: {
      id?: string;
      type: 'damage' | 'restock' | 'visit_complete' | 'task_update';
      data: any;
      timestamp: string;
      retryCount: number;
    };
    indexes: {
      'by-timestamp': string;
      'by-retryCount': number;
    };
  };
}

class OfflineStorageService {
  private db: IDBPDatabase<MyDB> | null = null;
  private syncInProgress = false;

  async init() {
    if (this.db) return this.db;
    
    this.db = await openDB<MyDB>('SmartPathOffline', 1, {
      upgrade(db) {
        // Almacenamiento de visitas en progreso
        if (!db.objectStoreNames.contains('visits')) {
          const visitStore = db.createObjectStore('visits', { keyPath: 'id' });
          visitStore.createIndex('by-synced', 'synced');
        }
        
        // Cola de sincronización pendiente
        if (!db.objectStoreNames.contains('pendingSync')) {
          const syncStore = db.createObjectStore('pendingSync', { keyPath: 'id', autoIncrement: true });
          syncStore.createIndex('by-timestamp', 'timestamp');
          syncStore.createIndex('by-retryCount', 'retryCount');
        }
      },
    });
    
    return this.db;
  }

  // Guardar estado completo de la visita
  async saveVisitState(visitId: string, data: {
    routeStoreId: number;
    storeId: number;
    storeName: string;
    startTime: string;
    status: 'pending' | 'in-progress' | 'completed' | 'skipped';
    tasks: any[];
    timeInStore: number;
    damageReports: any[];
    restockItems: any[];
    notes: string;
    photos: any[];
    signature?: string;
  }) {
    const db = await this.init();
    await db.put('visits', {
      ...data,
      id: visitId,
      lastUpdate: new Date().toISOString(),
      synced: false
    });
    console.log('💾 Visita guardada localmente:', visitId);
  }

  // Obtener estado de una visita
  async getVisitState(visitId: string) {
    const db = await this.init();
    return await db.get('visits', visitId);
  }

  // Eliminar visita
  async deleteVisitState(visitId: string) {
    const db = await this.init();
    await db.delete('visits', visitId);
  }

  // Agregar acción a la cola de sincronización
  async queueSyncAction(type: 'damage' | 'restock' | 'visit_complete' | 'task_update', data: any) {
    const db = await this.init();
    const id = await db.add('pendingSync', {
      type,
      data,
      timestamp: new Date().toISOString(),
      retryCount: 0
    });
    console.log(`📦 Acción encolada: ${type}`, id);
    return id;
  }

  // Obtener todas las acciones pendientes
  async getPendingSync() {
    const db = await this.init();
    const index = db.transaction('pendingSync').store.index('by-timestamp');
    return await index.getAll();
  }

  // Eliminar acción sincronizada
  async removeSyncedAction(id: string) {
    const db = await this.init();
    await db.delete('pendingSync', id);
    console.log(`🗑️ Acción eliminada de la cola: ${id}`);
  }

  // Incrementar contador de reintentos
  async incrementRetryCount(id: string) {
    const db = await this.init();
    const action = await db.get('pendingSync', id);
    if (action) {
      action.retryCount++;
      await db.put('pendingSync', action);
    }
  }

  // Sincronizar todo lo pendiente
  async syncAll() {
    if (this.syncInProgress) return;
    this.syncInProgress = true;
    
    try {
      const pendingActions = await this.getPendingSync();
      console.log(`🔄 Sincronizando ${pendingActions.length} acciones pendientes...`);
      
      for (const action of pendingActions) {
        try {
          await this.processSyncAction(action);
          await this.removeSyncedAction(action.id as string);
          console.log(`✅ Acción sincronizada: ${action.type}`);
        } catch (error) {
          console.error(`❌ Error sincronizando acción ${action.id}:`, error);
          await this.incrementRetryCount(action.id as string);
          
          if (action.retryCount >= 3) {
            console.warn(`⚠️ Acción ${action.id} falló ${action.retryCount} veces, requiere atención manual`);
          }
        }
      }
    } finally {
      this.syncInProgress = false;
    }
  }

  // Procesar una acción específica
  private async processSyncAction(action: any) {
    const { type, data } = action;
    const token = localStorage.getItem('token');
    const API_BASE_URL = '/~daniel.paez/smartpath/api';
    
    switch (type) {
      case 'damage':
        const damageResponse = await fetch(`${API_BASE_URL}/products/report-damage`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(data)
        });
        if (!damageResponse.ok) throw new Error('Error reportando daño');
        break;
        
      case 'restock':
        const restockResponse = await fetch(`${API_BASE_URL}/routes/restock/add-item`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(data)
        });
        if (!restockResponse.ok) throw new Error('Error registrando reposición');
        break;
        
      case 'visit_complete':
        const visitResponse = await fetch(`${API_BASE_URL}/routes/complete-visit`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(data)
        });
        if (!visitResponse.ok) throw new Error('Error completando visita');
        break;
        
      case 'task_update':
        const taskResponse = await fetch(`${API_BASE_URL}/routes/update-tasks`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(data)
        });
        if (!taskResponse.ok) throw new Error('Error actualizando tareas');
        break;
    }
  }
}

export const offlineStorage = new OfflineStorageService();