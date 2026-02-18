// frontend/src/components/admin/AdvancedMetrics.tsx - VERSIÓN COMPLETA CON ESTADÍSTICAS DE REPOSICIÓN
import React, { useState, useEffect } from 'react';
import { adminService, type AdvancedMetrics } from '../../services/adminService';
import '../../styles/AdvancedMetrics.css';

const AdvancedMetrics: React.FC = () => {
  const [metrics, setMetrics] = useState<AdvancedMetrics | null>(null);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'quarter'>('month');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<'real' | 'error'>('real');
  const [debugInfo, setDebugInfo] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'general' | 'damage' | 'restock' | 'advisors'>('general');

  useEffect(() => {
    loadMetrics();
  }, [timeRange]);

  const loadMetrics = async () => {
    try {
      setLoading(true);
      setError(null);
      setDebugInfo(`🔄 Consultando base de datos para: ${timeRange}...`);
      
      console.log(`📡 Solicitando métricas REALES para: ${timeRange}`);
      const data = await adminService.getAdvancedMetrics(timeRange);
      
      // Verificar si hay datos reales
      const hasRealData = data.overall.totalStores > 0 || 
                         data.damageAnalytics.totalDamagedProducts > 0 ||
                         data.advisorPerformance.length > 0 ||
                         data.restockMetrics.totalItems > 0;
      
      if (hasRealData) {
        setMetrics(data);
        setDataSource('real');
        setDebugInfo(`✅ Datos REALES cargados: ${data.overall.completedVisits} visitas, ${data.damageAnalytics.totalDamagedProducts} daños, ${data.restockMetrics.totalItems} productos repuestos`);
        
        console.log('📊 Datos REALES recibidos:', {
          tiendas: data.overall.totalStores,
          visitas: data.overall.completedVisits,
          distancia: data.overall.totalDistance,
          daños: data.damageAnalytics.totalDamagedProducts,
          reposiciones: data.restockMetrics.totalItems,
          valorReposiciones: data.restockMetrics.totalValue,
          asesores: data.advisorPerformance.length
        });
      } else {
        setError('No hay datos reales en el sistema para el período seleccionado');
        setDataSource('error');
        setDebugInfo('⚠️ Backend respondió pero sin datos reales');
      }
      
    } catch (err: any) {
      console.error('❌ Error cargando métricas:', err);
      
      const backendError = err.response?.data?.message || err.message;
      const sqlError = err.response?.data?.sqlMessage ? ` (SQL: ${err.response.data.sqlMessage})` : '';
      
      setError(`Error del servidor: ${backendError}${sqlError}`);
      setDataSource('error');
      setDebugInfo(`❌ Error: ${backendError}`);
      setMetrics(null);
    } finally {
      setLoading(false);
    }
  };

  // Función para calcular el ancho de las barras
  const calculateBarWidth = (count: number, allItems: any[]) => {
    if (!allItems || allItems.length === 0) return 0;
    const maxCount = Math.max(...allItems.map((item: any) => item.count || item.quantity || 0));
    return maxCount > 0 ? (count / maxCount) * 100 : 0;
  };

  // Formatear moneda
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
        <p>Cargando métricas REALES de la base de datos...</p>
        <small>{debugInfo}</small>
        <small className="loading-details">
          Consultando: Visitas • Productos • Reposiciones • Performance
        </small>
      </div>
    );
  }

  if (error && !metrics) {
    return (
      <div className="error-container">
        <h3>⚠️ Error del Sistema</h3>
        <p className="error-message">{error}</p>
        
        <div className="error-solutions">
          <p><strong>Soluciones posibles:</strong></p>
          <ul>
            <li>Verifica que la base de datos esté conectada</li>
            <li>Asegúrate de que haya datos en las tablas</li>
            <li>Revisa los logs del backend para más detalles</li>
            <li>Intenta con otro rango de tiempo (Semana/Mes)</li>
          </ul>
        </div>
        
        <div className="debug-section">
          <details>
            <summary>Información técnica de debug</summary>
            <pre>{debugInfo}</pre>
          </details>
        </div>
        
        <button onClick={loadMetrics} className="retry-btn">
          🔄 Reintentar conexión
        </button>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="no-data-container">
        <div className="no-data-icon">📭</div>
        <h3>Sin Datos Reales Disponibles</h3>
        <p>El sistema no tiene datos registrados para mostrar métricas.</p>
        
        <div className="data-requirements">
          <p><strong>Para ver datos en esta página necesitas:</strong></p>
          <ul>
            <li>✅ Asesores que hayan completado visitas</li>
            <li>✅ Reportes de productos dañados registrados</li>
            <li>✅ Productos repuestos (ventas) registrados</li>
            <li>✅ Tiendas asignadas a rutas</li>
            <li>✅ Rutas completadas en el sistema</li>
          </ul>
        </div>
        
        <div className="actions">
          <button onClick={loadMetrics} className="retry-btn">
            🔄 Verificar nuevamente
          </button>
          <small className="hint">Los datos se generan automáticamente cuando los asesores usan la app</small>
        </div>
      </div>
    );
  }

  const { restockMetrics } = metrics;

  return (
    <div className="advanced-metrics">
      {/* Header */}
      <div className="metrics-header">
        <div className="header-content">
          <h1>📊 Métricas Avanzadas - SmartPath</h1>
          <p className="header-subtitle">
            {dataSource === 'real' ? '✅ Datos REALES de la base de datos' : '⚠️ Modo de demostración'}
          </p>
          <div className="data-source-info">
            <span className="data-badge real">Base de datos MySQL</span>
            <span className="time-info">Período: {timeRange}</span>
          </div>
        </div>
        <div className="time-range-selector">
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

      {/* Tabs de navegación */}
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
        <div className={`status-badge ${dataSource === 'real' ? 'real-data' : 'mock-data'}`}>
          {dataSource === 'real' ? '✅ Datos Reales' : '⚠️ Datos Limitados'}
        </div>
        <div className="data-stats">
          <span className="stat-item">Tiendas: {metrics.overall.totalStores}</span>
          <span className="stat-item">Visitas: {metrics.overall.completedVisits}</span>
          <span className="stat-item">Repuestos: {restockMetrics.totalItems}</span>
          <span className="stat-item">Daños: {metrics.damageAnalytics.totalDamagedProducts}</span>
          <span className="stat-item">Asesores: {metrics.advisorPerformance.length}</span>
        </div>
        <div className="last-updated">
          Actualizado: {new Date().toLocaleTimeString()}
        </div>
      </div>

      {/* TAB: GENERAL */}
      {activeTab === 'general' && (
        <>
          {/* Métricas generales */}
          <div className="section">
            <h2>📈 Resumen General del Sistema</h2>
            <div className="overall-metrics grid">
              <div className="metric-card">
                <div className="metric-icon">🏪</div>
                <div className="metric-content">
                  <h3>Tiendas Activas</h3>
                  <div className="metric-value">{metrics.overall.totalStores}</div>
                  <div className="metric-subtitle">Total en sistema</div>
                </div>
              </div>
              
              <div className="metric-card">
                <div className="metric-icon">✓</div>
                <div className="metric-content">
                  <h3>Visitas Completadas</h3>
                  <div className="metric-value">{metrics.overall.completedVisits}</div>
                  <div className="metric-subtitle">En período seleccionado</div>
                </div>
              </div>
              
              <div className="metric-card">
                <div className="metric-icon">⏱️</div>
                <div className="metric-content">
                  <h3>Eficiencia Promedio</h3>
                  <div className="metric-value">{metrics.overall.averageEfficiency}%</div>
                  <div className="metric-subtitle">Score del sistema</div>
                </div>
              </div>
              
              <div className="metric-card">
                <div className="metric-icon">🛣️</div>
                <div className="metric-content">
                  <h3>Distancia Recorrida</h3>
                  <div className="metric-value">{metrics.overall.totalDistance} km</div>
                  <div className="metric-subtitle">Total optimizado</div>
                </div>
              </div>
            </div>
          </div>

          {/* KPIs combinados */}
          <div className="section">
            <h2>📊 KPIs Comerciales</h2>
            <div className="kpi-grid">
              <div className="kpi-card">
                <div className="kpi-header">
                  <span className="kpi-icon">📦</span>
                  <span className="kpi-label">Productos Repuestos</span>
                </div>
                <div className="kpi-value">{restockMetrics.totalItems}</div>
                <div className="kpi-trend">
                  {restockMetrics.averageItemsPerVisit.toFixed(1)} por visita
                </div>
              </div>

              <div className="kpi-card">
                <div className="kpi-header">
                  <span className="kpi-icon">💰</span>
                  <span className="kpi-label">Valor Total</span>
                </div>
                <div className="kpi-value">{formatCurrency(restockMetrics.totalValue)}</div>
                <div className="kpi-trend">
                  {restockMetrics.uniqueProducts} productos únicos
                </div>
              </div>

              <div className="kpi-card">
                <div className="kpi-header">
                  <span className="kpi-icon">⚠️</span>
                  <span className="kpi-label">Productos Dañados</span>
                </div>
                <div className="kpi-value">{metrics.damageAnalytics.totalDamagedProducts}</div>
                <div className="kpi-trend">
                  {(metrics.damageAnalytics.totalDamagedProducts / restockMetrics.totalItems * 100 || 0).toFixed(1)}% del total repuesto
                </div>
              </div>

              <div className="kpi-card">
                <div className="kpi-header">
                  <span className="kpi-icon">📈</span>
                  <span className="kpi-label">Rotación</span>
                </div>
                <div className="kpi-value">{(restockMetrics.totalItems / metrics.overall.completedVisits || 0).toFixed(1)}</div>
                <div className="kpi-trend">
                  productos por visita
                </div>
              </div>
            </div>
          </div>

          {/* Tendencia diaria de reposiciones */}
          {restockMetrics.dailyRestockTrend && restockMetrics.dailyRestockTrend.length > 0 && (
            <div className="section">
              <h2>📅 Tendencia de Reposiciones</h2>
              <div className="trend-chart">
                {restockMetrics.dailyRestockTrend.slice(-7).map((day, index) => (
                  <div key={index} className="trend-bar-container">
                    <div className="trend-bar" style={{ height: `${(day.items / Math.max(...restockMetrics.dailyRestockTrend.map(d => d.items)) * 100)}px` }}>
                      <span className="trend-value">{day.items}</span>
                    </div>
                    <div className="trend-label">{new Date(day.date).toLocaleDateString('es', { weekday: 'short' })}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* TAB: REPOSICIONES */}
      {activeTab === 'restock' && (
        <>
          <div className="section">
            <h2>📦 Estadísticas de Reposición</h2>
            
            {/* Cards de resumen */}
            <div className="restock-summary-cards">
              <div className="summary-card">
                <div className="summary-icon">📦</div>
                <div className="summary-details">
                  <span className="summary-label">Total Productos</span>
                  <span className="summary-value">{restockMetrics.totalItems}</span>
                </div>
              </div>
              
              <div className="summary-card">
                <div className="summary-icon">💰</div>
                <div className="summary-details">
                  <span className="summary-label">Valor Total</span>
                  <span className="summary-value">{formatCurrency(restockMetrics.totalValue)}</span>
                </div>
              </div>
              
              <div className="summary-card">
                <div className="summary-icon">🆕</div>
                <div className="summary-details">
                  <span className="summary-label">Productos Únicos</span>
                  <span className="summary-value">{restockMetrics.uniqueProducts}</span>
                </div>
              </div>
              
              <div className="summary-card">
                <div className="summary-icon">📊</div>
                <div className="summary-details">
                  <span className="summary-label">Promedio/Visita</span>
                  <span className="summary-value">{restockMetrics.averageItemsPerVisit.toFixed(1)}</span>
                </div>
              </div>
            </div>

            {/* Top productos repuestos */}
            {restockMetrics.topRestockedProducts && restockMetrics.topRestockedProducts.length > 0 && (
              <div className="top-products">
                <h3>🏆 Top Productos Repuestos</h3>
                <div className="products-list">
                  {restockMetrics.topRestockedProducts.map((product, index) => (
                    <div key={index} className="product-item">
                      <div className="product-rank">{index + 1}</div>
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

            {/* Top categorías */}
            {restockMetrics.topRestockedCategories && restockMetrics.topRestockedCategories.length > 0 && (
              <div className="top-categories">
                <h3>📊 Reposiciones por Categoría</h3>
                <div className="categories-chart">
                  {restockMetrics.topRestockedCategories.map((category, index) => {
                    const widthPercent = calculateBarWidth(category.quantity, restockMetrics.topRestockedCategories);
                    
                    return (
                      <div key={index} className="category-bar">
                        <div className="bar-label">
                          <span className="category-name">{category.category}</span>
                          <span className="category-stats">
                            {category.quantity} und ({category.percentage.toFixed(1)}%)
                          </span>
                        </div>
                        <div className="bar-container">
                          <div 
                            className="bar-fill category-fill"
                            style={{ width: `${widthPercent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Reposiciones por tienda */}
            {restockMetrics.restockByStore && restockMetrics.restockByStore.length > 0 && (
              <div className="top-stores-restock">
                <h3>🏪 Top Tiendas por Reposición</h3>
                <div className="stores-restock-list">
                  {restockMetrics.restockByStore.slice(0, 5).map((store, index) => (
                    <div key={index} className="store-restock-item">
                      <div className="store-restock-info">
                        <span className="store-restock-name">{store.storeName}</span>
                        <span className="store-restock-visits">{store.visits} visitas</span>
                      </div>
                      <div className="store-restock-stats">
                        <span className="store-restock-items">{store.totalItems} und</span>
                        {store.totalValue > 0 && (
                          <span className="store-restock-value">{formatCurrency(store.totalValue)}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* TAB: DAÑOS */}
      {activeTab === 'damage' && (
        <>
          <div className="section">
            <h2>⚠️ Análisis de Productos Dañados</h2>
            
            {/* Card de total daños */}
            <div className="damage-metrics grid">
              <div className="metric-card danger">
                <div className="metric-icon">🚨</div>
                <div className="metric-content">
                  <h3>Productos Dañados</h3>
                  <div className="metric-value">{metrics.damageAnalytics.totalDamagedProducts}</div>
                  <div className="metric-subtitle">Total reportado</div>
                </div>
              </div>
              
              <div className="metric-card warning">
                <div className="metric-icon">📊</div>
                <div className="metric-content">
                  <h3>% vs Reposiciones</h3>
                  <div className="metric-value">
                    {((metrics.damageAnalytics.totalDamagedProducts / restockMetrics.totalItems) * 100 || 0).toFixed(1)}%
                  </div>
                  <div className="metric-subtitle">Del total repuesto</div>
                </div>
              </div>
            </div>

            {/* Daños por categoría */}
            {metrics.damageAnalytics.damageByCategory && metrics.damageAnalytics.damageByCategory.length > 0 ? (
              <div className="damage-chart">
                <h3>Daños por Categoría</h3>
                <div className="chart-bars">
                  {metrics.damageAnalytics.damageByCategory.map((item, index) => {
                    const widthPercent = calculateBarWidth(item.count, metrics.damageAnalytics.damageByCategory);
                    
                    return (
                      <div key={index} className="chart-bar">
                        <div className="bar-label">
                          <span className="category-name">{item.category}</span>
                          <span className="category-count">{item.count}</span>
                        </div>
                        <div className="bar-container">
                          <div 
                            className="bar-fill damage-fill"
                            style={{ width: `${widthPercent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="no-data">
                <div className="no-data-icon">📊</div>
                <p>No hay datos de daños disponibles</p>
              </div>
            )}

            {/* Tiendas con más daños */}
            {metrics.damageAnalytics.topStoresWithDamage && metrics.damageAnalytics.topStoresWithDamage.length > 0 ? (
              <div className="top-stores">
                <h3>🏪 Tiendas con Más Daños</h3>
                <div className="stores-list">
                  {metrics.damageAnalytics.topStoresWithDamage.map((store, index) => (
                    <div key={index} className="store-item">
                      <div className="store-info">
                        <span className="store-rank">{index + 1}</span>
                        <span className="store-name">{store.storeName}</span>
                      </div>
                      <span className={`damage-count ${store.damageCount > 3 ? 'high' : store.damageCount > 1 ? 'medium' : 'low'}`}>
                        {store.damageCount} {store.damageCount === 1 ? 'daño' : 'daños'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="no-data-small">
                <p>📭 No hay datos de tiendas con daños</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* TAB: ASESORES */}
      {activeTab === 'advisors' && (
        <>
          <div className="section">
            <h2>👥 Performance de Asesores</h2>
            
            {metrics.advisorPerformance && metrics.advisorPerformance.length > 0 ? (
              <div className="advisor-performance">
                {/* Tabla principal */}
                <div className="table-container">
                  <table className="performance-table">
                    <thead>
                      <tr>
                        <th>Asesor</th>
                        <th>Visitas</th>
                        <th>Tiempo Prom.</th>
                        <th>Eficiencia</th>
                        <th>Repuestos</th>
                        <th>Valor</th>
                        <th>Daños</th>
                      </tr>
                    </thead>
                    <tbody>
                      {metrics.advisorPerformance.map((advisor, index) => {
                        // Buscar datos de reposición para este asesor
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
                                    className={`efficiency-fill ${advisor.efficiencyScore >= 90 ? 'excellent' : advisor.efficiencyScore >= 80 ? 'good' : advisor.efficiencyScore >= 70 ? 'average' : 'poor'}`}
                                    style={{ width: `${advisor.efficiencyScore}%` }}
                                  />
                                </div>
                                <span className={`efficiency-text ${advisor.efficiencyScore >= 90 ? 'excellent' : advisor.efficiencyScore >= 80 ? 'good' : advisor.efficiencyScore >= 70 ? 'average' : 'poor'}`}>
                                  {advisor.efficiencyScore}%
                                </span>
                              </div>
                            </td>
                            <td className="restock-cell">
                              <span className="restock-badge">
                                {advisorRestock?.totalItems || 0} und
                              </span>
                            </td>
                            <td className="value-cell">
                              {advisorRestock?.totalValue ? formatCurrency(advisorRestock.totalValue) : '$0'}
                            </td>
                            <td className="damage-reports">
                              <span className={`damage-badge ${advisor.damageReports > 2 ? 'high' : advisor.damageReports > 0 ? 'medium' : 'low'}`}>
                                {advisor.damageReports}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                
                {/* Resumen de asesores */}
                <div className="performance-summary">
                  <div className="summary-item">
                    <span className="summary-label">Total visitas:</span>
                    <span className="summary-value">
                      {metrics.advisorPerformance.reduce((sum, advisor) => sum + advisor.completedVisits, 0)}
                    </span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">Eficiencia promedio:</span>
                    <span className="summary-value">
                      {Math.round(metrics.advisorPerformance.reduce((sum, advisor) => sum + advisor.efficiencyScore, 0) / metrics.advisorPerformance.length)}%
                    </span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">Total repuestos:</span>
                    <span className="summary-value">
                      {restockMetrics.restockByAdvisor?.reduce((sum, a) => sum + a.totalItems, 0) || 0}
                    </span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">Total valor:</span>
                    <span className="summary-value">
                      {formatCurrency(restockMetrics.restockByAdvisor?.reduce((sum, a) => sum + a.totalValue, 0) || 0)}
                    </span>
                  </div>
                </div>

                {/* Ranking de asesores por reposición */}
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
            ) : (
              <div className="no-data">
                <div className="no-data-icon">👥</div>
                <p>No hay datos de performance de asesores</p>
                <small>Los datos aparecerán cuando los asesores completen visitas</small>
              </div>
            )}
          </div>
        </>
      )}

      {/* Botón de actualización y debug */}
      <div className="refresh-section">
        <div className="refresh-controls">
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
          
          <div className="data-info">
            <details className="debug-details">
              <summary>Información técnica</summary>
              <div className="debug-content">
                <p><strong>Endpoint:</strong> GET /admin/metrics/advanced?timeRange={timeRange}</p>
                <p><strong>Fuente de datos:</strong> Base de datos MySQL</p>
                <p><strong>Tablas consultadas:</strong> route_stores, damage_reports, restock_items, users, routes, stores</p>
                <p><strong>Estado:</strong> {dataSource === 'real' ? 'Datos reales' : 'Sin datos'}</p>
                <p><strong>Reposiciones:</strong> {restockMetrics.totalItems} productos, {formatCurrency(restockMetrics.totalValue)}</p>
                {debugInfo && <p><strong>Debug:</strong> {debugInfo}</p>}
              </div>
            </details>
          </div>
        </div>
        
        <small className="refresh-note">
          Los datos se actualizan automáticamente cuando los asesores completan visitas, reponen productos y reportan daños
        </small>
      </div>
    </div>
  );
};

export default AdvancedMetrics;