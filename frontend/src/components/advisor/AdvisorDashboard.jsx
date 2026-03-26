// frontend/src/components/advisor/AdvisorDashboard.tsx - CON UBICACIÓN AUTOMÁTICA AL ENTRAR
import React, { useState, useEffect, useRef } from 'react';
import { routeService } from '../../services/routeService';
import { useAuth } from '../../contexts/AuthContext';
import RouteMap from './RouteMap';
import { useNavigate } from 'react-router-dom';
import '../../styles/AdvisorDashboard.css';
import { API_BASE_URL } from '../../services/api';

const AdvisorDashboard = () => {
  const [currentRoute, setCurrentRoute] = useState(null);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  
  // ESTADOS PARA UBICACIÓN
  const [locationStatus, setLocationStatus] = useState('requesting');
  const [locationError, setLocationError] = useState(null);
  const locationIntervalRef = useRef(null);
  
  const { user: currentUser } = useAuth();

  // FUNCIÓN PARA ENVIAR UBICACIÓN AL BACKEND
  const sendLocationToBackend = async (latitude, longitude, activity_status = 'traveling') => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/tracking/update-location`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          latitude,
          longitude,
          activity_status,
          timestamp: new Date().toISOString()
        })
      });
      
      if (!response.ok) {
        console.error('Error enviando ubicación:', response.status);
      } else {
        console.log('📍 Ubicación enviada correctamente:', latitude, longitude);
      }
    } catch (error) {
      console.error('Error enviando ubicación:', error);
    }
  };

  // FUNCIÓN PARA SOLICITAR UBICACIÓN (SE EJECUTA AUTOMÁTICAMENTE)
  const requestLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Tu navegador no soporta geolocalización');
      setLocationStatus('error');
      return;
    }

    setLocationStatus('requesting');
    console.log('📍 Solicitando ubicación...');
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        console.log('📍 Ubicación obtenida:', latitude, longitude);
        
        // Enviar ubicación al backend
        sendLocationToBackend(latitude, longitude, 'traveling');
        
        setLocationStatus('active');
        setLocationError(null);
        
        // Configurar intervalo para enviar ubicación cada 30 segundos
        if (locationIntervalRef.current) {
          clearInterval(locationIntervalRef.current);
        }
        
        locationIntervalRef.current = setInterval(() => {
          navigator.geolocation.getCurrentPosition(
            (newPosition) => {
              const { latitude: newLat, longitude: newLng } = newPosition.coords;
              console.log('📍 Actualizando ubicación:', newLat, newLng);
              sendLocationToBackend(newLat, newLng, 'traveling');
            },
            (error) => {
              console.error('Error actualizando ubicación:', error);
            },
            { enableHighAccuracy: true, timeout: 10000 }
          );
        }, 30000);
      },
      (error) => {
        console.error('❌ Error obteniendo ubicación:', error);
        console.log('   - Código de error:', error.code);
        console.log('   - Mensaje:', error.message);
        
        let userMessage = 'No se pudo obtener tu ubicación. ';
        if (error.code === 1) {
          userMessage += 'Debes permitir el acceso a la ubicación en tu navegador. Haz clic en el candado 🔒 en la barra de direcciones y permite la ubicación.';
        } else if (error.code === 2) {
          userMessage += 'La ubicación no está disponible. Verifica que tu GPS esté activado.';
        } else if (error.code === 3) {
          userMessage += 'La solicitud de ubicación tomó demasiado tiempo. Intenta nuevamente.';
        }
        
        setLocationError(userMessage);
        setLocationStatus('error');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  // EFECTO PARA SOLICITAR UBICACIÓN DESPUÉS DE QUE LA RUTA ESTÉ CARGADA
  useEffect(() => {
    console.log('📍 Verificando si hay ruta para solicitar ubicación...');
    console.log('   - currentRoute:', !!currentRoute);
    console.log('   - stores:', currentRoute?.stores?.length);
    
    // Solo solicitar ubicación si:
    // 1. Hay una ruta cargada
    // 2. La ruta tiene tiendas
    // 3. No estamos en estado de error
    if (currentRoute && currentRoute.stores && currentRoute.stores.length > 0 && !error) {
      console.log('📍 Hay ruta activa con', currentRoute.stores.length, 'tiendas, solicitando ubicación...');
      requestLocation();
    } else if (currentRoute && (!currentRoute.stores || currentRoute.stores.length === 0)) {
      console.log('📍 Hay ruta pero sin tiendas, no se solicita ubicación');
    } else if (!currentRoute && !loading) {
      console.log('📍 No hay ruta cargada, esperando...');
    }
    
    return () => {
      if (locationIntervalRef.current) {
        clearInterval(locationIntervalRef.current);
      }
    };
  }, [currentRoute, loading, error]);

  useEffect(() => {
    console.log('🔄=== EFFECT ADVISOR DASHBOARD EJECUTADO ===');
    console.log('👤 Current User en effect:', currentUser);
    
    if (currentUser && currentUser.id) {
      console.log('✅ Usuario válido, iniciando carga de ruta...');
      initializeDashboard();
    } else {
      console.log('❌ Usuario no válido o sin ID');
      setLoading(false);
    }
  }, [currentUser]);

  const initializeDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔄=== INICIALIZANDO DASHBOARD ===');
      console.log('👤 Usuario actual:', currentUser);
      
      if (!currentUser || !currentUser.id) {
        console.error('❌ No hay usuario autenticado o sin ID');
        throw new Error('No se pudo obtener la información del usuario');
      }

      console.log('✅ Usuario válido, ID:', currentUser.id);
      await loadRouteData(currentUser.id.toString());
      
    } catch (err) {
      console.error('❌ Error en inicialización:', err);
      setError(err.message || 'Error al inicializar el dashboard');
      setLoading(false);
    }
  };

  const loadRouteData = async (userId) => {
    try {
      console.log('🔄=== CARGANDO DATOS DE RUTA ===');
      console.log('📡 User ID recibido:', userId, 'Tipo:', typeof userId);
      
      const routeData = await routeService.getCurrentRoute(userId);
      console.log('📊 Respuesta de routeService:', routeData);
      
      if (!routeData) {
        console.log('❌ routeService devolvió NULL');
        setError('No se pudo cargar la ruta');
        setCurrentRoute(null);
        setStores([]);
        setLoading(false);
        return;
      }
      
      console.log('✅ RUTA RECIBIDA DEL BACKEND:');
      console.log('   - ID Ruta:', routeData.id);
      console.log('   - Total tiendas:', routeData.total_stores);
      console.log('   - Tiendas en array:', routeData.stores?.length);
      console.log('   - Fecha:', routeData.date);
      
      const normalizedStores = routeData.stores?.map(store => ({
        ...store,
        status: normalizeStatus(store.status)
      })) || [];
      
      const normalizedRoute = {
        ...routeData,
        stores: normalizedStores
      };
      
      console.log('🔄 Status normalizados:', normalizedStores.map(s => ({id: s.id, status: s.status})));
      
      setCurrentRoute(normalizedRoute);
      setStores(normalizedStores);
      
      console.log('✅ currentRoute actualizado:', normalizedRoute.id);
      
    } catch (err) {
      console.error('❌ Error en loadRouteData:', err);
      console.error('   - Status:', err.response?.status);
      console.error('   - Message:', err.response?.data?.message);
      
      if (err.response?.status === 404) {
        setError('No tienes una ruta asignada para hoy');
      } else if (err.message?.includes('Sesión expirada')) {
        setError('Sesión expirada. Por favor inicia sesión nuevamente.');
      } else {
        setError(err.message || 'Error cargando la ruta');
      }
    } finally {
      setLoading(false);
    }
  };

  const normalizeStatus = (status) => {
    if (status === 'in_progress') return 'in-progress';
    return status;
  };

  const handleRetry = () => {
    console.log('🔄 Reintentando carga...');
    setError(null);
    setLoading(true);
    initializeDashboard();
  };

  const handleStartVisit = (storeId) => {
    console.log('🏪 Iniciando visita para store:', storeId);
    
    const store = currentRoute.stores.find(s => s.id === storeId);
    if (!store) {
      console.error('❌ Tienda no encontrada');
      return;
    }

    navigate('/store-visit', {
      state: {
        storeVisitId: storeId,
        routeId: currentRoute.id,
        storeId: store.storeId?.id || storeId
      }
    });
  };

  const handleContinueVisit = (storeId) => {
    console.log('🔄 Continuando visita para store:', storeId);
    
    const store = currentRoute.stores.find(s => s.id === storeId);
    if (!store) {
      console.error('❌ Tienda no encontrada');
      return;
    }

    navigate('/store-visit', {
      state: {
        storeVisitId: storeId,
        routeId: currentRoute.id,
        storeId: store.storeId?.id || storeId
      }
    });
  };

  const handleSkipStore = async (storeId) => {
    if (!window.confirm('¿Estás seguro de que quieres saltar esta tienda?')) {
      return;
    }

    try {
      console.log('⏭️ Saltando tienda desde dashboard:', storeId);
      
      await routeService.skipStoreVisit(
        currentRoute.id,
        storeId,
        'Saltada desde dashboard'
      );
      
      await loadRouteData(currentUser.id.toString());
      alert('✅ Tienda saltada exitosamente');
      
    } catch (error) {
      console.error('❌ Error saltando tienda:', error);
      alert('Error al saltar la tienda');
    }
  };

  const handleRestartSkippedVisit = async (storeId) => {
    if (!window.confirm('¿Quieres reiniciar esta visita que fue saltada?')) {
      return;
    }

    try {
      console.log('🔄 Reiniciando visita saltada:', storeId);
      
      await routeService.startVisit(
        currentRoute.id,
        storeId
      );
      
      await loadRouteData(currentUser.id.toString());
      alert('✅ Visita reiniciada exitosamente');
      
      const store = currentRoute.stores.find(s => s.id === storeId);
      if (store) {
        navigate('/store-visit', {
          state: {
            storeVisitId: storeId,
            routeId: currentRoute.id,
            storeId: store.storeId?.id || storeId
          }
        });
      }
      
    } catch (error) {
      console.error('❌ Error reiniciando visita:', error);
      
      if (error.response?.status === 404) {
        alert('Error: El endpoint no existe. Contacta al administrador.');
      } else if (error.message?.includes('No se puede iniciar')) {
        alert('Esta visita no puede reiniciarse porque ya fue completada o está en progreso.');
      } else {
        alert('Error al reiniciar la visita: ' + error.message);
      }
    }
  };

  const getTotalStoresCount = () => {
    if (!currentRoute) return 0;
    return currentRoute.total_stores || currentRoute.stores?.length || 0;
  };

  const getCompletedStoresCount = () => {
    if (!currentRoute) return 0;
    return currentRoute.completed_stores || currentRoute.stores?.filter(store => store.status === 'completed').length || 0;
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner"></div>
        <p>Cargando tu ruta del día...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-error">
        <h3>⚠️ {error.includes('No tienes') ? 'Sin Ruta para Hoy' : 'Error'}</h3>
        <p>{error}</p>
        <button className="retry-btn" onClick={handleRetry}>
          {error.includes('No tienes') ? 'Actualizar' : 'Reintentar'}
        </button>
      </div>
    );
  }

  if (!currentRoute) {
    return (
      <div className="dashboard-empty">
        <h3>📅 No hay ruta para hoy</h3>
        <p>No tienes tiendas asignadas para hoy.</p>
        <button className="retry-btn" onClick={handleRetry}>Actualizar</button>
      </div>
    );
  }

  if (!currentRoute.stores || currentRoute.stores.length === 0) {
    return (
      <div className="dashboard-empty">
        <h3>🏪 Sin Tiendas Asignadas</h3>
        <p>Tu ruta no tiene tiendas asignadas para hoy.</p>
        <button className="retry-btn" onClick={handleRetry}>Actualizar</button>
      </div>
    );
  }

  return (
    <div className="advisor-dashboard">
      <div className="dashboard-header-custom">
        <h1>Mi Ruta Diaria</h1>
        
        {/* INDICADOR DE UBICACIÓN */}
        <div className="location-status">
          {locationStatus === 'requesting' && (
            <div className="location-badge requesting">
              <span className="location-icon">📍</span>
              <span>Solicitando ubicación...</span>
            </div>
          )}
          {locationStatus === 'active' && (
            <div className="location-badge active">
              <span className="location-icon">📍</span>
              <span>Ubicación compartida en tiempo real</span>
            </div>
          )}
          {locationStatus === 'error' && (
            <div className="location-badge error">
              <span className="location-icon">⚠️</span>
              <span>{locationError || 'Error de ubicación'}</span>
              <button className="retry-location" onClick={requestLocation}>
                Reintentar
              </button>
            </div>
          )}
        </div>

        <div className="route-stats">
          <div className="stat-item">
            <span className="stat-icon">🏪</span>
            <div className="stat-info">
              <span className="stat-value">
                {getCompletedStoresCount()}/{getTotalStoresCount()}
              </span>
              <span className="stat-label">Tiendas</span>
            </div>
          </div>
          <div className="stat-item">
            <span className="stat-icon">🛣️</span>
            <div className="stat-info">
              <span className="stat-value">{currentRoute.total_distance} km</span>
              <span className="stat-label">Distancia</span>
            </div>
          </div>
          <div className="stat-item">
            <span className="stat-icon">⏱️</span>
            <div className="stat-info">
              <span className="stat-value">{currentRoute.estimated_duration}</span>
              <span className="stat-label">Duración</span>
            </div>
          </div>
          <Link to="/advisor/metrics" className="metrics-link">
            📊 Mis Estadísticas
          </Link>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="map-section">
          <RouteMap 
            stores={stores}
            currentRoute={currentRoute}
            onStoreSelect={handleStartVisit}
          />
        </div>

        <div className="stores-section">
          <h3 className="section-title">Tiendas de Hoy</h3>
          <div className="stores-grid">
            {currentRoute.stores.map(store => (
              <div 
                key={store.id} 
                className={`store-card ${store.status}`}
              >
                <div className="store-header">
                  <span className="store-order">#{store.visit_order}</span>
                  <span className={`status-badge ${store.status}`}>
                    {store.status === 'pending' && '⏳ Pendiente'}
                    {store.status === 'in-progress' && '🟡 En Progreso'}
                    {store.status === 'completed' && '✅ Completada'}
                    {store.status === 'skipped' && '⏭️ Saltada'}
                  </span>
                </div>
                
                <h4 className="store-name">{store.storeId?.name || store.name || 'Tienda sin nombre'}</h4>
                <p className="store-address">{store.storeId?.address || store.address || 'Dirección no disponible'}</p>
                <p className="store-zone">📍 {store.storeId?.zone || store.zone || 'Zona no especificada'}</p>
                
                {store.status === 'pending' && (
                  <button 
                    className="action-btn start-visit-btn"
                    onClick={() => handleStartVisit(store.id)}
                  >
                    🏪 Iniciar Visita
                  </button>
                )}
                
                {store.status === 'in-progress' && (
                  <div className="visit-actions">
                    <button 
                      className="action-btn continue-visit-btn"
                      onClick={() => handleContinueVisit(store.id)}
                    >
                      🔄 Continuar Visita
                    </button>
                    <button 
                      className="action-btn skip-btn secondary"
                      onClick={() => handleSkipStore(store.id)}
                    >
                      ⏭️ Saltar
                    </button>
                  </div>
                )}

                {store.status === 'completed' && (
                  <div className="completed-badge">
                    ✅ Visita Completada
                  </div>
                )}

                {store.status === 'skipped' && (
                  <div className="skipped-actions">
                    <div className="skipped-badge">
                      ⏭️ Visita Saltada
                    </div>
                    <button 
                      className="action-btn restart-visit-btn"
                      onClick={() => handleRestartSkippedVisit(store.id)}
                    >
                      🔄 Reiniciar Visita
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvisorDashboard;