// frontend/src/components/admin/MLDataDashboard.tsx
import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../../services/api';
import '../../styles/MLDataDashboard.css';

interface AdvisorOptimization {
  advisor_id: number;
  advisor_name: string;
  mejora_distancia: number;
  mejora_tiempo: number;
  rutas: number;
}

interface GlobalMetrics {
  mejora_promedio: number;
  total_rutas: number;
  mejora_min: number;
  mejora_max: number;
  confianza: number;
}

interface DistanceMetrics {
  distancia_original_total: number;
  distancia_optimizada_total: number;
  ahorro_km: number;
}

const MLDataDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [optimizing, setOptimizing] = useState(false);
  const [optimizationData, setOptimizationData] = useState<AdvisorOptimization[]>([]);
  const [globalMetrics, setGlobalMetrics] = useState<GlobalMetrics | null>(null);
  const [distanceMetrics, setDistanceMetrics] = useState<DistanceMetrics | null>(null);
  const [lastExecution, setLastExecution] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadOptimizationResults();
  }, []);

  const loadOptimizationResults = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/admin/optimization-summary`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      
      if (data.success) {
        setOptimizationData(data.byAdvisor || []);
        setGlobalMetrics(data.global || null);
        setDistanceMetrics(data.distanceMetrics || null);
        setLastExecution(data.lastExecution || '');
      } else {
        setError(data.error || 'Error cargando datos');
      }
    } catch (err) {
      console.error('Error cargando datos:', err);
      setError('Error de conexión con el servidor');
    } finally {
      setLoading(false);
    }
  };

  const runOptimization = async () => {
    try {
      setOptimizing(true);
      setError(null);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/admin/run-optimization`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      
      if (data.success) {
        alert('✅ Optimización completada exitosamente');
        await loadOptimizationResults();
      } else {
        alert(`❌ Error: ${data.error || data.details || 'No se pudo completar la optimización'}`);
      }
    } catch (err) {
      console.error('Error ejecutando optimización:', err);
      alert('Error de conexión con el servidor');
    } finally {
      setOptimizing(false);
    }
  };

  const formatPct = (value: number | string | null): string => {
    if (value === null || value === undefined) return '0%';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return isNaN(num) ? '0%' : `${num.toFixed(1)}%`;
  };

  const formatKm = (value: number | null): string => {
    if (value === null || value === undefined) return '0 km';
    return `${value.toFixed(2)} km`;
  };

  const getImprovementClass = (value: number | string | null): string => {
    const num = typeof value === 'string' ? parseFloat(value) : (value ?? 0);
    if (isNaN(num)) return 'tier-neutral';
    if (num > 30) return 'tier-high';
    if (num > 15) return 'tier-mid';
    if (num > 0) return 'tier-low';
    return 'tier-none';
  };

  if (loading) {
    return (
      <div className="mld-loading">
        <div className="spinner"></div>
        <p>Cargando resultados de optimización...</p>
      </div>
    );
  }

  return (
    <div className="mld">

      {/* Header */}
      <header className="mld__header">
        <div>
          <h1 className="mld__title">🤖 Optimización de Rutas</h1>
          <p className="mld__subtitle">Análisis cuantitativo — Algoritmo Nearest Neighbor</p>
        </div>
        <div className="mld__actions">
          {lastExecution && (
            <span className="mld__timestamp">
              Última ejecución: {new Date(lastExecution).toLocaleString('es-CO', {
                day: '2-digit', month: 'short', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
              })}
            </span>
          )}
          <button 
            className="mld__run-btn" 
            onClick={runOptimization} 
            disabled={optimizing}
          >
            {optimizing ? '⏳ Ejecutando...' : '🚀 Ejecutar Optimización'}
          </button>
          <button className="mld__refresh-btn" onClick={loadOptimizationResults}>
            🔄 Actualizar
          </button>
        </div>
      </header>

      {error && (
        <div className="mld-error">
          <span className="error-icon">⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* Global metrics */}
      {globalMetrics && (
        <section className="mld__metrics">
          <div className="mld-metric">
            <span className="mld-metric__value">{formatPct(globalMetrics.mejora_promedio)}</span>
            <span className="mld-metric__label">Mejora promedio</span>
          </div>
          <div className="mld-metric">
            <span className="mld-metric__value">{globalMetrics.total_rutas ?? 0}</span>
            <span className="mld-metric__label">Rutas optimizadas</span>
          </div>
          <div className="mld-metric">
            <span className="mld-metric__value">{formatPct(globalMetrics.mejora_max)}</span>
            <span className="mld-metric__label">Mejora máxima</span>
          </div>
          <div className="mld-metric">
            <span className="mld-metric__value">{formatPct(globalMetrics.confianza)}</span>
            <span className="mld-metric__label">Confianza estadística</span>
          </div>
        </section>
      )}

      {/* Comparativa de Distancias */}
      {distanceMetrics && (
        <section className="mld__section distance-comparison">
          <h2 className="mld__section-title">📏 Comparativa de Distancias</h2>
          <div className="distance-cards">
            <div className="distance-card original">
              <div className="distance-icon">📋</div>
              <div className="distance-label">Distancia Original</div>
              <div className="distance-value">{formatKm(distanceMetrics.distancia_original_total)}</div>
              <div className="distance-note">Total recorrido sin optimización</div>
            </div>
            <div className="distance-arrow">→</div>
            <div className="distance-card optimized">
              <div className="distance-icon">🚀</div>
              <div className="distance-label">Distancia Optimizada</div>
              <div className="distance-value">{formatKm(distanceMetrics.distancia_optimizada_total)}</div>
              <div className="distance-note">Total estimado con reordenamiento óptimo</div>
            </div>
          </div>
          <div className="saving-banner">
            <span className="saving-icon">💰</span>
            <span className="saving-text">
              Ahorro total estimado: <strong>{formatKm(distanceMetrics.ahorro_km)}</strong>
            </span>
            <span className="saving-percent">({formatPct(globalMetrics?.mejora_promedio || 0)})</span>
          </div>
        </section>
      )}

      {/* Tabla de resultados por asesor */}
      <section className="mld__section">
        <h2 className="mld__section-title">📊 Resultados por Asesor</h2>
        <div className="mld-table-wrap">
          <table className="mld-table">
            <thead>
              <tr>
                <th>Asesor</th>
                <th>Rutas analizadas</th>
                <th>Mejora distancia</th>
                <th>Mejora tiempo</th>
                <th>Eficiencia</th>
              </tr>
            </thead>
            <tbody>
              {optimizationData.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '40px' }}>
                    No hay datos de optimización aún. Ejecuta la optimización para generar resultados.
                  </td>
                </tr>
              ) : (
                optimizationData.map((advisor) => {
                  const pct = Math.min(100, Number(advisor.mejora_distancia) || 0);
                  return (
                    <tr key={advisor.advisor_id}>
                      <td className="mld-table__name">{advisor.advisor_name}</td>
                      <td>{advisor.rutas}</td>
                      <td>
                        <span className={`mld-badge ${getImprovementClass(advisor.mejora_distancia)}`}>
                          {formatPct(advisor.mejora_distancia)}
                        </span>
                      </td>
                      <td>{formatPct(advisor.mejora_tiempo)}</td>
                      <td>
                        <div className="mld-bar">
                          <div className="mld-bar__fill" style={{ width: `${pct}%` }} />
                          <span className="mld-bar__label">{Math.round(pct)}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Interpretación */}
      <section className="mld__section">
        <h2 className="mld__section-title">💡 Interpretación de Resultados</h2>
        <div className="mld-cards">
          <div className="mld-card">
            <h3 className="mld-card__title">🎯 Porcentaje de mejora</h3>
            <p>Indica la reducción en distancia total después de aplicar el algoritmo del Vecino Más Cercano. Una mejora del 30% significa que el asesor recorre un 30% menos de kilómetros por ruta.</p>
          </div>
          <div className="mld-card">
            <h3 className="mld-card__title">📊 Nivel de confianza</h3>
            <p>El modelo opera con un {formatPct(globalMetrics?.confianza || 0)} de confianza estadística, basado en el análisis de {globalMetrics?.total_rutas ?? 0} rutas históricas.</p>
          </div>
          <div className="mld-card">
            <h3 className="mld-card__title">⚙️ Algoritmo utilizado</h3>
            <p>Se implementó el algoritmo del <strong>Vecino Más Cercano (Nearest Neighbor)</strong> para resolver el problema del viajante (TSP), optimizando el orden de visita de las tiendas.</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mld__footer">
        <p className="mld__footer-text">
          Los datos se actualizan cada vez que se ejecuta una nueva optimización. 
          La confianza del modelo aumenta con más visitas registradas en el sistema.
        </p>
      </footer>

    </div>
  );
};

export default MLDataDashboard;