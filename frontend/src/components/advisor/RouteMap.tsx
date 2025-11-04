// frontend/src/components/advisor/RouteMap.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { routeService } from '../../services/routeService';
import type { IRoute } from '../../services/routeService';
import MapComponent, { type Store } from '../common/MapComponent';
import '../../styles/RouteMap.css';

const RouteMap: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [route, setRoute] = useState<IRoute | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (user) {
      loadCurrentRoute();
      getUserLocation();
    }
  }, [user]);

  const loadCurrentRoute = async () => {
    try {
      setError('');
      const currentRoute = await routeService.getCurrentRoute(user!.id);
      setRoute(currentRoute);
    } catch (error: any) {
      setError(error.response?.data?.message || 'Error cargando la ruta');
      console.error('Error cargando ruta:', error);
    } finally {
      setLoading(false);
    }
  };

  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.warn('Error obteniendo ubicación:', error);
          setUserLocation({ lat: 4.710989, lng: -74.072092 }); // Bogotá por defecto
        }
      );
    } else {
      setUserLocation({ lat: 4.710989, lng: -74.072092 });
    }
  };

  const handleStoreClick = (store: any) => {
    console.log('Tienda clickeada:', store);
  };

  const openInMaps = (lat: number, lng: number, storeName: string) => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const encodedName = encodeURIComponent(storeName);
    
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

  const startStoreVisit = (storeId: string) => {
    navigate('/advisor/visit', { state: { storeId } });
  };

  // Preparar datos para el mapa de forma segura
  const storesForMap: Store[] = route?.stores
    ?.filter(storeVisit => storeVisit?.storeId)
    .map(storeVisit => {
      const store = storeVisit.storeId!;
      return {
        _id: store.id || `store-${Math.random()}`,
        name: store.name || 'Tienda sin nombre',
        address: store.address || 'Dirección no disponible',
        coordinates: store.coordinates || { lat: 4.710989, lng: -74.072092 },
        status: storeVisit.status || 'pending'
      };
    }) || [];

  if (loading) {
    return (
      <div className="route-map-loading">
        <div className="spinner"></div>
        <p>Cargando mapa de ruta...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="route-map-error">
        <div className="error-icon">⚠️</div>
        <h3>Error al cargar la ruta</h3>
        <p>{error}</p>
        <button className="primary-btn" onClick={() => navigate('/advisor')}>
          Volver al Dashboard
        </button>
      </div>
    );
  }

  if (!route) {
    return (
      <div className="route-map-empty">
        <div className="empty-icon">🗺️</div>
        <h3>No hay ruta asignada para hoy</h3>
        <p>Consulta con tu administrador para obtener una ruta</p>
        <button className="primary-btn" onClick={() => navigate('/advisor')}>
          Volver al Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="route-map-container">
      {/* Header */}
      <header className="route-map-header">
        <div className="header-content">
          <h1>🗺️ Mapa de Ruta</h1>
          <p className="route-date">
            {new Date(route.date).toLocaleDateString('es-ES', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
        </div>

        {/* Estadísticas */}
        <div className="route-stats-grid">
          <div className="stat-card total">
            <span className="stat-icon">🏪</span>
            <div className="stat-info">
              <span className="stat-value">{route.stores?.length || 0}</span>
              <span className="stat-label">Total Tiendas</span>
            </div>
          </div>
          <div className="stat-card completed">
            <span className="stat-icon">✅</span>
            <div className="stat-info">
              <span className="stat-value">{route.stores?.filter(s => s.status === 'completed').length || 0}</span>
              <span className="stat-label">Completadas</span>
            </div>
          </div>
          <div className="stat-card progress">
            <span className="stat-icon">🟡</span>
            <div className="stat-info">
              <span className="stat-value">{route.stores?.filter(s => s.status === 'in-progress').length || 0}</span>
              <span className="stat-label">En Progreso</span>
            </div>
          </div>
          <div className="stat-card pending">
            <span className="stat-icon">⏳</span>
            <div className="stat-info">
              <span className="stat-value">{route.stores?.filter(s => s.status === 'pending').length || 0}</span>
              <span className="stat-label">Pendientes</span>
            </div>
          </div>
        </div>
      </header>

      {/* Mapa */}
      <section className="map-section">
        <div className="section-header">
          <h2>Vista del Mapa</h2>
          <p>Visualiza tu ruta y las tiendas asignadas</p>
        </div>
        <div className="map-container">
          <MapComponent
            stores={storesForMap}
            userLocation={userLocation || undefined}
            showRoute={true}
            onStoreClick={handleStoreClick}
          />
        </div>
      </section>

      {/* Lista de Tiendas */}
      <section className="stores-section">
        <div className="section-header">
          <h2>Lista de Tiendas</h2>
          <p>Gestiona tus visitas del día</p>
        </div>
        
        <div className="stores-list">
          {route.stores?.map((storeVisit, index) => {
            if (!storeVisit?.storeId) {
              console.warn('StoreVisit sin storeId:', storeVisit);
              return null;
            }

            const store = storeVisit.storeId;
            const coordinates = store.coordinates || { lat: 4.710989, lng: -74.072092 };
            
            return (
              <div key={storeVisit.id} className={`store-card ${storeVisit.status}`}>
                <div className="store-header">
                  <div className="store-order">#{index + 1}</div>
                  <div className={`status-badge ${storeVisit.status}`}>
                    {storeVisit.status === 'completed' && '✅ Completada'}
                    {storeVisit.status === 'in-progress' && '🟡 En Progreso'}
                    {storeVisit.status === 'pending' && '⏳ Pendiente'}
                  </div>
                </div>

                <div className="store-info">
                  <h3 className="store-name">{store.name || 'Tienda sin nombre'}</h3>
                  <p className="store-address">
                    <span className="icon">📍</span>
                    {store.address || 'Dirección no disponible'}
                  </p>
                  <p className="store-time">
                    <span className="icon">⏰</span>
                    {storeVisit.plannedArrival ? 
                      new Date(storeVisit.plannedArrival).toLocaleTimeString('es-ES', { 
                        hour: '2-digit', minute: '2-digit' 
                      }) : 'Horario por definir'}
                  </p>
                </div>

                <div className="store-actions">
                  <button 
                    className="action-btn navigate-btn"
                    onClick={() => openInMaps(coordinates.lat, coordinates.lng, store.name || 'Tienda')}
                    title="Abrir en Maps"
                  >
                    <span className="btn-icon">🗺️</span>
                    <span className="btn-text">Navegar</span>
                  </button>
                  
                  <button 
                    className={`action-btn visit-btn ${storeVisit.status === 'completed' ? 'completed' : ''}`}
                    onClick={() => startStoreVisit(store.id)}
                    disabled={storeVisit.status === 'completed'}
                    title={storeVisit.status === 'completed' ? 'Visita completada' : 'Iniciar visita'}
                  >
                    <span className="btn-icon">
                      {storeVisit.status === 'completed' ? '✅' : '🏪'}
                    </span>
                    <span className="btn-text">
                      {storeVisit.status === 'completed' ? 'Completada' : 'Visitar'}
                    </span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};

export default RouteMap;