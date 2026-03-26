// frontend/src/components/admin/MLDataDashboard.tsx
import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../../services/api';
import '../../styles/MLDataDashboard.css';

interface MLMetrics {
  summary: {
    totalVisits: number;
    avgDuration: number;
    totalRestocks: number;
    totalDamages: number;
    efficiencyScore: number;
    routesOptimized: number;
  };
  visitsData: {
    id: number;
    storeName: string;
    visitOrder: number;
    actualDuration: number;
    estimatedDuration: number;
    timeDifference: number;
    date: string;
  }[];
  distancesData: {
    storeId: number;
    storeName: string;
    fromStore: string;
    distanceKm: number;
    travelTime: number;
  }[];
  patterns: {
    slowestStores: { name: string; avgTime: number; visits: number }[];
    bestRoutes: { routeId: number; efficiency: number; stores: number }[];
    damagePatterns: { category: string; count: number; percentage: number }[];
  };
  recommendations: string[];
}

const MLDataDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<MLMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'quarter'>('month');

  useEffect(() => {
    loadData();
  }, [selectedPeriod]);

  const loadData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/admin/ml/metrics?period=${selectedPeriod}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error('Error cargando datos');
      const data = await response.json();
      setMetrics(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}min`;
  };

  if (loading) return <div className="ml-loading">Cargando datos de Machine Learning...</div>;
  if (error) return <div className="ml-error">Error: {error}</div>;
  if (!metrics) return <div className="ml-empty">No hay datos disponibles</div>;

  return (
    <div className="ml-dashboard">
      <div className="ml-header">
        <h1>🤖 Dashboard de Machine Learning</h1>
        <p>Datos para entrenamiento de modelos de optimización de rutas</p>
        <div className="period-selector">
          <button className={selectedPeriod === 'week' ? 'active' : ''} onClick={() => setSelectedPeriod('week')}>Semana</button>
          <button className={selectedPeriod === 'month' ? 'active' : ''} onClick={() => setSelectedPeriod('month')}>Mes</button>
          <button className={selectedPeriod === 'quarter' ? 'active' : ''} onClick={() => setSelectedPeriod('quarter')}>Trimestre</button>
        </div>
      </div>

      {/* KPIs Principales */}
      <div className="ml-kpis">
        <div className="kpi-card">
          <div className="kpi-icon">📊</div>
          <div className="kpi-info">
            <span className="kpi-value">{metrics.summary.totalVisits}</span>
            <span className="kpi-label">Visitas Analizadas</span>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon">⏱️</div>
          <div className="kpi-info">
            <span className="kpi-value">{formatTime(metrics.summary.avgDuration)}</span>
            <span className="kpi-label">Tiempo Promedio</span>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon">📦</div>
          <div className="kpi-info">
            <span className="kpi-value">{metrics.summary.totalRestocks}</span>
            <span className="kpi-label">Productos Repuestos</span>
          </div>
        </div>
        <div className="kpi-card warning">
          <div className="kpi-icon">⚠️</div>
          <div className="kpi-info">
            <span className="kpi-value">{metrics.summary.totalDamages}</span>
            <span className="kpi-label">Productos Dañados</span>
          </div>
        </div>
        <div className="kpi-card success">
          <div className="kpi-icon">📈</div>
          <div className="kpi-info">
            <span className="kpi-value">{metrics.summary.efficiencyScore}%</span>
            <span className="kpi-label">Eficiencia General</span>
          </div>
        </div>
      </div>

      {/* Datos de Visitas */}
      <div className="ml-section">
        <h2>📋 Datos de Visitas para Entrenamiento</h2>
        <div className="table-container">
          <table className="ml-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Tienda</th>
                <th>Orden</th>
                <th>Duración Real</th>
                <th>Duración Estimada</th>
                <th>Diferencia</th>
              </tr>
            </thead>
            <tbody>
              {metrics.visitsData.map((visit, i) => (
                <tr key={i}>
                  <td>{new Date(visit.date).toLocaleDateString()}</td>
                  <td>{visit.storeName}</td>
                  <td>{visit.visitOrder}</td>
                  <td className={visit.actualDuration > 40 ? 'slow' : 'normal'}>
                    {formatTime(visit.actualDuration)}
                  </td>
                  <td>{formatTime(visit.estimatedDuration)}</td>
                  <td className={visit.timeDifference > 0 ? 'positive' : 'negative'}>
                    {visit.timeDifference > 0 ? `+${visit.timeDifference} min` : `${visit.timeDifference} min`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Distancias entre Tiendas */}
      <div className="ml-section">
        <h2>🗺️ Distancias entre Tiendas (para optimización)</h2>
        <div className="table-container">
          <table className="ml-table">
            <thead>
              <tr>
                <th>Desde</th>
                <th>Hacia</th>
                <th>Distancia (km)</th>
                <th>Tiempo Estimado</th>
              </tr>
            </thead>
            <tbody>
              {metrics.distancesData.map((dist, i) => (
                <tr key={i}>
                  <td>{dist.fromStore}</td>
                  <td>{dist.storeName}</td>
                  <td>{dist.distanceKm.toFixed(2)} km</td>
                  <td>{Math.round(dist.distanceKm * 2)} min</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Patrones Identificados */}
      <div className="ml-grid">
        <div className="ml-card">
          <h3>🐌 Tiendas con Mayor Tiempo</h3>
          {metrics.patterns.slowestStores.map((store, i) => (
            <div key={i} className="pattern-item">
              <span className="pattern-name">{store.name}</span>
              <div className="pattern-bar">
                <div className="pattern-fill" style={{ width: `${(store.avgTime / 60) * 100}%` }} />
                <span className="pattern-value">{formatTime(store.avgTime)}</span>
              </div>
              <span className="pattern-count">{store.visits} visitas</span>
            </div>
          ))}
        </div>

        <div className="ml-card">
          <h3>🏆 Rutas Más Eficientes</h3>
          {metrics.patterns.bestRoutes.map((route, i) => (
            <div key={i} className="pattern-item">
              <span className="pattern-name">Ruta #{route.routeId}</span>
              <div className="pattern-bar">
                <div className="pattern-fill efficiency" style={{ width: `${route.efficiency}%` }} />
                <span className="pattern-value">{route.efficiency}%</span>
              </div>
              <span className="pattern-count">{route.stores} tiendas</span>
            </div>
          ))}
        </div>

        <div className="ml-card">
          <h3>⚠️ Productos con Más Daños</h3>
          {metrics.patterns.damagePatterns.map((cat, i) => (
            <div key={i} className="pattern-item">
              <span className="pattern-name">{cat.category}</span>
              <div className="pattern-bar">
                <div className="pattern-fill damage" style={{ width: `${cat.percentage}%` }} />
                <span className="pattern-value">{cat.count}</span>
              </div>
              <span className="pattern-count">{cat.percentage.toFixed(1)}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recomendaciones del Modelo */}
      <div className="ml-recommendations">
        <h3>💡 Recomendaciones para Optimización</h3>
        <ul>
          {metrics.recommendations.map((rec, i) => (
            <li key={i}>{rec}</li>
          ))}
        </ul>
      </div>

      <div className="ml-footer">
        <button onClick={loadData} className="refresh-btn">🔄 Actualizar Datos</button>
        <button className="export-btn" onClick={() => alert('Función de exportación próximamente')}>📥 Exportar para ML</button>
      </div>
    </div>
  );
};

export default MLDataDashboard;