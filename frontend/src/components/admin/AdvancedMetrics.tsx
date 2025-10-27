// frontend/src/components/admin/AdvancedMetrics.tsx
import React, { useState, useEffect } from 'react';
import { adminService, type AdvancedMetrics } from '../../services/adminService';
import '../../styles/AdvancedMetrics.css'; // Asegúrate de crear este archivo CSS

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
      const data = await adminService.getAdvancedMetrics(timeRange);
      setMetrics(data);
    } catch (err) {
      console.error('Error loading metrics:', err);
      setError('Error cargando las métricas. Mostrando datos de ejemplo.');
      // Los datos mock del servicio se mostrarán automáticamente
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Cargando métricas avanzadas...</p>
      </div>
    );
  }

  if (error && !metrics) {
    return (
      <div className="error-container">
        <h3>⚠️ Error</h3>
        <p>{error}</p>
        <button onClick={loadMetrics}>Reintentar</button>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="error-container">
        <h3>⚠️ No hay datos disponibles</h3>
        <p>No se pudieron cargar las métricas avanzadas.</p>
        <button onClick={loadMetrics}>Reintentar</button>
      </div>
    );
  }

  return (
    <div className="advanced-metrics">
      {/* Header */}
      <div className="metrics-header">
        <h1>📊 Métricas Avanzadas - SmartPath</h1>
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

      {error && (
        <div className="warning-message">
          ⚠️ {error}
        </div>
      )}

      {/* Métricas generales */}
      <div className="section">
        <h2>📈 Resumen General</h2>
        <div className="overall-metrics grid">
          <div className="metric-card">
            <div className="metric-icon">🏪</div>
            <div className="metric-content">
              <h3>Tiendas Visitadas</h3>
              <div className="metric-value">{metrics.overall.completedVisits}/{metrics.overall.totalStores}</div>
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
        </div>

        {/* Tiendas con más daños */}
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
      </div>

      {/* Análisis de ventas */}
      <div className="section">
        <h2>📈 Análisis de Ventas y Reposición</h2>
        <div className="sales-metrics grid">
          <div className="metric-card success">
            <div className="metric-icon">🛒</div>
            <div className="metric-content">
              <h3>Productos Repuestos</h3>
              <div className="metric-value">{metrics.salesAnalytics.totalProductsSold}</div>
              <div className="metric-subtitle">Indicador de ventas</div>
            </div>
          </div>
          
          <div className="metric-card">
            <div className="metric-icon">⚡</div>
            <div className="metric-content">
              <h3>Eficiencia Reposición</h3>
              <div className="metric-value">{metrics.salesAnalytics.restockingEfficiency}%</div>
              <div className="metric-subtitle">Effectividad en tienda</div>
            </div>
          </div>
        </div>

        {/* Mejores tiendas */}
        <div className="best-stores">
          <h4>🏆 Mejores Tiendas por Ventas</h4>
          <div className="stores-list">
            {metrics.salesAnalytics.bestPerformingStores.map((store, index) => (
              <div key={index} className="store-item">
                <span className="store-name">{store.storeName}</span>
                <span className="sales-count">{store.salesCount} productos</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Performance de asesores */}
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

      {/* Botón de actualización */}
      <div className="refresh-section">
        <button 
          onClick={loadMetrics}
          className="refresh-btn"
          disabled={loading}
        >
          {loading ? '🔄 Actualizando...' : '🔄 Actualizar Métricas'}
        </button>
      </div>
    </div>
  );
};

export default AdvancedMetrics;