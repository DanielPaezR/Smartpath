// frontend/src/components/advisor/AdvisorDashboard.tsx - CON DEBUG
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
    console.log('🔄=== EFFECT ADVISOR DASHBOARD ===');
    console.log('👤 Current User:', currentUser);
    initializeDashboard();
  }, [currentUser]);

  const initializeDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔄=== INICIALIZANDO DASHBOARD ===');
      console.log('👤 Usuario actual:', currentUser);
      
      if (!currentUser) {
        console.error('❌ No hay usuario autenticado');
        throw new Error('No se pudo obtener la información del usuario');
      }

      if (!currentUser.id) {
        console.error('❌ Usuario sin ID válido:', currentUser);
        throw new Error('El usuario no tiene ID válido');
      }

      console.log('✅ Usuario válido, ID:', currentUser.id);
      await loadRouteData(currentUser.id);
      
    } catch (err) {
      console.error('❌ Error en inicialización:', err);
      setError(err.message || 'Error al inicializar el dashboard');
      setLoading(false);
    }
  };

  const loadRouteData = async (userId) => {
    try {
      console.log('🔄=== DEBUG COMPLETO ADVISOR DASHBOARD ===');
      console.log('📡 User ID recibido:', userId);
      console.log('📞 Llamando a routeService.getCurrentRoute...');
      
      const routeData = await routeService.getCurrentRoute(userId);
      console.log('📊 Respuesta COMPLETA de routeService:', JSON.stringify(routeData, null, 2));
      
      if (!routeData) {
        console.log('❌ routeService devolvió NULL - NO HAY RUTA');
        setError('No tienes una ruta asignada para hoy');
        setCurrentRoute(null);
        setStores([]);
        setLoading(false);
        return;
      }
      
      console.log('✅ RUTA RECIBIDA DEL BACKEND - ANÁLISIS:');
      console.log('   - ID Ruta:', routeData.id);
      console.log('   - Total tiendas:', routeData.total_stores);
      console.log('   - Tiendas reales:', routeData.stores?.length);
      console.log('   - Fecha:', routeData.date);
      console.log('   - ¿Es hoy?', routeData.date === new Date().toISOString().split('T')[0]);
      // Agrega esto después de recibir la ruta
      console.log('🔍 DEBUG COMPLETO RUTA:', {
        id: currentRoute?.id,
        total_stores: currentRoute?.total_stores,
        stores_count: currentRoute?.stores?.length,
        stores: currentRoute?.stores,
        is_template: currentRoute?.id?.startsWith('template_'),
        date: currentRoute?.date
      });
      
      
      // ANÁLISIS DETALLADO DE LAS TIENDAS
      console.log('🔍 ANÁLISIS DETALLADO DE TIENDAS:');
      routeData.stores?.forEach((store, index) => {
        console.log(`   Tienda ${index + 1}:`, {
          id: store.id,
          storeId: store.storeId?.id,
          name: store.storeId?.name || store.name,
          status: store.status,
          visit_order: store.visit_order
        });
      });
      
      setCurrentRoute(routeData);
      setStores(routeData.stores || []);
      
    } catch (err) {
      console.error('❌ Error en loadRouteData:', err);
      console.error('   - Status:', err.response?.status);
      console.error('   - Message:', err.response?.data?.message);
      console.error('   - Error completo:', err);
      
      if (err.response?.status === 404) {
        setError('No tienes una ruta asignada para hoy');
      } else {
        setError(err.message || 'Error cargando la ruta');
      }
    } finally {
      setLoading(false);
    }
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

    // Navegar a StoreVisit con los parámetros necesarios
    navigate('/store-visit', {
      state: {
        storeVisitId: storeId,
        routeId: currentRoute.id,
        storeId: storeId
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

    // Navegar a StoreVisit con los parámetros necesarios
    navigate('/advisor/visit', {
      state: {
        storeVisitId: storeId,
        routeId: currentRoute.id,
        storeId: storeId
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
      
      // Recargar la ruta para actualizar el estado
      await loadCurrentRoute();
      
      alert('✅ Tienda saltada exitosamente');
      
    } catch (error) {
      console.error('❌ Error saltando tienda:', error);
      alert('Error al saltar la tienda');
    }
  };

  // Función para obtener el total de tiendas
  const getTotalStoresCount = () => {
    if (!currentRoute) return 0;
    
    // Si es una plantilla, contar las tiendas del array stores
    if (currentRoute.id?.startsWith('template_')) {
      return currentRoute.stores?.length || 0;
    }
    
    // Si es una ruta real, usar total_stores
    return currentRoute.total_stores || currentRoute.stores?.length || 0;
  };

  // Función para obtener tiendas completadas
  const getCompletedStoresCount = () => {
    if (!currentRoute) return 0;
    
    // Si es una plantilla, contar las tiendas con status 'completed'
    if (currentRoute.id?.startsWith('template_')) {
      return currentRoute.stores?.filter(store => store.status === 'completed').length || 0;
    }
    
    // Si es una ruta real, usar completed_stores
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

  // ✅ VERIFICACIÓN ADICIONAL POR SI STORES ESTÁ VACÍO
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
                    {store.status === 'in_progress' && '🟡 En Progreso'}
                    {store.status === 'completed' && '✅ Completada'}
                    {store.status === 'skipped' && '⏭️ Saltada'}
                  </span>
                </div>
                
                <h4 className="store-name">{store.storeId?.name || store.name || 'Tienda sin nombre'}</h4>
                <p className="store-address">{store.storeId?.address || store.address || 'Dirección no disponible'}</p>
                <p className="store-zone">📍 {store.storeId?.zone || store.zone || 'Zona no especificada'}</p>
                
                {/* 🎯 BOTONES MEJORADOS */}
                {store.status === 'pending' && (
                  <button 
                    className="action-btn start-visit-btn"
                    onClick={() => handleStartVisit(store.id)}
                  >
                    🏪 Iniciar Visita
                  </button>
                )}
                
                {store.status === 'in_progress' && (
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