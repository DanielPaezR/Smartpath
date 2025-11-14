// frontend/src/components/advisor/AdvisorDashboard.tsx - CORREGIDO
import React, { useState, useEffect } from 'react';
import { routeService } from '../../services/routeService';
import { useAuth } from '../../contexts/AuthContext';
import RouteMap from './RouteMap';
import { useNavigate } from 'react-router-dom';
import '../../styles/AdvisorDashboard.css';

const AdvisorDashboard = () => {
  const [currentRoute, setCurrentRoute] = useState(null);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  
  const { user: currentUser } = useAuth();

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
      
      // 🆕 NORMALIZAR STATUS DE TIENDAS
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

  // 🆕 FUNCIÓN PARA NORMALIZAR STATUS
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

    console.log('🔍 Datos de la tienda:', {
      storeId: store.id,
      routeId: currentRoute.id,
      storeName: store.storeId?.name
    });

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

    navigate('/advisor/visit', {
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

  // Función para obtener el total de tiendas
  const getTotalStoresCount = () => {
    if (!currentRoute) return 0;
    return currentRoute.total_stores || currentRoute.stores?.length || 0;
  };

  // Función para obtener tiendas completadas
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
              <span className="stat-value">{currentRoute.estimated_duration} min</span>
              <span className="stat-label">Duración</span>
            </div>
          </div>
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
                
                {/* 🎯 BOTONES ESTANDARIZADOS CON GUION MEDIO */}
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
                  <div className="skipped-badge">
                    ⏭️ Visita Saltada
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