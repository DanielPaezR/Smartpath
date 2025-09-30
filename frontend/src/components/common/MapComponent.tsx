import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix para los iconos de Leaflet en React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// ✅ ACTUALIZAR la interfaz Store para que coincida con el backend
export interface Store {
  _id: string;
  name: string;
  address: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  status?: 'pending' | 'in-progress' | 'completed' | 'skipped'; // ✅ Agregar 'skipped'
}

interface MapComponentProps {
  stores: Store[];
  userLocation?: { lat: number; lng: number };
  showRoute?: boolean;
  onStoreClick?: (store: Store) => void;
}

const MapComponent: React.FC<MapComponentProps> = ({ 
  stores, 
  userLocation, 
  showRoute = false,
  onStoreClick 
}) => {
  // Centro del mapa en Bogotá por defecto
  const defaultCenter: [number, number] = [4.710989, -74.072092];
  
  // Iconos personalizados para diferentes estados
  const createCustomIcon = (status: string = 'pending') => {
    const color = status === 'completed' ? 'green' : 
                 status === 'in-progress' ? 'orange' : 
                 status === 'skipped' ? 'red' : 'blue'; // ✅ Agregar color para 'skipped'
    
    return L.divIcon({
      className: 'custom-marker',
      html: `<div style="
        background-color: ${color};
        width: 20px;
        height: 20px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 5px rgba(0,0,0,0.3);
      "></div>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });
  };

  // Generar polyline para la ruta
  const routePoints = stores.map(store => 
    [store.coordinates.lat, store.coordinates.lng] as [number, number]
  );

  return (
    <div style={{ height: '500px', width: '100%', borderRadius: '10px', overflow: 'hidden' }}>
      <MapContainer
        center={defaultCenter}
        zoom={12}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Marcador de ubicación del usuario */}
        {userLocation && (
          <Marker 
            position={[userLocation.lat, userLocation.lng]}
            icon={L.icon({
              iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
              shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
              iconSize: [25, 41],
              iconAnchor: [12, 41],
            })}
          >
            <Popup>Tu ubicación actual</Popup>
          </Marker>
        )}

        {/* Marcadores de tiendas */}
        {stores.map((store, index) => (
          <Marker
            key={store._id}
            position={[store.coordinates.lat, store.coordinates.lng]}
            icon={createCustomIcon(store.status)}
            eventHandlers={{
              click: () => onStoreClick && onStoreClick(store),
            }}
          >
            <Popup>
              <div>
                <h4>{store.name}</h4>
                <p>{store.address}</p>
                <p>Orden: {index + 1}</p>
                {store.status && (
                  <p>Estado: {
                    store.status === 'completed' ? '✅ Completada' :
                    store.status === 'in-progress' ? '🟡 En Progreso' :
                    store.status === 'skipped' ? '🔴 Saltada' : '⏳ Pendiente' // ✅ Agregar caso 'skipped'
                  }</p>
                )}
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Línea de ruta */}
        {showRoute && routePoints.length > 1 && (
          <Polyline
            positions={routePoints}
            color="blue"
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