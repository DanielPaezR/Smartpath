// frontend/src/components/admin/RealTimeTracking.tsx - VERSIÓN CON POPUPS MEJORADOS
import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';
import MapComponent from '../common/MapComponent';
import '../../styles/RealTimeTracking.css';

// 🎯 Interfaz para asesores con ubicación
interface AdvisorWithLocation {
  id: string;
  name: string;
  email: string;
  vehicle_type: string;
  activity_status: 'at_store' | 'traveling' | 'break' | 'offline';
  current_store_name?: string;
  completed_stores: number;
  total_stores_today: number;
  battery_level?: number;
  // Campos para el mapa
  _id: string;
  address: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  status?: 'pending' | 'in-progress' | 'completed' | 'skipped';
  // 🆕 Campos adicionales para mejor información
  progress_percentage?: number;
  last_update?: string;
}

const RealTimeTracking: React.FC = () => {
  const [advisors, setAdvisors] = useState<AdvisorWithLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(true);

  useEffect(() => {
    loadRealData();
    const interval = setInterval(loadRealData, 30000);
    return () => clearInterval(interval);
  }, []);

  // 🎯 FUNCIÓN PARA MEJORAR LOS DATOS DE ASESORES PARA EL MAPA
  const enhanceAdvisorsForMap = (advisors: AdvisorWithLocation[]) => {
    return advisors.map(advisor => ({
      ...advisor,
      name: `👤 ${advisor.name}`,
      address: `${advisor.activity_status === 'at_store' ? '🏪 En Tienda' : 
                advisor.activity_status === 'traveling' ? '🚗 En Viaje' : 
                advisor.activity_status === 'break' ? '☕ En Descanso' : '⚫ Sin conexión'} | ${advisor.completed_stores}/${advisor.total_stores_today} tiendas`,
      // ✅ Asegurar que coordinates se mantiene
      coordinates: advisor.coordinates,
      customInfo: {
        email: advisor.email,
        vehicle: advisor.vehicle_type,
        battery: advisor.battery_level,
        progress: advisor.progress_percentage,
        lastUpdate: advisor.last_update
      }
    }));
  };

  const loadRealData = async () => {
    try {
      setError(null);
      const advisorsData = await adminService.getLiveAdvisorsStatus();
      console.log('📡 Datos recibidos del backend:', advisorsData);
      
      const advisorsWithLocation: AdvisorWithLocation[] = advisorsData.map((advisor: any) => {
        // ✅ CORREGIDO: usar latitude y longitude directamente, no current_latitude
        const hasRealLocation = advisor.latitude && advisor.longitude;
        
        // Convertir a número si es string
        const lat = hasRealLocation ? parseFloat(advisor.latitude) : getSimulatedLatitude(advisor.id.toString());
        const lng = hasRealLocation ? parseFloat(advisor.longitude) : getSimulatedLongitude(advisor.id.toString());
        
        console.log(`📍 Asesor ${advisor.name}: hasRealLocation=${hasRealLocation}, lat=${lat}, lng=${lng}`);
        
        const completed = advisor.completed_stores || 0;
        const total = advisor.total_stores_today || 0;
        const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
        
        return {
          id: advisor.id.toString(),
          name: advisor.name,
          email: advisor.email,
          vehicle_type: advisor.vehicle_type,
          activity_status: advisor.activity_status as 'at_store' | 'traveling' | 'break' | 'offline',
          current_store_name: advisor.current_store_name,
          completed_stores: completed,
          total_stores_today: total,
          battery_level: advisor.battery_level,
          // Campos para el mapa
          _id: advisor.id.toString(),
          address: advisor.current_store_name || 'En ruta',
          coordinates: { lat, lng },
          status: getStatusFromActivity(advisor.activity_status),
          progress_percentage: progress,
          last_update: advisor.last_update || new Date().toISOString()
        };
      });
      
      console.log('📍 Asesores procesados:', advisorsWithLocation.map(a => ({
        name: a.name,
        lat: a.coordinates.lat,
        lng: a.coordinates.lng,
        hasRealLocation: a.coordinates.lat !== getSimulatedLatitude(a.id) && a.coordinates.lng !== getSimulatedLongitude(a.id)
      })));
      
      setAdvisors(advisorsWithLocation);
    } catch (err: any) {
      console.error('Error cargando datos reales:', err);
      // ... resto del error handling
    } finally {
      setLoading(false);
    }
  };

  // 🎯 Función para generar latitud simulada basada en ID
  const getSimulatedLatitude = (id: string): number => {
    const baseLat = 6.244203;
    const seed = parseInt(id, 36) % 1000;
    return baseLat + (seed / 10000);
  };

  // 🎯 Función para generar longitud simulada basada en ID
  const getSimulatedLongitude = (id: string): number => {
    const baseLng = -75.581211;
    const seed = parseInt(id, 36) % 1000;
    return baseLng + (seed / 10000);
  };

  // 🎯 Convertir activity_status a status del mapa
  const getStatusFromActivity = (activityStatus: string): 'pending' | 'in-progress' | 'completed' | 'skipped' => {
    switch (activityStatus) {
      case 'at_store': return 'in-progress';
      case 'traveling': return 'in-progress';
      case 'break': return 'pending';
      case 'offline': return 'skipped';
      default: return 'pending';
    }
  };

  const handleRetry = () => {
    setLoading(true);
    setError(null);
    loadRealData();
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  // 🎯 Filtrar asesores con ubicación válida para el mapa
  const advisorsWithValidLocation = advisors.filter(advisor => 
    advisor.coordinates && advisor.coordinates.lat && advisor.coordinates.lng
  );

  // 🎯 Asesores mejorados para el mapa
  const enhancedAdvisors = enhanceAdvisorsForMap(advisorsWithValidLocation);

  if (loading) {
    return (
      <div className="real-time-loading">
        <div className="loading-spinner"></div>
        <p>Conectando con datos en tiempo real...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <h3>⚠️ Sistema de Tracking</h3>
        <p>{error}</p>
        
        {error.includes('Sesión expirada') ? (
          <p>Redirigiendo automáticamente al login...</p>
        ) : (
          <>
            <p>Los asesores aparecerán aquí cuando comiencen sus rutas.</p>
            <div className="error-actions">
              <button onClick={handleRetry}>Reintentar conexión</button>
              <button onClick={handleLogout} className="logout-btn">
                Cerrar sesión
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="real-time-tracking">
      <div className="tracking-header">
        <div className="header-content">
          <h1>🎯 Seguimiento en Tiempo Real</h1>
          <p>Sistema activo - Mostrando {advisors.length} asesores</p>
        </div>
        <div className="header-actions">
          <button 
            className={`view-toggle ${showMap ? 'active' : ''}`}
            onClick={() => setShowMap(!showMap)}
          >
            {showMap ? '📋 Lista' : '🗺️ Mapa'}
          </button>
          <button className="refresh-btn" onClick={loadRealData}>
            🔄 Actualizar
          </button>
        </div>
      </div>

      {/* 🗺️ MAPA DE ASESORES */}
      {showMap && enhancedAdvisors.length > 0 && (
        <div className="advisors-map-section">
          <div className="map-header">
            <h3>📍 Ubicación de Asesores en Tiempo Real</h3>
            <div className="map-legend">
              <div className="legend-item">
                <span className="legend-color in-progress"></span>
                <span>Activo/En Viaje</span>
              </div>
              <div className="legend-item">
                <span className="legend-color pending"></span>
                <span>En Descanso</span>
              </div>
              <div className="legend-item">
                <span className="legend-color skipped"></span>
                <span>Sin Conexión</span>
              </div>
            </div>
          </div>
          
          {/* 🎯 AQUÍ ESTÁ EL MAPCOMPONENT CON LOS DATOS MEJORADOS */}
          <MapComponent 
            stores={enhancedAdvisors}
            showRoute={false}
            forceShowAll={true}
            onStoreClick={(advisor) => {
              console.log('Asesor clickeado:', advisor);
            }}
          />
          
          <div className="map-stats">
            <span><strong>{enhancedAdvisors.length}</strong> asesores en el mapa</span>
            <span>Actualizado: {new Date().toLocaleTimeString()}</span>
          </div>
        </div>
      )}

      {advisors.length === 0 ? (
        <div className="no-activity">
          <div className="no-activity-icon">👥</div>
          <h3>No hay asesores activos</h3>
          <p>Los asesores aparecerán aquí automáticamente cuando:</p>
          <ul>
            <li>• Inicien su ruta diaria</li>
            <li>• Comiencen una visita a tienda</li>
            <li>• Actualicen su ubicación</li>
          </ul>
          <div className="demo-note">
            <p><strong>Nota:</strong> El sistema está funcionando correctamente.</p>
            <p>Los asesores aparecerán cuando usen la aplicación móvil.</p>
          </div>
        </div>
      ) : (
        <>
          {/* 📊 ESTADÍSTICAS */}
          <div className="stats-bar">
            <div className="stats-grid">
              <div className="stat-item">
                <span className="stat-number">{advisors.length}</span>
                <span className="stat-label">Total Asesores</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">
                  {advisors.filter(a => a.activity_status === 'at_store').length}
                </span>
                <span className="stat-label">En Tienda</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">
                  {advisors.filter(a => a.activity_status === 'traveling').length}
                </span>
                <span className="stat-label">En Viaje</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">
                  {enhancedAdvisors.length}
                </span>
                <span className="stat-label">Con Ubicación</span>
              </div>
            </div>
            <span className="update-time">
              Última actualización: {new Date().toLocaleTimeString()}
            </span>
          </div>

          {/* 📋 LISTA DE ASESORES */}
          <div className="advisors-section">
            <h3>👥 Lista de Asesores {!showMap && `(${advisors.length})`}</h3>
            <div className="advisors-grid">
              {advisors.map((advisor) => (
                <div key={advisor.id} className="advisor-card">
                  <div className="advisor-header">
                    <h3>{advisor.name}</h3>
                    <span className={`status ${advisor.activity_status}`}>
                      {advisor.activity_status === 'at_store' && '🏪 En Tienda'}
                      {advisor.activity_status === 'traveling' && '🚗 En Viaje'}
                      {advisor.activity_status === 'break' && '☕ En Descanso'}
                      {advisor.activity_status === 'offline' && '⚫ Sin conexión'}
                    </span>
                  </div>
                  
                  <div className="advisor-info">
                    <p><strong>Email:</strong> {advisor.email}</p>
                    <p><strong>Vehículo:</strong> {advisor.vehicle_type}</p>
                    <p><strong>Ubicación:</strong> {advisor.current_store_name || 'En ruta'}</p>
                    <p><strong>Progreso:</strong> {advisor.completed_stores}/{advisor.total_stores_today} tiendas</p>
                    {advisor.battery_level && (
                      <p><strong>Batería:</strong> {advisor.battery_level}%</p>
                    )}
                    {advisor.coordinates?.lat && advisor.coordinates?.lng ? (
                      <p className="location-available">
                        📍 Ubicación: {advisor.coordinates.lat.toFixed(4)}, {advisor.coordinates.lng.toFixed(4)}
                      </p>
                    ) : (
                      <p className="location-missing">❌ Sin ubicación reciente</p>
                    )}
                  </div>

                  {advisor.total_stores_today > 0 && (
                    <div className="progress-section">
                      <div className="progress-bar">
                        <div 
                          className="progress-fill"
                          style={{ 
                            width: `${(advisor.completed_stores / advisor.total_stores_today) * 100}%` 
                          }}
                        />
                      </div>
                      <div className="progress-text">
                        {Math.round((advisor.completed_stores / advisor.total_stores_today) * 100)}% completado
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default RealTimeTracking;