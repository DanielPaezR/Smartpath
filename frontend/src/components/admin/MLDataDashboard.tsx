// frontend/src/components/admin/MLDataDashboard.tsx
import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../../services/api';
import '../../styles/MLDataDashboard.css';

interface OptimizationSummary {
  advisor_id: number;
  advisor_name: string;
  mejora_distancia: number;
  rutas: number;
}

interface GlobalMetrics {
  mejora_promedio: number;
  total_rutas: number;
  mejora_min: number;
  mejora_max: number;
  confianza: number;
}

const MLDataDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [optimizationData, setOptimizationData] = useState<OptimizationSummary[]>([]);
  const [globalMetrics, setGlobalMetrics] = useState<GlobalMetrics | null>(null);
  const [lastExecution, setLastExecution] = useState<string>('');

  useEffect(() => {
    loadOptimizationResults();
  }, []);

  const loadOptimizationResults = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/admin/optimization-summary`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        setOptimizationData(data.byAdvisor || []);
        setGlobalMetrics(data.global || null);
        setLastExecution(data.lastExecution || '');
      }
    } catch (err) {
      console.error('Error cargando datos:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatPct = (value: number | string | null): string => {
    if (value === null || value === undefined) return '0%';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return isNaN(num) ? '0%' : `${num.toFixed(1)}%`;
  };

  const getImprovementClass = (value: number | string | null): string => {
    const num = typeof value === 'string' ? parseFloat(value) : (value ?? 0);
    if (isNaN(num)) return 'tier-neutral';
    if (num > 30) return 'tier-high';
    if (num > 15) return 'tier-mid';
    if (num > 0)  return 'tier-low';
    return 'tier-none';
  };

  if (loading) {
    return (
      <div className="mld-loading">
        <span className="mld-loading__spinner" />
        <p>Cargando resultados...</p>
      </div>
    );
  }

  return (
    <div className="mld">

      {/* Header */}
      <header className="mld__header">
        <div>
          <h1 className="mld__title">Optimización de Rutas</h1>
          <p className="mld__subtitle">Análisis cuantitativo — algoritmo Nearest Neighbor</p>
        </div>
        {lastExecution && (
          <span className="mld__timestamp">
            Actualizado {new Date(lastExecution).toLocaleString('es-CO', {
              day: '2-digit', month: 'short', year: 'numeric',
              hour: '2-digit', minute: '2-digit',
            })}
          </span>
        )}
      </header>

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

      {/* Results table */}
      <section className="mld__section">
        <h2 className="mld__section-title">Resultados por asesor</h2>
        <div className="mld-table-wrap">
          <table className="mld-table">
            <thead>
              <tr>
                <th>Asesor</th>
                <th>Rutas analizadas</th>
                <th>Mejora en distancia</th>
                <th>Eficiencia</th>
              </tr>
            </thead>
            <tbody>
              {optimizationData.map((advisor) => {
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
                    <td>
                      <div className="mld-bar">
                        <div className="mld-bar__fill" style={{ width: `${pct}%` }} />
                        <span className="mld-bar__label">{Math.round(pct)}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Interpretation */}
      <section className="mld__section">
        <h2 className="mld__section-title">Interpretación</h2>
        <div className="mld-cards">
          <div className="mld-card">
            <h3 className="mld-card__title">Lectura del porcentaje</h3>
            <p>El porcentaje de mejora indica la reducción en distancia total después de aplicar el algoritmo. Un 30% significa que el asesor recorre un 30% menos de kilómetros por ruta.</p>
          </div>
          <div className="mld-card">
            <h3 className="mld-card__title">Nivel de confianza</h3>
            <p>El modelo opera con un {formatPct(globalMetrics?.confianza || 0)} de confianza estadística, basado en el análisis de {globalMetrics?.total_rutas ?? 0} rutas.</p>
          </div>
          <div className="mld-card">
            <h3 className="mld-card__title">Algoritmo</h3>
            <p>Se implementó el algoritmo del Vecino Más Cercano (Nearest Neighbor) para resolver el problema del viajante (TSP), optimizando el orden de visita de las tiendas.</p>
          </div>
        </div>
      </section>

      {/* Executive summary */}
      <section className="mld__section">
        <h2 className="mld__section-title">Resumen ejecutivo</h2>
        <div className="mld-summary">
          <p>
            El modelo logró una mejora promedio de{' '}
            <strong>{formatPct(globalMetrics?.mejora_promedio || 0)}</strong> en la distancia recorrida,
            con un nivel de confianza del <strong>{formatPct(globalMetrics?.confianza || 0)}</strong>.
          </p>
          <ul className="mld-summary__list">
            {optimizationData.map((advisor) => (
              <li key={advisor.advisor_id}>
                <strong>{advisor.advisor_name}</strong>
                <span>{formatPct(advisor.mejora_distancia)} de mejora — {advisor.rutas} rutas</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Methodology */}
      <section className="mld__section">
        <h2 className="mld__section-title">Metodología</h2>
        <p className="mld__body">
          Las rutas optimizadas se calculan con el método del{' '}
          <strong>Vecino Más Cercano</strong>. La distancia entre tiendas se obtiene mediante la{' '}
          <strong>fórmula de Haversine</strong>, que considera la curvatura terrestre para mayor precisión.
        </p>
        <div className="mld-stats">
          <div className="mld-stat">
            <span className="mld-stat__number">{globalMetrics?.total_rutas ?? 0}</span>
            <span className="mld-stat__label">Rutas analizadas</span>
          </div>
          <div className="mld-stat">
            <span className="mld-stat__number">162</span>
            <span className="mld-stat__label">Tiendas en sistema</span>
          </div>
          <div className="mld-stat">
            <span className="mld-stat__number">{formatPct(globalMetrics?.confianza || 0)}</span>
            <span className="mld-stat__label">Confianza estadística</span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mld__footer">
        <button className="mld__refresh" onClick={loadOptimizationResults}>
          Actualizar datos
        </button>
      </footer>

    </div>
  );
};

export default MLDataDashboard;