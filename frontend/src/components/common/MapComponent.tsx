// frontend/src/components/common/MapComponent.tsx - VERSIÓN CORREGIDA COMPLETA
import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix para los iconos de Leaflet en React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// ✅ Interfaz Store actualizada
export interface Store {
  _id: string;
  name: string;
  address: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  status?: 'pending' | 'in-progress' | 'completed' | 'skipped';
}

interface MapComponentProps {
  stores: Store[];
  userLocation?: { lat: number; lng: number };
  showRoute?: boolean;
  onStoreClick?: (store: Store) => void;
  forceShowAll?: boolean; // 🆕 NUEVA PROP
}

// 🎯 COMPONENTE MEJORADO PARA AJUSTAR VISTA - CORREGIDO
const MapBoundsAdjuster: React.FC<{ 
  stores: Store[]; 
  userLocation?: { lat: number; lng: number };
  forceShowAll?: boolean;
}> = ({ stores, userLocation, forceShowAll = true }) => {
  const map = useMap();
  const hasAdjusted = useRef(false);

  useEffect(() => {
    console.log('🗺️ MapBoundsAdjuster ejecutándose...', {
      storesCount: stores.length,
      userLocation,
      forceShowAll
    });

    // Si no hay tiendas o ya ajustamos, no hacer nada
    if (stores.length === 0 || hasAdjusted.current) {
      return;
    }

    // Crear un array con todas las coordenadas
    const allLatLngs: L.LatLng[] = [];

    // Agregar coordenadas de todas las tiendas
    stores.forEach(store => {
      if (store.coordinates && store.coordinates.lat && store.coordinates.lng) {
        allLatLngs.push(L.latLng(store.coordinates.lat, store.coordinates.lng));
        console.log(`📍 Agregando tienda al bounds: ${store.name}`, store.coordinates);
      }
    });

    // Agregar ubicación del usuario si existe
    if (userLocation && userLocation.lat && userLocation.lng) {
      allLatLngs.push(L.latLng(userLocation.lat, userLocation.lng));
      console.log('📍 Agregando ubicación usuario al bounds:', userLocation);
    }

    // Si no hay coordenadas válidas, usar centro por defecto
    if (allLatLngs.length === 0) {
      console.log('📍 No hay coordenadas válidas, usando centro por defecto');
      map.setView([6.244203, -75.581211], 13);
      return;
    }

    // 🎯 CREAR BOUNDS QUE INCLUYA TODOS LOS PUNTOS
    const bounds = L.latLngBounds(allLatLngs);

    // Expandir ligeramente los bounds para mejor visualización
    bounds.pad(0.05);

    console.log('🎯 Ajustando mapa para mostrar TODOS los puntos:', {
      totalPoints: allLatLngs.length,
      bounds: bounds.getCenter(),
      zoom: map.getZoom()
    });

    // Ajustar el mapa para mostrar todos los puntos
    if (forceShowAll && bounds.isValid()) {
      map.fitBounds(bounds, { 
        padding: [20, 20], // Padding para que no queden pegados al borde
        maxZoom: 15 // Zoom máximo para evitar que se aleje demasiado
      });
      
      console.log('✅ Mapa ajustado para mostrar TODAS las tiendas');
      hasAdjusted.current = true;
    }

  }, [stores, userLocation, map, forceShowAll]);

  return null;
};

const MapComponent: React.FC<MapComponentProps> = ({ 
  stores, 
  userLocation, 
  showRoute = false,
  onStoreClick,
  forceShowAll = true // 🆕 Por defecto forzar mostrar todas
}) => {
  // ✅ CENTRO DEL MAPA EN MEDELLÍN POR DEFECTO
  const defaultCenter: [number, number] = [6.244203, -75.581211];
  
  console.log('🗺️ MapComponent iniciado con:', {
    storesCount: stores.length,
    userLocation,
    defaultCenter,
    forceShowAll,
    stores: stores.map(s => ({ 
      name: s.name, 
      coords: s.coordinates,
      status: s.status 
    }))
  });

  // Iconos personalizados para diferentes estados
  const createCustomIcon = (status: string = 'pending') => {
    const color = status === 'completed' ? '#10b981' : 
                 status === 'in-progress' ? '#f59e0b' : 
                 status === 'skipped' ? '#ef4444' : '#3b82f6';
    
    return L.divIcon({
      className: 'custom-marker',
      html: `
        <div style="
          background-color: ${color};
          width: 24px;
          height: 24px;
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          color: white;
          font-size: 12px;
        ">
          ${status === 'completed' ? '✓' : 
            status === 'in-progress' ? '→' : 
            status === 'skipped' ? '✕' : '•'}
        </div>
      `,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });
  };

  // Icono para la ubicación del usuario
  const userIcon = L.divIcon({
    className: 'user-marker',
    html: `
      <div style="
        background-color: #8b5cf6;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(139, 92, 246, 0.5);
        animation: pulse 1.5s infinite;
      ">
        <style>
          @keyframes pulse {
            0% { box-shadow: 0 0 0 0 rgba(139, 92, 246, 0.7); }
            70% { box-shadow: 0 0 0 10px rgba(139, 92, 246, 0); }
            100% { box-shadow: 0 0 0 0 rgba(139, 92, 246, 0); }
          }
        </style>
      </div>
    `,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });

  // Generar polyline para la ruta
  const routePoints = stores.map(store => 
    [store.coordinates.lat, store.coordinates.lng] as [number, number]
  );

  // 🎯 VERIFICAR QUE HAY TIENDAS PARA MOSTRAR
  if (stores.length === 0) {
    return (
      <div style={{ 
        height: '500px', 
        width: '100%', 
        borderRadius: '12px', 
        overflow: 'hidden',
        border: '2px solid #e5e7eb',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f9fafb'
      }}>
        <div style={{ textAlign: 'center', color: '#6b7280' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🗺️</div>
          <h3 style={{ margin: '0 0 8px 0' }}>No hay tiendas para mostrar</h3>
          <p style={{ margin: 0 }}>No se encontraron tiendas con coordenadas válidas</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      height: '500px', 
      width: '100%', 
      borderRadius: '12px', 
      overflow: 'hidden',
      border: '2px solid #e5e7eb'
    }}>
      <MapContainer
        center={defaultCenter}
        zoom={12} // Zoom inicial más amplio
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* 🎯 COMPONENTE MEJORADO PARA AJUSTAR AUTOMÁTICAMENTE LOS BOUNDS */}
        <MapBoundsAdjuster 
          stores={stores} 
          userLocation={userLocation} 
          forceShowAll={forceShowAll}
        />

        {/* Marcador de ubicación del usuario */}
        {userLocation && (
          <Marker 
            position={[userLocation.lat, userLocation.lng]}
            icon={userIcon}
          >
            <Popup>
              <div style={{ textAlign: 'center', minWidth: '150px' }}>
                <h4 style={{ margin: '0 0 8px 0', color: '#8b5cf6' }}>📍 Tu ubicación</h4>
                <p style={{ margin: 0, fontSize: '12px', color: '#6b7280' }}>
                  Lat: {userLocation.lat.toFixed(6)}<br/>
                  Lng: {userLocation.lng.toFixed(6)}
                </p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* 🎯 MARCADORES DE TODAS LAS TIENDAS */}
        {stores.map((store, index) => {
          // Verificar que la tienda tenga coordenadas válidas
          if (!store.coordinates || !store.coordinates.lat || !store.coordinates.lng) {
            console.warn('❌ Tienda sin coordenadas válidas:', store.name);
            return null;
          }

          return (
            <Marker
              key={store._id || `store-${index}`}
              position={[store.coordinates.lat, store.coordinates.lng]}
              icon={createCustomIcon(store.status)}
              eventHandlers={{
                click: () => {
                  console.log('📍 Marcador clickeado:', store.name);
                  onStoreClick && onStoreClick(store);
                },
              }}
            >
              <Popup>
                <div style={{ minWidth: '200px' }}>
                  <h4 style={{ margin: '0 0 8px 0', color: '#1f2937' }}>{store.name}</h4>
                  <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#6b7280' }}>
                    {store.address}
                  </p>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    fontSize: '12px',
                    color: '#6b7280'
                  }}>
                    <span>Orden: <strong>#{index + 1}</strong></span>
                    
                    {store.status && (
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '12px',
                        backgroundColor: 
                          store.status === 'completed' ? '#10b981' :
                          store.status === 'in-progress' ? '#f59e0b' :
                          store.status === 'skipped' ? '#ef4444' : '#6b7280',
                        color: 'white',
                        fontWeight: 'bold'
                      }}>
                        {store.status === 'completed' ? 'COMPLETADA' :
                         store.status === 'in-progress' ? 'EN PROGRESO' :
                         store.status === 'skipped' ? 'SALTADA' : 'PENDIENTE'}
                      </span>
                    )}
                  </div>
                  <div style={{ 
                    marginTop: '8px', 
                    fontSize: '11px', 
                    color: '#9ca3af',
                    borderTop: '1px solid #e5e7eb',
                    paddingTop: '8px'
                  }}>
                    📍 Lat: {store.coordinates.lat.toFixed(6)}<br/>
                    📍 Lng: {store.coordinates.lng.toFixed(6)}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Línea de ruta */}
        {showRoute && routePoints.length > 1 && (
          <Polyline
            positions={routePoints}
            color="#3b82f6"
            weight={4}
            opacity={0.7}
            dashArray="10, 10"
          />
        )}
      </MapContainer>
    </div>
  );
};

export default MapComponent;