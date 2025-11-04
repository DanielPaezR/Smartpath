// frontend/src/components/advisor/StoreVisit.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
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

// Servicio para productos
const productService = {
  getProductByBarcode: async (barcode: string): Promise<IProduct | null> => {
    try {
      const response = await fetch(`/api/products/barcode/${barcode}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Producto no encontrado');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error buscando producto:', error);
      return null;
    }
  },

  reportDamage: async (damageReport: Omit<IDamageReport, 'id' | 'timestamp'>) => {
    try {
      const response = await fetch('/api/products/report-damage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(damageReport)
      });
      
      if (!response.ok) {
        throw new Error('Error reportando daño');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error reportando daño:', error);
      throw error;
    }
  }
};

// Servicio de tracking
const trackingService = {
  updateLocation: async (latitude: number, longitude: number, currentStoreId?: string, activityStatus?: string) => {
    try {
      const response = await fetch('/api/tracking/update-location', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          latitude,
          longitude,
          currentStoreId,
          activityStatus,
          batteryLevel: 100
        })
      });
      
      if (!response.ok) {
        throw new Error('Error updating location');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error en tracking:', error);
    }
  }
};

const StoreVisit: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
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
  const [currentBarcode, setCurrentBarcode] = useState<string>('');
  const [currentProduct, setCurrentProduct] = useState<IProduct | null>(null);
  const [damageDescription, setDamageDescription] = useState('');
  const [damageType, setDamageType] = useState('');
  const [damageSeverity, setDamageSeverity] = useState<'low' | 'medium' | 'high'>('low');
  const [damagePhotos, setDamagePhotos] = useState<string[]>([]);
  const [visitNotes, setVisitNotes] = useState('');
  const [loading, setLoading] = useState(false);

  // Tareas mejoradas
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
      label: '⚠️ Revisar en bodega las averías (evidencia fotográfica y escaneo)', 
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

  // 🆕 FUNCIÓN PARA NAVEGACIÓN A MAPS
  const openInMaps = () => {
    if (!route?.stores?.[currentStoreIndex]?.storeId?.coordinates) {
      alert('No hay coordenadas disponibles para esta tienda');
      return;
    }

    const store = route.stores[currentStoreIndex].storeId;
    const lat = store.coordinates?.lat || 4.710989; // Bogotá por defecto
    const lng = store.coordinates?.lng || -74.072092;
    const storeName = encodeURIComponent(store.name || 'Tienda');
    
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    if (isMobile) {
      // Intentar con Waze primero
      window.open(`waze://?ll=${lat},${lng}&navigate=yes`, '_blank');
      // Fallback a Google Maps después de un delay
      setTimeout(() => {
        window.open(`https://maps.google.com/?q=${lat},${lng}`, '_blank');
      }, 500);
    } else {
      // Desktop - Google Maps
      window.open(`https://maps.google.com/?q=${lat},${lng}`, '_blank');
    }
  };

  // Función para actualizar ubicación
  const updateAdvisorLocation = async (storeId?: string, activityStatus: string = 'at_store') => {
    try {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            trackingService.updateLocation(
              position.coords.latitude,
              position.coords.longitude,
              storeId,
              activityStatus
            ).then(() => {
              console.log('📍 Ubicación actualizada');
            }).catch((error) => {
              console.warn('Error actualizando ubicación:', error);
            });
          },
          (error) => {
            console.warn('No se pudo obtener la ubicación:', error);
            trackingService.updateLocation(0, 0, storeId, activityStatus)
              .then(() => console.log('📍 Ubicación actualizada (fallback)'))
              .catch(err => console.warn('Error actualizando ubicación fallback:', err));
          },
          { 
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 60000 
          }
        );
      } else {
        trackingService.updateLocation(0, 0, storeId, activityStatus)
          .then(() => console.log('📍 Ubicación actualizada (sin geolocalización)'))
          .catch(err => console.warn('Error actualizando ubicación sin geolocalización:', err));
      }
    } catch (error) {
      console.error('Error en updateAdvisorLocation:', error);
    }
  };

  const loadCurrentRoute = async () => {
    try {
      const currentRoute = await routeService.getCurrentRoute(user!.id);
      setRoute(currentRoute);
      
      if (currentRoute) {
        // Si viene de un storeId específico, encontrar ese índice
        const storeIdFromState = location.state?.storeId;
        let currentIndex;
        
        if (storeIdFromState) {
          currentIndex = currentRoute.stores.findIndex(store => store.id === storeIdFromState);
        } else {
          currentIndex = currentRoute.stores.findIndex(
            store => store.status === 'in-progress' || store.status === 'pending'
          );
        }
        
        setCurrentStoreIndex(Math.max(0, currentIndex));
        
        // Inicializar tareas si la visita está en progreso
        if (currentIndex >= 0 && currentRoute.stores[currentIndex].status === 'in-progress') {
          initializeTasks();
          setIsTimerRunning(true);
        }
      }
    } catch (error) {
      console.error('Error cargando ruta:', error);
      alert('Error cargando la ruta. Intenta nuevamente.');
    }
  };

  const initializeTasks = () => {
    setTasks([...taskDefinitions]);
  };

  const handleStartVisit = async () => {
    if (!route) return;
    
    try {
      console.log('🔄 Iniciando visita...');
      
      const result = await routeService.startVisit(
        route.id,
        route.stores[currentStoreIndex].id
      );
      
      console.log('✅ Visita iniciada:', result);
      
      // Actualizar el estado local para reflejar que la visita comenzó
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
      initializeTasks();
      
      // ACTUALIZAR TRACKING - Asesor llega a la tienda
      await updateAdvisorLocation(route.stores[currentStoreIndex].storeId?.id?.toString(), 'at_store');
      
    } catch (error) {
      console.error('❌ Error iniciando visita:', error);
      alert('Error al iniciar la visita. Intenta nuevamente.');
    }
  };

  // Manejo mejorado de tareas
  const handleTaskComplete = (taskIndex: number) => {
    const task = tasks[taskIndex];
    
    // Validaciones antes de marcar como completada
    if (task.requiresPhotos && (!task.photos || task.photos.length === 0)) {
      alert('⚠️ Esta tarea requiere al menos una foto');
      return;
    }
    
    if (task.requiresBarcode && (!task.barcodes || task.barcodes.length === 0)) {
      setCurrentTaskIndex(taskIndex);
      setShowBarcodeScanner(true);
      return;
    }
    
    if (task.requiresSignature && !task.signature) {
      setCurrentTaskIndex(taskIndex);
      setShowSignaturePad(true);
      return;
    }

    const updatedTasks = [...tasks];
    updatedTasks[taskIndex].completed = !updatedTasks[taskIndex].completed;
    updatedTasks[taskIndex].timestamp = new Date();
    
    setTasks(updatedTasks);
  };

  // Manejo de fotos con compresión
  const handlePhotosChange = (taskIndex: number, photos: string[]) => {
    const updatedTasks = [...tasks];
    updatedTasks[taskIndex].photos = photos;
    setTasks(updatedTasks);
  };

  // Manejo de firma digital
  const handleSignatureSave = (signatureData: string) => {
    if (currentTaskIndex !== null) {
      const updatedTasks = [...tasks];
      updatedTasks[currentTaskIndex].signature = signatureData;
      updatedTasks[currentTaskIndex].completed = true;
      updatedTasks[currentTaskIndex].timestamp = new Date();
      
      setTasks(updatedTasks);
      setShowSignaturePad(false);
      setCurrentTaskIndex(null);
    }
  };

  // Manejo de códigos de barras CONEXIÓN A BD
  const handleBarcodeScanned = async (barcode: string) => {
    setLoading(true);
    try {
      console.log('🔍 Buscando producto con código:', barcode);
      
      const product = await productService.getProductByBarcode(barcode);
      
      if (product) {
        setCurrentBarcode(barcode);
        setCurrentProduct(product);
        setShowBarcodeScanner(false);
        setShowDamageReport(true);
        console.log('✅ Producto encontrado:', product);
      } else {
        alert('❌ Producto no encontrado en la base de datos. Verifica el código de barras.');
      }
    } catch (error) {
      console.error('Error al buscar producto:', error);
      alert('Error al buscar producto en la base de datos');
    } finally {
      setLoading(false);
    }
  };

  // Manejo de reportes de daños
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
      
      // Agregar a la lista local
      const reportWithId: IDamageReport = {
        ...savedReport,
        timestamp: new Date()
      };
      
      setDamageReports(prev => [...prev, reportWithId]);
      
      // Actualizar la tarea de daños
      const damageTaskIndex = tasks.findIndex(t => t.key === 'damageCheck');
      if (damageTaskIndex !== -1) {
        const updatedTasks = [...tasks];
        if (!updatedTasks[damageTaskIndex].barcodes) {
          updatedTasks[damageTaskIndex].barcodes = [];
        }
        updatedTasks[damageTaskIndex].barcodes!.push(currentBarcode);
        setTasks(updatedTasks);
      }
      
      // Resetear formulario
      setShowDamageReport(false);
      setCurrentBarcode('');
      setCurrentProduct(null);
      setDamageDescription('');
      setDamageType('');
      setDamageSeverity('low');
      setDamagePhotos([]);
      
      alert('✅ Reporte de daño guardado exitosamente');
      
    } catch (error) {
      console.error('Error guardando reporte de daño:', error);
      alert('Error al guardar el reporte de daño');
    } finally {
      setLoading(false);
    }
  };

  // Validación completa antes de finalizar
  const validateVisitCompletion = (): { isValid: boolean; missingTasks: string[] } => {
    const missingTasks: string[] = [];
    
    tasks.forEach(task => {
      if (!task.completed) {
        missingTasks.push(task.label);
      }
      
      if (task.requiresPhotos && (!task.photos || task.photos.length === 0)) {
        missingTasks.push(`${task.label} (fotos requeridas)`);
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

    // Validación completa
    const validation = validateVisitCompletion();
    if (!validation.isValid) {
      alert(`❌ No puedes finalizar la visita. Tareas pendientes:\n\n• ${validation.missingTasks.join('\n• ')}`);
      return;
    }

    try {
      console.log('✅ Completando visita...');
      
      const result = await routeService.completeVisit(
        route.id,
        route.stores[currentStoreIndex].id,
        {
          duration: timeInStore,
          notes: visitNotes || `Tareas completadas: ${completedTasks}/${totalTasks}. Reportes de daño: ${damageReports.length}`,
          damageReports: damageReports,
          signature: tasks.find(t => t.key === 'signature')?.signature
        }
      );
      
      console.log('✅ Visita completada:', result);
      
      // Actualizar el estado local
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
      await updateAdvisorLocation(undefined, 'traveling');
      
      // Navegar con resumen
      navigate('/dashboard', { 
        state: { 
          message: `¡Visita a ${storeInfo.name} completada!`,
          summary: {
            tasksCompleted: completedTasks,
            totalTasks,
            timeSpent: timeInStore,
            damageReports: damageReports.length,
            photosTaken: tasks.reduce((acc, task) => acc + (task.photos?.length || 0), 0)
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
      console.log('⏭️ Saltando tienda:', reason);
      
      // Simular saltar tienda
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Actualizar estado local
      const updatedStores = [...route.stores];
      updatedStores[currentStoreIndex] = {
        ...updatedStores[currentStoreIndex],
        status: 'skipped',
        skipReason: reason
      };
      
      setRoute({
        ...route,
        stores: updatedStores
      });
      
      setIsTimerRunning(false);
      
      // ACTUALIZAR TRACKING - Asesor sale sin completar
      await updateAdvisorLocation(undefined, 'traveling');
      
      // Navegar de vuelta al dashboard
      navigate('/dashboard');
      
    } catch (error) {
      console.error('Error saltando tienda:', error);
    }
  };

  // Componente de tarea mejorado
  const renderTask = (task: ITask, index: number) => (
    <div key={task.key} className={`task-card ${task.completed ? 'completed' : ''}`}>
      <div className="task-content">
        <input 
          type="checkbox" 
          checked={task.completed}
          onChange={() => handleTaskComplete(index)}
          className="task-checkbox"
        />
        
        <div className="task-info">
          <div className="task-header">
            <span className="task-label">
              {task.label}
            </span>
            <div className="task-requirements">
              {task.requiresPhotos && <span className="requirement-badge photos">📸</span>}
              {task.requiresBarcode && <span className="requirement-badge barcode">📱</span>}
              {task.requiresSignature && <span className="requirement-badge signature">✍️</span>}
            </div>
          </div>
          
          {/* Subida de fotos con compresión */}
          {task.requiresPhotos && (
            <div className="task-additional">
              <PhotoUpload 
                onPhotosChange={(photos) => handlePhotosChange(index, photos)}
                existingPhotos={task.photos || []}
                maxPhotos={5}
                enableCompression={true}
                maxSizeMB={2}
              />
            </div>
          )}
          
          {/* Escáner de códigos de barras */}
          {task.requiresBarcode && task.barcodes && task.barcodes.length > 0 && (
            <div className="scanned-products">
              <h5>Productos escaneados ({task.barcodes.length}):</h5>
              <div className="barcode-tags">
                {task.barcodes.map((barcode, i) => (
                  <span key={i} className="barcode-tag">
                    {barcode}
                  </span>
                ))}
              </div>
              <button 
                className="secondary-btn primary"
                onClick={() => {
                  setCurrentTaskIndex(index);
                  setShowBarcodeScanner(true);
                }}
              >
                📱 Escanear más productos
              </button>
            </div>
          )}
          
          {/* Firma digital */}
          {task.requiresSignature && task.signature && (
            <div className="signature-section">
              <h5>Firma capturada:</h5>
              <img src={task.signature} alt="Firma" className="signature-image" />
              <button 
                className="secondary-btn warning"
                onClick={() => {
                  setCurrentTaskIndex(index);
                  setShowSignaturePad(true);
                }}
              >
                ✍️ Cambiar firma
              </button>
            </div>
          )}
          
          {/* Timestamp */}
          {task.timestamp && (
            <div className="task-timestamp">
              Completado: {task.timestamp.toLocaleTimeString()}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Actualizar ubicación periódicamente mientras está en tienda
  useEffect(() => {
    let locationInterval: ReturnType<typeof setInterval>;
    
    if (isTimerRunning && route?.stores?.[currentStoreIndex]?.status === 'in-progress') {
      updateAdvisorLocation(route.stores[currentStoreIndex].storeId?.id?.toString(), 'at_store');
      
      locationInterval = setInterval(() => {
        updateAdvisorLocation(route.stores[currentStoreIndex].storeId?.id?.toString(), 'at_store');
      }, 120000);
    }
    
    return () => {
      if (locationInterval) clearInterval(locationInterval);
    };
  }, [isTimerRunning, route, currentStoreIndex]);

  useEffect(() => {
    if (user) {
      loadCurrentRoute();
    }
  }, [user]);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    
    if (isTimerRunning && timeInStore < 40) {
      timer = setInterval(() => {
        setTimeInStore(prev => prev + 1);
      }, 60000);
    }

    return () => clearInterval(timer);
  }, [isTimerRunning, timeInStore]);

  if (!route) {
    return (
      <div className="store-visit-container">
        <div className="visit-status pending">
          <h3>No hay ruta asignada para hoy</h3>
          <button className="primary-action-btn" onClick={() => navigate('/dashboard')}>
            Volver al Dashboard
          </button>
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
          <p>No se pudo cargar la información de la tienda actual.</p>
          <button className="primary-action-btn" onClick={() => navigate('/dashboard')}>
            Volver al Dashboard
          </button>
        </div>
      </div>
    );
  }

  const storeInfo = {
    name: currentStore.storeId?.name || 'Tienda no disponible',
    address: currentStore.storeId?.address || 'Dirección no disponible',
    coordinates: currentStore.storeId?.coordinates || { lat: 4.710989, lng: -74.072092 }
  };

  const completedTasks = tasks.filter(task => task.completed).length;
  const totalTasks = tasks.length;
  const progressPercentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  return (
    <div className="store-visit-container">
      {/* Header */}
      <header className="store-visit-header">
        <h2>🏪 {storeInfo.name}</h2>
        <p className="store-address">📍 {storeInfo.address}</p>
        
        {/* 🆕 BOTÓN DE NAVEGACIÓN */}
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
        
        {timeInStore >= 40 && (
          <div className="time-warning">
            ⚠️ Has excedido el tiempo máximo de 40 minutos
          </div>
        )}
      </header>

      {/* Estado de la visita */}
      <div className={`visit-status ${currentStore.status === 'in-progress' ? 'in-progress' : 'pending'}`}>
        <h3>
          {currentStore.status === 'in-progress' ? '🟢 Visita en Progreso' : '🟡 Visita Pendiente'}
        </h3>
        <p>
          {currentStore.status === 'in-progress' 
            ? `Progreso: ${progressPercentage.toFixed(0)}% completado` 
            : 'Presiona "Iniciar Visita" para comenzar'
          }
        </p>
      </div>

      {/* Botón para iniciar visita */}
      {currentStore.status === 'pending' && (
        <button className="primary-action-btn" onClick={handleStartVisit}>
          🏪 Iniciar Visita
        </button>
      )}

      {/* Lista de tareas cuando la visita está en progreso */}
      {currentStore.status === 'in-progress' && (
        <div className="tasks-section">
          <h3>📋 Checklist de Tareas:</h3>
          
          <div className="tasks-list">
            {tasks.map((task, index) => renderTask(task, index))}
          </div>

          {/* Reportes de daños */}
          {damageReports.length > 0 && (
            <div className="damage-reports">
              <h4>⚠️ Reportes de Daños ({damageReports.length})</h4>
              {damageReports.map((report, index) => (
                <div key={index} className="damage-report-card">
                  <strong>Producto:</strong> {report.product.name} <br/>
                  <strong>Código:</strong> {report.barcode} <br/>
                  <strong>Daño:</strong> {report.damageType} <br/>
                  <strong>Severidad:</strong> <span style={{ 
                    color: report.severity === 'high' ? '#dc3545' : 
                           report.severity === 'medium' ? '#ffc107' : '#28a745',
                    fontWeight: 'bold'
                  }}>{report.severity}</span>
                </div>
              ))}
            </div>
          )}

          {/* Notas de la visita */}
          <div className="visit-notes">
            <h4>📝 Notas de la visita</h4>
            <textarea 
              value={visitNotes}
              onChange={(e) => setVisitNotes(e.target.value)}
              placeholder="Agregar notas adicionales sobre la visita..."
              className="notes-textarea"
            />
          </div>

          {/* Botones de acción */}
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

          {/* Mensaje de finalización */}
          {completedTasks === totalTasks && (
            <div className="completion-message">
              ✅ Todas las tareas completadas. Revisa que tengas todas las fotos y firmas necesarias antes de finalizar.
            </div>
          )}
        </div>
      )}

      {/* Modal de Reporte de Daños */}
      {showDamageReport && currentProduct && (
        <div className="damage-modal-overlay">
          <div className="damage-modal">
            <h3>⚠️ Reportar Daño</h3>
            
            {/* Información del producto */}
            <div className="product-info">
              <h4>Producto Escaneado</h4>
              <p><strong>Nombre:</strong> {currentProduct.name}</p>
              <p><strong>Código:</strong> {currentBarcode}</p>
              <p><strong>Marca:</strong> {currentProduct.brand}</p>
              <p><strong>Categoría:</strong> {currentProduct.category}</p>
            </div>

            {/* Formulario de daño */}
            <div className="modal-form-group">
              <label className="modal-label">Tipo de Daño:</label>
              <select 
                value={damageType}
                onChange={(e) => setDamageType(e.target.value)}
                className="modal-select"
              >
                <option value="">Seleccionar tipo de daño</option>
                <option value="empaque_danado">Empaque dañado</option>
                <option value="producto_vencido">Producto vencido</option>
                <option value="producto_abierto">Producto abierto</option>
                <option value="etiqueta_danada">Etiqueta dañada</option>
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
              />
            </div>

            <div className="modal-form-group">
              <label className="modal-label">Fotos del Daño:</label>
              <PhotoUpload 
                onPhotosChange={setDamagePhotos}
                existingPhotos={damagePhotos}
                maxPhotos={3}
                enableCompression={true}
              />
            </div>

            <div className="modal-actions">
              <button 
                className="modal-btn cancel"
                onClick={() => setShowDamageReport(false)}
              >
                Cancelar
              </button>
              <button 
                className="modal-btn report"
                onClick={handleAddDamageReport}
                disabled={!damageType || !damageDescription || loading}
              >
                {loading ? '⏳ Guardando...' : '📝 Reportar Daño'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modales para funcionalidades avanzadas */}
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