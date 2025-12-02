// frontend/src/components/admin/AdminDashboard.tsx - CON HEADER SUPERIOR
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

// Componente de Header reutilizable
const DashboardHeader = ({ user, onLogout, title, subtitle }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    if (window.confirm('¿Estás seguro de que quieres cerrar sesión?')) {
      onLogout();
      navigate('/login');
    }
  };

  return (
    <div style={{
      backgroundColor: '#ffffff',
      borderBottom: '1px solid #e5e7eb',
      padding: '20px 30px',
      marginBottom: '30px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        <div>
          <h1 style={{
            margin: '0 0 8px 0',
            color: '#1f2937',
            fontSize: '28px',
            fontWeight: '700'
          }}>
            {title}
          </h1>
          <p style={{
            margin: 0,
            color: '#6b7280',
            fontSize: '16px'
          }}>
            {subtitle}
          </p>
          <div style={{
            marginTop: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '15px',
            fontSize: '14px'
          }}>
            <span style={{
              backgroundColor: '#dbeafe',
              color: '#1e40af',
              padding: '4px 12px',
              borderRadius: '20px',
              fontWeight: '500'
            }}>
              👑 Administrador
            </span>
            <span style={{ color: '#6b7280' }}>
              ID: {user?.id || 'N/A'}
            </span>
          </div>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '15px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            backgroundColor: '#f8fafc',
            borderRadius: '8px',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              backgroundColor: '#3b82f6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 'bold',
              fontSize: '14px'
            }}>
              {user?.name?.charAt(0)?.toUpperCase() || 'A'}
            </div>
            <div>
              <div style={{ fontWeight: '600', fontSize: '14px' }}>
                {user?.name || 'Administrador'}
              </div>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>
                {user?.email || 'admin@vitamarket.com'}
              </div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            style={{
              padding: '10px 20px',
              backgroundColor: '#f3f4f6',
              color: '#6b7280',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '500',
              fontSize: '14px',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#fef2f2';
              e.currentTarget.style.color = '#dc2626';
              e.currentTarget.style.borderColor = '#fca5a5';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#f3f4f6';
              e.currentTarget.style.color = '#6b7280';
              e.currentTarget.style.borderColor = '#d1d5db';
            }}
          >
            <span>🚪</span>
            Cerrar Sesión
          </button>
        </div>
      </div>
    </div>
  );
};

// Interfaces para los datos
interface DashboardOverview {
  active_advisors: number;
  active_routes: number;
  total_stores_today: number;
  completed_stores: number;
  in_progress_stores: number;
  avg_visit_duration: number;
}

// Interfaz para la respuesta del backend
interface ApiResponse {
  success: boolean;
  data?: DashboardOverview;
  message?: string;
}

// Componente de tarjeta reutilizable
interface DashboardCardProps {
  title: string;
  description: string;
  onClick: () => void;
  icon?: string;
}

const DashboardCard: React.FC<DashboardCardProps> = ({ title, description, onClick, icon }) => {
  return (
    <div 
      onClick={onClick}
      style={{
        border: '1px solid #e1e5e9',
        borderRadius: '12px',
        padding: '25px',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        backgroundColor: '#ffffff',
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.15)';
        e.currentTarget.style.borderColor = '#3b82f6';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
        e.currentTarget.style.borderColor = '#e1e5e9';
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '15px' }}>
        {icon && <span style={{ fontSize: '24px', marginRight: '12px' }}>{icon}</span>}
        <h3 style={{ 
          margin: 0, 
          color: '#1f2937', 
          fontSize: '18px',
          fontWeight: '600'
        }}>
          {title}
        </h3>
      </div>
      <p style={{ 
        margin: 0, 
        color: '#6b7280', 
        fontSize: '14px',
        lineHeight: '1.5'
      }}>
        {description}
      </p>
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

  // Verificar si el backend está disponible
  const checkBackendHealth = async (): Promise<boolean> => {
    try {
      const response = await fetch('http://localhost:5000/api/health');
      return response.ok;
    } catch {
      return false;
    }
  };

  // Función mejorada para cargar los datos
  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔄 Cargando datos del dashboard...');
      
      // Primero verificar si el backend está disponible
      const isBackendHealthy = await checkBackendHealth();
      setBackendAvailable(isBackendHealthy);
      
      if (!isBackendHealthy) {
        throw new Error('El servidor backend no está disponible');
      }

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      const response = await fetch('http://localhost:5000/api/admin/dashboard/overview', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('📊 Status:', response.status);

      if (response.status === 404) {
        // Si el endpoint no existe, usar datos de prueba
        console.log('⚠️ Endpoint no encontrado, usando datos de prueba');
        
        // Datos de prueba para desarrollo
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
        // Si el backend no tiene datos, usar datos de prueba
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
      
      // Si hay error, usar datos de prueba
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

  const handleRetry = () => {
    loadDashboardData();
  };

  return (
    <div style={{ 
      minHeight: '100vh',
      backgroundColor: '#f8fafc'
    }}>
      {/* Header Superior */}
      <DashboardHeader 
        user={user}
        onLogout={logout}
        title="Panel de Administración"
        subtitle="SmartPath - Sistema de Optimización de Rutas para Vitamarket"
      />

      {/* Contenido Principal */}
      <div style={{ 
        padding: '0 30px 30px',
        maxWidth: '1200px', 
        margin: '0 auto'
      }}>

        {/* Grid de Tarjetas */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', 
          gap: '25px',
          marginBottom: '40px'
        }}>
          <DashboardCard 
            icon="📍"
            title="Seguimiento en Tiempo Real" 
            description="Monitorear progreso y ubicación actual de asesores en tiempo real"
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
            description="Asignar tiendas a asesores comerciales y gestionar puntos de venta"
            onClick={() => navigate('/admin/stores')}
          />
          
          <DashboardCard 
            icon="📊"
            title="Métricas y Estadísticas" 
            description="Ver datos de productos, ventas y métricas de desempeño"
            onClick={() => {
              if (backendAvailable) {
                navigate('/admin/metrics');
              } else {
                alert('Esta función requiere que el backend esté disponible');
              }
            }}
          />
        </div>

        {/* Resumen Rápido */}
        <div style={{
          padding: '20px',
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e1e5e9'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h3 style={{ margin: '0 0 15px 0', color: '#1f2937' }}>
              Resumen Rápido del Sistema
            </h3>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              {!backendAvailable && (
                <span style={{
                  fontSize: '12px',
                  color: '#92400e',
                  backgroundColor: '#fef3c7',
                  padding: '4px 8px',
                  borderRadius: '4px'
                }}>
                  Modo Demo
                </span>
              )}
              <button 
                onClick={handleRetry}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Actualizar
              </button>
            </div>
          </div>
          
          {error && !backendAvailable && (
            <div style={{
              padding: '15px',
              backgroundColor: '#fffbeb',
              border: '1px solid #fef3c7',
              borderRadius: '8px',
              marginBottom: '20px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ color: '#92400e' }}>⚠️ Modo Demo:</strong>
                  <span style={{ marginLeft: '8px', color: '#92400e' }}>
                    Backend no disponible. Mostrando datos de prueba.
                  </span>
                </div>
              </div>
              <div style={{ marginTop: '10px', fontSize: '13px', color: '#9ca3af' }}>
                <p>Para usar todas las funciones, asegúrate de:</p>
                <ol style={{ margin: '5px 0', paddingLeft: '20px' }}>
                  <li>Ejecutar el backend en <code>localhost:5000</code></li>
                  <li>Agregar <code>app.use('/api/admin', adminRoutes)</code> en server.js</li>
                  <li>Implementar <code>getDashboardOverview</code> en adminController.js</li>
                </ol>
              </div>
            </div>
          )}

          {loading ? (
            <div style={{ textAlign: 'center', padding: '30px' }}>
              <div style={{
                display: 'inline-block',
                width: '40px',
                height: '40px',
                border: '4px solid #f3f3f3',
                borderTop: '4px solid #3b82f6',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }}></div>
              <p style={{ marginTop: '10px', color: '#6b7280' }}>
                {backendAvailable ? 'Cargando datos del servidor...' : 'Preparando modo demo...'}
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
              <div>
                <strong style={{ color: '#3b82f6' }}>Asesores Activos:</strong>
                <span style={{ marginLeft: '8px', color: '#6b7280' }}>
                  {dashboardData?.active_advisors ?? 'N/A'}
                </span>
              </div>
              <div>
                <strong style={{ color: '#3b82f6' }}>Tiendas Hoy:</strong>
                <span style={{ marginLeft: '8px', color: '#6b7280' }}>
                  {dashboardData?.total_stores_today ?? 'N/A'}
                </span>
              </div>
              <div>
                <strong style={{ color: '#3b82f6' }}>Rutas en Progreso:</strong>
                <span style={{ marginLeft: '8px', color: '#6b7280' }}>
                  {dashboardData?.active_routes ?? 'N/A'}
                </span>
              </div>
              <div>
                <strong style={{ color: '#3b82f6' }}>Tiendas Completadas:</strong>
                <span style={{ marginLeft: '8px', color: '#6b7280' }}>
                  {dashboardData?.completed_stores ?? 'N/A'}
                </span>
              </div>
              <div>
                <strong style={{ color: '#3b82f6' }}>Tiendas en Progreso:</strong>
                <span style={{ marginLeft: '8px', color: '#6b7280' }}>
                  {dashboardData?.in_progress_stores ?? 'N/A'}
                </span>
              </div>
              <div>
                <strong style={{ color: '#3b82f6' }}>Duración Promedio:</strong>
                <span style={{ marginLeft: '8px', color: '#6b7280' }}>
                  {dashboardData?.avg_visit_duration ? `${dashboardData.avg_visit_duration} min` : 'N/A'}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Estilos para el spinner */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default AdminDashboard;