import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { routeService, type IRoute } from '../../services/routeService';
import { useAuth } from '../../contexts/AuthContext';
import PhotoUpload from '../common/PhotoUpload';

// Definir interfaz para las tareas
interface ITask {
  key: string;
  label: string;
  completed: boolean;
  photos?: string[];
  timestamp?: Date;
  additionalData?: any;
}

const StoreVisit: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [route, setRoute] = useState<IRoute | null>(null);
  const [currentStoreIndex, setCurrentStoreIndex] = useState(0);
  const [timeInStore, setTimeInStore] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [tasks, setTasks] = useState<ITask[]>([]);

  // Definir las tareas específicas para Vitamarket
  const taskDefinitions = [
    { key: 'evidenceBefore', label: '📸 Evidencia fotográfica del como se encontró el lugar', requiresPhotos: true },
    { key: 'identifySold', label: '🛒 Identificar productos vendidos para reponer', requiresPhotos: false },
    { key: 'picking', label: '📦 Ir a bodega y hacer picking de productos', requiresPhotos: false },
    { key: 'restocking', label: '🧹 Realizar bajada de productos y limpieza', requiresPhotos: false },
    { key: 'organization', label: '📦 Volver productos a su sitio dejando los que ya estaban al frente', requiresPhotos: false },
    { key: 'pricing', label: '🏷️ Realizar segmentación de precios', requiresPhotos: false },
    { key: 'evidenceAfter', label: '📸 Tomar fotografía del después', requiresPhotos: true },
    { key: 'damageCheck', label: '⚠️ Revisar en bodega las averías (evidencia fotográfica y escaneo)', requiresPhotos: true },
    { key: 'signature', label: '✍️ Recoger firma y sello de seguridad del almacén', requiresPhotos: false }
  ];

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
      }, 60000); // Actualizar cada minuto
    }

    return () => clearInterval(timer);
  }, [isTimerRunning, timeInStore]);

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
            store => store.status === 'in_progress' || store.status === 'pending'
          );
        }
        
        setCurrentStoreIndex(Math.max(0, currentIndex));
        
        // Inicializar tareas si la visita está en progreso
        if (currentIndex >= 0 && currentRoute.stores[currentIndex].status === 'in_progress') {
          initializeTasks();
          setIsTimerRunning(true);
        }
      }
    } catch (error) {
      console.error('Error cargando ruta:', error);
    }
  };

  const initializeTasks = () => {
    const initialTasks: ITask[] = taskDefinitions.map(task => ({
      key: task.key,
      label: task.label,
      completed: false,
      photos: []
    }));
    setTasks(initialTasks);
  };

  const handleStartVisit = async () => {
    if (!route) return;
    
    try {
      console.log('🔄 Iniciando visita...');
      
      const result = await routeService.startVisit(
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
      
    } catch (error) {
      console.error('Error iniciando visita:', error);
    }
  };

  const handleTaskComplete = async (taskIndex: number) => {
    const updatedTasks = [...tasks];
    updatedTasks[taskIndex].completed = !updatedTasks[taskIndex].completed;
    updatedTasks[taskIndex].timestamp = new Date();
    
    setTasks(updatedTasks);

    const allCompleted = updatedTasks.every(task => task.completed);
    if (allCompleted) {
      console.log('🎉 Todas las tareas completadas!');
    }
  };

  const handlePhotosChange = (taskIndex: number, photos: string[]) => {
    const updatedTasks = [...tasks];
    updatedTasks[taskIndex].photos = photos;
    setTasks(updatedTasks);
  };

  const handleCompleteVisit = async () => {
    if (!route) return;

    try {
      console.log('✅ Completando visita...');
      
      const result = await routeService.completeVisit(
        route.stores[currentStoreIndex].id
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
      
      // Navegar de vuelta al dashboard
      navigate('/dashboard', { 
        state: { message: `¡Visita a ${storeInfo.name} completada!` } 
      });
      
    } catch (error) {
      console.error('Error finalizando visita:', error);
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
      
      // Navegar de vuelta al dashboard
      navigate('/dashboard');
      
    } catch (error) {
      console.error('Error saltando tienda:', error);
    }
  };

  useEffect(() => {
    if (tasks.length > 0 && route?.stores?.[currentStoreIndex]?.status === 'in-progress') {
      const timeoutId = setTimeout(() => {
        console.log('💾 Progreso guardado automáticamente', tasks);
      }, 5000);
      return () => clearTimeout(timeoutId);
    }
  }, [tasks, route, currentStoreIndex]);

  if (!route) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2>No hay ruta asignada para hoy</h2>
        <button onClick={() => navigate('/dashboard')}>
          Volver al Dashboard
        </button>
      </div>
    );
  }

  const currentStore = route.stores?.[currentStoreIndex];
  
  if (!currentStore) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2>Error: Tienda no encontrada</h2>
        <p>No se pudo cargar la información de la tienda actual.</p>
        <button onClick={() => navigate('/dashboard')}>
          Volver al Dashboard
        </button>
      </div>
    );
  }

  const storeInfo = {
    name: currentStore.name || 'Tienda no disponible',
    address: currentStore.address || 'Dirección no disponible'
  };

  const completedTasks = tasks.filter(task => task.completed).length;
  const totalTasks = tasks.length;
  const progressPercentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  return (
    <div style={{ 
      padding: '20px', 
      maxWidth: '500px', 
      margin: '0 auto',
      backgroundColor: '#f8f9fa',
      minHeight: '100vh'
    }}>
      {/* Header */}
      <header style={{ marginBottom: '20px' }}>
        <button 
          onClick={() => navigate('/dashboard')} 
          style={{ 
            marginBottom: '10px', 
            padding: '8px 16px',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          ← Volver al Dashboard
        </button>
        
        <h2 style={{ margin: '10px 0', color: '#333' }}>🏪 {storeInfo.name}</h2>
        <p style={{ margin: '5px 0', color: '#666' }}>📍 {storeInfo.address}</p>
        
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '10px',
          color: '#555'
        }}>
          <span>⏱️ {timeInStore}/40 min</span>
          <span>📊 {completedTasks}/{totalTasks} tareas</span>
        </div>

        {/* Barra de progreso */}
        <div style={{
          width: '100%',
          height: '8px',
          backgroundColor: '#e9ecef',
          borderRadius: '4px',
          marginTop: '10px',
          overflow: 'hidden'
        }}>
          <div style={{
            width: `${progressPercentage}%`,
            height: '100%',
            backgroundColor: progressPercentage === 100 ? '#28a745' : '#007bff',
            transition: 'width 0.3s ease'
          }} />
        </div>
      </header>

      {/* Alerta de tiempo */}
      {timeInStore >= 40 && (
        <div style={{
          backgroundColor: '#f8d7da',
          color: '#721c24',
          padding: '10px',
          borderRadius: '5px',
          marginBottom: '15px',
          textAlign: 'center',
          border: '1px solid #f5c6cb'
        }}>
          ⚠️ Has excedido el tiempo máximo de 40 minutos
        </div>
      )}

      {/* Estado de la visita */}
      <div style={{ 
        backgroundColor: currentStore.status === 'in-progress' ? '#d4edda' : '#fff3cd',
        color: currentStore.status === 'in-progress' ? '#155724' : '#856404',
        padding: '15px',
        borderRadius: '8px',
        marginBottom: '20px',
        textAlign: 'center',
        border: `1px solid ${currentStore.status === 'in-progress' ? '#c3e6cb' : '#ffeaa7'}`
      }}>
        <h3 style={{ margin: '0 0 5px 0' }}>
          {currentStore.status === 'in-progress' ? '🟢 Visita en Progreso' : '🟡 Visita Pendiente'}
        </h3>
        <p style={{ margin: 0, fontSize: '14px' }}>
          {currentStore.status === 'in-progress' 
            ? `Progreso: ${progressPercentage.toFixed(0)}% completado` 
            : 'Presiona "Iniciar Visita" para comenzar'
          }
        </p>
      </div>

      {/* Botón para iniciar visita */}
      {currentStore.status === 'pending' && (
        <button 
          onClick={handleStartVisit}
          style={{
            width: '100%',
            padding: '15px',
            fontSize: '18px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            marginBottom: '20px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          🏪 Iniciar Visita
        </button>
      )}

      {/* Lista de tareas cuando la visita está en progreso */}
      {currentStore.status === 'in-progress' && (
        <div>
          <h3 style={{ marginBottom: '15px', color: '#333' }}>📋 Checklist de Tareas:</h3>
          
          <div style={{ display: 'grid', gap: '10px' }}>
            {tasks.map((task, index) => (
              <div key={task.key} style={{
                border: '1px solid #dee2e6',
                borderRadius: '8px',
                padding: '15px',
                backgroundColor: task.completed ? '#d4edda' : 'white',
                color: task.completed ? '#155724' : '#333'
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <input 
                    type="checkbox" 
                    checked={task.completed}
                    onChange={() => handleTaskComplete(index)}
                    style={{ marginTop: '2px' }}
                  />
                  
                  <div style={{ flex: 1 }}>
                    <span style={{ 
                      textDecoration: task.completed ? 'line-through' : 'none',
                      color: task.completed ? '#155724' : '#333'
                    }}>
                      {task.label}
                    </span>
                    
                    {/* Componente de subida de fotos para tareas que lo requieren */}
                    {taskDefinitions.find(t => t.key === task.key)?.requiresPhotos && (
                      <div style={{ marginTop: '10px' }}>
                        <PhotoUpload 
                          onPhotosChange={(photos) => handlePhotosChange(index, photos)}
                          existingPhotos={task.photos || []}
                          maxPhotos={3}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Botones de acción */}
          <div style={{ 
            display: 'flex', 
            gap: '10px', 
            marginTop: '30px',
            flexWrap: 'wrap'
          }}>
            <button 
              onClick={handleCompleteVisit}
              disabled={completedTasks !== totalTasks}
              style={{
                flex: 1,
                padding: '12px',
                backgroundColor: completedTasks === totalTasks ? '#28a745' : '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: completedTasks === totalTasks ? 'pointer' : 'not-allowed',
                fontWeight: 'bold'
              }}
            >
              ✅ Finalizar Visita
            </button>
            
            <button 
              onClick={() => {
                if (window.confirm('¿Estás seguro de que quieres saltar esta tienda?')) {
                  handleSkipStore('Tienda cerrada');
                }
              }}
              style={{
                padding: '12px',
                backgroundColor: '#ffc107',
                color: '#212529',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              ⏭️ Saltar Tienda
            </button>
          </div>

          {/* Mensaje de finalización */}
          {completedTasks === totalTasks && (
            <div style={{
              backgroundColor: '#28a745',
              color: 'white',
              padding: '10px',
              borderRadius: '5px',
              marginTop: '15px',
              textAlign: 'center',
              fontWeight: 'bold'
            }}>
              ✅ Todas las tareas completadas. Puedes finalizar la visita.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StoreVisit;