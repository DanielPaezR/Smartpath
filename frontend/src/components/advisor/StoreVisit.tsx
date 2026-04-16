// frontend/src/components/advisor/StoreVisit.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { routeService, type IRoute } from '../../services/routeService';
import { useAuth } from '../../contexts/AuthContext';
import SignaturePad from '../common/SignaturePad';
import BarcodeScannerButton from './BarcodeScannerButton';
import RestockModal from './RestockModal';
import TaskProgress from '../common/TaskProgress';
import { restockService, IRestockItem } from '../../services/restockService';
import { offlineStorage } from '../../services/offlineStorage';
import '../../styles/StoreVisit.css';
import { API_BASE_URL } from '../../services/api';
import DamageModal from './DamageModal';

// Interfaces mejoradas
interface ITask {
  key: string;
  label: string;
  completed: boolean;
  photos?: string[];
  timestamp?: Date;
  requiresPhotos?: boolean;
  requiresSignature?: boolean;
  requiresBarcode?: boolean;
  barcodes?: string[];
  signature?: string;
  additionalData?: any;
}

interface IProduct {
  id: string;
  barcode: string;
  name: string;
  category: string;
  brand: string;
  price: number;
  stock: number;
  description?: string;
}

interface IDamageReport {
  id: string;
  barcode: string;
  product: IProduct;
  damageType: string;
  description: string;
  photos: string[];
  timestamp: Date;
  severity: 'low' | 'medium' | 'high';
  storeId: string;
  reportedBy: string;
}

// COMPONENTE PARA CÁMARA NATIVA - CON GUARDADO LOCAL EN INDEXEDDB
const CameraButton: React.FC<{
  onCapture: (photos: string[]) => void;
  existingPhotos?: string[];
  maxPhotos?: number;
  disabled?: boolean;
  required?: boolean;
  visitId?: string;
  taskKey?: string;
}> = ({ onCapture, existingPhotos = [], maxPhotos = 6, disabled = false, required = false, visitId, taskKey }) => {
  const [capturedPhotos, setCapturedPhotos] = useState<string[]>(existingPhotos);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    if (capturedPhotos.length + files.length > maxPhotos) {
      alert(`Máximo ${maxPhotos} fotos permitidas`);
      return;
    }

    setIsSaving(true);
    
    for (const file of Array.from(files)) {
      try {
        if (visitId) {
          const photoType = taskKey === 'evidenceBefore' ? 'before' : 
                           taskKey === 'evidenceAfter' ? 'after' : 'damage';
          await offlineStorage.savePhoto(visitId, photoType, file);
          console.log(`📸 Foto guardada localmente para tarea: ${taskKey}`);
        }
        
        const reader = new FileReader();
        reader.onloadend = () => {
          const photoData = reader.result as string;
          const newPhotos = [...capturedPhotos, photoData];
          setCapturedPhotos(newPhotos);
          onCapture(newPhotos);
        };
        reader.readAsDataURL(file);
        
      } catch (error) {
        console.error('Error guardando foto localmente:', error);
        alert('Error al guardar la foto. Intenta nuevamente.');
      }
    }
    
    setIsSaving(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removePhoto = (index: number) => {
    const newPhotos = capturedPhotos.filter((_, i) => i !== index);
    setCapturedPhotos(newPhotos);
    onCapture(newPhotos);
  };

  return (
    <div className="camera-upload-container">
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />

      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={disabled || capturedPhotos.length >= maxPhotos || isSaving}
        className="camera-open-btn"
      >
        📸 {isSaving ? 'Guardando...' : (capturedPhotos.length === 0 ? 'Tomar Foto' : 'Agregar Foto')} 
        {capturedPhotos.length > 0 && ` (${capturedPhotos.length}/${maxPhotos})`}
        {required && capturedPhotos.length === 0 && <span className="required-badge">*Obligatorio</span>}
      </button>

      {capturedPhotos.length > 0 && (
        <div className="photos-preview">
          <p><strong>Fotos:</strong></p>
          <div className="photos-grid">
            {capturedPhotos.map((photo, index) => (
              <div key={index} className="photo-preview">
                <img src={photo} alt={`Foto ${index + 1}`} />
                <button
                  type="button"
                  onClick={() => removePhoto(index)}
                  className="remove-photo-btn"
                  disabled={disabled}
                >
                  ✕
                </button>
                {index === 0 && <span className="photo-main-badge">Principal</span>}
              </div>
            ))}
          </div>
          {capturedPhotos.length < maxPhotos && (
            <p className="photo-hint">
              Puedes agregar hasta {maxPhotos - capturedPhotos.length} foto(s) más (opcional)
            </p>
          )}
        </div>
      )}
    </div>
  );
};

// Servicio para productos
const productService = {
  getProductByBarcode: async (barcode: string): Promise<IProduct | null> => {
    try {
      const response = await fetch(`${API_BASE_URL}/products/barcode/${barcode}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`Error del servidor: ${response.status}`);
      }
      
      return await response.json();
      
    } catch (error) {
      console.error('Error buscando producto:', error);
      return null;
    }
  },

  reportDamage: async (damageReport: Omit<IDamageReport, 'id' | 'timestamp'>) => {
    try {
      const reportToSend = {
        barcode: damageReport.barcode,
        product: {
          id: damageReport.product.id,
          name: damageReport.product.name,
          brand: damageReport.product.brand,
          category: damageReport.product.category,
          price: damageReport.product.price,
          stock: damageReport.product.stock
        },
        damageType: damageReport.damageType,
        description: damageReport.description,
        severity: damageReport.severity,
        storeId: damageReport.storeId,
        reportedBy: damageReport.reportedBy,
        photosMetadata: damageReport.photos ? damageReport.photos.map((photo, index) => ({
          index: index,
          hasPhoto: !!photo,
          isBase64: photo?.startsWith('data:image'),
          length: photo?.length || 0
        })) : []
      };
      
      const response = await fetch(`${API_BASE_URL}/products/report-damage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(reportToSend)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error('Error reportando daño en el servidor');
      }
      
      return await response.json();
      
    } catch (error) {
      console.error('Error reportando daño:', error);
      throw error;
    }
  }
};

const StoreVisit: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const { storeVisitId, routeId } = location.state || {};
  
  const [route, setRoute] = useState<IRoute | null>(null);
  const [currentStoreIndex, setCurrentStoreIndex] = useState(0);
  const [timeInMinutes, setTimeInMinutes] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [tasks, setTasks] = useState<ITask[]>([]);
  const [currentTaskIndex, setCurrentTaskIndex] = useState<number | null>(null);
  const [damageReports, setDamageReports] = useState<IDamageReport[]>([]);
  const [restockItems, setRestockItems] = useState<IRestockItem[]>([]);
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [showDamageReport, setShowDamageReport] = useState(false);
  const [showRestockModal, setShowRestockModal] = useState(false);
  const [showDamageModal, setShowDamageModal] = useState(false);
  
  // Estados para formulario de daños
  const [currentBarcode, setCurrentBarcode] = useState<string>('');
  const [currentProduct, setCurrentProduct] = useState<IProduct | null>(null);
  const [damageDescription, setDamageDescription] = useState('');
  const [damageType, setDamageType] = useState('');
  const [damageSeverity, setDamageSeverity] = useState<'low' | 'medium' | 'high'>('low');
  const [damagePhotos, setDamagePhotos] = useState<string[]>([]);
  
  const [visitNotes, setVisitNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncing, setSyncing] = useState(false);


  // Estados de visita
  const [visitStatus, setVisitStatus] = useState<'pending' | 'in-progress' | 'in_progress' | 'completed' | 'skipped'>('pending');
  const [hasCheckedStatus, setHasCheckedStatus] = useState(false);
  const [hasInitializedTasks, setHasInitializedTasks] = useState(false);

  // Tareas
  const taskDefinitions: ITask[] = [
    { 
      key: 'evidenceBefore', 
      label: '📸 Evidencia fotográfica del como se encontró el lugar', 
      requiresPhotos: true,
      completed: false
    },
    { 
      key: 'identifySold', 
      label: '🛒 Identificar productos vendidos para reponer', 
      requiresPhotos: false,
      completed: false
    },
    { 
      key: 'picking', 
      label: '📦 Ir a bodega y hacer picking de productos', 
      requiresPhotos: false,
      completed: false
    },
    { 
      key: 'restocking', 
      label: '🧹 Realizar bajada de productos y limpieza', 
      requiresPhotos: false,
      completed: false
    },
    { 
      key: 'organization', 
      label: '📦 Volver productos a su sitio dejando los que ya estaban al frente', 
      requiresPhotos: false,
      completed: false
    },
    { 
      key: 'pricing', 
      label: '🏷️ Realizar segmentación de precios', 
      requiresPhotos: false,
      completed: false
    },
    { 
      key: 'evidenceAfter', 
      label: '📸 Tomar fotografía del después', 
      requiresPhotos: true,
      completed: false
    },
    { 
      key: 'damageCheck', 
      label: '⚠️ Reportar productos dañados en bodega', 
      requiresPhotos: true,
      requiresBarcode: true,
      completed: false
    },
    { 
      key: 'signature', 
      label: '✍️ Recoger firma y sello de seguridad del almacén', 
      requiresSignature: true,
      completed: false
    }
  ];

  // Formatear tiempo en formato MM:SS
  const formatTime = (minutes: number): string => {
    const totalSeconds = Math.floor(minutes * 60);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    const padZero = (num: number): string => num < 10 ? '0' + num : num.toString();
    return `${padZero(mins)}:${padZero(secs)}`;
  };

  // Cargar estado guardado localmente (incluyendo fotos y checklist)
  const loadSavedState = async () => {
    if (!storeVisitId) return;
    
    const saved = await offlineStorage.getVisitState(storeVisitId);
    if (saved) {
      console.log('🔄 Cargando estado guardado localmente para visita:', storeVisitId);
      console.log('📦 restockItems recuperados:', saved.restockItems?.length || 0);
      console.log('📸 damageReports recuperados:', saved.damageReports?.length || 0);
      
      // Crear copia de las tareas base
      let loadedTasks = [...taskDefinitions];
      
      // Si hay tareas guardadas, restaurar su estado y fotos
      if (saved.tasks && saved.tasks.length > 0) {
        loadedTasks = loadedTasks.map((task, idx) => {
          const savedTask = saved.tasks.find((st: any) => st.key === task.key);
          if (savedTask) {
            return {
              ...task,
              completed: savedTask.completed || false,
              photos: savedTask.photos || [],
              timestamp: savedTask.timestamp ? new Date(savedTask.timestamp) : undefined,
              additionalData: savedTask.additionalData,
              barcodes: savedTask.barcodes,
              signature: savedTask.signature
            };
          }
          return task;
        });
      }
      
      // Si hay checklist, aplicarlo (sobrescribe completed)
      if (saved.tasksChecklist && Object.keys(saved.tasksChecklist).length > 0) {
        loadedTasks = loadedTasks.map(task => ({
          ...task,
          completed: saved.tasksChecklist[task.key] || false,
          timestamp: saved.tasksChecklist[task.key] ? task.timestamp || new Date() : undefined
        }));
      }
      
      setTasks(loadedTasks);
      setTimeInMinutes(saved.timeInStore || 0);
      setDamageReports(saved.damageReports || []);
      setRestockItems(saved.restockItems || []);
      setVisitNotes(saved.notes || '');
      
      setVisitStatus(saved.status);
      setHasInitializedTasks(true);
      
      if (saved.status === 'in-progress') {
        setIsTimerRunning(true);
      }
      
      // Actualizar la tarea de picking para mostrar los productos recuperados
      if (saved.restockItems && saved.restockItems.length > 0) {
        const pickingTaskIndex = loadedTasks.findIndex(t => t.key === 'picking');
        if (pickingTaskIndex !== -1 && loadedTasks[pickingTaskIndex].completed) {
          const totalItems = saved.restockItems.reduce((sum: number, item: any) => sum + item.quantity, 0);
          const uniqueProducts = saved.restockItems.length;
          setTasks(prev => {
            const updated = [...prev];
            if (updated[pickingTaskIndex]) {
              updated[pickingTaskIndex].additionalData = {
                totalItems: totalItems,
                uniqueProducts: uniqueProducts
              };
            }
            return updated;
          });
        }
      }
      
      // Limpiar fotos existentes en las tareas antes de agregar nuevas
      setTasks(prev => {
        const cleaned = [...prev];
        for (let i = 0; i < cleaned.length; i++) {
          if (cleaned[i].key === 'evidenceBefore' || cleaned[i].key === 'evidenceAfter' || cleaned[i].key === 'damageCheck') {
            cleaned[i].photos = [];
          }
        }
        return cleaned;
      });
      
      // Recuperar fotos pendientes SOLO de esta visita
      const pendingPhotos = await offlineStorage.getPendingPhotos(storeVisitId);
      if (pendingPhotos.length > 0) {
        console.log(`📸 Recuperando ${pendingPhotos.length} fotos pendientes para visita ${storeVisitId}`);
        
        // Agrupar fotos por tarea
        for (const photo of pendingPhotos) {
          const taskKey = photo.type === 'before' ? 'evidenceBefore' : 
                          photo.type === 'after' ? 'evidenceAfter' : 'damageCheck';
          
          setTasks(prev => {
            const updated = [...prev];
            const taskIndex = updated.findIndex(t => t.key === taskKey);
            if (taskIndex !== -1) {
              const photoUrl = URL.createObjectURL(photo.data);
              if (!updated[taskIndex].photos) updated[taskIndex].photos = [];
              
              let exists = false;
              for (let i = 0; i < updated[taskIndex].photos.length; i++) {
                if (updated[taskIndex].photos[i] === photoUrl) {
                  exists = true;
                  break;
                }
              }
              if (!exists) {
                updated[taskIndex].photos.push(photoUrl);
              }
            }
            return updated;
          });
        }
      }
    } else {
      // Si es una visita nueva, limpiar fotos de cualquier visita anterior
      if (storeVisitId) {
        await offlineStorage.clearPhotosForVisit(storeVisitId);
      }
      if (!hasInitializedTasks) {
        setTasks([...taskDefinitions]);
        setHasInitializedTasks(true);
      }
    }
  };

  const normalizeStatus = useCallback((status: string): 'pending' | 'in-progress' | 'completed' | 'skipped' => {
    if (status === 'in_progress' || status === 'in-progress') {
      return 'in-progress';
    }
    return status as 'pending' | 'in-progress' | 'completed' | 'skipped';
  }, []);

  const checkVisitStatus = useCallback(() => {
    if (!route || !storeVisitId) return;
    
    const currentStoreVisit = route.stores?.find(
      store => store.id.toString() === storeVisitId.toString()
    );

    console.log('🔍 currentStoreVisit COMPLETO:', currentStoreVisit);
    console.log('🔍 start_time específico:', currentStoreVisit?.start_time);

    if (currentStoreVisit) {
      const normalizedStatus = normalizeStatus(currentStoreVisit.status || 'pending');
      setVisitStatus(normalizedStatus);
      
      if (normalizedStatus === 'in-progress') {
        setIsTimerRunning(true);
        initializeTasks();
        
        if (currentStoreVisit.start_time) {
          const startTime = new Date(currentStoreVisit.start_time);
          const now = new Date();
          const diffMs = now.getTime() - startTime.getTime();
          const minutesElapsed = diffMs / 60000;
          setTimeInMinutes(minutesElapsed);
          console.log(`⏱️ Tiempo cargado desde start_time: ${minutesElapsed.toFixed(2)} minutos`);
        }
      }
      
      setHasCheckedStatus(true);
    } else {
      setHasCheckedStatus(true);
    }
  }, [route, storeVisitId, normalizeStatus]);

  const openInMaps = () => {
    if (!route?.stores?.[currentStoreIndex]?.storeId?.coordinates) {
      alert('No hay coordenadas disponibles para esta tienda');
      return;
    }

    const store = route.stores[currentStoreIndex].storeId;
    const lat = store.coordinates?.lat || 4.710989;
    const lng = store.coordinates?.lng || -74.072092;
    
    window.open(`https://maps.google.com/?q=${lat},${lng}`, '_blank');
  };

  const handleSignatureSave = (signatureData: string) => {
    if (currentTaskIndex !== null && signatureData) {
      const updatedTasks = [...tasks];
      updatedTasks[currentTaskIndex].signature = signatureData;
      
      if (updatedTasks[currentTaskIndex].requiresSignature) {
        updatedTasks[currentTaskIndex].completed = true;
        updatedTasks[currentTaskIndex].timestamp = new Date();
      }
      
      setTasks(updatedTasks);
      setShowSignaturePad(false);
      setCurrentTaskIndex(null);
    }
  };

  const handleDamageCheckTask = (taskIndex: number) => {
    // Abrir el nuevo modal de daños directamente
    setCurrentTaskIndex(taskIndex);
    setShowDamageModal(true);
  };

  const loadCurrentRoute = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      const currentRoute = await routeService.getCurrentRoute(user.id);
      console.log('📡 Ruta completa recibida:', JSON.stringify(currentRoute, null, 2));

      if (!currentRoute) {
        console.error('❌ No se pudo cargar la ruta');
        return;
      }
      
      setRoute(currentRoute);
      
      let currentIndex = 0;
      if (storeVisitId) {
        currentIndex = currentRoute.stores.findIndex(
          store => store.id.toString() === storeVisitId.toString()
        );
      }

      if (currentIndex === -1) currentIndex = 0;
      setCurrentStoreIndex(currentIndex);
      
      setTimeout(() => {
        checkVisitStatus();
      }, 100);
      
    } catch (error) {
      console.error('❌ Error cargando ruta:', error);
      alert('Error cargando la ruta. Intenta nuevamente.');
    }
  }, [user, storeVisitId, checkVisitStatus]);

  const initializeTasks = useCallback(() => {
    if (hasInitializedTasks && tasks.length > 0) return;
    
    setTasks([...taskDefinitions]);
    setHasInitializedTasks(true);
  }, [hasInitializedTasks, tasks.length]);

  const handleStartVisit = async () => {
    if (!route) return;
    
    const newStoreVisitId = route.stores[currentStoreIndex].id;
    
    // 🆕 Limpiar fotos de la visita anterior si existe
    if (storeVisitId && storeVisitId !== newStoreVisitId) {
      await offlineStorage.clearPhotosForVisit(storeVisitId);
      await offlineStorage.deleteVisitState(storeVisitId);
      localStorage.removeItem(`start_time_${storeVisitId}`);
      console.log('🧹 Fotos de visita anterior limpiadas');
    }
    
    try {
      const response = await routeService.startVisit(
        route.id,
        route.stores[currentStoreIndex].id
      );
      
      const startTime = response.startTime ? new Date(response.startTime) : new Date();
      
      // Guardar start_time en localStorage
      localStorage.setItem(`start_time_${route.stores[currentStoreIndex].id}`, startTime.toISOString());
      
      const updatedStores = [...route.stores];
      updatedStores[currentStoreIndex] = {
        ...updatedStores[currentStoreIndex],
        status: 'in-progress',
        start_time: startTime.toISOString()
      };
      
      setRoute({
        ...route,
        stores: updatedStores
      });
      
      setIsTimerRunning(true);
      setVisitStatus('in-progress');
      setTimeInMinutes(0);
      initializeTasks();
      
    } catch (error) {
      console.error('❌ Error iniciando visita:', error);
      alert('Error al iniciar la visita. Intenta nuevamente.');
    }
  };

  const handlePhotosChange = (taskIndex: number, photos: string[]) => {
    const updatedTasks = [...tasks];
    updatedTasks[taskIndex].photos = photos;
    setTasks(updatedTasks);
  };

  const handleBarcodeScanned = async (barcode: string) => {
    setLoading(true);
    try {
      const product = await productService.getProductByBarcode(barcode);
      
      if (product) {
        setCurrentBarcode(barcode);
        setCurrentProduct(product);
        setShowBarcodeScanner(false);
        setShowDamageReport(true);
      } else {
        alert('❌ Producto no encontrado en la base de datos.');
        const tryAgain = window.confirm('¿Quieres escanear otro código?');
        if (tryAgain) {
          setShowBarcodeScanner(true);
        } else {
          setShowBarcodeScanner(false);
        }
      }
    } catch (error) {
      console.error('Error al buscar producto:', error);
      alert('Error al buscar producto en la base de datos');
    } finally {
      setLoading(false);
    }
  };

  const handleDamagePhotosChange = (photos: string[]) => {
    setDamagePhotos(photos);
  };

  const handleAddDamageReport = async () => {
    if (!currentProduct || !route) return;
    
    setLoading(true);
    try {
      const newReport: Omit<IDamageReport, 'id' | 'timestamp'> = {
        barcode: currentBarcode,
        product: currentProduct,
        damageType,
        description: damageDescription,
        photos: damagePhotos,
        severity: damageSeverity,
        storeId: route.stores[currentStoreIndex].storeId.id,
        reportedBy: user!.id
      };

      let reportWithId: IDamageReport;
      
      if (isOnline) {
        const savedReport = await productService.reportDamage(newReport);
        reportWithId = {
          ...savedReport,
          timestamp: new Date()
        };
      } else {
        await offlineStorage.queueSyncAction('damage', newReport);
        reportWithId = {
          id: `local_${Date.now()}`,
          ...newReport,
          timestamp: new Date()
        };
      }
      
      const newDamageReports = [...damageReports, reportWithId];
      setDamageReports(newDamageReports);
      alert(`✅ Reporte de daño guardado para: ${currentProduct.name}`);
      
      // Actualizar tarea de daños
      const damageTaskIndex = tasks.findIndex(t => t.key === 'damageCheck');
      if (damageTaskIndex !== -1) {
        const updatedTasks = [...tasks];
        if (!updatedTasks[damageTaskIndex].barcodes) {
          updatedTasks[damageTaskIndex].barcodes = [];
        }
        updatedTasks[damageTaskIndex].barcodes!.push(currentBarcode);
        
        if (damagePhotos.length > 0 && currentBarcode) {
          updatedTasks[damageTaskIndex].completed = true;
          updatedTasks[damageTaskIndex].timestamp = new Date();
          updatedTasks[damageTaskIndex].additionalData = { hasDamages: true };
          updatedTasks[damageTaskIndex].photos = damagePhotos;
        }
        setTasks(updatedTasks);
        
        // Guardar inmediatamente en offlineStorage
        if (storeVisitId && currentStore) {
          const tasksChecklist = updatedTasks.reduce((acc, task) => {
            acc[task.key] = task.completed;
            return acc;
          }, {} as { [key: string]: boolean });
          
          // Normalizar status
          const normalizedStatus = visitStatus === 'in_progress' ? 'in-progress' : visitStatus;
          
          await offlineStorage.saveVisitState(storeVisitId, {
            routeStoreId: Number(currentStore.id),
            storeId: Number(currentStore.storeId.id),
            storeName: storeInfo.name,
            startTime: new Date().toISOString(),
            status: normalizedStatus as 'pending' | 'in-progress' | 'completed' | 'skipped',
            tasks: updatedTasks,
            tasksChecklist: tasksChecklist,
            timeInStore: timeInMinutes,
            damageReports: newDamageReports,
            restockItems: restockItems,
            notes: visitNotes,
            photos: []
          });
          console.log('💾 Daño guardado inmediatamente');
        }
      }
      
      handleCloseDamageReport();
      
    } catch (error) {
      console.error('Error guardando reporte de daño:', error);
      alert('Error al guardar el reporte de daño');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseDamageReport = () => {
    setShowDamageReport(false);
    setCurrentBarcode('');
    setCurrentProduct(null);
    setDamageDescription('');
    setDamageType('');
    setDamageSeverity('low');
    setDamagePhotos([]);
  };

  const handleRestockSave = async (items: IRestockItem[]) => {
    if (!currentStore) {
      throw new Error('No se encontro la tienda actual para sincronizar la reposicion');
    }

    const routeStoreId = Number(currentStore.id);
    const storeId = Number(currentStore.storeId.id);
    const payloadItems = items.map(({ reported_at, total_value, ...item }) => ({
      ...item,
      route_store_id: routeStoreId,
      store_id: storeId
    }));

    const newRestockItems = isOnline
      ? await restockService.syncRestockItems(routeStoreId, storeId, payloadItems)
      : payloadItems;

    setRestockItems(newRestockItems);
    
    if (currentTaskIndex !== null) {
      const updatedTasks = [...tasks];
      updatedTasks[currentTaskIndex].completed = true;
      updatedTasks[currentTaskIndex].timestamp = new Date();
      updatedTasks[currentTaskIndex].additionalData = {
        totalItems: newRestockItems.reduce((sum, item) => sum + item.quantity, 0),
        uniqueProducts: newRestockItems.length
      };
      setTasks(updatedTasks);
      
      if (storeVisitId && currentStore) {
        const tasksChecklist = updatedTasks.reduce((acc, task) => {
          acc[task.key] = task.completed;
          return acc;
        }, {} as { [key: string]: boolean });
        
        const normalizedStatus = visitStatus === 'in_progress' ? 'in-progress' : visitStatus;
        
        await offlineStorage.saveVisitState(storeVisitId, {
          routeStoreId,
          storeId,
          storeName: storeInfo.name,
          startTime: new Date().toISOString(),
          status: normalizedStatus as 'pending' | 'in-progress' | 'completed' | 'skipped',
          tasks: updatedTasks,
          tasksChecklist: tasksChecklist,
          timeInStore: timeInMinutes,
          damageReports: damageReports,
          restockItems: newRestockItems,
          notes: visitNotes,
          photos: []
        });
        console.log('Restock guardado inmediatamente');
      }
    }
    
    setShowRestockModal(false);
    setCurrentTaskIndex(null);
    
    if (!isOnline) {
      await offlineStorage.queueSyncAction('restock', {
        route_store_id: routeStoreId,
        store_id: storeId,
        items: payloadItems
      });
      alert(`${payloadItems.length} productos registrados localmente. Se sincronizaran cuando haya conexion.`);
    } else {
      const totalQuantity = newRestockItems.reduce((sum, item) => sum + item.quantity, 0);
      alert(`Registro exitoso: ${totalQuantity} productos repuestos`);
    }
  };

  const handleDamageSave = async (newDamages: any[]) => {
    // Si no hay daños (array vacío), marcar como sin daños
    if (newDamages.length === 0) {
      setShowDamageModal(false);
      
      // Marcar tarea de daños como completada sin daños
      if (currentTaskIndex !== null) {
        const updatedTasks = [...tasks];
        updatedTasks[currentTaskIndex].completed = true;
        updatedTasks[currentTaskIndex].timestamp = new Date();
        updatedTasks[currentTaskIndex].additionalData = { noDamages: true };
        updatedTasks[currentTaskIndex].barcodes = []; // Limpiar barcodes
        setTasks(updatedTasks);
        
        // Guardar en offlineStorage
        if (storeVisitId && currentStore) {
          const tasksChecklist = updatedTasks.reduce((acc, task) => {
            acc[task.key] = task.completed;
            return acc;
          }, {} as { [key: string]: boolean });
          
          const normalizedStatus = visitStatus === 'in_progress' ? 'in-progress' : visitStatus;
          
          await offlineStorage.saveVisitState(storeVisitId, {
            routeStoreId: Number(currentStore.id),
            storeId: Number(currentStore.storeId.id),
            storeName: storeInfo.name,
            startTime: new Date().toISOString(),
            status: normalizedStatus as 'pending' | 'in-progress' | 'completed' | 'skipped',
            tasks: updatedTasks,
            tasksChecklist: tasksChecklist,
            timeInStore: timeInMinutes,
            damageReports: damageReports,
            restockItems: restockItems,
            notes: visitNotes,
            photos: []
          });
        }
      }
      
      alert('✅ Revisión de daños completada - Sin productos dañados');
      setCurrentTaskIndex(null);
      return;
    }
    
    // Convertir los daños del nuevo formato al formato existente (IDamageReport)
    const formattedDamages = newDamages.map(damage => ({
      id: damage.id || `local_${Date.now()}`,
      barcode: damage.barcode,
      product: {
        id: '',
        barcode: damage.barcode,
        name: damage.product_name,
        category: damage.product_category,
        brand: damage.product_brand,
        price: 0,
        stock: 0
      },
      damageType: 'producto_danado',
      description: `${damage.quantity} unidades dañadas - Severidad: ${damage.severity}`,
      photos: damage.photos,
      timestamp: new Date(),
      severity: damage.severity,
      storeId: String(route?.stores[currentStoreIndex]?.storeId?.id || ''),
      reportedBy: user!.id,
      quantity: damage.quantity
    }));
    
    const newDamageReports = [...damageReports, ...formattedDamages];
    setDamageReports(newDamageReports);
    setShowDamageModal(false);
    
    // Marcar tarea de daños como completada
    if (currentTaskIndex !== null) {
      const updatedTasks = [...tasks];
      updatedTasks[currentTaskIndex].completed = true;
      updatedTasks[currentTaskIndex].timestamp = new Date();
      // 🆕 Guardar la lista de barcodes para mostrar en el resumen
      updatedTasks[currentTaskIndex].barcodes = formattedDamages.map(d => d.barcode);
      updatedTasks[currentTaskIndex].additionalData = { 
        hasDamages: true, 
        count: formattedDamages.length,
        totalQuantity: formattedDamages.reduce((sum, d) => sum + (d.quantity || 1), 0)
      };
      setTasks(updatedTasks);
      
      // Guardar inmediatamente en offlineStorage
      if (storeVisitId && currentStore) {
        const tasksChecklist = updatedTasks.reduce((acc, task) => {
          acc[task.key] = task.completed;
          return acc;
        }, {} as { [key: string]: boolean });
        
        const normalizedStatus = visitStatus === 'in_progress' ? 'in-progress' : visitStatus;
        
        await offlineStorage.saveVisitState(storeVisitId, {
          routeStoreId: Number(currentStore.id),
          storeId: Number(currentStore.storeId.id),
          storeName: storeInfo.name,
          startTime: new Date().toISOString(),
          status: normalizedStatus as 'pending' | 'in-progress' | 'completed' | 'skipped',
          tasks: updatedTasks,
          tasksChecklist: tasksChecklist,
          timeInStore: timeInMinutes,
          damageReports: newDamageReports,
          restockItems: restockItems,
          notes: visitNotes,
          photos: []
        });
      }
    }
    
    const totalProducts = formattedDamages.reduce((sum, d) => sum + (d.quantity || 1), 0);
    alert(`✅ ${formattedDamages.length} productos dañados reportados (${totalProducts} unidades)`);
    setCurrentTaskIndex(null);
  };

  const handleTaskCheckbox = async (task: ITask, index: number) => {
    if (task.completed) {
      const updatedTasks = [...tasks];
      updatedTasks[index].completed = false;
      updatedTasks[index].timestamp = undefined;
      updatedTasks[index].additionalData = undefined;
      setTasks(updatedTasks);
      
      if (storeVisitId) {
        const checklist = updatedTasks.reduce((acc, t) => {
          acc[t.key] = t.completed;
          return acc;
        }, {} as { [key: string]: boolean });
        await offlineStorage.saveTasksChecklist(storeVisitId, checklist);
      }
      return;
    }

    if (task.key === 'picking') {
      setCurrentTaskIndex(index);
      setShowRestockModal(true);
      return;
    }

    if (task.requiresPhotos && (!task.photos || task.photos.length === 0)) {
      alert('⚠️ Esta tarea requiere al menos 1 foto');
      return;
    }
    
    if (task.requiresSignature && !task.signature) {
      setCurrentTaskIndex(index);
      setShowSignaturePad(true);
      return;
    }
    
    if (task.requiresBarcode && (!task.barcodes || task.barcodes.length === 0)) {
      setCurrentTaskIndex(index);
      setShowBarcodeScanner(true);
      return;
    }
    
    const updatedTasks = [...tasks];
    updatedTasks[index].completed = true;
    updatedTasks[index].timestamp = new Date();
    setTasks(updatedTasks);
    
    if (storeVisitId) {
      const checklist = updatedTasks.reduce((acc, t) => {
        acc[t.key] = t.completed;
        return acc;
      }, {} as { [key: string]: boolean });
      await offlineStorage.saveTasksChecklist(storeVisitId, checklist);
    }
  };

  const validateVisitCompletion = (): { isValid: boolean; missingTasks: string[] } => {
    const missingTasks: string[] = [];
    
    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      
      if (task.key === 'damageCheck') {
        if (!task.completed) {
          missingTasks.push('Debes completar la revisión de averías');
        }
        continue;
      }
      
      if (task.key === 'picking') {
        if (!task.completed) {
          missingTasks.push('Debes registrar los productos repuestos');
        }
        continue;
      }
      
      if (!task.completed) {
        missingTasks.push(task.label);
        continue;
      }
      
      if (task.requiresPhotos && (!task.photos || task.photos.length === 0)) {
        // Solo mostrar advertencia si no hay fotos locales pendientes
        console.log(`⚠️ Tarea ${task.key} no tiene fotos en memoria`);
      }
      
      if (task.requiresSignature && !task.signature) {
        missingTasks.push(`${task.label} (firma requerida)`);
      }
    }
    
    return {
      isValid: missingTasks.length === 0,
      missingTasks
    };
  };

  const handleCompleteVisit = async () => {
    if (!route) return;

    // Verificar token antes de continuar
    const token = localStorage.getItem('token');
    if (!token) {
      alert('Sesión expirada. Por favor, inicia sesión nuevamente.');
      navigate('/login');
      return;
    }

    // Verificar expiración del token
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.exp * 1000 < Date.now()) {
        alert('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
        return;
      }
    } catch (e) {
      console.error('Error verificando token:', e);
    }

    // Verificar si hay fotos pendientes en IndexedDB
    const pendingPhotos = await offlineStorage.getPendingPhotos(storeVisitId);
    if (pendingPhotos.length > 0) {
      console.log(`📸 Hay ${pendingPhotos.length} fotos pendientes por subir`);
    }

    const validation = validateVisitCompletion();
    if (!validation.isValid) {
      alert(`❌ No puedes finalizar la visita. Tareas pendientes:\n\n• ${validation.missingTasks.join('\n• ')}`);
      return;
    }

    // Obtener fotos de las tareas
    const beforePhotoTask = tasks.find(t => t.key === 'evidenceBefore');
    const afterPhotoTask = tasks.find(t => t.key === 'evidenceAfter');
    
    const beforePhotoData = beforePhotoTask?.photos?.[0];
    const afterPhotoData = afterPhotoTask?.photos?.[0];
    
    // Crear FormData para enviar archivos
    const formData = new FormData();
    formData.append('routeId', route.id);
    formData.append('storeVisitId', route.stores[currentStoreIndex].id);
    formData.append('duration', Math.floor(timeInMinutes).toString());
    formData.append('notes', visitNotes);
    formData.append('tasksCompleted', tasks.filter(t => t.completed).length.toString());
    
    // Función para comprimir imagen
    const compressImage = (dataUrl: string, maxWidth: number = 1024): Promise<Blob> => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          canvas.toBlob(blob => {
            if (blob) resolve(blob);
            else reject(new Error('Error comprimiendo imagen'));
          }, 'image/jpeg', 0.7);
        };
        img.onerror = reject;
        img.src = dataUrl;
      });
    };
    
    // Agregar fotos comprimidas si existen
    if (beforePhotoData && beforePhotoData.startsWith('data:image')) {
      try {
        const compressedBlob = await compressImage(beforePhotoData, 1024);
        formData.append('beforePhoto', compressedBlob, 'before.jpg');
        console.log('📸 Foto BEFORE comprimida y agregada');
      } catch (err) {
        console.error('Error procesando foto BEFORE:', err);
      }
    }
    
    if (afterPhotoData && afterPhotoData.startsWith('data:image')) {
      try {
        const compressedBlob = await compressImage(afterPhotoData, 1024);
        formData.append('afterPhoto', compressedBlob, 'after.jpg');
        console.log('📸 Foto AFTER comprimida y agregada');
      } catch (err) {
        console.error('Error procesando foto AFTER:', err);
      }
    }
    
    // Agregar firma si existe
    const signature = tasks.find(t => t.key === 'signature')?.signature;
    if (signature && signature.startsWith('data:image')) {
      try {
        const blob = await (await fetch(signature)).blob();
        formData.append('signature', blob, 'signature.png');
        console.log('✍️ Firma agregada al FormData');
      } catch (err) {
        console.error('Error procesando firma:', err);
      }
    }
    
    // Agregar reportes de daños
    if (damageReports.length > 0) {
      formData.append('productsDamaged', JSON.stringify({
        count: damageReports.length,
        reports: damageReports
      }));
      console.log(`⚠️ ${damageReports.length} reportes de daño agregados`);
    }

    setLoading(true);
    
    // AbortController para timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 segundos
    
    try {
      console.log('📤 Enviando petición a:', `${API_BASE_URL}/routes/complete-visit`);
      
      const response = await fetch(`${API_BASE_URL}/routes/complete-visit`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      console.log('📥 Status response:', response.status);
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        await finalizeVisit();
        alert('✅ Visita completada exitosamente');
      } else {
        throw new Error(result.message || 'Error desconocido');
      }
    } catch (error) {
      clearTimeout(timeoutId);
      console.error('❌ Error finalizando visita:', error);
      
      if (error.name === 'AbortError') {
        alert('⏰ La petición tomó demasiado tiempo. Los datos se guardaron localmente y se sincronizarán después.');
      } else {
        alert(`❌ Error al completar la visita: ${error.message}. Los datos se guardaron localmente.`);
      }
      
      // Guardar localmente para sincronizar después
      const visitData = {
        duration: Math.floor(timeInMinutes),
        notes: visitNotes,
        damageReports: damageReports,
        signature: tasks.find(t => t.key === 'signature')?.signature,
        routeId: route.id,
        storeVisitId: route.stores[currentStoreIndex].id
      };
      await offlineStorage.queueSyncAction('visit_complete', visitData);
      await finalizeVisit(true);
    } finally {
      setLoading(false);
    }
  };

  const finalizeVisit = async (offlineMode = false) => {
    const updatedStores = [...route.stores];
    updatedStores[currentStoreIndex] = {
      ...updatedStores[currentStoreIndex],
      status: 'completed'
    };
    
    setRoute({
      ...route,
      stores: updatedStores,
      completed_stores: (route.completed_stores || 0) + 1
    });
    
    setIsTimerRunning(false);
    setVisitStatus('completed');
    
    // Limpiar fotos y datos de esta visita
    if (storeVisitId) {
      await offlineStorage.clearPhotosForVisit(storeVisitId);
      await offlineStorage.deleteVisitState(storeVisitId);
      localStorage.removeItem(`start_time_${storeVisitId}`);
      console.log('🧹 Datos de visita completada limpiados');
    }
    
    localStorage.removeItem('storeVisitState');
    
    navigate('/dashboard', { 
      state: { 
        message: `¡Visita a ${storeInfo.name} completada!`,
        summary: {
          tasksCompleted: completedTasks,
          totalTasks,
          timeSpent: Math.floor(timeInMinutes),
          damageReports: damageReports.length,
          restockedItems: restockItems.length,
          restockedQuantity: restockItems.reduce((sum, item) => sum + item.quantity, 0)
        }
      } 
    });
  };

  const handleSkipStore = async (reason: string) => {
    if (!route) return;

    try {
      await routeService.skipStoreVisit(
        route.id, 
        route.stores[currentStoreIndex].id, 
        reason
      );
      
      const updatedStores = [...route.stores];
      updatedStores[currentStoreIndex] = {
        ...updatedStores[currentStoreIndex],
        status: 'skipped'
      };
      
      setRoute({
        ...route,
        stores: updatedStores
      });
      
      setIsTimerRunning(false);
      setVisitStatus('skipped');
      
      // Limpiar fotos y datos de esta visita
      if (storeVisitId) {
        await offlineStorage.clearPhotosForVisit(storeVisitId);
        await offlineStorage.deleteVisitState(storeVisitId);
        localStorage.removeItem(`start_time_${storeVisitId}`);
        console.log('🧹 Datos de visita saltada limpiados');
      }
      
      alert('✅ Tienda saltada exitosamente');
      navigate('/dashboard');
      
    } catch (error) {
      console.error('❌ Error saltando tienda:', error);
      alert('Error al saltar la tienda');
    }
  };

  const renderTask = (task: ITask, index: number) => {
    if (task.key === 'damageCheck') {
      return (
        <div key={task.key} className={`task-card ${task.completed ? 'completed' : ''}`}>
          <div className="task-content">
            <div className="task-header">
              <input 
                type="checkbox" 
                checked={task.completed}
                onChange={() => handleDamageCheckTask(index)}
                className="task-checkbox"
              />
              <span className="task-label">{task.label}</span>
              <div className="task-requirements">
                {task.requiresPhotos && <span className="requirement-badge">📸</span>}
                {task.requiresBarcode && <span className="requirement-badge">📱</span>}
              </div>
            </div>
            {task.completed ? (
              <div className="task-status">
                <p className="status-success">
                  {task.additionalData?.noDamages ? (
                    '✅ Revisión completada sin daños'
                  ) : task.additionalData?.hasDamages ? (
                    `✅ Reporte completado (${task.additionalData?.count || task.barcodes?.length || 0} productos, ${task.additionalData?.totalQuantity || 0} unidades)`
                  ) : (
                    'Revisión completada'
                  )}
                </p>
                <button className="secondary-btn outline" onClick={() => handleDamageCheckTask(index)}>✏️ Cambiar</button>
              </div>
            ) : (
              <div className="task-actions">
                <p className="task-instruction">Haz clic en el checkbox para revisar daños en bodega</p>
              </div>
            )}
            {task.timestamp && (
              <div className="task-timestamp">Actualizado: {task.timestamp.toLocaleTimeString()}</div>
            )}
          </div>
        </div>
      );
    }
    
    if (task.key === 'picking') {
      return (
        <div key={task.key} className={`task-card ${task.completed ? 'completed' : ''}`}>
          <div className="task-content">
            <div className="task-header">
              <input 
                type="checkbox" 
                checked={task.completed}
                onChange={() => handleTaskCheckbox(task, index)}
                className="task-checkbox"
              />
              <span className="task-label">{task.label}</span>
              <div className="task-requirements"><span className="requirement-badge">📦</span></div>
            </div>
            {task.completed ? (
              <div className="task-status">
                <p className="status-success">✅ Productos repuestos: {task.additionalData?.totalItems || 0} unidades</p>
                <p className="status-success">📦 Tipos diferentes: {task.additionalData?.uniqueProducts || 0}</p>
                <button className="secondary-btn outline" onClick={() => { setCurrentTaskIndex(index); setShowRestockModal(true); }}>✏️ Editar</button>
              </div>
            ) : (
              <div className="task-actions">
                <p className="task-instruction">Haz clic en el checkbox para registrar productos repuestos</p>
              </div>
            )}
            {task.timestamp && (
              <div className="task-timestamp">Completado: {task.timestamp.toLocaleTimeString()}</div>
            )}
          </div>
        </div>
      );
    }
    
    return (
      <div key={task.key} className={`task-card ${task.completed ? 'completed' : ''}`}>
        <div className="task-content">
          <div className="task-main-row">
            <input 
              type="checkbox" 
              checked={task.completed}
              onChange={() => handleTaskCheckbox(task, index)}
              className="task-checkbox"
            />
            <div className="task-info">
              <div className="task-header">
                <span className="task-label">{task.label}</span>
                <div className="task-requirements">
                  {task.requiresPhotos && <span className="requirement-badge">📸</span>}
                  {task.requiresBarcode && <span className="requirement-badge">📱</span>}
                  {task.requiresSignature && <span className="requirement-badge">✍️</span>}
                </div>
              </div>
              {task.timestamp && (
                <div className="task-timestamp">Completado: {task.timestamp.toLocaleTimeString()}</div>
              )}
            </div>
          </div>
          {task.requiresPhotos && (
            <div className="task-photos-section">
              <CameraButton 
                onCapture={(photos) => handlePhotosChange(index, photos)}
                existingPhotos={task.photos || []}
                maxPhotos={6}
                disabled={task.completed}
                required={true}
                visitId={storeVisitId}
                taskKey={task.key}
              />
            </div>
          )}
        </div>
      </div>
    );
  };

  const currentStore = route?.stores?.[currentStoreIndex];
  const storeInfo = {
    name: currentStore?.storeId?.name || 'Tienda sin nombre',
    address: currentStore?.storeId?.address || 'Dirección no disponible'
  };
  const completedTasks = tasks.filter(task => task.completed).length;
  const totalTasks = tasks.length;
  const progressPercentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  const getTimeColor = () => {
    return '#27ae60'; // Siempre verde
  };

  // Guardar estado automáticamente
  useEffect(() => {
    if ((visitStatus === 'in-progress' || visitStatus === 'in_progress') && storeVisitId && currentStore && currentStore.id && currentStore.storeId?.id) {
      const saveInterval = setInterval(() => {
        const tasksChecklist = tasks.reduce((acc, task) => {
          acc[task.key] = task.completed;
          return acc;
        }, {} as { [key: string]: boolean });
        
        // Normalizar status
        const normalizedStatus = visitStatus === 'in_progress' ? 'in-progress' : visitStatus;
        
        offlineStorage.saveVisitState(storeVisitId, {
          routeStoreId: Number(currentStore.id),
          storeId: Number(currentStore.storeId.id),
          storeName: storeInfo.name,
          startTime: new Date().toISOString(),
          status: normalizedStatus as 'pending' | 'in-progress' | 'completed' | 'skipped',
          tasks: tasks,
          tasksChecklist: tasksChecklist,
          timeInStore: timeInMinutes,
          damageReports: damageReports,
          restockItems: restockItems,
          notes: visitNotes,
          photos: []
        });
        console.log('💾 Estado guardado localmente');
      }, 5000);
      
      return () => clearInterval(saveInterval);
    }
  }, [visitStatus, tasks, timeInMinutes, damageReports, restockItems, visitNotes, storeVisitId, currentStore, storeInfo.name]);

  // Detectar cambios de conexión
  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      console.log('🟢 Conexión recuperada, sincronizando...');
      await offlineStorage.syncAll();
    };
    const handleOffline = () => {
      setIsOnline(false);
      console.log('🔴 Sin conexión, trabajando en modo offline');
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    loadSavedState();
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [storeVisitId]);

  // Backup en localStorage
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    const saveState = () => {
      if (tasks.length > 0 && (visitStatus === 'in-progress' || visitStatus === 'in_progress')) {
        const stateToSave = { tasks, timeInStore: timeInMinutes, damageReports, restockItems, visitNotes, storeVisitId, routeId: route?.id, currentStoreIndex, saveTimestamp: new Date().toISOString() };
        localStorage.setItem('storeVisitState', JSON.stringify(stateToSave));
      }
    };
    timeoutId = setTimeout(saveState, 2000);
    return () => { clearTimeout(timeoutId); };
  }, [tasks, timeInMinutes, damageReports, restockItems, visitNotes, visitStatus, route?.id, currentStoreIndex, storeVisitId]);

  useEffect(() => {
    if (hasCheckedStatus && (visitStatus === 'in-progress' || visitStatus === 'in_progress') && tasks.length === 0) {
      const savedState = localStorage.getItem('storeVisitState');
      if (savedState) {
        try {
          const parsedState = JSON.parse(savedState);
          if (parsedState.storeVisitId === storeVisitId) {
            if (parsedState.tasks && parsedState.tasks.length > 0) { setTasks(parsedState.tasks); setHasInitializedTasks(true); }
            if (parsedState.timeInStore !== undefined) setTimeInMinutes(parsedState.timeInStore);
            if (parsedState.damageReports) setDamageReports(parsedState.damageReports);
            if (parsedState.restockItems) setRestockItems(parsedState.restockItems);
            if (parsedState.visitNotes) setVisitNotes(parsedState.visitNotes);
            return;
          }
        } catch (error) { console.error('Error recuperando estado:', error); }
      }
      if (!hasInitializedTasks) initializeTasks();
    }
  }, [hasCheckedStatus, visitStatus, storeVisitId, hasInitializedTasks, tasks.length, initializeTasks]);

  useEffect(() => {
    if (user && !route) loadCurrentRoute();
  }, [user, route, loadCurrentRoute]);

  useEffect(() => {
    if (route && !hasCheckedStatus) checkVisitStatus();
  }, [route, hasCheckedStatus, checkVisitStatus]);

  // Temporizador en tiempo real (cada 1 segundo)
  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval>;
    
    if (isTimerRunning && (visitStatus === 'in-progress' || visitStatus === 'in_progress')) {
      const updateRealTime = () => {
        if (!route || !storeVisitId) return;
        
        const currentStoreVisit = route.stores?.find(
          store => store.id.toString() === storeVisitId.toString()
        );
        
        if (currentStoreVisit?.start_time) {
          const startTime = new Date(currentStoreVisit.start_time);
          const now = new Date();
          const diffMs = now.getTime() - startTime.getTime();
          const minutesElapsed = diffMs / 60000;
          
          setTimeInMinutes(prev => {
            if (Math.abs(prev - minutesElapsed) > 0.01) {
              console.log(`⏱️ Tiempo real actualizado: ${minutesElapsed.toFixed(2)} minutos`);
              return minutesElapsed;
            }
            return prev;
          });
        }
      };
      
      updateRealTime();
      intervalId = setInterval(updateRealTime, 1000);
    }
    
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isTimerRunning, visitStatus, route, storeVisitId]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if ((visitStatus === 'in-progress' || visitStatus === 'in_progress') && tasks.some(t => !t.completed)) {
        e.preventDefault();
        e.returnValue = 'Tienes una visita en progreso. ¿Estás seguro de que quieres salir?';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => { window.removeEventListener('beforeunload', handleBeforeUnload); };
  }, [visitStatus, tasks]);

  // Recuperar start_time de localStorage al cargar (para visitas en progreso)
  useEffect(() => {
    const recoverStartTime = async () => {
      if (!storeVisitId) return;
      
      // Si ya tenemos start_time en route, no hacer nada
      if (currentStore?.start_time) {
        console.log('✅ start_time ya existe en route:', currentStore.start_time);
        return;
      }
      
      // Intentar recuperar de localStorage
      const savedStartTime = localStorage.getItem(`start_time_${storeVisitId}`);
      if (savedStartTime) {
        console.log('🔄 Recuperando start_time de localStorage:', savedStartTime);
        
        // Actualizar el route con el start_time recuperado
        if (route) {
          const updatedStores = [...route.stores];
          const storeIndex = updatedStores.findIndex(s => s.id.toString() === storeVisitId.toString());
          if (storeIndex !== -1) {
            updatedStores[storeIndex] = {
              ...updatedStores[storeIndex],
              start_time: savedStartTime
            };
            setRoute({ ...route, stores: updatedStores });
            
            // Calcular tiempo transcurrido
            const startTime = new Date(savedStartTime);
            const now = new Date();
            const minutesElapsed = (now.getTime() - startTime.getTime()) / 60000;
            setTimeInMinutes(minutesElapsed);
            console.log(`⏱️ Tiempo recuperado: ${minutesElapsed.toFixed(2)} minutos`);
          }
        }
      } else {
        // Intentar recuperar de offlineStorage
        const saved = await offlineStorage.getVisitState(storeVisitId);
        if (saved?.startTime) {
          console.log('🔄 Recuperando start_time de offlineStorage:', saved.startTime);
          localStorage.setItem(`start_time_${storeVisitId}`, saved.startTime);
          
          const startTime = new Date(saved.startTime);
          const now = new Date();
          const minutesElapsed = (now.getTime() - startTime.getTime()) / 60000;
          setTimeInMinutes(minutesElapsed);
        }
      }
    };
    
    recoverStartTime();
  }, [storeVisitId, currentStore, route]);
  
  if (!route) {
    return (
      <div className="store-visit-container">
        <div className="visit-status pending"><h3>Cargando ruta...</h3></div>
      </div>
    );
  }

  if (!currentStore) {
    return (
      <div className="store-visit-container">
        <div className="visit-status pending">
          <h3>Error: Tienda no encontrada</h3>
          <button className="primary-action-btn" onClick={() => navigate('/dashboard')}>Volver al Dashboard</button>
        </div>
      </div>
    );
  }

  const renderVisitContent = () => {
    const normalizedStatus = normalizeStatus(visitStatus);
    switch (normalizedStatus) {
      case 'pending':
        return (
          <div className="visit-pending">
            <div className="visit-status pending"><h3>🟡 Visita Pendiente</h3><p>Presiona "Iniciar Visita" para comenzar</p></div>
            <button className="primary-action-btn" onClick={handleStartVisit}>🏪 Iniciar Visita</button>
          </div>
        );
      case 'in-progress':
        return (
          <div className="visit-in-progress">
            <div className="visit-status in-progress">
              <h3>🟢 Visita en Progreso</h3>
              <p>Progreso: {progressPercentage.toFixed(0)}% completado</p>
              <p className="time-elapsed">⏱️ Tiempo: {formatTime(timeInMinutes)}</p>
            </div>
            <div className="tasks-section">
              <h3>📋 Checklist de Tareas:</h3>
              <div className="tasks-list">{tasks.map((task, index) => renderTask(task, index))}</div>
              {damageReports.length > 0 && (
                <div className="damage-reports"><h4>⚠️ Reportes de Daños ({damageReports.length})</h4></div>
              )}
              {restockItems.length > 0 && (
                <div className="restock-summary">
                  <h4>📦 Productos Repuestos ({restockItems.length})</h4>
                  <div className="restock-total">Total: {restockItems.reduce((sum, item) => sum + item.quantity, 0)} unidades</div>
                </div>
              )}
              <div className="visit-notes">
                <h4>📝 Notas</h4>
                <textarea value={visitNotes} onChange={(e) => setVisitNotes(e.target.value)} placeholder="Agregar notas adicionales..." className="notes-textarea" />
              </div>
              {!isOnline && <div className="offline-banner">⚠️ Modo offline - Los datos se guardarán localmente</div>}
              <div className="visit-actions">
                <button className="action-btn complete-btn" onClick={handleCompleteVisit} disabled={completedTasks !== totalTasks || loading}>
                  {loading ? '⏳ Procesando...' : '✅ Finalizar Visita'}
                </button>
                <button className="action-btn skip-btn" onClick={() => { if (window.confirm('¿Estás seguro de que quieres saltar esta tienda?')) handleSkipStore('Tienda cerrada'); }}>
                  ⏭️ Saltar Tienda
                </button>
              </div>
              {completedTasks === totalTasks && <div className="completion-message">✅ Todas las tareas completadas.</div>}
            </div>
          </div>
        );
      case 'completed':
        return (
          <div className="visit-completed">
            <div className="visit-status completed"><h3>✅ Visita Completada</h3></div>
            <button className="primary-action-btn" onClick={() => navigate('/dashboard')}>➡️ Volver al Dashboard</button>
          </div>
        );
      case 'skipped':
        return (
          <div className="visit-skipped">
            <div className="visit-status skipped"><h3>⏭️ Visita Saltada</h3></div>
            <button className="primary-action-btn" onClick={() => navigate('/dashboard')}>➡️ Volver al Dashboard</button>
          </div>
        );
      default:
        return (
          <div className="visit-pending">
            <div className="visit-status pending"><h3>🔄 Cargando...</h3></div>
          </div>
        );
    }
  };

  return (
    <div className="store-visit-container">
      <header className="store-visit-header">
        <h2>🏪 {storeInfo.name}</h2>
        <p className="store-address">📍 {storeInfo.address}</p>
        
        <button 
          className="secondary-btn primary"
          onClick={openInMaps}
          style={{ marginTop: '10px', marginBottom: '10px' }}
        >
          🗺️ Navegar a Tienda
        </button>
        
        {/* Barra de progreso de tiempo - SIN LÍMITE */}
        <div className="time-progress-container">
          <div className="time-progress-header">
            <span className="time-progress-label">⏱️ Tiempo en visita</span>
            <span className="time-progress-value">
              {formatTime(timeInMinutes)}
            </span>
          </div>
          <div className="time-info" style={{ textAlign: 'center', marginTop: '8px', fontSize: '12px', color: '#666' }}>
            Registrando tiempo real para análisis de eficiencia
          </div>
        </div>
        
        <TaskProgress 
          completed={completedTasks}
          total={totalTasks}
          timeElapsed={Math.floor(timeInMinutes)}
        />
        
      </header>

      {renderVisitContent()}

      {showDamageReport && currentProduct && (
        <div className="damage-modal-overlay">
          <div className="damage-modal">
            <h3>⚠️ Reportar Producto Dañado</h3>
            <div className="product-info"><h4>Producto: {currentProduct.name}</h4><p><strong>Código:</strong> {currentBarcode}</p><p><strong>Marca:</strong> {currentProduct.brand}</p></div>
            <div className="modal-form-group"><label className="modal-label">📸 Fotos del daño (máx 6):</label><CameraButton onCapture={handleDamagePhotosChange} existingPhotos={damagePhotos} maxPhotos={6} disabled={loading} required={true} /></div>
            <div className="modal-form-group"><label className="modal-label">Tipo de Daño:</label><select value={damageType} onChange={(e) => setDamageType(e.target.value)} className="modal-select" disabled={loading}><option value="">Seleccionar tipo</option><option value="empaque_danado">Empaque dañado</option><option value="producto_vencido">Producto vencido</option><option value="producto_abierto">Producto abierto</option><option value="producto_roto">Producto roto</option><option value="otro">Otro</option></select></div>
            <div className="modal-form-group"><label className="modal-label">Severidad:</label><select value={damageSeverity} onChange={(e) => setDamageSeverity(e.target.value as 'low' | 'medium' | 'high')} className="modal-select" disabled={loading}><option value="low">Baja</option><option value="medium">Media</option><option value="high">Alta</option></select></div>
            <div className="modal-form-group"><label className="modal-label">Descripción:</label><textarea value={damageDescription} onChange={(e) => setDamageDescription(e.target.value)} placeholder="Describir el daño encontrado..." className="modal-textarea" disabled={loading} rows={3} /></div>
            <div className="modal-actions"><button className="modal-btn cancel" onClick={handleCloseDamageReport} disabled={loading}>Cancelar</button><button className="modal-btn report" onClick={handleAddDamageReport} disabled={!damageType || !damageDescription || damagePhotos.length === 0 || loading}>{loading ? '⏳ Guardando...' : '📝 Guardar'}</button></div>
          </div>
        </div>
      )}

      {showDamageModal && (
        <DamageModal
          storeId={Number(currentStore?.storeId?.id)}
          routeStoreId={Number(currentStore?.id)}
          reportedBy={Number(user!.id)}
          existingDamages={damageReports}
          onClose={() => setShowDamageModal(false)}
          onSave={handleDamageSave}
        />
      )}

      {showSignaturePad && <SignaturePad onSave={handleSignatureSave} onClose={() => setShowSignaturePad(false)} />}
      
      {showBarcodeScanner && (
        <div className="barcode-modal-overlay">
          <div className="barcode-modal">
            <div className="barcode-modal-header"><h3>📱 Escanear Código de Barras</h3><button onClick={() => setShowBarcodeScanner(false)} className="close-modal-btn">×</button></div>
            <div className="barcode-modal-content"><BarcodeScannerButton onScan={handleBarcodeScanned} disabled={loading} /></div>
            <div className="barcode-modal-footer"><button className="modal-btn cancel" onClick={() => setShowBarcodeScanner(false)}>Cancelar</button></div>
          </div>
        </div>
      )}

      {showRestockModal && route && (
        <RestockModal
          routeStoreId={Number(route.stores[currentStoreIndex].id)}
          storeId={Number(route.stores[currentStoreIndex].storeId.id)}
          reportedBy={Number(user!.id)}
          existingItems={restockItems}
          onClose={() => { setShowRestockModal(false); setCurrentTaskIndex(null); }}
          onSave={handleRestockSave}
        />
      )}
    </div>
  );
};

export default StoreVisit;