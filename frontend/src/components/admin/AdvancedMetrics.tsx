// frontend/src/components/admin/AdvancedMetrics.tsx
import React, { useState, useEffect } from 'react';
import { adminService, type AdvancedMetrics } from '../../services/adminService';
import '../../styles/AdvancedMetrics.css';

const AdvancedMetrics: React.FC = () => {
  const [metrics, setMetrics] = useState<AdvancedMetrics | null>(null);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'quarter'>('month');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadMetrics();
  }, [timeRange]);

  const loadMetrics = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log(`📡 Solicitando métricas para: ${timeRange}`);
      const data = await adminService.getAdvancedMetrics(timeRange);
      setMetrics(data);
    } catch (err: any) {
      console.error('❌ Error cargando métricas:', err);
      setError(err.message || 'Error al cargar métricas');
    } finally {
      setLoading(false);
    }
  };

  const calculateBarWidth = (count: number, items: any[]) => {
    const maxCount = Math.max(...items.map(i => i.count));
    return maxCount > 0 ? (count / maxCount) * 100 : 0;
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Cargando métricas avanzadas...</p>
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="error-container">
        <h3>⚠️ Error</h3>
        <p>{error || 'No hay datos disponibles'}</p>
        <button onClick={loadMetrics} className="retry-btn">
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="advanced-metrics">
      <div className="metrics-header">
        <h1>📊 Métricas Avanzadas</h1>
        <div className="time-range-selector">
          <button 
            className={timeRange === 'week' ? 'active' : ''}
            onClick={() => setTimeRange('week')}
          >
            Semana
          </button>
          <button 
            className={timeRange === 'month' ? 'active' : ''}
            onClick={() => setTimeRange('month')}
          >
            Mes
          </button>
          <button 
            className={timeRange === 'quarter' ? 'active' : ''}
            onClick={() => setTimeRange('quarter')}
          >
            Trimestre
          </button>
        </div>
      </div>

      <div className="section">
        <h2>📈 Resumen General</h2>
        <div className="grid">
          <div className="metric-card">
            <h3>Tiendas</h3>
            <div className="metric-value">{metrics.overall.totalStores}</div>
          </div>
          <div className="metric-card">
            <h3>Visitas Completadas</h3>
            <div className="metric-value">{metrics.overall.completedVisits}</div>
          </div>
          <div className="metric-card">
            <h3>Eficiencia</h3>
            <div className="metric-value">{metrics.overall.averageEfficiency}%</div>
          </div>
          <div className="metric-card">
            <h3>Distancia</h3>
            <div className="metric-value">{metrics.overall.totalDistance} km</div>
          </div>
        </div>
      </div>

      <div className="section">
        <h2>⚠️ Análisis de Daños</h2>
        <div className="metric-card danger">
          <h3>Total Productos Dañados</h3>
          <div className="metric-value">{metrics.damageAnalytics.totalDamagedProducts}</div>
        </div>

        {metrics.damageAnalytics.damageByCategory.length > 0 && (
          <div className="damage-chart">
            <h3>Daños por Categoría</h3>
            {metrics.damageAnalytics.damageByCategory.map((item, index) => (
              <div key={index} className="chart-bar">
                <span>{item.category}: {item.count}</span>
                <div className="bar-container">
                  <div 
                    className="bar-fill"
                    style={{ width: `${calculateBarWidth(item.count, metrics.damageAnalytics.damageByCategory)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="section">
        <h2>👥 Performance de Asesores</h2>
        {metrics.advisorPerformance.length > 0 ? (
          <div className="table-container">
            <table className="performance-table">
              <thead>
                <tr>
                  <th>Asesor</th>
                  <th>Visitas</th>
                  <th>Tiempo Prom.</th>
                  <th>Eficiencia</th>
                  <th>Daños</th>
                </tr>
              </thead>
              <tbody>
                {metrics.advisorPerformance.map((advisor, index) => (
                  <tr key={index}>
                    <td>{advisor.advisorName}</td>
                    <td>{advisor.completedVisits}</td>
                    <td>{advisor.averageTimePerStore} min</td>
                    <td>{advisor.efficiencyScore}%</td>
                    <td>{advisor.damageReports}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p>No hay datos de asesores</p>
        )}
      </div>
    </div>
  );
};

export default AdvancedMetrics;