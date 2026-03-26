// frontend/src/services/offlineStorage.ts
import { openDB, DBSchema } from 'idb';
import { API_BASE_URL } from '../services/api';

interface StoreVisitDB extends DBSchema {
  visits: {
    key: string;
    value: {
      id: string;
      routeStoreId: number;
      storeId: number;
      storeName: string;
      startTime: string;
      lastUpdate: string;
      status: 'pending' | 'in-progress' | 'completed' | 'skipped';
      tasks: any[];
      damageReports: any[];
      restockItems: any[];
      notes: string;
      photos: any[];
      signature?: string;
      synced: boolean;
    };
    indexes: { 'synced': boolean };
  };
  pendingSync: {
    key: string;
    value: {
      id: string;
      type: 'damage' | 'restock' | 'visit_complete' | 'task_update';
      data: any;
      timestamp: string;
      retryCount: number;
    };
    indexes: { 'timestamp': string; 'retryCount': number };
  };
}

class OfflineStorageService {
  private db: any = null;
  private syncInProgress = false;

  async init() {
    if (this.db) return this.db;
    
    this.db = await openDB<StoreVisitDB>('SmartPathOffline', 1, {
      upgrade(db) {
        // Almacenamiento de visitas en progreso
        if (!db.objectStoreNames.contains('visits')) {
          const visitStore = db.createObjectStore('visits', { keyPath: 'id' });
          visitStore.createIndex('synced', 'synced');
        }
        
        // Cola de sincronización pendiente
        if (!db.objectStoreNames.contains('pendingSync')) {
          const syncStore = db.createObjectStore('pendingSync', { keyPath: 'id', autoIncrement: true });
          syncStore.createIndex('timestamp', 'timestamp');
          syncStore.createIndex('retryCount', 'retryCount');
        }
      },
    });
    
    return this.db;
  }

  // Guardar estado completo de la visita
  async saveVisitState(visitId: string, data: any) {
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

  // Eliminar visita (cuando se completa y sincroniza)
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
    return await db.getAllFromIndex('pendingSync', 'timestamp');
  }

  // Eliminar acción sincronizada
  async removeSyncedAction(id: string) {
    const db = await this.init();
    await db.delete('pendingSync', id);
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
          await this.removeSyncedAction(action.id);
          console.log(`✅ Acción sincronizada: ${action.type}`);
        } catch (error) {
          console.error(`❌ Error sincronizando acción ${action.id}:`, error);
          await this.incrementRetryCount(action.id);
          
          // Si falló más de 3 veces, marcar para revisión manual
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
    
    switch (type) {
      case 'damage':
        await fetch(`${API_BASE_URL}/products/report-damage`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(data)
        });
        break;
        
      case 'restock':
        await fetch(`${API_BASE_URL}/routes/restock/add-item`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(data)
        });
        break;
        
      case 'visit_complete':
        await fetch(`${API_BASE_URL}/routes/complete-visit`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(data)
        });
        break;
        
      case 'task_update':
        await fetch(`${API_BASE_URL}/routes/update-tasks`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(data)
        });
        break;
    }
  }
}

export const offlineStorage = new OfflineStorageService();