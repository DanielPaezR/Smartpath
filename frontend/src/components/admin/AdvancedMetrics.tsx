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
      console.log(`🔄 Cargando métricas para: ${timeRange}`);
      const data = await adminService.getAdvancedMetrics(timeRange);
      setMetrics(data);
      console.log('✅ Métricas cargadas:', data);
    } catch (err) {
      console.error('❌ Error cargando métricas:', err);
      setError('Error cargando las métricas desde el servidor');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Cargando métricas avanzadas...</p>
        <small>Conectando con datos reales del sistema</small>
      </div>
    );
  }

  if (error && !metrics) {
    return (
      <div className="error-container">
        <h3>⚠️ Error de Conexión</h3>
        <p>{error}</p>
        <p className="error-help">
          Asegúrate de que el servidor esté ejecutándose y que haya datos en el sistema.
        </p>
        <button onClick={loadMetrics} className="retry-btn">
          🔄 Reintentar
        </button>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="error-container">
        <h3>📊 Sin Datos Disponibles</h3>
        <p>No hay datos de métricas disponibles en el sistema.</p>
        <p className="error-help">
          Los datos aparecerán a medida que los asesores completen visitas y reporten información.
        </p>
        <button onClick={loadMetrics} className="retry-btn">
          🔄 Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="advanced-metrics">
      {/* Header */}
      <div className="metrics-header">
        <div className="header-content">
          <h1>📊 Métricas Avanzadas - SmartPath</h1>
          <p className="header-subtitle">
            Datos en tiempo real recolectados del sistema
          </p>
        </div>
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

      {/* Estado de Datos */}
      <div className="data-status">
        <div className="status-badge real-data">
          ✅ Datos Reales del Sistema
        </div>
        <div className="last-updated">
          Última actualización: {new Date().toLocaleString()}
        </div>
      </div>

      {/* Métricas generales */}
      <div className="section">
        <h2>📈 Resumen General</h2>
        <div className="overall-metrics grid">
          <div className="metric-card">
            <div className="metric-icon">🏪</div>
            <div className="metric-content">
              <h3>Tiendas Visitadas</h3>
              <div className="metric-value">
                {metrics.overall.completedVisits}/{metrics.overall.totalStores}
              </div>
              <div className="metric-subtitle">Completadas / Totales</div>
            </div>
          </div>
          
          <div className="metric-card">
            <div className="metric-icon">⏱️</div>
            <div className="metric-content">
              <h3>Eficiencia Promedio</h3>
              <div className="metric-value">{metrics.overall.averageEfficiency}%</div>
              <div className="metric-subtitle">Score de eficiencia</div>
            </div>
          </div>
          
          <div className="metric-card">
            <div className="metric-icon">🛣️</div>
            <div className="metric-content">
              <h3>Distancia Total</h3>
              <div className="metric-value">{metrics.overall.totalDistance} km</div>
              <div className="metric-subtitle">Recorrido optimizado</div>
            </div>
          </div>
          
          <div className="metric-card">
            <div className="metric-icon">💸</div>
            <div className="metric-content">
              <h3>Tiempo Ahorrado</h3>
              <div className="metric-value">{metrics.overall.timeSaved} min</div>
              <div className="metric-subtitle">Gracias a ML</div>
            </div>
          </div>
        </div>
      </div>

      {/* Análisis de daños */}
      <div className="section">
        <h2>⚠️ Análisis de Productos Dañados</h2>
        <div className="damage-metrics grid">
          <div className="metric-card danger">
            <div className="metric-icon">🚨</div>
            <div className="metric-content">
              <h3>Productos Dañados</h3>
              <div className="metric-value">{metrics.damageAnalytics.totalDamagedProducts}</div>
              <div className="metric-subtitle">Total reportado</div>
            </div>
          </div>
          
          {metrics.damageAnalytics.damageByCategory.length > 0 ? (
            <div className="damage-chart">
              <h4>Daños por Categoría</h4>
              <div className="chart-bars">
                {metrics.damageAnalytics.damageByCategory.map((item, index) => (
                  <div key={index} className="chart-bar">
                    <div className="bar-label">{item.category}</div>
                    <div className="bar-container">
                      <div 
                        className="bar-fill"
                        style={{ 
                          width: `${(item.count / Math.max(...metrics.damageAnalytics.damageByCategory.map(d => d.count))) * 100}%` 
                        }}
                      >
                        <span className="bar-value">{item.count}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="no-data">
              <p>📭 No hay datos de daños disponibles</p>
              <small>Los datos aparecerán cuando se reporten productos dañados</small>
            </div>
          )}
        </div>

        {/* Tiendas con más daños */}
        {metrics.damageAnalytics.topStoresWithDamage.length > 0 && (
          <div className="top-stores">
            <h4>🏪 Tiendas con Más Daños</h4>
            <div className="stores-list">
              {metrics.damageAnalytics.topStoresWithDamage.map((store, index) => (
                <div key={index} className="store-item">
                  <span className="store-name">{store.storeName}</span>
                  <span className="damage-count">{store.damageCount} daños</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Performance de asesores */}
      {metrics.advisorPerformance.length > 0 && (
        <div className="section">
          <h2>👥 Performance de Asesores</h2>
          <div className="advisor-performance">
            <table className="performance-table">
              <thead>
                <tr>
                  <th>Asesor</th>
                  <th>Visitas</th>
                  <th>Tiempo Promedio</th>
                  <th>Eficiencia</th>
                  <th>Reportes Daño</th>
                </tr>
              </thead>
              <tbody>
                {metrics.advisorPerformance.map((advisor, index) => (
                  <tr key={index}>
                    <td className="advisor-name">
                      <span className="advisor-avatar">
                        {advisor.advisorName.split(' ').map(n => n[0]).join('')}
                      </span>
                      {advisor.advisorName}
                    </td>
                    <td className="visits-count">{advisor.completedVisits}</td>
                    <td className="time-avg">{advisor.averageTimePerStore} min</td>
                    <td className="efficiency-cell">
                      <div className="efficiency-bar">
                        <div 
                          className="efficiency-fill"
                          style={{ width: `${advisor.efficiencyScore}%` }}
                        />
                        <span className="efficiency-text">{advisor.efficiencyScore}%</span>
                      </div>
                    </td>
                    <td className="damage-reports">
                      <span className={`damage-badge ${advisor.damageReports > 2 ? 'high' : advisor.damageReports > 0 ? 'medium' : 'low'}`}>
                        {advisor.damageReports}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Botón de actualización */}
      <div className="refresh-section">
        <button 
          onClick={loadMetrics}
          className="refresh-btn"
          disabled={loading}
        >
          {loading ? '🔄 Actualizando...' : '🔄 Actualizar Métricas'}
        </button>
        <small className="refresh-note">
          Los datos se actualizan automáticamente cada vez que se completa una visita
        </small>
      </div>
    </div>
  );
};

export default AdvancedMetrics;