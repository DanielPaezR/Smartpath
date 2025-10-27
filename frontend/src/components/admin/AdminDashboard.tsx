import React from 'react';
import { useNavigate } from 'react-router-dom';

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

  return (
    <div style={{ 
      padding: '30px', 
      maxWidth: '1200px', 
      margin: '0 auto',
      minHeight: '100vh',
      backgroundColor: '#f8fafc'
    }}>
      {/* Header */}
      <div style={{ marginBottom: '40px' }}>
        <h1 style={{ 
          margin: '0 0 8px 0', 
          color: '#1f2937',
          fontSize: '32px',
          fontWeight: '700'
        }}>
          Panel de Administración
        </h1>
        <p style={{ 
          margin: 0, 
          color: '#6b7280',
          fontSize: '16px'
        }}>
          SmartPath - Sistema de Optimización de Rutas para Vitamarket
        </p>
      </div>

      {/* Grid de Tarjetas - Solo las esenciales */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', 
        gap: '25px'
      }}>
        <DashboardCard 
          icon="📍"
          title="Seguimiento en Tiempo Real" 
          description="Monitorear progreso y ubicación actual de asesores en tiempo real"
          onClick={() => navigate('/admin/tracking')}
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
          onClick={() => navigate('/admin/metrics')}
        />
      </div>

      {/* Información Rápida */}
      <div style={{
        marginTop: '50px',
        padding: '20px',
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #e1e5e9'
      }}>
        <h3 style={{ margin: '0 0 15px 0', color: '#1f2937' }}>
          Resumen Rápido del Sistema
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
          <div>
            <strong style={{ color: '#3b82f6' }}>Asesores Activos:</strong>
            <span style={{ marginLeft: '8px', color: '#6b7280' }}>Cargando...</span>
          </div>
          <div>
            <strong style={{ color: '#3b82f6' }}>Tiendas Hoy:</strong>
            <span style={{ marginLeft: '8px', color: '#6b7280' }}>Cargando...</span>
          </div>
          <div>
            <strong style={{ color: '#3b82f6' }}>Rutas en Progreso:</strong>
            <span style={{ marginLeft: '8px', color: '#6b7280' }}>Cargando...</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;