// frontend/src/components/common/Dashboard.tsx
import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import AdminDashboard from '../components/admin/AdminDashboard';
import AdvisorDashboard from '../components/advisor/AdvisorDashboard';
import '../styles/common/Dashboard.css'; // Vamos a crear este CSS

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
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="header-brand">
          <img 
            src="https://media.licdn.com/dms/image/v2/D4E0BAQF5nYIzwOYBtA/company-logo_200_200/company-logo_200_200/0/1681181862974/vitamarket_logo?e=2147483647&v=beta&t=qxAn5rp-7MC1FvaZS09zvc9L3_o16RdPaMpxjGDdpLw" 
            alt="Vitamarket" 
            className="brand-logo"
          />
          <div className="brand-text">
            <h1>SmartPath</h1>
            <p className="user-welcome">Bienvenido, {user.name} ({user.role})</p>
          </div>
        </div>
        <button className="logout-btn" onClick={handleLogout}>
          Cerrar Sesión
        </button>
      </header>

      <main className="dashboard-main">
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