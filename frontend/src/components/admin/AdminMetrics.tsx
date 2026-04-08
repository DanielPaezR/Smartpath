// frontend/src/components/admin/AdminMetrics.tsx
import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../../services/api';
import '../../styles/AdminMetrics.css';

interface SystemMetrics {
  visits: {
    total: number;
    efficient: number;
    efficiency_rate: number;
    avg_duration: number;
    efficient_avg: number;
  };
  tasks: {
    avg_completed: number;
    avg_time_per_task: number;
  };
  offline: {
    total_sync_operations: number;
    avg_retries: number;
  };
  advisor_performance: Array<{
    name: string;
    visits: number;
    avg_time: number;
    avg_tasks: number;
    efficiency: number;
  }>;
  daily_trend: Array<{
    date: string;
    visits_completed: number;
    avg_duration: number;
  }>;
}

const AdminMetrics: React.FC = () => {
  const [period, setPeriod] = useState<'week' | 'month' | 'quarter'>('month');
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMetrics();
  }, [period]);

  const loadMetrics = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/admin/metrics/system?period=${period}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setMetrics(data.metrics);
      }
    } catch (error) {
      console.error('Error cargando métricas:', error);
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

  if (loading) return <div className="admin-metrics-loading">Cargando métricas del sistema...</div>;

  return (
    <div className="admin-metrics">
      <h1>📊 Métricas de Rendimiento del Sistema</h1>
      
      <div className="period-selector">
        <button className={period === 'week' ? 'active' : ''} onClick={() => setPeriod('week')}>Última Semana</button>
        <button className={period === 'month' ? 'active' : ''} onClick={() => setPeriod('month')}>Último Mes</button>
        <button className={period === 'quarter' ? 'active' : ''} onClick={() => setPeriod('quarter')}>Último Trimestre</button>
      </div>

      {metrics && (
        <>
          {/* Tarjetas de resumen */}
          <div className="metrics-summary">
            <div className="metric-card">
              <div className="metric-icon">🏪</div>
              <div className="metric-value">{metrics.visits.total}</div>
              <div className="metric-label">Visitas completadas</div>
              <div className="metric-subtitle">Promedio: {formatTime(metrics.visits.avg_duration)}</div>
            </div>
            
            <div className="metric-card success">
              <div className="metric-icon">✅</div>
              <div className="metric-value">{metrics.visits.efficiency_rate}%</div>
              <div className="metric-label">Eficiencia del sistema</div>
              <div className="metric-subtitle">{metrics.visits.efficient} visitas eficientes</div>
            </div>
            
            <div className="metric-card">
              <div className="metric-icon">⏱️</div>
              <div className="metric-value">{metrics.tasks.avg_time_per_task} min</div>
              <div className="metric-label">Tiempo promedio por tarea</div>
              <div className="metric-subtitle">{metrics.tasks.avg_completed} tareas/visita</div>
            </div>
            
            <div className="metric-card info">
              <div className="metric-icon">📱</div>
              <div className="metric-value">{metrics.offline.total_sync_operations}</div>
              <div className="metric-label">Sincronizaciones offline</div>
              <div className="metric-subtitle">Reintentos: {metrics.offline.avg_retries}</div>
            </div>
          </div>

          {/* Tabla de rendimiento por asesor */}
          <div className="advisor-table">
            <h3>📈 Rendimiento por Asesor</h3>
            <table>
              <thead>
                <tr>
                  <th>Asesor</th>
                  <th>Visitas</th>
                  <th>Tiempo promedio</th>
                  <th>Tareas/visita</th>
                  <th>Eficiencia</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {metrics.advisor_performance.map((advisor, idx) => (
                  <tr key={idx}>
                    <td>{advisor.name}</td>
                    <td>{advisor.visits}</td>
                    <td>{formatTime(advisor.avg_time)}</td>
                    <td>{advisor.avg_tasks.toFixed(1)}</td>
                    <td>{advisor.efficiency}%</td>
                    <td>
                      <div className="efficiency-bar">
                        <div className="efficiency-fill" style={{ width: `${advisor.efficiency}%` }} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Tendencia diaria */}
          <div className="trend-chart">
            <h3>📊 Tendencia de Visitas</h3>
            <div className="chart-bars">
              {metrics.daily_trend.slice(0, 14).map((day, idx) => (
                <div key={idx} className="chart-bar-container">
                  <div className="chart-bar" style={{ height: `${(day.visits_completed / Math.max(...metrics.daily_trend.map(d => d.visits_completed))) * 100}px` }}>
                    <span className="bar-value">{day.visits_completed}</span>
                  </div>
                  <div className="bar-label">{new Date(day.date).toLocaleDateString('es', { day: 'numeric', month: 'short' })}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminMetrics;