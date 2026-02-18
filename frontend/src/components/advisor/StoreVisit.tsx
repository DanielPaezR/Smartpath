// frontend/src/components/advisor/StoreVisit.tsx - VERSIÓN CON CÁMARA NATIVA
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { routeService, type IRoute } from '../../services/routeService';
import { useAuth } from '../../contexts/AuthContext';
import PhotoUpload from '../common/PhotoUpload';
import SignaturePad from '../common/SignaturePad';
import BarcodeScanner from '../common/BarcodeScanner';
import TaskProgress from '../common/TaskProgress';
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

// 🆕 COMPONENTE SIMPLIFICADO - USA CÁMARA NATIVA DEL TELÉFONO
const CameraButton: React.FC<{
  onCapture: (photos: string[]) => void;
  existingPhotos?: string[];
  maxPhotos?: number;
  disabled?: boolean;
}> = ({ onCapture, existingPhotos = [], maxPhotos = 5, disabled = false }) => {
  const [capturedPhotos, setCapturedPhotos] = useState<string[]>(existingPhotos);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    if (capturedPhotos.length + files.length > maxPhotos) {
      alert(`Máximo ${maxPhotos} fotos permitidas`);
      return;
    }

    // Procesar cada archivo
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

    // Limpiar el input para poder seleccionar el mismo archivo nuevamente
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
      {/* INPUT OCULTO PARA CÁMARA */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        capture="environment"
        multiple
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />

      {/* BOTÓN QUE ABRE LA CÁMARA NATIVA */}
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={disabled || capturedPhotos.length >= maxPhotos}
        className="camera-open-btn"
      >
        📸 Tomar Foto {capturedPhotos.length > 0 && `(${capturedPhotos.length}/${maxPhotos})`}
      </button>

      {/* PREVIEW DE FOTOS TOMADAS */}
      {capturedPhotos.length > 0 && (
        <div className="photos-preview">
          <p><strong>Fotos tomadas ({capturedPhotos.length}):</strong></p>
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
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Servicio para productos
const productService = {
  getProductByBarcode: async (barcode: string): Promise<IProduct | null> => {
    try {
      const response = await fetch(`/api/routes/products/barcode/${barcode}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Producto no encontrado');
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
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [showDamageReport, setShowDamageReport] = useState(false);
  
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

  // FUNCIÓN SIMPLIFICADA PARA TAREA DE DAÑOS - DOS OPCIONES
  const handleDamageCheckTask = (taskIndex: number) => {
    const task = tasks[taskIndex];
    
    if (task.completed) {
      // Desmarcar si ya está completada
      const updatedTasks = [...tasks];
      updatedTasks[taskIndex].completed = false;
      updatedTasks[taskIndex].timestamp = undefined;
      updatedTasks[taskIndex].additionalData = undefined;
      setTasks(updatedTasks);
    } else {
      // MOSTRAR OPCIÓN: REPORTAR DAÑOS O SIN DAÑOS
      const option = window.confirm(
        '¿Cómo quieres completar la revisión de bodega?\n\n' +
        '✅ Aceptar = Reportar productos dañados\n' +
        '❌ Cancelar = Marcar como "Sin daños"'
      );
      
      if (option) {
        // OPCIÓN 1: REPORTAR DAÑOS
        setCurrentTaskIndex(taskIndex);
        setShowBarcodeScanner(true);
      } else {
        // OPCIÓN 2: SIN DAÑOS
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

  // Manejo de códigos de barras
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

  // FUNCIÓN MEJORADA PARA GUARDAR REPORTE
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
      
      // ACTUALIZAR LA TAREA
      const damageTaskIndex = tasks.findIndex(t => t.key === 'damageCheck');
      if (damageTaskIndex !== -1) {
        const updatedTasks = [...tasks];
        if (!updatedTasks[damageTaskIndex].barcodes) {
          updatedTasks[damageTaskIndex].barcodes = [];
        }
        updatedTasks[damageTaskIndex].barcodes!.push(currentBarcode);
        
        // Marcar como completada si tiene fotos y código
        if (damagePhotos.length > 0 && currentBarcode) {
          updatedTasks[damageTaskIndex].completed = true;
          updatedTasks[damageTaskIndex].timestamp = new Date();
          updatedTasks[damageTaskIndex].additionalData = { hasDamages: true };
          
          // Guardar fotos en la tarea también
          updatedTasks[damageTaskIndex].photos = damagePhotos;
        }
        
        setTasks(updatedTasks);
      }
      
      alert(`✅ Reporte de daño guardado para: ${currentProduct.name}`);
      
      // Preguntar si quiere agregar otro
      const continueAdding = window.confirm(
        `¿Quieres agregar otro producto dañado?\n\n` +
        `✅ Aceptar = Escanear otro producto\n` +
        `❌ Cancelar = Volver a tareas`
      );
      
      if (continueAdding) {
        // Resetear para nuevo reporte
        setCurrentBarcode('');
        setCurrentProduct(null);
        setDamageDescription('');
        setDamageType('');
        setDamageSeverity('low');
        // Mantener las fotos existentes
        // setDamagePhotos([]); // No limpiar fotos
        
        setShowDamageReport(false);
        setShowBarcodeScanner(true);
      } else {
        // Cerrar todo
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
  };

  const validateVisitCompletion = (): { isValid: boolean; missingTasks: string[] } => {
    const missingTasks: string[] = [];
    
    tasks.forEach(task => {
      if (task.key === 'damageCheck') {
        if (!task.completed) {
          missingTasks.push('Debes completar la revisión de averías');
        }
        return;
      }
      
      if (!task.completed) {
        missingTasks.push(task.label);
      }
      
      if (task.requiresPhotos && (!task.photos || task.photos.length === 0)) {
        if (!task.completed) {
          missingTasks.push(`${task.label} (fotos requeridas)`);
        }
      }
      
      if (task.requiresSignature && !task.signature) {
        if (!task.completed) {
          missingTasks.push(`${task.label} (firma requerida)`);
        }
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
          notes: visitNotes || `Tareas completadas: ${completedTasks}/${totalTasks}. Reportes de daño: ${damageReports.length}`,
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
            damageReports: damageReports.length
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
    // TAREA DE DAMAGE CHECK SIMPLIFICADA
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
            
            {/* Estado de la tarea */}
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
            
            {/* Timestamp */}
            {task.timestamp && (
              <div className="task-timestamp">
                Actualizado: {task.timestamp.toLocaleTimeString()}
              </div>
            )}
          </div>
        </div>
      );
    }
    
    // TAREAS NORMALES CON CÁMARA
    return (
      <div key={task.key} className={`task-card ${task.completed ? 'completed' : ''}`}>
        <div className="task-content">
          <input 
            type="checkbox" 
            checked={task.completed}
            onChange={() => {
              if (task.requiresPhotos && (!task.photos || task.photos.length === 0)) {
                alert('⚠️ Esta tarea requiere fotos');
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
              updatedTasks[index].completed = !updatedTasks[index].completed;
              updatedTasks[index].timestamp = new Date();
              setTasks(updatedTasks);
            }}
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
            
            {/* SUBIDA DE FOTOS CON CÁMARA NATIVA */}
            {task.requiresPhotos && (
              <div className="task-additional">
                <CameraButton 
                  onCapture={(photos) => handlePhotosChange(index, photos)}
                  existingPhotos={task.photos || []}
                  maxPhotos={5}
                  disabled={task.completed}
                />
              </div>
            )}
            
            {/* Estado */}
            {task.timestamp && (
              <div className="task-timestamp">
                Completado: {task.timestamp.toLocaleTimeString()}
              </div>
            )}
          </div>
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
  }, [tasks, timeInStore, damageReports, visitNotes, visitStatus, route?.id, currentStoreIndex, storeVisitId]);

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

              {damageReports.length > 0 && (
                <div className="damage-reports">
                  <h4>⚠️ Reportes de Daños ({damageReports.length})</h4>
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

            {/* CÁMARA PARA TOMAR FOTOS - VERSIÓN NATIVA */}
            <div className="modal-form-group">
              <label className="modal-label">📸 Fotos del daño:</label>
              <CameraButton 
                onCapture={handleDamagePhotosChange}
                existingPhotos={damagePhotos}
                maxPhotos={5}
                disabled={loading}
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
      
      {showBarcodeScanner && (
        <BarcodeScanner 
          onScan={handleBarcodeScanned}
          onClose={() => setShowBarcodeScanner(false)}
        />
      )}
    </div>
  );
};

export default StoreVisit;