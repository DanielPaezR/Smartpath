// frontend/src/components/advisor/AdvisorDashboard.jsx
import React, { useState, useEffect } from 'react';
import { routeService } from '../../services/routeService';
import { useAuth } from '../../contexts/AuthContext';
import RouteMap from './RouteMap';
import { useNavigate } from 'react-router-dom'; // ✅ Ya está importado
import '../../styles/AdvisorDashboard.css';

const AdvisorDashboard = () => {
  const [currentRoute, setCurrentRoute] = useState(null);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true); // ✅ Remover currentStore del estado
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
      
      // Simular datos de prueba para evitar errores 404
      console.log('⚠️ Usando datos de prueba temporalmente');
      const mockRoute = {
        id: 'route-123',
        advisor_id: userId,
        date: new Date().toISOString().split('T')[0],
        total_stores: 3,
        completed_stores: 1,
        total_distance: '8.5',
        estimated_duration: '120',
        stores: [
          {
            id: 'store-1',
            name: 'Supermercado Central',
            address: 'Av. Principal 123',
            zone: 'Centro',
            visit_order: 1,
            status: 'completed'
          },
          {
            id: 'store-2',
            name: 'MiniMarket Express',
            address: 'Jr. Comercio 456',
            zone: 'Centro',
            visit_order: 2,
            status: 'in_progress'
          },
          {
            id: 'store-3',
            name: 'Bodega Don Pedro',
            address: 'Av. Libertad 789',
            zone: 'Norte',
            visit_order: 3,
            status: 'pending'
          }
        ]
      };
      
      setCurrentRoute(mockRoute);
      setStores(mockRoute.stores);
      // ✅ Remover setCurrentStore - ya no lo necesitamos aquí
      
    } catch (err) {
      console.error('❌ Error cargando datos:', err);
      setError(err.message || 'Error cargando la ruta');
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    console.log('🔄 Reintentando carga...');
    setError(null);
    initializeDashboard();
  };

  // ✅ Cambiar handleStartVisit para navegar directamente
  const handleStartVisit = (storeId) => {
    console.log('🚀 Navegando a visita de tienda:', storeId);
    navigate('/advisor/visit', { state: { storeId } });
  };

  // ✅ Cambiar handleCompleteVisit para navegar también
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
        <button onClick={handleRetry}>Reintentar</button>
      </div>
    );
  }

  if (!currentRoute) {
    return (
      <div className="dashboard-empty">
        <h3>📅 No hay ruta para hoy</h3>
        <p>No tienes tiendas asignadas para hoy.</p>
        <button onClick={handleRetry}>Actualizar</button>
      </div>
    );
  }

  return (
    <div className="advisor-dashboard">
      <div className="dashboard-header">
        <h1>Mi Ruta Diaria</h1>
        <div className="route-stats">
          <span className="stat">
            🏪 {currentRoute.completed_stores}/{currentRoute.total_stores} Tiendas
          </span>
          <span className="stat">
            🛣️ {currentRoute.total_distance} km
          </span>
          <span className="stat">
            ⏱️ {currentRoute.estimated_duration} min
          </span>
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

        <div className="stores-list">
          <h3>Tiendas de Hoy</h3>
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
                  </span>
                </div>
                <h4>{store.name}</h4>
                <p>{store.address}</p>
                <p className="store-zone">📍 {store.zone}</p>
                
                {/* ✅ Cambiar todos los botones para navegar a página separada */}
                {store.status === 'pending' && (
                  <button 
                    className="start-visit-btn"
                    onClick={() => handleStartVisit(store.id)}
                  >
                    Iniciar Visita
                  </button>
                )}
                
                {store.status === 'in_progress' && (
                  <button 
                    className="complete-visit-btn"
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