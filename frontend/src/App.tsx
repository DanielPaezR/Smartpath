import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import StoreManagement from './components/admin/StoreManagement';
import StoreVisit from './components/advisor/StoreVisit';
import RouteMap from './components/advisor/RouteMap';
import './App.css';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div>Cargando...</div>;
  return user ? <>{children}</> : <Navigate to="/login" />;
};

const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div>Cargando...</div>;
  return user && user.role === 'admin' ? <>{children}</> : <Navigate to="/dashboard" />;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/admin/stores" element={<AdminRoute><StoreManagement /></AdminRoute>} />
            
            {/* Rutas placeholder para las otras secciones */}
            <Route path="/admin/metrics" element={<AdminRoute><div>Métricas - En construcción</div></AdminRoute>} />
            <Route path="/admin/tracking" element={<AdminRoute><div>Seguimiento - En construcción</div></AdminRoute>} />
            <Route path="/admin/settings" element={<AdminRoute><div>Configuración - En construcción</div></AdminRoute>} />
            
            <Route path="/" element={<Navigate to="/dashboard" />} />
            <Route path="/advisor/visit" element={
            <ProtectedRoute>
              <StoreVisit />
            </ProtectedRoute>
            } />

            <Route path="/advisor/map" element={
              <ProtectedRoute>
                <div>Mapa - En construcción</div>
              </ProtectedRoute>
            } />
            <Route path="/advisor/map" element={
              <ProtectedRoute>
                <RouteMap />
              </ProtectedRoute>
            } />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;