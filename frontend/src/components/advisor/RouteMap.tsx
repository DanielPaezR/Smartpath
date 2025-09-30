import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { routeService } from '../../services/routeService';
import type { IRoute } from '../../services/routeService';
import MapComponent, { type Store } from '../common/MapComponent';

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
          setUserLocation({ lat: 4.710989, lng: -74.072092 });
        }
      );
    } else {
      setUserLocation({ lat: 4.710989, lng: -74.072092 });
    }
  };

  const handleStoreClick = (store: any) => {
    console.log('Tienda clickeada:', store);
  };

  const openInMaps = (lat: number, lng: number) => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    if (isMobile) {
      window.open(`waze://?ll=${lat},${lng}&navigate=yes`, '_blank');
      setTimeout(() => {
        window.open(`https://maps.google.com/?q=${lat},${lng}`, '_blank');
      }, 500);
    } else {
      window.open(`https://maps.google.com/?q=${lat},${lng}`, '_blank');
    }
  };

  // CORRECCIÓN: Preparar datos para el mapa de forma segura
  const storesForMap: Store[] = route?.stores
    ?.filter(storeVisit => storeVisit?.storeId) // Filtrar storeVisits con storeId válido
    .map(storeVisit => {
      const store = storeVisit.storeId!;
      return {
        _id: store._id || store.id || `store-${Math.random()}`,
        name: store.name || 'Tienda sin nombre',
        address: store.address || 'Dirección no disponible',
        coordinates: store.coordinates || { lat: 4.710989, lng: -74.072092 },
        status: storeVisit.status || 'pending'
      };
    }) || [];

  if (loading) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Cargando mapa...</div>;
  }

  if (error) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2>Error</h2>
        <p>{error}</p>
        <button onClick={() => navigate('/advisor')}>
          Volver al Dashboard
        </button>
      </div>
    );
  }

  if (!route) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2>No hay ruta asignada para hoy</h2>
        <p>Genera una nueva ruta desde el dashboard</p>
        <button onClick={() => navigate('/advisor')}>
          Volver al Dashboard
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <header style={{ marginBottom: '20px' }}>
        <button onClick={() => navigate('/advisor')} style={{ marginBottom: '10px' }}>
          ← Volver al Dashboard
        </button>
        <h2>🗺️ Mapa de Ruta - {new Date(route.date).toLocaleDateString('es-ES')}</h2>
        
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '15px',
          marginTop: '15px'
        }}>
          <div style={{ padding: '10px', backgroundColor: '#e3f2fd', borderRadius: '5px' }}>
            <strong>Tiendas Totales:</strong> {route.stores?.length || 0}
          </div>
          <div style={{ padding: '10px', backgroundColor: '#e8f5e8', borderRadius: '5px' }}>
            <strong>Completadas:</strong> {route.stores?.filter(s => s.status === 'completed').length || 0}
          </div>
          <div style={{ padding: '10px', backgroundColor: '#fff3e0', borderRadius: '5px' }}>
            <strong>En Progreso:</strong> {route.stores?.filter(s => s.status === 'in-progress').length || 0}
          </div>
          <div style={{ padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '5px' }}>
            <strong>Pendientes:</strong> {route.stores?.filter(s => s.status === 'pending').length || 0}
          </div>
        </div>
      </header>

      {/* Mapa */}
      <div style={{ marginBottom: '20px' }}>
        <MapComponent
          stores={storesForMap}
          userLocation={userLocation || undefined}
          showRoute={true}
          onStoreClick={handleStoreClick}
        />
      </div>

      {/* Lista de tiendas */}
      <div>
        <h3>Tiendas en la Ruta:</h3>
        {route.stores?.map((storeVisit, index) => {
          // Verificación segura de storeVisit.storeId
          if (!storeVisit?.storeId) {
            console.warn('StoreVisit sin storeId:', storeVisit);
            return null;
          }

          const store = storeVisit.storeId;
          
          return (
            <div key={storeVisit._id} style={{
              border: '1px solid #ddd',
              borderRadius: '8px',
              padding: '15px',
              marginBottom: '10px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: storeVisit.status === 'completed' ? '#e8f5e8' : 
                             storeVisit.status === 'in-progress' ? '#fff3e0' : '#f5f5f5'
            }}>
              <div>
                <h4 style={{ margin: '0 0 5px 0' }}>
                  {index + 1}. {store.name || 'Tienda sin nombre'}
                  <span style={{ 
                    marginLeft: '10px',
                    fontSize: '12px',
                    padding: '2px 8px',
                    borderRadius: '10px',
                    backgroundColor: storeVisit.status === 'completed' ? '#4caf50' :
                                   storeVisit.status === 'in-progress' ? '#ff9800' : '#9e9e9e',
                    color: 'white'
                  }}>
                    {storeVisit.status === 'completed' ? 'COMPLETADA' :
                     storeVisit.status === 'in-progress' ? 'EN PROGRESO' : 'PENDIENTE'}
                  </span>
                </h4>
                <p style={{ margin: '2px 0' }}>📍 {store.address || 'Dirección no disponible'}</p>
                <p style={{ margin: '2px 0' }}>⏰ {storeVisit.plannedArrival ? 
                  new Date(storeVisit.plannedArrival).toLocaleTimeString('es-ES', { 
                    hour: '2-digit', minute: '2-digit' 
                  }) : 'Horario no definido'}
                </p>
              </div>
              
              <div>
                <button 
                  onClick={() => openInMaps(
                    store.coordinates?.lat || 4.710989, 
                    store.coordinates?.lng || -74.072092
                  )}
                  style={{
                    padding: '8px 15px',
                    marginRight: '10px',
                    backgroundColor: '#4285f4',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer'
                  }}
                >
                  🗺️ Navegar
                </button>
                
                <button 
                  onClick={() => navigate('/advisor/visit')}
                  style={{
                    padding: '8px 15px',
                    backgroundColor: storeVisit.status === 'completed' ? '#9e9e9e' : '#4caf50',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: storeVisit.status === 'completed' ? 'not-allowed' : 'pointer'
                  }}
                  disabled={storeVisit.status === 'completed'}
                >
                  {storeVisit.status === 'completed' ? '✅ Completada' : '🏪 Visitar'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RouteMap;