// frontend/src/components/admin/AdvancedMetrics.tsx
import React, { useState, useEffect } from 'react';
import { adminService, type AdvancedMetrics } from '../../services/adminService';
import '../../styles/AdvancedMetrics.css';

const AdvancedMetrics: React.FC = () => {
  const [metrics, setMetrics] = useState<AdvancedMetrics | null>(null);
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month' | 'quarter'>('month');
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

  const getEfficiencyTooltip = () => {
    return "La eficiencia se calcula basada en el tiempo óptimo de 30 minutos por tienda. " +
           "Cada minuto adicional reduce la eficiencia en 2%.";
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Cargando métricas avanzadas...</p>
        <small className="loading-details">Conectando con la base de datos...</small>
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

  const hasRestockData = restockMetrics.totalItems > 0;
  const hasDamageData = metrics.damageAnalytics.totalDamagedProducts > 0;
  const hasAdvisorData = metrics.advisorPerformance.length > 0;

  return (
    <div className="advanced-metrics">
      {/* Header */}
      <div className="metrics-header">
        <h1>📊 Métricas Avanzadas</h1>
        <div className="time-range-selector">
          <button 
            className={timeRange === 'day' ? 'active' : ''}
            onClick={() => setTimeRange('day')}
            title="Visitas y datos de hoy"
          >
            📅 Hoy
          </button>
          <button 
            className={timeRange === 'week' ? 'active' : ''}
            onClick={() => setTimeRange('week')}
            title="Últimos 7 días"
          >
            Semana
          </button>
          <button 
            className={timeRange === 'month' ? 'active' : ''}
            onClick={() => setTimeRange('month')}
            title="Últimos 30 días"
          >
            Mes
          </button>
          <button 
            className={timeRange === 'quarter' ? 'active' : ''}
            onClick={() => setTimeRange('quarter')}
            title="Últimos 90 días"
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
          📦 Reposiciones {hasRestockData && <span className="tab-badge">{restockMetrics.totalItems}</span>}
        </button>
        <button 
          className={`tab-btn ${activeTab === 'damage' ? 'active' : ''}`}
          onClick={() => setActiveTab('damage')}
        >
          ⚠️ Daños {hasDamageData && <span className="tab-badge">{metrics.damageAnalytics.totalDamagedProducts}</span>}
        </button>
        <button 
          className={`tab-btn ${activeTab === 'advisors' ? 'active' : ''}`}
          onClick={() => setActiveTab('advisors')}
        >
          👥 Asesores {hasAdvisorData && <span className="tab-badge">{metrics.advisorPerformance.length}</span>}
        </button>
      </div>

      {/* Estado de Datos */}
      <div className="data-status">
        <div className="data-stats">
          <span className="stat-item">🏪 Tiendas: {metrics.overall.totalStores}</span>
          <span className="stat-item">✓ Visitas: {metrics.overall.completedVisits}</span>
          <span className="stat-item">📦 Repuestos: {restockMetrics.totalItems}</span>
          <span className="stat-item">⚠️ Daños: {metrics.damageAnalytics.totalDamagedProducts}</span>
          <span className="stat-item">👥 Asesores: {metrics.advisorPerformance.length}</span>
        </div>
      </div>

      {/* TAB: GENERAL */}
      {activeTab === 'general' && (
        <>
          <div className="section">
            <h2>📈 Resumen General</h2>
            <div className="grid">
              <div className="metric-card">
                <div className="metric-header">
                  <h3>Tiendas</h3>
                  <span className="tooltip-icon" title="Total de tiendas registradas en el sistema">ⓘ</span>
                </div>
                <div className="metric-value">{metrics.overall.totalStores}</div>
                <div className="metric-subtitle">Registradas</div>
              </div>
              
              <div className="metric-card">
                <div className="metric-header">
                  <h3>Visitas Completadas</h3>
                  <span className="tooltip-icon" title="Visitas finalizadas en el período seleccionado">ⓘ</span>
                </div>
                <div className="metric-value">{metrics.overall.completedVisits}</div>
                <div className="metric-subtitle">En {timeRange}</div>
              </div>
              
              <div className="metric-card">
                <div className="metric-header">
                  <h3>Eficiencia</h3>
                  <span className="tooltip-icon" title={getEfficiencyTooltip()}>ⓘ</span>
                </div>
                <div className="metric-value">{metrics.overall.averageEfficiency}%</div>
                <div className="metric-subtitle">
                  {metrics.advisorPerformance.length > 0 
                    ? `Basado en ${metrics.advisorPerformance.length} asesores` 
                    : 'Esperando datos...'}
                </div>
              </div>
              
              <div className="metric-card">
                <div className="metric-header">
                  <h3>Distancia Recorrida</h3>
                  <span className="tooltip-icon" title="Total de kilómetros recorridos">ⓘ</span>
                </div>
                <div className="metric-value">{metrics.overall.totalDistance} km</div>
                <div className="metric-subtitle">En total</div>
              </div>
            </div>
          </div>

          <div className="section">
            <h2>📊 KPIs Comerciales</h2>
            <div className="kpi-grid">
              <div className="kpi-card">
                <span className="kpi-icon">📦</span>
                <div className="kpi-content">
                  <span className="kpi-label">Productos Repuestos</span>
                  <span className="kpi-value">{restockMetrics.totalItems}</span>
                  <span className="kpi-trend">{restockMetrics.averageItemsPerVisit.toFixed(1)} por visita</span>
                </div>
              </div>
              
              <div className="kpi-card">
                <span className="kpi-icon">💰</span>
                <div className="kpi-content">
                  <span className="kpi-label">Valor Total</span>
                  <span className="kpi-value">{formatCurrency(restockMetrics.totalValue)}</span>
                  <span className="kpi-trend">{restockMetrics.uniqueProducts} productos únicos</span>
                </div>
              </div>
              
              <div className="kpi-card">
                <span className="kpi-icon">⚠️</span>
                <div className="kpi-content">
                  <span className="kpi-label">Productos Dañados</span>
                  <span className="kpi-value">{metrics.damageAnalytics.totalDamagedProducts}</span>
                  <span className="kpi-trend">
                    {((metrics.damageAnalytics.totalDamagedProducts / (restockMetrics.totalItems || 1)) * 100).toFixed(1)}% del total
                  </span>
                </div>
              </div>
            </div>
          </div>

          {!hasRestockData && !hasDamageData && !hasAdvisorData && (
            <div className="info-message">
              <span className="info-icon">ℹ️</span>
              <div className="info-content">
                <p><strong>No hay datos en el período seleccionado</strong></p>
                <p>Los datos aparecerán automáticamente cuando los asesores:</p>
                <ul>
                  <li>✓ Completen visitas a tiendas</li>
                  <li>✓ Registren productos repuestos</li>
                  <li>✓ Reporten productos dañados</li>
                </ul>
                <small>Cambia el período de tiempo o espera a que se generen datos.</small>
              </div>
            </div>
          )}
        </>
      )}

      {/* TAB: REPOSICIONES */}
      {activeTab === 'restock' && (
        <div className="section">
          <h2>📦 Estadísticas de Reposición</h2>
          
          {!hasRestockData ? (
            <div className="info-message">
              <span className="info-icon">ℹ️</span>
              <div className="info-content">
                <p><strong>No hay datos de reposiciones</strong></p>
                <p>Los datos aparecerán cuando los asesores comiencen a registrar productos repuestos durante sus visitas.</p>
                <small>Cada producto repuesto se registra con código de barras, cantidad y precio.</small>
              </div>
            </div>
          ) : (
            <>
              <div className="restock-summary">
                <div className="summary-card">
                  <span className="summary-icon">📦</span>
                  <div className="summary-details">
                    <span className="summary-label">Total Productos</span>
                    <span className="summary-value">{restockMetrics.totalItems}</span>
                  </div>
                </div>
                <div className="summary-card">
                  <span className="summary-icon">💰</span>
                  <div className="summary-details">
                    <span className="summary-label">Valor Total</span>
                    <span className="summary-value">{formatCurrency(restockMetrics.totalValue)}</span>
                  </div>
                </div>
                <div className="summary-card">
                  <span className="summary-icon">🆕</span>
                  <div className="summary-details">
                    <span className="summary-label">Productos Únicos</span>
                    <span className="summary-value">{restockMetrics.uniqueProducts}</span>
                  </div>
                </div>
                <div className="summary-card">
                  <span className="summary-icon">📊</span>
                  <div className="summary-details">
                    <span className="summary-label">Promedio/Visita</span>
                    <span className="summary-value">{restockMetrics.averageItemsPerVisit.toFixed(1)}</span>
                  </div>
                </div>
              </div>

              {restockMetrics.topRestockedProducts.length > 0 && (
                <div className="top-products">
                  <h3>🏆 Top Productos Repuestos</h3>
                  <div className="products-list">
                    {restockMetrics.topRestockedProducts.map((product, index) => (
                      <div key={index} className="product-item">
                        <span className="product-rank">{index + 1}</span>
                        <div className="product-info">
                          <span className="product-name">{product.productName}</span>
                          <span className="product-barcode">{product.productBarcode}</span>
                        </div>
                        <div className="product-stats">
                          <span className="product-quantity">{product.quantity} und</span>
                          {product.totalValue > 0 && (
                            <span className="product-value">{formatCurrency(product.totalValue)}</span>
                          )}
                        </div>
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
                          className="bar-fill category-fill"
                          style={{ width: `${calculateBarWidth(cat.quantity, restockMetrics.topRestockedCategories)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {restockMetrics.dailyRestockTrend.length > 0 && (
                <div className="trend-section">
                  <h3>📈 Tendencia Diaria</h3>
                  <div className="trend-chart">
                    {restockMetrics.dailyRestockTrend.slice(-7).map((day, index) => (
                      <div key={index} className="trend-bar-container">
                        <div 
                          className="trend-bar" 
                          style={{ 
                            height: `${(day.items / Math.max(...restockMetrics.dailyRestockTrend.map(d => d.items)) * 100)}px` 
                          }}
                        >
                          <span className="trend-value">{day.items}</span>
                        </div>
                        <div className="trend-label">
                          {new Date(day.date).toLocaleDateString('es', { weekday: 'short' })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* TAB: DAÑOS */}
      {activeTab === 'damage' && (
        <div className="section">
          <h2>⚠️ Análisis de Daños</h2>
          
          {!hasDamageData ? (
            <div className="info-message">
              <span className="info-icon">ℹ️</span>
              <div className="info-content">
                <p><strong>No hay reportes de daños</strong></p>
                <p>Los datos aparecerán cuando los asesores reporten productos dañados durante sus visitas.</p>
                <small>Los reportes incluyen fotos, tipo de daño y severidad.</small>
              </div>
            </div>
          ) : (
            <>
              <div className="damage-summary">
                <div className="summary-card danger">
                  <span className="summary-icon">🚨</span>
                  <div className="summary-details">
                    <span className="summary-label">Total Daños</span>
                    <span className="summary-value">{metrics.damageAnalytics.totalDamagedProducts}</span>
                  </div>
                </div>
                <div className="summary-card warning">
                  <span className="summary-icon">📊</span>
                  <div className="summary-details">
                    <span className="summary-label">% vs Reposiciones</span>
                    <span className="summary-value">
                      {((metrics.damageAnalytics.totalDamagedProducts / (restockMetrics.totalItems || 1)) * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
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
                      <span className="store-name">{store.storeName}</span>
                      <span className={`damage-count ${store.damageCount > 3 ? 'high' : store.damageCount > 1 ? 'medium' : 'low'}`}>
                        {store.damageCount} {store.damageCount === 1 ? 'daño' : 'daños'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* TAB: ASESORES */}
      {activeTab === 'advisors' && (
        <div className="section">
          <h2>👥 Performance de Asesores</h2>
          
          {!hasAdvisorData ? (
            <div className="info-message">
              <span className="info-icon">ℹ️</span>
              <div className="info-content">
                <p><strong>No hay datos de asesores</strong></p>
                <p>Los datos aparecerán cuando los asesores comiencen a completar visitas.</p>
                <small>Se registra número de visitas, tiempo promedio, eficiencia y reportes.</small>
              </div>
            </div>
          ) : (
            <div className="advisor-performance">
              <div className="table-container">
                <table className="performance-table">
                  <thead>
                    <tr>
                      <th>Asesor</th>
                      <th>Visitas</th>
                      <th>Tiempo Prom.</th>
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
                        <tr key={index} className={index % 2 === 0 ? 'even-row' : 'odd-row'}>
                          <td className="advisor-name">
                            <span className="advisor-avatar">
                              {advisor.advisorName.split(' ').map(n => n[0]).join('').toUpperCase()}
                            </span>
                            <span className="advisor-name-text">{advisor.advisorName}</span>
                          </td>
                          <td className="visits-count">
                            <span className="count-badge">{advisor.completedVisits}</span>
                          </td>
                          <td className="time-avg">
                            {advisor.averageTimePerStore} min
                          </td>
                          <td className="efficiency-cell">
                            <div className="efficiency-container">
                              <div className="efficiency-bar">
                                <div 
                                  className={`efficiency-fill ${
                                    advisor.efficiencyScore >= 90 ? 'excellent' : 
                                    advisor.efficiencyScore >= 80 ? 'good' : 
                                    advisor.efficiencyScore >= 70 ? 'average' : 'poor'
                                  }`}
                                  style={{ width: `${advisor.efficiencyScore}%` }}
                                />
                              </div>
                              <span className={`efficiency-text ${
                                advisor.efficiencyScore >= 90 ? 'excellent' : 
                                advisor.efficiencyScore >= 80 ? 'good' : 
                                advisor.efficiencyScore >= 70 ? 'average' : 'poor'
                              }`}>
                                {advisor.efficiencyScore}%
                              </span>
                            </div>
                          </td>
                          <td className="damage-reports">
                            <span className={`damage-badge ${
                              advisor.damageReports > 2 ? 'high' : 
                              advisor.damageReports > 0 ? 'medium' : 'low'
                            }`}>
                              {advisor.damageReports}
                            </span>
                          </td>
                          <td className="restock-cell">
                            <span className="restock-badge">
                              {advisorRestock?.totalItems || 0} und
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {restockMetrics.restockByAdvisor && restockMetrics.restockByAdvisor.length > 0 && (
                <div className="advisor-ranking">
                  <h3>🏆 Ranking de Asesores por Reposición</h3>
                  <div className="ranking-list">
                    {restockMetrics.restockByAdvisor
                      .sort((a, b) => b.totalItems - a.totalItems)
                      .slice(0, 3)
                      .map((advisor, index) => (
                        <div key={index} className={`ranking-item rank-${index + 1}`}>
                          <div className="rank-position">{index + 1}</div>
                          <div className="rank-info">
                            <span className="rank-name">{advisor.advisorName}</span>
                            <span className="rank-stats">
                              {advisor.totalItems} und • {formatCurrency(advisor.totalValue)}
                            </span>
                          </div>
                          <div className="rank-badge">
                            {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Botón de actualización */}
      <div className="refresh-section">
        <button 
          onClick={loadMetrics}
          className="refresh-btn"
          disabled={loading}
        >
          {loading ? (
            <>
              <span className="spinner-small"></span>
              Actualizando...
            </>
          ) : (
            '🔄 Actualizar Métricas'
          )}
        </button>
        <small className="refresh-note">
          Los datos se actualizan automáticamente cada vez que cambias de período o haces clic en Actualizar
        </small>
      </div>
    </div>
  );
};

export default AdvancedMetrics;