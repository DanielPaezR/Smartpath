// frontend/src/components/advisor/RouteMap.tsx - VERSIÓN CORREGIDA
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { routeService } from '../../services/routeService';
import type { IRoute } from '../../services/routeService';
import MapComponent, { type Store } from '../common/MapComponent';
import '../../styles/RouteMap.css';

// ✅ COORDENADAS POR DEFECTO DE MEDELLÍN
const DEFAULT_MEDELLIN_COORDS = { lat: 6.244203, lng: -75.581211 };

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
      console.log('🛣️ Solicitando ruta para asesor:', user!.id);
      const currentRoute = await routeService.getCurrentRoute(user!.id);
      console.log('✅ Ruta recibida:', currentRoute);
      
      // ✅ DEBUG: Verificar coordenadas de las tiendas
      if (currentRoute.stores) {
        console.log('📍 VERIFICANDO COORDENADAS DE TIENDAS:');
        currentRoute.stores.forEach((store, index) => {
          console.log(`   ${index + 1}. ${store.storeId?.name}`, {
            coordinates: store.storeId?.coordinates,
            hasCoords: !!store.storeId?.coordinates,
            lat: store.storeId?.coordinates?.lat,
            lng: store.storeId?.coordinates?.lng
          });
        });
      }
      
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
          const userCoords = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          console.log('📍 Ubicación del usuario obtenida:', userCoords);
          setUserLocation(userCoords);
        },
        (error) => {
          console.warn('❌ Error obteniendo ubicación:', error);
          console.log('📍 Usando coordenadas por defecto de Medellín');
          setUserLocation(DEFAULT_MEDELLIN_COORDS);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        }
      );
    } else {
      console.log('📍 Geolocalización no soportada, usando Medellín');
      setUserLocation(DEFAULT_MEDELLIN_COORDS);
    }
  };

  const handleStoreClick = (store: any) => {
    console.log('📍 Tienda clickeada en el mapa:', store);
    // Aquí puedes agregar lógica adicional cuando se hace click en una tienda del mapa
  };

  const openInMaps = (lat: number, lng: number, storeName: string) => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const encodedName = encodeURIComponent(storeName);
    
    console.log('🗺️ Abriendo en maps:', { storeName, lat, lng });
    
    if (isMobile) {
      // Intentar con Waze primero
      window.open(`waze://?ll=${lat},${lng}&navigate=yes`, '_blank');
      // Fallback a Google Maps
      setTimeout(() => {
        window.open(`https://maps.google.com/?q=${lat},${lng}`, '_blank');
      }, 500);
    } else {
      // Desktop - Google Maps
      window.open(`https://maps.google.com/?q=${lat},${lng}`, '_blank');
    }
  };

  const startStoreVisit = (storeVisitId: string, routeId: string) => {
    console.log('🏪 Iniciando visita a tienda:', { storeVisitId, routeId });
    navigate('/advisor/visit', { 
      state: { 
        storeVisitId: storeVisitId,
        routeId: routeId // 🎯 Asegurar que routeId también se pase
      } 
    });
  };

  // ✅ PREPARAR DATOS PARA EL MAPA CON COORDENADAS REALES
  const storesForMap: Store[] = route?.stores
    ?.filter(storeVisit => storeVisit?.storeId)
    .map((storeVisit, index) => {
      const store = storeVisit.storeId!;
      const coordinates = store.coordinates || DEFAULT_MEDELLIN_COORDS;
      
      console.log(`🏪 Procesando tienda ${index + 1}: ${store.name}`, {
        coordinates,
        hasRealCoords: !!store.coordinates,
        status: storeVisit.status
      });
      
      return {
        _id: store.id || `store-${Math.random()}`,
        name: store.name || 'Tienda sin nombre',
        address: store.address || 'Dirección no disponible',
        coordinates: coordinates,
        status: storeVisit.status || 'pending'
      };
    }) || [];

  console.log('🗺️ Stores para mapa:', {
    total: storesForMap.length,
    stores: storesForMap.map(s => ({ name: s.name, coords: s.coordinates }))
  });

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
          <p className="route-info">
            📍 Mostrando {storesForMap.length} tiendas en Medellín
          </p>
        </div>

        <div className="route-stats-grid">
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

      <section className="map-section">
        <div className="section-header">
          <h2>Vista del Mapa - {storesForMap.length} Tiendas</h2>
          <p>Mostrando todas las {storesForMap.length} tiendas de tu ruta en Medellín</p>
          <div className="map-stats">
            <span className="stat-badge">📍 {storesForMap.length} tiendas</span>
            <span className="stat-badge">🗺️ Vista completa</span>
          </div>
        </div>
        <div className="map-container">
          <MapComponent
            stores={storesForMap}
            userLocation={userLocation}
            showRoute={true}
            onStoreClick={handleStoreClick}
            forceShowAll={true} 
          />
        </div>
      </section>
    </div>
  );
};

export default RouteMap;