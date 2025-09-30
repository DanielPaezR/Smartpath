import React from 'react';
import { useNavigate } from 'react-router-dom';

// Componente de tarjeta reutilizable
interface DashboardCardProps {
  title: string;
  description: string;
  onClick: () => void;
}

const DashboardCard: React.FC<DashboardCardProps> = ({ title, description, onClick }) => {
  return (
    <div 
      onClick={onClick}
      style={{
        border: '1px solid #ddd',
        borderRadius: '8px',
        padding: '20px',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        backgroundColor: '#f9f9f9'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <h3 style={{ margin: '0 0 10px 0', color: '#333' }}>{title}</h3>
      <p style={{ margin: 0, color: '#666' }}>{description}</p>
    </div>
  );
};

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate(); // ✅ Ahora sí está dentro del Router

  return (
    <div>
      <h2>Panel de Administración</h2>
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
        gap: '20px',
        marginTop: '20px'
      }}>
        <DashboardCard 
          title="Gestión de Tiendas" 
          description="Asignar tiendas a asesores"
          onClick={() => navigate('/admin/stores')}
        />
        <DashboardCard 
          title="Métricas y Estadísticas" 
          description="Ver datos de productos y ventas"
          onClick={() => navigate('/admin/metrics')}
        />
        <DashboardCard 
          title="Seguimiento en Tiempo Real" 
          description="Monitorear progreso de asesores"
          onClick={() => navigate('/admin/tracking')}
        />
        <DashboardCard 
          title="Configuración de Rutas" 
          description="Optimización automática de rutas"
          onClick={() => navigate('/admin/settings')}
        />
      </div>
    </div>
  );
};

export default AdminDashboard;