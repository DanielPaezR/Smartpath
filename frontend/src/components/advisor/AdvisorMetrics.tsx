// frontend/src/components/advisor/AdvisorMetrics.tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { API_BASE_URL } from '../../services/api';
import '../../styles/AdvisorMetrics.css';

interface DailyMetrics {
  visits: number;
  completed: number;
  avgTime: number;
  restocks: number;
  damages: number;
}

interface WeeklyMetrics extends DailyMetrics {
  efficiency: number;
}

interface MonthlyMetrics extends WeeklyMetrics {
  totalDistance: number;
}

interface AdvisorMetricsData {
  daily: DailyMetrics;
  weekly: WeeklyMetrics;
  monthly: MonthlyMetrics;
  trends: {
    dailyVisits: { date: string; count: number }[];
    efficiencyTrend: { week: string; score: number }[];
  };
}

const AdvisorMetrics: React.FC = () => {
  const { user } = useAuth();
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [metrics, setMetrics] = useState<AdvisorMetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadMetrics();
  }, [period]);

  const loadMetrics = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/advisor/metrics?period=${period}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error('Error cargando métricas');
      
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

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es', { day: 'numeric', month: 'short' });
  };

  if (loading) return <div className="advisor-metrics-loading">Cargando tus métricas...</div>;
  if (error) return <div className="advisor-metrics-error">Error: {error}</div>;
  if (!metrics) return <div className="advisor-metrics-empty">No hay datos disponibles</div>;

  // Obtener los datos según el período seleccionado
  const currentData = metrics[period];
  const isMonthly = period === 'monthly';
  const isWeekly = period === 'weekly';

  return (
    <div className="advisor-metrics">
      <div className="metrics-header">
        <h1>📊 Mis Estadísticas</h1>
        <p>{user?.name}</p>
      </div>

      <div className="period-selector">
        <button className={period === 'daily' ? 'active' : ''} onClick={() => setPeriod('daily')}>
          📅 Hoy
        </button>
        <button className={period === 'weekly' ? 'active' : ''} onClick={() => setPeriod('weekly')}>
          📆 Esta Semana
        </button>
        <button className={period === 'monthly' ? 'active' : ''} onClick={() => setPeriod('monthly')}>
          📈 Este Mes
        </button>
      </div>

      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-icon">🏪</div>
          <div className="metric-info">
            <span className="metric-label">Visitas</span>
            <span className="metric-value">{currentData.visits}</span>
            <span className="metric-subtitle">completadas</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">✅</div>
          <div className="metric-info">
            <span className="metric-label">Tasa de éxito</span>
            <span className="metric-value">{currentData.visits > 0 ? Math.round((currentData.completed / currentData.visits) * 100) : 0}%</span>
            <span className="metric-subtitle">{currentData.completed}/{currentData.visits}</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">⏱️</div>
          <div className="metric-info">
            <span className="metric-label">Tiempo promedio</span>
            <span className="metric-value">{formatTime(currentData.avgTime)}</span>
            <span className="metric-subtitle">por tienda</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">📦</div>
          <div className="metric-info">
            <span className="metric-label">Productos repuestos</span>
            <span className="metric-value">{currentData.restocks}</span>
            <span className="metric-subtitle">unidades</span>
          </div>
        </div>

        <div className="metric-card warning">
          <div className="metric-icon">⚠️</div>
          <div className="metric-info">
            <span className="metric-label">Productos dañados</span>
            <span className="metric-value">{currentData.damages}</span>
            <span className="metric-subtitle">reportados</span>
          </div>
        </div>

        {/* Eficiencia - solo visible en weekly y monthly */}
        {isWeekly && (
          <div className="metric-card success">
            <div className="metric-icon">📈</div>
            <div className="metric-info">
              <span className="metric-label">Eficiencia</span>
              <span className="metric-value">{(currentData as WeeklyMetrics).efficiency}%</span>
              <span className="metric-subtitle">vs objetivo (80%)</span>
            </div>
          </div>
        )}

        {isMonthly && (
          <>
            <div className="metric-card success">
              <div className="metric-icon">📈</div>
              <div className="metric-info">
                <span className="metric-label">Eficiencia</span>
                <span className="metric-value">{(currentData as MonthlyMetrics).efficiency}%</span>
                <span className="metric-subtitle">vs objetivo (80%)</span>
              </div>
            </div>
            <div className="metric-card">
              <div className="metric-icon">🛣️</div>
              <div className="metric-info">
                <span className="metric-label">Distancia recorrida</span>
                <span className="metric-value">{(currentData as MonthlyMetrics).totalDistance} km</span>
                <span className="metric-subtitle">total</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Gráfico de tendencia diaria */}
      {metrics.trends.dailyVisits.length > 0 && (
        <div className="trend-section">
          <h3>📈 Tendencia de Visitas (últimos 14 días)</h3>
          <div className="trend-chart">
            {metrics.trends.dailyVisits.slice(-7).map((day, i) => {
              const maxCount = Math.max(...metrics.trends.dailyVisits.map(d => d.count));
              const height = maxCount > 0 ? (day.count / maxCount) * 100 : 0;
              return (
                <div key={i} className="trend-bar-container">
                  <div className="trend-bar" style={{ height: `${height}px` }}>
                    <span className="trend-value">{day.count}</span>
                  </div>
                  <div className="trend-label">{formatDate(day.date)}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Gráfico de eficiencia semanal */}
      {metrics.trends.efficiencyTrend.length > 0 && (
        <div className="efficiency-section">
          <h3>📊 Evolución de Eficiencia</h3>
          <div className="efficiency-chart">
            {metrics.trends.efficiencyTrend.map((week, i) => (
              <div key={i} className="efficiency-bar-container">
                <div className="efficiency-label">{week.week}</div>
                <div className="efficiency-bar" style={{ width: `${week.score}%` }}>
                  <span className="efficiency-value">{Math.round(week.score)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="metrics-footer">
        <small>Los datos se actualizan en tiempo real</small>
        <button onClick={loadMetrics} className="refresh-btn">🔄 Actualizar</button>
      </div>
    </div>
  );
};

export default AdvisorMetrics;