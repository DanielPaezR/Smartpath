// frontend/src/components/admin/MLDataDashboard.tsx
import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../../services/api';
import '../../styles/MLDataDashboard.css';

interface AdvisorMetrics {
  id: number;
  name: string;
  total_visits: number;
  avg_time: number;
  efficiency: number;
  total_restocks: number;
  total_damages: number;
}

interface GlobalStats {
  total_visits: number;
  avg_time: number;
  efficiency_avg: number;
  total_restocks: number;
  total_damages: number;
  advisors_count: number;
}

const MLDataDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [advisors, setAdvisors] = useState<AdvisorMetrics[]>([]);
  const [globalStats, setGlobalStats] = useState<GlobalStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      
      // Usar endpoint existente de métricas avanzadas
      const response = await fetch(`${API_BASE_URL}/admin/metrics/advanced?timeRange=month`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      if (!response.ok) {
        throw new Error('Error cargando datos');
      }
      
      const data = await response.json();
      console.log('📊 Datos cargados:', data);
      
      if (data.success) {
        // Transformar datos para el dashboard
        const advisorList = data.advisorPerformance || [];
        setAdvisors(advisorList);
        
        setGlobalStats({
          total_visits: data.overall?.completedVisits || 0,
          avg_time: data.overall?.avgVisitDuration || 0,
          efficiency_avg: data.overall?.averageEfficiency || 0,
          total_restocks: data.restockMetrics?.totalItems || 0,
          total_damages: data.damageAnalytics?.totalDamagedProducts || 0,
          advisors_count: advisorList.length
        });
      } else {
        // Si no hay datos, mostrar ejemplo
        setAdvisors([]);
        setGlobalStats({
          total_visits: 0,
          avg_time: 0,
          efficiency_avg: 0,
          total_restocks: 0,
          total_damages: 0,
          advisors_count: 0
        });
      }
    } catch (err) {
      console.error('Error cargando datos:', err);
      setError('No se pudieron cargar los datos. Asegúrate de que el backend esté corriendo.');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (minutes: number) => {
    if (!minutes) return '0 min';
    if (minutes < 60) return `${Math.round(minutes)} min`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}min`;
  };

  const getEfficiencyClass = (efficiency: number) => {
    if (efficiency >= 80) return 'high';
    if (efficiency >= 60) return 'medium';
    return 'low';
  };

  if (loading) {
    return (
      <div className="mld-loading">
        <div className="spinner"></div>
        <p>Cargando datos del sistema...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mld-error">
        <h3>⚠️ Error</h3>
        <p>{error}</p>
        <button onClick={loadData} className="mld__refresh">Reintentar</button>
      </div>
    );
  }

  return (
    <div className="mld">

      {/* Header */}
      <header className="mld__header">
        <div>
          <h1 className="mld__title">📊 Métricas del Sistema</h1>
          <p className="mld__subtitle">Análisis cuantitativo de rendimiento y optimización</p>
        </div>
        <button onClick={loadData} className="mld__refresh">🔄 Actualizar</button>
      </header>

      {/* Global metrics */}
      {globalStats && (
        <section className="mld__metrics">
          <div className="mld-metric">
            <span className="mld-metric__value">{globalStats.total_visits}</span>
            <span className="mld-metric__label">Visitas completadas</span>
          </div>
          <div className="mld-metric">
            <span className="mld-metric__value">{formatTime(globalStats.avg_time)}</span>
            <span className="mld-metric__label">Tiempo promedio</span>
          </div>
          <div className="mld-metric">
            <span className="mld-metric__value">{globalStats.efficiency_avg}%</span>
            <span className="mld-metric__label">Eficiencia promedio</span>
          </div>
          <div className="mld-metric">
            <span className="mld-metric__value">{globalStats.total_restocks}</span>
            <span className="mld-metric__label">Productos repuestos</span>
          </div>
          <div className="mld-metric">
            <span className="mld-metric__value">{globalStats.total_damages}</span>
            <span className="mld-metric__label">Productos dañados</span>
          </div>
        </section>
      )}

      {/* Results table */}
      <section className="mld__section">
        <h2 className="mld__section-title">📈 Rendimiento por Asesor</h2>
        <div className="mld-table-wrap">
          <table className="mld-table">
            <thead>
              <tr>
                <th>Asesor</th>
                <th>Visitas</th>
                <th>Tiempo promedio</th>
                <th>Eficiencia</th>
                <th>Reposiciones</th>
                <th>Daños</th>
              </tr>
            </thead>
            <tbody>
              {advisors.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '40px' }}>
                    No hay datos disponibles todavía. Los asesores deben completar visitas para generar métricas.
                  </td>
                </tr>
              ) : (
                advisors.map((advisor) => (
                  <tr key={advisor.id}>
                    <td className="mld-table__name">{advisor.name}</td>
                    <td>{advisor.total_visits}</td>
                    <td>{formatTime(advisor.avg_time)}</td>
                    <td>
                      <div className="mld-bar">
                        <div 
                          className={`mld-bar__fill ${getEfficiencyClass(advisor.efficiency)}`} 
                          style={{ width: `${Math.min(100, advisor.efficiency)}%` }} 
                        />
                        <span className="mld-bar__label">{Math.round(advisor.efficiency)}%</span>
                      </div>
                    </td>
                    <td>{advisor.total_restocks || 0}</td>
                    <td>{advisor.total_damages || 0}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Interpretation */}
      <section className="mld__section">
        <h2 className="mld__section-title">💡 Interpretación de Métricas</h2>
        <div className="mld-cards">
          <div className="mld-card">
            <h3 className="mld-card__title">🎯 Eficiencia</h3>
            <p>Porcentaje de visitas completadas en ≤40 minutos. <strong>Meta: &gt;80%</strong></p>
          </div>
          <div className="mld-card">
            <h3 className="mld-card__title">📦 Productividad</h3>
            <p>Cantidad de productos repuestos por visita. Refleja la efectividad en el punto de venta.</p>
          </div>
          <div className="mld-card">
            <h3 className="mld-card__title">⚠️ Calidad</h3>
            <p>Productos dañados reportados. Idealmente debe ser &lt;5% del total de reposiciones.</p>
          </div>
        </div>
      </section>

      {/* Methodology */}
      <section className="mld__section">
        <h2 className="mld__section-title">🔬 Metodología de Optimización</h2>
        <p className="mld__body">
          El sistema utiliza datos históricos de tiempos de visita y ubicaciones geográficas para calcular rutas óptimas.
          La eficiencia se calcula como el porcentaje de visitas completadas dentro del tiempo estándar (40 minutos).
        </p>
        <div className="mld-stats">
          <div className="mld-stat">
            <span className="mld-stat__number">{globalStats?.advisors_count || 0}</span>
            <span className="mld-stat__label">Asesores activos</span>
          </div>
          <div className="mld-stat">
            <span className="mld-stat__number">{globalStats?.total_visits || 0}</span>
            <span className="mld-stat__label">Visitas analizadas</span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mld__footer">
        <p className="mld__footer-text">
          Los datos se actualizan en tiempo real. La confianza del modelo aumenta con más visitas registradas.
        </p>
      </footer>

    </div>
  );
};

export default MLDataDashboard;