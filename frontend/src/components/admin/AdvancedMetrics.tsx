// frontend/src/components/admin/AdvancedMetrics.tsx
import React, { useState, useEffect } from 'react';
import { adminService, type AdvancedMetrics } from '../../services/adminService';
import '../../styles/AdvancedMetrics.css';

const AdvancedMetrics: React.FC = () => {
  const [metrics, setMetrics] = useState<AdvancedMetrics | null>(null);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'quarter'>('month');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'general' | 'damage' | 'restock' | 'advisors'>('general');

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
    if (!items || items.length === 0) return 0;
    const maxCount = Math.max(...items.map(i => i.count || i.quantity || 0));
    return maxCount > 0 ? (count / maxCount) * 100 : 0;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
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

  const restockMetrics = metrics.restockMetrics || {
    totalItems: 0,
    totalValue: 0,
    uniqueProducts: 0,
    averageItemsPerVisit: 0,
    topRestockedProducts: [],
    topRestockedCategories: [],
    restockByAdvisor: [],
    restockByStore: [],
    dailyRestockTrend: []
  };

  return (
    <div className="advanced-metrics">
      {/* Header */}
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

      {/* Tabs */}
      <div className="metrics-tabs">
        <button 
          className={`tab-btn ${activeTab === 'general' ? 'active' : ''}`}
          onClick={() => setActiveTab('general')}
        >
          📈 General
        </button>
        <button 
          className={`tab-btn ${activeTab === 'restock' ? 'active' : ''}`}
          onClick={() => setActiveTab('restock')}
        >
          📦 Reposiciones
        </button>
        <button 
          className={`tab-btn ${activeTab === 'damage' ? 'active' : ''}`}
          onClick={() => setActiveTab('damage')}
        >
          ⚠️ Daños
        </button>
        <button 
          className={`tab-btn ${activeTab === 'advisors' ? 'active' : ''}`}
          onClick={() => setActiveTab('advisors')}
        >
          👥 Asesores
        </button>
      </div>

      {/* Estado de Datos */}
      <div className="data-status">
        <div className="data-stats">
          <span>Tiendas: {metrics.overall.totalStores}</span>
          <span>Visitas: {metrics.overall.completedVisits}</span>
          <span>Repuestos: {restockMetrics.totalItems}</span>
          <span>Daños: {metrics.damageAnalytics.totalDamagedProducts}</span>
          <span>Asesores: {metrics.advisorPerformance.length}</span>
        </div>
      </div>

      {/* TAB: GENERAL */}
      {activeTab === 'general' && (
        <>
          <div className="section">
            <h2>📈 Resumen General</h2>
            <div className="grid">
              <div className="metric-card">
                <h3>Tiendas</h3>
                <div className="metric-value">{metrics.overall.totalStores}</div>
              </div>
              <div className="metric-card">
                <h3>Visitas</h3>
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
            <h2>📊 KPIs Comerciales</h2>
            <div className="kpi-grid">
              <div className="kpi-card">
                <span className="kpi-label">Productos Repuestos</span>
                <span className="kpi-value">{restockMetrics.totalItems}</span>
                <span className="kpi-trend">{restockMetrics.averageItemsPerVisit.toFixed(1)} por visita</span>
              </div>
              <div className="kpi-card">
                <span className="kpi-label">Valor Total</span>
                <span className="kpi-value">{formatCurrency(restockMetrics.totalValue)}</span>
                <span className="kpi-trend">{restockMetrics.uniqueProducts} productos únicos</span>
              </div>
              <div className="kpi-card">
                <span className="kpi-label">Productos Dañados</span>
                <span className="kpi-value">{metrics.damageAnalytics.totalDamagedProducts}</span>
                <span className="kpi-trend">
                  {((metrics.damageAnalytics.totalDamagedProducts / restockMetrics.totalItems) * 100 || 0).toFixed(1)}% del total
                </span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* TAB: REPOSICIONES */}
      {activeTab === 'restock' && (
        <div className="section">
          <h2>📦 Estadísticas de Reposición</h2>
          
          <div className="restock-summary">
            <div className="summary-card">
              <span className="summary-label">Total Productos</span>
              <span className="summary-value">{restockMetrics.totalItems}</span>
            </div>
            <div className="summary-card">
              <span className="summary-label">Valor Total</span>
              <span className="summary-value">{formatCurrency(restockMetrics.totalValue)}</span>
            </div>
            <div className="summary-card">
              <span className="summary-label">Productos Únicos</span>
              <span className="summary-value">{restockMetrics.uniqueProducts}</span>
            </div>
          </div>

          {restockMetrics.topRestockedProducts.length > 0 && (
            <div className="top-products">
              <h3>🏆 Top Productos</h3>
              <div className="products-list">
                {restockMetrics.topRestockedProducts.map((product, index) => (
                  <div key={index} className="product-item">
                    <span className="product-rank">{index + 1}</span>
                    <span className="product-name">{product.productName}</span>
                    <span className="product-quantity">{product.quantity} und</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {restockMetrics.topRestockedCategories.length > 0 && (
            <div className="top-categories">
              <h3>📊 Por Categoría</h3>
              {restockMetrics.topRestockedCategories.map((cat, idx) => (
                <div key={idx} className="category-bar">
                  <div className="bar-label">
                    <span>{cat.category}</span>
                    <span>{cat.quantity} ({cat.percentage.toFixed(1)}%)</span>
                  </div>
                  <div className="bar-container">
                    <div 
                      className="bar-fill"
                      style={{ width: `${calculateBarWidth(cat.quantity, restockMetrics.topRestockedCategories)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB: DAÑOS */}
      {activeTab === 'damage' && (
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
                  <div className="bar-label">
                    <span>{item.category}</span>
                    <span>{item.count}</span>
                  </div>
                  <div className="bar-container">
                    <div 
                      className="bar-fill damage-fill"
                      style={{ width: `${calculateBarWidth(item.count, metrics.damageAnalytics.damageByCategory)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {metrics.damageAnalytics.topStoresWithDamage.length > 0 && (
            <div className="top-stores">
              <h3>🏪 Tiendas con Más Daños</h3>
              {metrics.damageAnalytics.topStoresWithDamage.map((store, idx) => (
                <div key={idx} className="store-item">
                  <span>{store.storeName}</span>
                  <span className="damage-count">{store.damageCount}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB: ASESORES */}
      {activeTab === 'advisors' && (
        <div className="section">
          <h2>👥 Performance de Asesores</h2>
          
          {metrics.advisorPerformance.length > 0 ? (
            <div className="table-container">
              <table className="performance-table">
                <thead>
                  <tr>
                    <th>Asesor</th>
                    <th>Visitas</th>
                    <th>Tiempo</th>
                    <th>Eficiencia</th>
                    <th>Daños</th>
                    <th>Repuestos</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.advisorPerformance.map((advisor, index) => {
                    const advisorRestock = restockMetrics.restockByAdvisor?.find(
                      a => a.advisorName === advisor.advisorName
                    );
                    return (
                      <tr key={index}>
                        <td>{advisor.advisorName}</td>
                        <td>{advisor.completedVisits}</td>
                        <td>{advisor.averageTimePerStore} min</td>
                        <td>{advisor.efficiencyScore}%</td>
                        <td>{advisor.damageReports}</td>
                        <td>{advisorRestock?.totalItems || 0}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p>No hay datos de asesores</p>
          )}
        </div>
      )}
    </div>
  );
};

export default AdvancedMetrics;