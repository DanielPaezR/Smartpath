// frontend/src/components/admin/AdminDashboard.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { API_BASE_URL } from '../../services/api';
import '../../styles/AdminDashboard.css'; // Importamos los estilos CSS

// Interfaces para los datos
interface DashboardOverview {
  active_advisors: number;
  active_routes: number;
  total_stores_today: number;
  completed_stores: number;
  in_progress_stores: number;
  avg_visit_duration: number;
}

interface ApiResponse {
  success: boolean;
  data?: DashboardOverview;
  message?: string;
}

// Componente de tarjeta usando clases CSS
const DashboardCard: React.FC<{ 
  title: string; 
  description: string; 
  onClick: () => void; 
  icon?: string;
}> = ({ title, description, onClick, icon }) => {
  return (
    <div className="dashboard-card" onClick={onClick}>
      <div className="card-header">
        {icon && <span className="card-icon">{icon}</span>}
        <h3 className="card-title">{title}</h3>
      </div>
      <p className="card-description">{description}</p>
    </div>
  );
};

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [dashboardData, setDashboardData] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [backendAvailable, setBackendAvailable] = useState<boolean>(true);

  const checkBackendHealth = async (): Promise<boolean> => {
    try {
      console.log('🔍 Verificando backend en:', `${API_BASE_URL}/health`);
      const response = await fetch(`${API_BASE_URL}/health`);
      return response.ok;
    } catch (error) {
      console.error('❌ No se pudo conectar al backend:', error);
      return false;
    }
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔄 Cargando datos del dashboard...');
      
      const isBackendHealthy = await checkBackendHealth();
      setBackendAvailable(isBackendHealthy);
      
      if (!isBackendHealthy) {
        throw new Error('El servidor backend no está disponible');
      }

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      const response = await fetch(`${API_BASE_URL}/admin/dashboard/overview`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('📊 Status:', response.status);

      if (response.status === 404) {
        console.log('⚠️ Endpoint no encontrado, usando datos de prueba');
        const mockData: DashboardOverview = {
          active_advisors: 12,
          active_routes: 8,
          total_stores_today: 156,
          completed_stores: 89,
          in_progress_stores: 25,
          avg_visit_duration: 42
        };
        setDashboardData(mockData);
        setError('⚠️ Backend en desarrollo. Usando datos de prueba.');
        return;
      }

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const apiResponse: ApiResponse = await response.json();
      console.log('✅ Respuesta del backend:', apiResponse);
      
      if (apiResponse.success && apiResponse.data) {
        setDashboardData(apiResponse.data);
      } else {
        console.log('⚠️ Backend sin datos, usando datos de prueba');
        const mockData: DashboardOverview = {
          active_advisors: 12,
          active_routes: 8,
          total_stores_today: 156,
          completed_stores: 89,
          in_progress_stores: 25,
          avg_visit_duration: 42
        };
        setDashboardData(mockData);
      }
      
    } catch (err: any) {
      console.error('❌ Error cargando dashboard:', err);
      const mockData: DashboardOverview = {
        active_advisors: 12,
        active_routes: 8,
        total_stores_today: 156,
        completed_stores: 89,
        in_progress_stores: 25,
        avg_visit_duration: 42
      };
      setDashboardData(mockData);
      setError(err instanceof Error ? err.message : 'Error desconocido. Usando datos de prueba.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleLogout = () => {
    if (window.confirm('¿Estás seguro de que quieres cerrar sesión?')) {
      logout();
      navigate('/login');
    }
  };

  return (
    <div className="admin-dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-container">
          {/* Fila superior */}
          <div className="header-top">
            <div className="header-title">
              <h1>Panel de Administración</h1>
              <p>SmartPath - Sistema de Optimización de Rutas</p>
            </div>

            <button onClick={handleLogout} className="logout-btn">
              <span>🚪</span>
              <span className="btn-text">Cerrar Sesión</span>
            </button>
          </div>

          {/* Info del usuario */}
          <div className="user-info-row">
            <div className="user-badges">
              <span className="admin-badge">
                <span>👑</span>
                Administrador
              </span>
              
              <span className="user-id">
                <span>ID:</span> 
                {user?.id || 'N/A'}
              </span>
            </div>

            <div className="user-profile">
              <div className="user-avatar">
                {user?.name?.charAt(0)?.toUpperCase() || 'A'}
              </div>
              <div className="user-details">
                <div className="user-name">
                  {user?.name || 'Administrador'}
                </div>
                <div className="user-email">
                  {user?.email || 'admin@vitamarket.com'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="dashboard-content">
        {/* Grid de Tarjetas */}
        <section className="cards-section">
          <div className="cards-grid">
            <DashboardCard 
              icon="📍"
              title="Seguimiento" 
              description="Monitorear ubicación actual de asesores"
              onClick={() => {
                if (backendAvailable) {
                  navigate('/admin/tracking');
                } else {
                  alert('Esta función requiere que el backend esté disponible');
                }
              }}
            />
            
            <DashboardCard 
              icon="🏪"
              title="Gestión de Tiendas" 
              description="Asignar tiendas a asesores y gestionar puntos de venta"
              onClick={() => navigate('/admin/stores')}
            />
            
            <DashboardCard 
              icon="📊"
              title="Métricas" 
              description="Ver datos de productos, ventas y métricas"
              onClick={() => {
                if (backendAvailable) {
                  navigate('/admin/metrics');
                } else {
                  alert('Esta función requiere que el backend esté disponible');
                }
              }}
            />
          </div>
        </section>

        {/* Resumen Rápido */}
        <section className="quick-overview">
          <div className="overview-header">
            <div className="overview-title-row">
              <h3>Resumen Rápido</h3>
              
              <div className="overview-actions">
                {!backendAvailable && (
                  <span className="demo-badge">
                    Modo Demo
                  </span>
                )}
                <button 
                  onClick={loadDashboardData}
                  className="refresh-btn"
                  disabled={loading}
                >
                  Actualizar
                </button>
              </div>
            </div>
          </div>
          
          {error && !backendAvailable && (
            <div className="error-banner">
              <div className="error-content">
                <div className="error-text">
                  <strong>⚠️ Modo Demo:</strong>
                  <span> Backend no disponible.</span>
                </div>
              </div>
              <div className="debug-info">
                <p>Para usar todas las funciones:</p>
                <ol>
                  <li>Ejecutar backend en localhost:10000</li>
                  <li>Configurar rutas de admin</li>
                </ol>
              </div>
            </div>
          )}

          {loading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p className="loading-text">
                {backendAvailable ? 'Cargando datos...' : 'Preparando demo...'}
              </p>
            </div>
          ) : (
            <div className="stats-grid">
              <div className="stat-item">
                <strong className="stat-label">Asesores Activos:</strong>
                <span className="stat-value">
                  {dashboardData?.active_advisors ?? 'N/A'}
                </span>
              </div>
              <div className="stat-item">
                <strong className="stat-label">Tiendas Hoy:</strong>
                <span className="stat-value">
                  {dashboardData?.total_stores_today ?? 'N/A'}
                </span>
              </div>
              <div className="stat-item">
                <strong className="stat-label">Rutas en Progreso:</strong>
                <span className="stat-value">
                  {dashboardData?.active_routes ?? 'N/A'}
                </span>
              </div>
              <div className="stat-item">
                <strong className="stat-label">Tiendas Completadas:</strong>
                <span className="stat-value">
                  {dashboardData?.completed_stores ?? 'N/A'}
                </span>
              </div>
              <div className="stat-item">
                <strong className="stat-label">Tiendas en Progreso:</strong>
                <span className="stat-value">
                  {dashboardData?.in_progress_stores ?? 'N/A'}
                </span>
              </div>
              <div className="stat-item">
                <strong className="stat-label">Duración Promedio:</strong>
                <span className="stat-value">
                  {dashboardData?.avg_visit_duration ? `${dashboardData.avg_visit_duration} min` : 'N/A'}
                </span>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default AdminDashboard;