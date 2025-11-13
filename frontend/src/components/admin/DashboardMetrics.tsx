// frontend/src/components/admin/DashboardMetrics.tsx
import React from 'react';
import { DashboardOverview } from '../../services/adminService';
import '../../styles/common/DashboardMetrics.css';

interface DashboardMetricsProps {
  overview: DashboardOverview;
}

const DashboardMetrics: React.FC<DashboardMetricsProps> = ({ overview }) => {
  const completionRate = overview.total_stores_today > 0 
    ? Math.round((overview.completed_stores / overview.total_stores_today) * 100)
    : 0;

  const efficiencyScore = overview.efficiency_score || 0;

  return (
    <div className="dashboard-metrics">
      <div className="metrics-header">
        <h2>📊 Dashboard en Tiempo Real</h2>
        <span className="last-update">Actualizado: {new Date().toLocaleTimeString()}</span>
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
              <span className="progress-text">{completionRate}% de progreso</span>
            </div>
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
        </div>

        {/* Tiempo Promedio */}
        <div className="metric-card info">
          <div className="metric-icon">⏱️</div>
          <div className="metric-content">
            <h3>Tiempo Promedio</h3>
            <span className="metric-value">{Math.round(overview.avg_visit_duration)}min</span>
            <span className="metric-subtitle">Por tienda</span>
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
          </div>
        </div>

        {/* Distancia Recorrida */}
        <div className="metric-card distance">
          <div className="metric-icon">🛣️</div>
          <div className="metric-content">
            <h3>Distancia Recorrida</h3>
            <span className="metric-value">{overview.total_distance_today || 0}km</span>
            <span className="metric-subtitle">Total hoy</span>
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
        </div>
      </div>

      {/* Estado del Sistema */}
      <div className="system-status">
        <div className="status-item">
          <span className="status-dot active"></span>
          <span>Sistema de Analytics: <strong>Activo</strong></span>
        </div>
        <div className="status-item">
          <span className="status-dot active"></span>
          <span>Captura de Datos: <strong>En tiempo real</strong></span>
        </div>
        <div className="status-item">
          <span className="status-dot active"></span>
          <span>Base de Datos: <strong>Conectada</strong></span>
        </div>
      </div>
    </div>
  );
};

export default DashboardMetrics;