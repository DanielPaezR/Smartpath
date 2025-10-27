import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';
import '../../styles/RealTimeTracking.css';

const RealTimeTracking: React.FC = () => {
  const [advisors, setAdvisors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRealData();
    const interval = setInterval(loadRealData, 30000); // Actualizar cada 30 seg
    return () => clearInterval(interval);
  }, []);

  const loadRealData = async () => {
    try {
      setError(null);
      const advisorsData = await adminService.getLiveAdvisorsStatus();
      setAdvisors(advisorsData);
    } catch (err: any) {
      console.error('Error cargando datos reales:', err);
      
      // Manejo específico de errores de autenticación
      if (err.message?.includes('Sesión expirada') || err.response?.status === 403 || err.response?.status === 401) {
        setError('Sesión expirada - Redirigiendo al login...');
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
      } else {
        setError('Error al conectar con el servidor');
      }
    } finally {
      setLoading(false);
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
          <p>Sistema activo - Mostrando datos en tiempo real de la base de datos</p>
        </div>
        <button className="refresh-btn" onClick={loadRealData}>
          🔄 Actualizar
        </button>
      </div>

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
          <div className="stats-bar">
            <span>Asesores activos: <strong>{advisors.length}</strong></span>
            <span>Última actualización: {new Date().toLocaleTimeString()}</span>
          </div>

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
        </>
      )}
    </div>
  );
};

export default RealTimeTracking;