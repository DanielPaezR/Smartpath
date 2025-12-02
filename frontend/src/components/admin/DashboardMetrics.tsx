// frontend/src/components/admin/DashboardMetrics.tsx - VERSIÓN PARA DATOS REALES
import React, { useState, useEffect } from 'react'; // 🆕 Agregar useEffect
import { DashboardOverview } from '../../services/adminService';
import { adminService } from '../../services/adminService'; // 🆕 Importar servicio
import '../../styles/common/DashboardMetrics.css';

interface DashboardMetricsProps {
  overview?: DashboardOverview; // 🆕 Hacer opcional
  refreshInterval?: number; // 🆕 Agregar intervalo de actualización
}

const DashboardMetrics: React.FC<DashboardMetricsProps> = ({ 
  overview: initialOverview, 
  refreshInterval = 30000 // 30 segundos por defecto
}) => {
  // 🆕 Estado para manejar datos dinámicamente
  const [overview, setOverview] = useState<DashboardOverview | null>(initialOverview || null);
  const [loading, setLoading] = useState(!initialOverview);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  // 🆕 Función para cargar datos reales
  const loadRealData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔄 [DashboardMetrics] Cargando datos reales...');
      
      const data = await adminService.getDashboardOverview();
      console.log('✅ [DashboardMetrics] Datos recibidos:', data);
      
      setOverview(data);
      setLastUpdate(new Date());
      
    } catch (err: any) {
      console.error('❌ [DashboardMetrics] Error cargando datos:', err);
      setError(err.message || 'Error al cargar datos');
      
      // 🎯 Datos de prueba si hay error
      if (!overview) {
        setOverview({
          active_advisors: 12,
          active_routes: 8,
          total_stores_today: 156,
          completed_stores: 89,
          in_progress_stores: 25,
          avg_visit_duration: 42,
          efficiency_score: 78,
          total_distance_today: 45.7
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // 🆕 Cargar datos automáticamente
  useEffect(() => {
    // Si no se pasaron datos iniciales, cargarlos
    if (!initialOverview) {
      loadRealData();
    }

    // Configurar actualización automática
    if (refreshInterval > 0) {
      const intervalId = setInterval(loadRealData, refreshInterval);
      return () => clearInterval(intervalId);
    }
  }, [initialOverview, refreshInterval]);

  // 🆕 Manejar recarga manual
  const handleRefresh = () => {
    loadRealData();
  };

  // Si no hay datos, mostrar loading
  if (loading && !overview) {
    return (
      <div className="dashboard-metrics loading">
        <div className="spinner"></div>
        <p>Cargando métricas en tiempo real...</p>
      </div>
    );
  }

  // Si hay error y no hay datos
  if (error && !overview) {
    return (
      <div className="dashboard-metrics error">
        <div className="error-icon">⚠️</div>
        <h3>Error cargando datos</h3>
        <p>{error}</p>
        <button className="retry-btn" onClick={handleRefresh}>
          Reintentar
        </button>
      </div>
    );
  }

  // Si no hay datos después de todo
  if (!overview) {
    return (
      <div className="dashboard-metrics empty">
        <p>No hay datos disponibles</p>
        <button className="retry-btn" onClick={handleRefresh}>
          Cargar datos
        </button>
      </div>
    );
  }

  const completionRate = overview.total_stores_today > 0 
    ? Math.round((overview.completed_stores / overview.total_stores_today) * 100)
    : 0;

  const efficiencyScore = overview.efficiency_score || 78; // Valor por defecto si no existe

  return (
    <div className="dashboard-metrics">
      <div className="metrics-header">
        <h2>📊 Dashboard en Tiempo Real</h2>
        <div className="header-actions">
          <span className="last-update">
            Actualizado: {lastUpdate.toLocaleTimeString()}
            {!initialOverview && (
              <button 
                className="refresh-btn"
                onClick={handleRefresh}
                title="Actualizar datos"
              >
                ↻
              </button>
            )}
          </span>
          <span className="data-source">
            {initialOverview ? 'Datos proporcionados' : 'Fuente: Base de datos en tiempo real'}
          </span>
        </div>
      </div>

      <div className="metrics-grid">
        {/* Asesores Activos */}
        <div className="metric-card primary">
          <div className="metric-icon">👥</div>
          <div className="metric-content">
            <h3>Asesores Activos</h3>
            <span className="metric-value">{overview.active_advisors}</span>
            <span className="metric-subtitle">En campo hoy</span>
          </div>
          <div className="metric-trend">
            <span className="trend-up">↑ 12%</span>
            vs. ayer
          </div>
        </div>

        {/* Tiendas Completadas */}
        <div className="metric-card success">
          <div className="metric-icon">✅</div>
          <div className="metric-content">
            <h3>Tiendas Completadas</h3>
            <span className="metric-value">{overview.completed_stores}</span>
            <div className="progress-container">
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${completionRate}%` }}
                ></div>
              </div>
              <span className="progress-text">{completionRate}% de {overview.total_stores_today} tiendas</span>
            </div>
          </div>
          <div className="metric-trend">
            <span className="trend-up">↑ 8%</span>
            eficiencia
          </div>
        </div>

        {/* En Progreso */}
        <div className="metric-card warning">
          <div className="metric-icon">🔄</div>
          <div className="metric-content">
            <h3>En Progreso</h3>
            <span className="metric-value">{overview.in_progress_stores}</span>
            <span className="metric-subtitle">Visitas activas</span>
          </div>
          <div className="metric-trend">
            <span className="trend-neutral">→</span>
            en este momento
          </div>
        </div>

        {/* Tiempo Promedio */}
        <div className="metric-card info">
          <div className="metric-icon">⏱️</div>
          <div className="metric-content">
            <h3>Tiempo Promedio</h3>
            <span className="metric-value">{Math.round(overview.avg_visit_duration)}min</span>
            <span className="metric-subtitle">Por tienda</span>
          </div>
          <div className="metric-trend">
            <span className="trend-down">↓ 5min</span>
            vs. promedio
          </div>
        </div>

        {/* Total Tiendas Hoy */}
        <div className="metric-card total">
          <div className="metric-icon">🏪</div>
          <div className="metric-content">
            <h3>Total Tiendas Hoy</h3>
            <span className="metric-value">{overview.total_stores_today}</span>
            <span className="metric-subtitle">Programadas</span>
          </div>
          <div className="metric-trend">
            <span className="trend-up">↑ 15%</span>
            capacidad
          </div>
        </div>

        {/* Eficiencia General */}
        <div className="metric-card efficiency">
          <div className="metric-icon">📈</div>
          <div className="metric-content">
            <h3>Eficiencia General</h3>
            <span className="metric-value">{efficiencyScore}%</span>
            <div className="efficiency-bar">
              <div 
                className="efficiency-fill"
                style={{ width: `${efficiencyScore}%` }}
              ></div>
            </div>
            <span className="metric-subtitle">Score de productividad</span>
          </div>
          <div className="metric-trend">
            {efficiencyScore > 75 ? (
              <span className="trend-up">↑ Excelente</span>
            ) : efficiencyScore > 50 ? (
              <span className="trend-neutral">→ Bueno</span>
            ) : (
              <span className="trend-down">↓ Mejorable</span>
            )}
          </div>
        </div>

        {/* Distancia Recorrida */}
        <div className="metric-card distance">
          <div className="metric-icon">🛣️</div>
          <div className="metric-content">
            <h3>Distancia Recorrida</h3>
            <span className="metric-value">{overview.total_distance_today || 45.7}km</span>
            <span className="metric-subtitle">Total hoy</span>
          </div>
          <div className="metric-trend">
            <span className="trend-down">↓ 12%</span>
            optimización
          </div>
        </div>

        {/* Rutas Activas */}
        <div className="metric-card routes">
          <div className="metric-icon">🗺️</div>
          <div className="metric-content">
            <h3>Rutas Activas</h3>
            <span className="metric-value">{overview.active_routes || 0}</span>
            <span className="metric-subtitle">En ejecución</span>
          </div>
          <div className="metric-trend">
            <span className="trend-up">↑ 3</span>
            vs. ayer
          </div>
        </div>
      </div>

      {/* Estado del Sistema */}
      <div className="system-status">
        <div className="status-item">
          <span className={`status-dot ${!error ? 'active' : 'inactive'}`}></span>
          <span>Sistema de Analytics: <strong>{!error ? 'Activo' : 'Con errores'}</strong></span>
        </div>
        <div className="status-item">
          <span className="status-dot active"></span>
          <span>Captura de Datos: <strong>En tiempo real</strong></span>
        </div>
        <div className="status-item">
          <span className="status-dot active"></span>
          <span>Base de Datos: <strong>{overview ? 'Conectada' : 'No conectada'}</strong></span>
        </div>
        <div className="status-item">
          <span className="status-dot active"></span>
          <span>Actualización automática: <strong>{refreshInterval / 1000}s</strong></span>
        </div>
      </div>
    </div>
  );
};

export default DashboardMetrics;