// frontend/src/components/Dashboard.tsx
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import AdminDashboard from './admin/AdminDashboard';
import AdvisorDashboard from './advisor/AdvisorDashboard';
import ChangePassword from './common/ChangePassword';
import '../styles/common/Dashboard.css';

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showChangePassword, setShowChangePassword] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) {
    return <div>Cargando...</div>;
  }

  return (
    <div className="dashboard-container">
      {/* 👈 EL HEADER DEBE ESTAR AQUÍ, FUERA DE CUALQUIER CONDICIÓN */}
      <header className="dashboard-header">
        <div className="header-brand">
          <img 
            src="https://media.licdn.com/dms/image/v2/D4E0BAQF5nYIzwOYBtA/company-logo_200_200/company-logo_200_200/0/1681181862974/vitamarket_logo?e=2147483647&v=beta&t=qxAn5rp-7MC1FvaZS09zvc9L3_o16RdPaMpxjGDdpLw" 
            alt="Vitamarket" 
            className="brand-logo"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
          <div className="brand-text">
            <h1>SmartPath</h1>
            <p className="user-welcome">Bienvenido, {user.name} ({user.role})</p>
          </div>
        </div>
        <div className="header-actions">
          <button 
            onClick={() => setShowChangePassword(true)} 
            className="change-password-btn"
          >
            🔐 Cambiar Contraseña
          </button>
          <button className="logout-btn" onClick={handleLogout}>
            Cerrar Sesión
          </button>
        </div>
      </header>

      <main className="dashboard-main">
        {user.role === 'admin' ? (
          <AdminDashboard />
        ) : (
          <AdvisorDashboard />
        )}
      </main>

      {showChangePassword && (
        <ChangePassword onClose={() => setShowChangePassword(false)} />
      )}
    </div>
  );
};

export default Dashboard;