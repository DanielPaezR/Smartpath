// frontend/src/components/advisor/AdvisorDashboard.tsx
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
    initializeDashboard();
  }, [currentUser]);

  const initializeDashboard = async () => {
    try {
      setLoading(true);
      console.log('🔄 Inicializando dashboard...');
      
      if (!currentUser) {
        throw new Error('No se pudo obtener la información del usuario');
      }

      if (!currentUser.id) {
        throw new Error('El usuario no tiene ID válido');
      }

      await loadRouteData(currentUser.id);
      
    } catch (err) {
      console.error('❌ Error en inicialización:', err);
      setError(err.message || 'Error al inicializar el dashboard');
      setLoading(false);
    }
  };

  const loadRouteData = async (userId) => {
    try {
      console.log('📡 Cargando datos de ruta para usuario ID:', userId);
      
      const routeData = await routeService.getCurrentRoute(userId);
      console.log('✅ Ruta obtenida de la API:', routeData);
      
      setCurrentRoute(routeData);
      setStores(routeData.stores);
      
    } catch (err) {
      console.error('❌ Error cargando datos:', err);
      
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
    initializeDashboard();
  };

  const handleStartVisit = (storeId) => {
    console.log('🚀 Navegando a visita de tienda:', storeId);
    navigate('/advisor/visit', { state: { storeId } });
  };

  const handleCompleteVisit = (storeId) => {
    console.log('✅ Navegando a completar visita:', storeId);
    navigate('/advisor/visit', { state: { storeId } });
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
        <h3>⚠️ Error</h3>
        <p>{error}</p>
        <button className="retry-btn" onClick={handleRetry}>Reintentar</button>
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

  return (
    <div className="advisor-dashboard">
      <div className="dashboard-header-custom">
        <h1>Mi Ruta Diaria</h1>
        <div className="route-stats">
          <div className="stat-item">
            <span className="stat-icon">🏪</span>
            <div className="stat-info">
              <span className="stat-value">{currentRoute.completed_stores}/{currentRoute.total_stores}</span>
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
                  </span>
                </div>
                
                <h4 className="store-name">{store.storeId?.name || store.name}</h4>
                <p className="store-address">{store.storeId?.address || store.address}</p>
                <p className="store-zone">📍 {store.storeId?.zone || store.zone}</p>
                
                {store.status === 'pending' && (
                  <button 
                    className="action-btn start-visit-btn"
                    onClick={() => handleStartVisit(store.id)}
                  >
                    Iniciar Visita
                  </button>
                )}
                
                {store.status === 'in-progress' && (
                  <button 
                    className="action-btn complete-visit-btn"
                    onClick={() => handleCompleteVisit(store.id)}
                  >
                    Continuar Visita
                  </button>
                )}

                {store.status === 'completed' && (
                  <div className="completed-badge">
                    ✅ Visita Completada
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