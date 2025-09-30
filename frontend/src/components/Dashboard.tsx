import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import AdminDashboard from './admin/AdminDashboard';
import AdvisorDashboard from './advisor/AdvisorDashboard';

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) {
    return <div>Cargando...</div>;
  }

  return (
    <div style={{ padding: '20px' }}>
      <header style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '30px',
        borderBottom: '1px solid #ccc',
        paddingBottom: '20px'
      }}>
        <div>
          <h1>SmartPath - Vitamarket</h1>
          <p>Bienvenido, {user.name} ({user.role})</p>
        </div>
        <button onClick={handleLogout} style={{ padding: '10px 20px' }}>
          Cerrar Sesión
        </button>
      </header>

      <main>
        {user.role === 'admin' ? (
          <AdminDashboard />
        ) : (
          <AdvisorDashboard />
        )}
      </main>
    </div>
  );
};

export default Dashboard;