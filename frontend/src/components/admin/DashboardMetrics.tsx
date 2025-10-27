import React from 'react';
import { DashboardOverview } from '../../services/adminService';
import './DashboardMetrics.css';

interface DashboardMetricsProps {
  overview: DashboardOverview;
}

const DashboardMetrics: React.FC<DashboardMetricsProps> = ({ overview }) => {
  const completionRate = overview.total_stores_today > 0 
    ? Math.round((overview.completed_stores / overview.total_stores_today) * 100)
    : 0;

  return (
    <div className="dashboard-metrics">
      <div className="metrics-grid">
        <div className="metric-card primary">
          <div className="metric-icon">👥</div>
          <div className="metric-content">
            <h3>Asesores Activos</h3>
            <span className="metric-value">{overview.active_advisors}</span>
          </div>
        </div>

        <div className="metric-card success">
          <div className="metric-icon">✅</div>
          <div className="metric-content">
            <h3>Tiendas Completadas</h3>
            <span className="metric-value">{overview.completed_stores}</span>
            <span className="metric-subtitle">{completionRate}% de progreso</span>
          </div>
        </div>

        <div className="metric-card warning">
          <div className="metric-icon">🔄</div>
          <div className="metric-content">
            <h3>En Progreso</h3>
            <span className="metric-value">{overview.in_progress_stores}</span>
          </div>
        </div>

        <div className="metric-card info">
          <div className="metric-icon">⏱️</div>
          <div className="metric-content">
            <h3>Tiempo Promedio</h3>
            <span className="metric-value">{Math.round(overview.avg_visit_duration)}min</span>
          </div>
        </div>

        <div className="metric-card total">
          <div className="metric-icon">🏪</div>
          <div className="metric-content">
            <h3>Total Tiendas Hoy</h3>
            <span className="metric-value">{overview.total_stores_today}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardMetrics;