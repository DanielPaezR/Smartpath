// frontend/src/components/advisor/StoreVisit.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { routeService, type IRoute } from '../../services/routeService';
import { useAuth } from '../../contexts/AuthContext';
import PhotoUpload from '../common/PhotoUpload';
import SignaturePad from '../common/SignaturePad';
import BarcodeScannerButton from './BarcodeScannerButton';
import RestockModal from './RestockModal';
import TaskProgress from '../common/TaskProgress';
import { restockService, IRestockItem } from '../../services/restockService';
import '../../styles/StoreVisit.css';

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

// COMPONENTE PARA CÁMARA NATIVA - FOTOS
const CameraButton: React.FC<{
  onCapture: (photos: string[]) => void;
  existingPhotos?: string[];
  maxPhotos?: number;
  disabled?: boolean;
  required?: boolean;
}> = ({ onCapture, existingPhotos = [], maxPhotos = 3, disabled = false, required = false }) => {
  const [capturedPhotos, setCapturedPhotos] = useState<string[]>(existingPhotos);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    if (capturedPhotos.length + files.length > maxPhotos) {
      alert(`Máximo ${maxPhotos} fotos permitidas`);
      return;
    }

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const photoData = reader.result as string;
        const newPhotos = [...capturedPhotos, photoData];
        setCapturedPhotos(newPhotos);
        onCapture(newPhotos);
      };
      reader.readAsDataURL(file);
    });

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
        disabled={disabled || capturedPhotos.length >= maxPhotos}
        className="camera-open-btn"
      >
        📸 {capturedPhotos.length === 0 ? 'Tomar Foto' : 'Agregar Foto'} 
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
      const response = await fetch(`/~daniel.paez/smartpath/api/products/barcode/${barcode}`, {
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
      
      const response = await fetch('/api/routes/products/report-damage', {
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
  const [timeInStore, setTimeInStore] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [tasks, setTasks] = useState<ITask[]>([]);
  const [currentTaskIndex, setCurrentTaskIndex] = useState<number | null>(null);
  const [damageReports, setDamageReports] = useState<IDamageReport[]>([]);
  const [restockItems, setRestockItems] = useState<IRestockItem[]>([]);
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [showDamageReport, setShowDamageReport] = useState(false);
  const [showRestockModal, setShowRestockModal] = useState(false);
  
  // Estados para formulario de daños
  const [currentBarcode, setCurrentBarcode] = useState<string>('');
  const [currentProduct, setCurrentProduct] = useState<IProduct | null>(null);
  const [damageDescription, setDamageDescription] = useState('');
  const [damageType, setDamageType] = useState('');
  const [damageSeverity, setDamageSeverity] = useState<'low' | 'medium' | 'high'>('low');
  const [damagePhotos, setDamagePhotos] = useState<string[]>([]);
  
  const [visitNotes, setVisitNotes] = useState('');
  const [loading, setLoading] = useState(false);

  // Estados de visita
  const [visitStatus, setVisitStatus] = useState<'pending' | 'in-progress' | 'in_progress' | 'completed' | 'skipped'>('pending');
  const [hasCheckedStatus, setHasCheckedStatus] = useState(false);
  const [hasInitializedTasks, setHasInitializedTasks] = useState(false);

  // Tareas - CONFIGURACIÓN DE FOTOS OPTIMIZADA
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
          const minutesElapsed = Math.floor(diffMs / 60000);
          setTimeInStore(minutesElapsed);
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

  // FUNCIÓN PARA TAREA DE DAÑOS
  const handleDamageCheckTask = (taskIndex: number) => {
    const task = tasks[taskIndex];
    
    if (task.completed) {
      const updatedTasks = [...tasks];
      updatedTasks[taskIndex].completed = false;
      updatedTasks[taskIndex].timestamp = undefined;
      updatedTasks[taskIndex].additionalData = undefined;
      setTasks(updatedTasks);
    } else {
      const option = window.confirm(
        '¿Cómo quieres completar la revisión de bodega?\n\n' +
        '✅ Aceptar = Reportar productos dañados\n' +
        '❌ Cancelar = Marcar como "Sin daños"'
      );
      
      if (option) {
        setCurrentTaskIndex(taskIndex);
        setShowBarcodeScanner(true);
      } else {
        const confirmNoDamages = window.confirm(
          '¿Confirmas que NO encontraste productos dañados en la bodega?\n\n' +
          'Esta acción marcará la tarea como completada sin reportes de daño.'
        );
        
        if (confirmNoDamages) {
          const updatedTasks = [...tasks];
          updatedTasks[taskIndex].completed = true;
          updatedTasks[taskIndex].timestamp = new Date();
          updatedTasks[taskIndex].additionalData = { noDamages: true };
          setTasks(updatedTasks);
        }
      }
    }
  };

  const loadCurrentRoute = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      const currentRoute = await routeService.getCurrentRoute(user.id);
      
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
    
    try {
      await routeService.startVisit(
        route.id,
        route.stores[currentStoreIndex].id
      );
      
      const updatedStores = [...route.stores];
      updatedStores[currentStoreIndex] = {
        ...updatedStores[currentStoreIndex],
        status: 'in-progress'
      };
      
      setRoute({
        ...route,
        stores: updatedStores
      });
      
      setIsTimerRunning(true);
      setVisitStatus('in-progress');
      initializeTasks();
      
    } catch (error) {
      console.error('❌ Error iniciando visita:', error);
      alert('Error al iniciar la visita. Intenta nuevamente.');
    }
  };

  // Manejo de fotos con cámara
  const handlePhotosChange = (taskIndex: number, photos: string[]) => {
    const updatedTasks = [...tasks];
    updatedTasks[taskIndex].photos = photos;
    setTasks(updatedTasks);
  };

  // Manejo de códigos de barras para daños
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

  // FUNCIÓN PARA MANEJAR FOTOS DE DAÑOS
  const handleDamagePhotosChange = (photos: string[]) => {
    setDamagePhotos(photos);
  };

  // FUNCIÓN PARA GUARDAR REPORTE DE DAÑO
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

      const savedReport = await productService.reportDamage(newReport);
      
      const reportWithId: IDamageReport = {
        ...savedReport,
        timestamp: new Date()
      };
      
      setDamageReports(prev => [...prev, reportWithId]);
      
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
      }
      
      alert(`✅ Reporte de daño guardado para: ${currentProduct.name}`);
      
      const continueAdding = window.confirm(
        `¿Quieres agregar otro producto dañado?\n\n` +
        `✅ Aceptar = Escanear otro producto\n` +
        `❌ Cancelar = Volver a tareas`
      );
      
      if (continueAdding) {
        setCurrentBarcode('');
        setCurrentProduct(null);
        setDamageDescription('');
        setDamageType('');
        setDamageSeverity('low');
        setDamagePhotos([]);
        setShowDamageReport(false);
        setShowBarcodeScanner(true);
      } else {
        handleCloseDamageReport();
      }
      
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

  // 🆕 MANEJAR GUARDADO DE REPOSICIONES
  const handleRestockSave = async (items: IRestockItem[]) => {
    setRestockItems(prev => [...prev, ...items]);
    
    if (currentTaskIndex !== null) {
      const updatedTasks = [...tasks];
      updatedTasks[currentTaskIndex].completed = true;
      updatedTasks[currentTaskIndex].timestamp = new Date();
      updatedTasks[currentTaskIndex].additionalData = {
        totalItems: items.reduce((sum, item) => sum + item.quantity, 0),
        uniqueProducts: items.length
      };
      setTasks(updatedTasks);
    }
    
    setShowRestockModal(false);
    setCurrentTaskIndex(null);
    
    // Mostrar resumen
    const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
    alert(`✅ Registro exitoso: ${totalQuantity} productos repuestos`);
  };

  // 🆕 FUNCIÓN PARA MANEJAR CHECKBOX DE TAREAS (ACTUALIZADA)
  const handleTaskCheckbox = (task: ITask, index: number) => {
    if (task.completed) {
      const updatedTasks = [...tasks];
      updatedTasks[index].completed = false;
      updatedTasks[index].timestamp = undefined;
      updatedTasks[index].additionalData = undefined;
      setTasks(updatedTasks);
      return;
    }

    // Para la tarea de picking, abrir modal de reposición
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
  };

  // 🆕 VALIDACIÓN DE VISITA COMPLETA (ACTUALIZADA)
  const validateVisitCompletion = (): { isValid: boolean; missingTasks: string[] } => {
    const missingTasks: string[] = [];
    
    tasks.forEach(task => {
      if (task.key === 'damageCheck') {
        if (!task.completed) {
          missingTasks.push('Debes completar la revisión de averías');
        }
        return;
      }
      
      if (task.key === 'picking') {
        if (!task.completed) {
          missingTasks.push('Debes registrar los productos repuestos');
        }
        return;
      }
      
      if (!task.completed) {
        missingTasks.push(task.label);
      }
      
      if (task.requiresPhotos && (!task.photos || task.photos.length === 0)) {
        missingTasks.push(`${task.label} (requiere al menos 1 foto)`);
      }
      
      if (task.requiresSignature && !task.signature) {
        missingTasks.push(`${task.label} (firma requerida)`);
      }
    });
    
    return {
      isValid: missingTasks.length === 0,
      missingTasks
    };
  };

  const handleCompleteVisit = async () => {
    if (!route) return;

    const validation = validateVisitCompletion();
    if (!validation.isValid) {
      alert(`❌ No puedes finalizar la visita. Tareas pendientes:\n\n• ${validation.missingTasks.join('\n• ')}`);
      return;
    }

    try {
      await routeService.completeVisit(
        route.id,
        route.stores[currentStoreIndex].id,
        {
          duration: timeInStore,
          notes: visitNotes || `Tareas completadas: ${completedTasks}/${totalTasks}. Reportes de daño: ${damageReports.length}. Productos repuestos: ${restockItems.reduce((sum, item) => sum + item.quantity, 0)}`,
          damageReports: damageReports,
          signature: tasks.find(t => t.key === 'signature')?.signature
        }
      );
      
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
      
      localStorage.removeItem('storeVisitState');
      
      navigate('/dashboard', { 
        state: { 
          message: `¡Visita a ${storeInfo.name} completada!`,
          summary: {
            tasksCompleted: completedTasks,
            totalTasks,
            timeSpent: timeInStore,
            damageReports: damageReports.length,
            restockedItems: restockItems.length,
            restockedQuantity: restockItems.reduce((sum, item) => sum + item.quantity, 0)
          }
        } 
      });
      
    } catch (error) {
      console.error('❌ Error finalizando visita:', error);
      alert('Error al completar la visita. Intenta nuevamente.');
    }
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
      alert('✅ Tienda saltada exitosamente');
      navigate('/dashboard');
      
    } catch (error) {
      console.error('❌ Error saltando tienda:', error);
      alert('Error al saltar la tienda');
    }
  };

  // Componente de tarea con cámara
  const renderTask = (task: ITask, index: number) => {
    // TAREA DE DAMAGE CHECK ESPECIAL
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
              
              <span className="task-label">
                {task.label}
              </span>
              
              <div className="task-requirements">
                {task.requiresPhotos && <span className="requirement-badge">📸</span>}
                {task.requiresBarcode && <span className="requirement-badge">📱</span>}
              </div>
            </div>
            
            {task.completed ? (
              <div className="task-status">
                <p className="status-success">
                  ✅ {task.additionalData?.hasDamages 
                    ? `Reporte completado (${task.barcodes?.length || 0} productos)`
                    : 'Revisión completada sin daños'
                  }
                </p>
                <button 
                  className="secondary-btn outline"
                  onClick={() => handleDamageCheckTask(index)}
                >
                  ✏️ Cambiar
                </button>
              </div>
            ) : (
              <div className="task-actions">
                <p className="task-instruction">
                  Haz clic en el checkbox para revisar daños en bodega
                </p>
              </div>
            )}
            
            {task.timestamp && (
              <div className="task-timestamp">
                Actualizado: {task.timestamp.toLocaleTimeString()}
              </div>
            )}
          </div>
        </div>
      );
    }
    
    // TAREA DE PICKING ESPECIAL (ACTUALIZADA)
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
              
              <span className="task-label">
                {task.label}
              </span>
              
              <div className="task-requirements">
                <span className="requirement-badge">📦</span>
              </div>
            </div>
            
            {task.completed ? (
              <div className="task-status">
                <p className="status-success">
                  ✅ Productos repuestos: {task.additionalData?.totalItems || 0} unidades
                </p>
                <p className="status-success">
                  📦 Tipos diferentes: {task.additionalData?.uniqueProducts || 0}
                </p>
                <button 
                  className="secondary-btn outline"
                  onClick={() => {
                    setCurrentTaskIndex(index);
                    setShowRestockModal(true);
                  }}
                >
                  ✏️ Editar
                </button>
              </div>
            ) : (
              <div className="task-actions">
                <p className="task-instruction">
                  Haz clic en el checkbox para registrar productos repuestos
                </p>
              </div>
            )}
            
            {task.timestamp && (
              <div className="task-timestamp">
                Completado: {task.timestamp.toLocaleTimeString()}
              </div>
            )}
          </div>
        </div>
      );
    }
    
    // TAREAS NORMALES CON CHECKBOX FUNCIONAL
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
                <span className="task-label">
                  {task.label}
                </span>
                <div className="task-requirements">
                  {task.requiresPhotos && <span className="requirement-badge">📸</span>}
                  {task.requiresBarcode && <span className="requirement-badge">📱</span>}
                  {task.requiresSignature && <span className="requirement-badge">✍️</span>}
                </div>
              </div>
              
              {task.timestamp && (
                <div className="task-timestamp">
                  Completado: {task.timestamp.toLocaleTimeString()}
                </div>
              )}
            </div>
          </div>
          
          {task.requiresPhotos && (
            <div className="task-photos-section">
              <CameraButton 
                onCapture={(photos) => handlePhotosChange(index, photos)}
                existingPhotos={task.photos || []}
                maxPhotos={3}
                disabled={task.completed}
                required={true}
              />
            </div>
          )}
        </div>
      </div>
    );
  };

  // Efectos optimizados
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    
    const saveState = () => {
      if (tasks.length > 0 && (visitStatus === 'in-progress' || visitStatus === 'in_progress')) {
        const stateToSave = {
          tasks,
          timeInStore,
          damageReports,
          restockItems,
          visitNotes,
          storeVisitId,
          routeId: route?.id,
          currentStoreIndex,
          saveTimestamp: new Date().toISOString()
        };
        
        localStorage.setItem('storeVisitState', JSON.stringify(stateToSave));
      }
    };
    
    timeoutId = setTimeout(saveState, 2000);
    
    return () => {
      clearTimeout(timeoutId);
    };
  }, [tasks, timeInStore, damageReports, restockItems, visitNotes, visitStatus, route?.id, currentStoreIndex, storeVisitId]);

  useEffect(() => {
    if (hasCheckedStatus && (visitStatus === 'in-progress' || visitStatus === 'in_progress') && tasks.length === 0) {
      const savedState = localStorage.getItem('storeVisitState');
      
      if (savedState) {
        try {
          const parsedState = JSON.parse(savedState);
          
          if (parsedState.storeVisitId === storeVisitId) {
            if (parsedState.tasks && parsedState.tasks.length > 0) {
              setTasks(parsedState.tasks);
              setHasInitializedTasks(true);
            }
            
            if (parsedState.timeInStore !== undefined) {
              setTimeInStore(parsedState.timeInStore);
            }
            
            if (parsedState.damageReports) {
              setDamageReports(parsedState.damageReports);
            }
            
            if (parsedState.restockItems) {
              setRestockItems(parsedState.restockItems);
            }
            
            if (parsedState.visitNotes) {
              setVisitNotes(parsedState.visitNotes);
            }
            
            return;
          }
        } catch (error) {
          console.error('Error recuperando estado:', error);
        }
      }
      
      if (!hasInitializedTasks) {
        initializeTasks();
      }
    }
  }, [hasCheckedStatus, visitStatus, storeVisitId, hasInitializedTasks, tasks.length, initializeTasks]);

  useEffect(() => {
    if (user && !route) {
      loadCurrentRoute();
    }
  }, [user, route, loadCurrentRoute]);

  useEffect(() => {
    if (route && !hasCheckedStatus) {
      checkVisitStatus();
    }
  }, [route, hasCheckedStatus, checkVisitStatus]);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    
    if (isTimerRunning && (visitStatus === 'in-progress' || visitStatus === 'in_progress')) {
      timer = setInterval(() => {
        setTimeInStore(prev => prev + 1);
      }, 60000);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isTimerRunning, visitStatus]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if ((visitStatus === 'in-progress' || visitStatus === 'in_progress') && tasks.some(t => !t.completed)) {
        e.preventDefault();
        e.returnValue = 'Tienes una visita en progreso. ¿Estás seguro de que quieres salir?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [visitStatus, tasks]);

  if (!route) {
    return (
      <div className="store-visit-container">
        <div className="visit-status pending">
          <h3>Cargando ruta...</h3>
        </div>
      </div>
    );
  }

  const currentStore = route.stores?.[currentStoreIndex];
  
  if (!currentStore) {
    return (
      <div className="store-visit-container">
        <div className="visit-status pending">
          <h3>Error: Tienda no encontrada</h3>
          <button className="primary-action-btn" onClick={() => navigate('/dashboard')}>
            Volver al Dashboard
          </button>
        </div>
      </div>
    );
  }

  const storeInfo = {
    name: currentStore.storeId?.name || 'Tienda',
    address: currentStore.storeId?.address || 'Dirección no disponible'
  };

  const completedTasks = tasks.filter(task => task.completed).length;
  const totalTasks = tasks.length;
  const progressPercentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  const renderVisitContent = () => {
    const normalizedStatus = normalizeStatus(visitStatus);
    
    switch (normalizedStatus) {
      case 'pending':
        return (
          <div className="visit-pending">
            <div className="visit-status pending">
              <h3>🟡 Visita Pendiente</h3>
              <p>Presiona "Iniciar Visita" para comenzar</p>
            </div>
            <button className="primary-action-btn" onClick={handleStartVisit}>
              🏪 Iniciar Visita
            </button>
          </div>
        );

      case 'in-progress':
        return (
          <div className="visit-in-progress">
            <div className="visit-status in-progress">
              <h3>🟢 Visita en Progreso</h3>
              <p>Progreso: {progressPercentage.toFixed(0)}% completado</p>
              <p className="time-elapsed">⏱️ Tiempo: {timeInStore} minutos</p>
            </div>

            <div className="tasks-section">
              <h3>📋 Checklist de Tareas:</h3>
              
              <div className="tasks-list">
                {tasks.map((task, index) => renderTask(task, index))}
              </div>

              {/* Resumen de daños */}
              {damageReports.length > 0 && (
                <div className="damage-reports">
                  <h4>⚠️ Reportes de Daños ({damageReports.length})</h4>
                  {damageReports.slice(0, 3).map((report, index) => (
                    <div key={index} className="damage-item">
                      <span>{report.product.name}</span>
                      <span className="damage-severity">{report.severity}</span>
                    </div>
                  ))}
                  {damageReports.length > 3 && (
                    <p>... y {damageReports.length - 3} más</p>
                  )}
                </div>
              )}

              {/* 🆕 Resumen de productos repuestos */}
              {restockItems.length > 0 && (
                <div className="restock-summary">
                  <h4>📦 Productos Repuestos ({restockItems.length})</h4>
                  <div className="restock-items-list">
                    {restockItems.slice(0, 3).map((item, index) => (
                      <div key={index} className="restock-item">
                        <span>{item.product_name}</span>
                        <span className="restock-quantity">x{item.quantity}</span>
                      </div>
                    ))}
                    {restockItems.length > 3 && (
                      <p className="more-items">... y {restockItems.length - 3} más</p>
                    )}
                  </div>
                  <div className="restock-total">
                    Total: {restockItems.reduce((sum, item) => sum + item.quantity, 0)} unidades
                    {restockItems.some(i => i.unit_price) && (
                      <> | Valor: ${restockItems.reduce((sum, item) => sum + (item.quantity * (item.unit_price || 0)), 0).toFixed(2)}</>
                    )}
                  </div>
                </div>
              )}

              <div className="visit-notes">
                <h4>📝 Notas</h4>
                <textarea 
                  value={visitNotes}
                  onChange={(e) => setVisitNotes(e.target.value)}
                  placeholder="Agregar notas adicionales..."
                  className="notes-textarea"
                />
              </div>

              <div className="visit-actions">
                <button 
                  className="action-btn complete-btn"
                  onClick={handleCompleteVisit}
                  disabled={completedTasks !== totalTasks || loading}
                >
                  {loading ? '⏳ Procesando...' : '✅ Finalizar Visita'}
                </button>
                
                <button 
                  className="action-btn skip-btn"
                  onClick={() => {
                    if (window.confirm('¿Estás seguro de que quieres saltar esta tienda?')) {
                      handleSkipStore('Tienda cerrada');
                    }
                  }}
                >
                  ⏭️ Saltar Tienda
                </button>
              </div>

              {completedTasks === totalTasks && (
                <div className="completion-message">
                  ✅ Todas las tareas completadas.
                </div>
              )}
            </div>
          </div>
        );

      case 'completed':
        return (
          <div className="visit-completed">
            <div className="visit-status completed">
              <h3>✅ Visita Completada</h3>
              {restockItems.length > 0 && (
                <p>📦 {restockItems.reduce((sum, item) => sum + item.quantity, 0)} productos repuestos</p>
              )}
            </div>
            <button className="primary-action-btn" onClick={() => navigate('/dashboard')}>
              ➡️ Volver al Dashboard
            </button>
          </div>
        );

      case 'skipped':
        return (
          <div className="visit-skipped">
            <div className="visit-status skipped">
              <h3>⏭️ Visita Saltada</h3>
            </div>
            <button className="primary-action-btn" onClick={() => navigate('/dashboard')}>
              ➡️ Volver al Dashboard
            </button>
          </div>
        );

      default:
        return (
          <div className="visit-pending">
            <div className="visit-status pending">
              <h3>🔄 Cargando...</h3>
            </div>
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
        
        <TaskProgress 
          completed={completedTasks}
          total={totalTasks}
          timeElapsed={timeInStore}
          maxTime={40}
        />
        
        {timeInStore >= 40 && (visitStatus === 'in-progress' || visitStatus === 'in_progress') && (
          <div className="time-warning">
            ⚠️ Has excedido el tiempo máximo
          </div>
        )}
      </header>

      {renderVisitContent()}

      {/* Modal de Reporte de Daños con cámara */}
      {showDamageReport && currentProduct && (
        <div className="damage-modal-overlay">
          <div className="damage-modal">
            <h3>⚠️ Reportar Producto Dañado</h3>
            
            <div className="product-info">
              <h4>Producto: {currentProduct.name}</h4>
              <p><strong>Código:</strong> {currentBarcode}</p>
              <p><strong>Marca:</strong> {currentProduct.brand}</p>
            </div>

            <div className="modal-form-group">
              <label className="modal-label">📸 Fotos del daño (máx 3):</label>
              <CameraButton 
                onCapture={handleDamagePhotosChange}
                existingPhotos={damagePhotos}
                maxPhotos={3}
                disabled={loading}
                required={true}
              />
            </div>

            <div className="modal-form-group">
              <label className="modal-label">Tipo de Daño:</label>
              <select 
                value={damageType}
                onChange={(e) => setDamageType(e.target.value)}
                className="modal-select"
                disabled={loading}
              >
                <option value="">Seleccionar tipo</option>
                <option value="empaque_danado">Empaque dañado</option>
                <option value="producto_vencido">Producto vencido</option>
                <option value="producto_abierto">Producto abierto</option>
                <option value="producto_roto">Producto roto</option>
                <option value="otro">Otro</option>
              </select>
            </div>

            <div className="modal-form-group">
              <label className="modal-label">Severidad:</label>
              <select 
                value={damageSeverity}
                onChange={(e) => setDamageSeverity(e.target.value as 'low' | 'medium' | 'high')}
                className="modal-select"
                disabled={loading}
              >
                <option value="low">Baja</option>
                <option value="medium">Media</option>
                <option value="high">Alta</option>
              </select>
            </div>

            <div className="modal-form-group">
              <label className="modal-label">Descripción:</label>
              <textarea 
                value={damageDescription}
                onChange={(e) => setDamageDescription(e.target.value)}
                placeholder="Describir el daño encontrado..."
                className="modal-textarea"
                disabled={loading}
                rows={3}
              />
            </div>

            <div className="modal-actions">
              <button 
                className="modal-btn cancel"
                onClick={handleCloseDamageReport}
                disabled={loading}
              >
                Cancelar
              </button>
              <button 
                className="modal-btn report"
                onClick={handleAddDamageReport}
                disabled={!damageType || !damageDescription || damagePhotos.length === 0 || loading}
              >
                {loading ? '⏳ Guardando...' : '📝 Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showSignaturePad && (
        <SignaturePad 
          onSave={handleSignatureSave}
          onClose={() => setShowSignaturePad(false)}
        />
      )}
      
      {/* Modal de Escaneo de Código de Barras */}
      {showBarcodeScanner && (
        <div className="barcode-modal-overlay">
          <div className="barcode-modal">
            <div className="barcode-modal-header">
              <h3>📱 Escanear Código de Barras</h3>
              <button 
                onClick={() => setShowBarcodeScanner(false)}
                className="close-modal-btn"
              >
                ×
              </button>
            </div>
            
            <div className="barcode-modal-content">
              <BarcodeScannerButton 
                onScan={handleBarcodeScanned}
                disabled={loading}
              />
            </div>
            
            <div className="barcode-modal-footer">
              <button 
                className="modal-btn cancel"
                onClick={() => setShowBarcodeScanner(false)}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🆕 Modal de Registro de Reposiciones */}
      {showRestockModal && route && (
        <RestockModal
          routeStoreId={Number(route.stores[currentStoreIndex].id)}
          storeId={Number(route.stores[currentStoreIndex].storeId.id)}
          reportedBy={Number(user!.id)}
          onClose={() => {
            setShowRestockModal(false);
            setCurrentTaskIndex(null);
          }}
          onSave={handleRestockSave}
        />
      )}
    </div>
  );
};

export default StoreVisit;