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
      tasksChecklist: { [taskId: string]: boolean }; // 🆕 Checklist de tareas completadas
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
      type: 'damage' | 'restock' | 'visit_complete' | 'task_update' | 'photo_upload';
      data: any;
      timestamp: string;
      retryCount: number;
    };
    indexes: {
      'by-timestamp': string;
      'by-retryCount': number;
    };
  };
  // 🆕 Almacén específico para fotos (manejo más eficiente)
  pendingPhotos: {
    key: string;
    value: {
      id: string;
      visitId: string;
      type: 'before' | 'after' | 'damage';
      data: Blob;
      filename: string;
      timestamp: string;
      synced: boolean;
    };
    indexes: {
      'by-visitId': string;
      'by-synced': string;
    };
  };
}

class OfflineStorageService {
  private db: IDBPDatabase<MyDB> | null = null;
  private syncInProgress = false;

  async init() {
    if (this.db) return this.db;
    
    this.db = await openDB<MyDB>('SmartPathOffline', 2, {  // 🔥 Versión 2 (nueva estructura)
      upgrade(db, oldVersion, newVersion, transaction) {
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
        
        // 🆕 Almacén para fotos pendientes
        if (!db.objectStoreNames.contains('pendingPhotos')) {
          const photoStore = db.createObjectStore('pendingPhotos', { keyPath: 'id' });
          photoStore.createIndex('by-visitId', 'visitId');
          photoStore.createIndex('by-synced', 'synced');
        }
      },
    });
    
    return this.db;
  }

  // ============================================
  // 🆕 FUNCIONES PARA EL CHECKLIST DE TAREAS
  // ============================================
  
  // Guardar el progreso del checklist de tareas
  async saveTasksChecklist(visitId: string, tasksChecklist: { [taskId: string]: boolean }) {
    const db = await this.init();
    const existingVisit = await db.get('visits', visitId);
    
    if (existingVisit) {
      existingVisit.tasksChecklist = tasksChecklist;
      existingVisit.lastUpdate = new Date().toISOString();
      existingVisit.synced = false;
      await db.put('visits', existingVisit);
      console.log('✅ Checklist guardado localmente:', Object.keys(tasksChecklist).filter(k => tasksChecklist[k]).length, 'tareas completadas');
    } else {
      console.warn('⚠️ No se encontró la visita para guardar el checklist');
    }
  }
  
  // Obtener el checklist de tareas de una visita
  async getTasksChecklist(visitId: string): Promise<{ [taskId: string]: boolean } | null> {
    const db = await this.init();
    const visit = await db.get('visits', visitId);
    return visit?.tasksChecklist || null;
  }
  
  // Marcar/desmarcar una tarea específica
  async toggleTask(visitId: string, taskId: string, completed: boolean) {
    const db = await this.init();
    const visit = await db.get('visits', visitId);
    
    if (visit) {
      if (!visit.tasksChecklist) visit.tasksChecklist = {};
      visit.tasksChecklist[taskId] = completed;
      visit.lastUpdate = new Date().toISOString();
      visit.synced = false;
      await db.put('visits', visit);
      console.log(`📋 Tarea ${taskId} ${completed ? 'completada' : 'pendiente'} (guardado local)`);
      
      // Encolar para sincronización
      await this.queueSyncAction('task_update', {
        visitId,
        taskId,
        completed,
        tasksChecklist: visit.tasksChecklist
      });
    }
  }

  // ============================================
  // 🆕 FUNCIONES PARA FOTOS (mejoradas)
  // ============================================
  
  // Guardar una foto localmente (antes de subir al servidor)
  async savePhoto(visitId: string, type: 'before' | 'after' | 'damage', file: File): Promise<string> {
    const db = await this.init();
    const photoId = `${visitId}_${type}_${Date.now()}`;
    
    await db.add('pendingPhotos', {
      id: photoId,
      visitId: visitId,
      type: type,
      data: file,
      filename: file.name,
      timestamp: new Date().toISOString(),
      synced: false
    });
    
    // También guardar referencia en la visita
    const visit = await db.get('visits', visitId);
    if (visit) {
      if (!visit.photos) visit.photos = [];
      visit.photos.push({ id: photoId, type, filename: file.name, synced: false });
      visit.lastUpdate = new Date().toISOString();
      await db.put('visits', visit);
    }
    
    console.log(`📸 Foto ${type} guardada localmente para visita ${visitId}`);
    return photoId;
  }
  
  // Obtener todas las fotos pendientes de una visita
  async getPendingPhotos(visitId: string) {
    const db = await this.init();
    const index = db.transaction('pendingPhotos').store.index('by-visitId');
    return await index.getAll(visitId);
  }
  
  // Marcar foto como sincronizada
  async markPhotoSynced(photoId: string) {
    const db = await this.init();
    const photo = await db.get('pendingPhotos', photoId);
    if (photo) {
      photo.synced = true;
      await db.put('pendingPhotos', photo);
    }
  }
  
  // Eliminar fotos de una visita ya completada
  async clearPhotosForVisit(visitId: string) {
    const db = await this.init();
    const photos = await this.getPendingPhotos(visitId);
    for (const photo of photos) {
      await db.delete('pendingPhotos', photo.id);
    }
    console.log(`🗑️ ${photos.length} fotos eliminadas para visita ${visitId}`);
  }

  // ============================================
  // FUNCIONES EXISTENTES (mejoradas)
  // ============================================
  
  // Guardar estado completo de la visita (incluyendo checklist)
  async saveVisitState(visitId: string, data: {
    routeStoreId: number;
    storeId: number;
    storeName: string;
    startTime: string;
    status: 'pending' | 'in-progress' | 'completed' | 'skipped';
    tasks: any[];
    tasksChecklist?: { [taskId: string]: boolean };
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
      tasksChecklist: data.tasksChecklist || {},
      id: visitId,
      lastUpdate: new Date().toISOString(),
      synced: false
    });
    console.log('💾 Visita guardada localmente:', visitId);
  }

  // Obtener estado completo de una visita
  async getVisitState(visitId: string) {
    const db = await this.init();
    return await db.get('visits', visitId);
  }

  // Eliminar visita
  async deleteVisitState(visitId: string) {
    const db = await this.init();
    await db.delete('visits', visitId);
    // También limpiar sus fotos
    await this.clearPhotosForVisit(visitId);
  }

  // Agregar acción a la cola de sincronización
  async queueSyncAction(type: 'damage' | 'restock' | 'visit_complete' | 'task_update' | 'photo_upload', data: any) {
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

  // Sincronizar todo lo pendiente (incluyendo fotos)
  async syncAll() {
    if (this.syncInProgress) return;
    this.syncInProgress = true;
    
    try {
      // 1. Sincronizar fotos primero
      await this.syncPhotos();
      
      // 2. Sincronizar el resto de acciones
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
  
  // 🆕 Sincronizar fotos pendientes
  private async syncPhotos() {
    const db = await this.init();
    const index = db.transaction('pendingPhotos').store.index('by-synced');
    const unsyncedPhotos = await index.getAll(IDBKeyRange.only(false));
    
    console.log(`📸 Sincronizando ${unsyncedPhotos.length} fotos pendientes...`);
    
    for (const photo of unsyncedPhotos) {
      try {
        const formData = new FormData();
        formData.append('photo', photo.data, photo.filename);
        formData.append('type', photo.type);
        formData.append('visitId', photo.visitId);
        
        const token = localStorage.getItem('token');
        const API_BASE_URL = '/~daniel.paez/smartpath/api';
        
        const response = await fetch(`${API_BASE_URL}/upload/photo`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        });
        
        if (response.ok) {
          await this.markPhotoSynced(photo.id);
          console.log(`📸 Foto ${photo.id} sincronizada`);
        } else {
          throw new Error('Error subiendo foto');
        }
      } catch (error) {
        console.error(`❌ Error sincronizando foto ${photo.id}:`, error);
      }
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
        
      case 'photo_upload':
        // Las fotos se manejan en syncPhotos()
        break;
    }
  }
}

export const offlineStorage = new OfflineStorageService();