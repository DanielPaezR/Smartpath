import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import StoresManagement from './components/admin/StoreManagement';
import StoreVisit from './components/advisor/StoreVisit';
import RouteMap from './components/advisor/RouteMap';
import RealTimeTracking from './components/admin/RealTimeTracking';
import AdvancedMetrics from './components/admin/AdvancedMetrics';
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

const AdvisorRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div>Cargando...</div>;
  return user && user.role === 'advisor' ? <>{children}</> : <Navigate to="/dashboard" />;
};

// Componente placeholder para páginas en desarrollo
const PlaceholderPage: React.FC<{ title: string }> = ({ title }) => (
  <div style={{ padding: '40px', textAlign: 'center' }}>
    <h2>{title}</h2>
    <p>Esta funcionalidad estará disponible próximamente</p>
  </div>
);

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            {/* Rutas públicas */}
            <Route path="/login" element={<Login />} />
            
            {/* Ruta principal */}
            <Route path="/" element={<Navigate to="/dashboard" />} />
            
            {/* Rutas protegidas (para todos los usuarios autenticados) */}
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            
            {/* 🆕 RUTA STORE-VISIT FALTANTE */}
            <Route path="/store-visit" element={
              <AdvisorRoute>
                <StoreVisit />
              </AdvisorRoute>
            } />
            
            <Route path="/advisor/visit" element={
              <AdvisorRoute>
                <StoreVisit />
              </AdvisorRoute>
            } />
            
            <Route path="/advisor/map" element={
              <AdvisorRoute>
                <RouteMap />
              </AdvisorRoute>
            } />

            {/* Rutas exclusivas para ADMIN */}
            <Route path="/admin/stores" element={
              <AdminRoute>
                <StoresManagement />
              </AdminRoute>
            } />
            
            <Route path="/admin/tracking" element={
              <AdminRoute>
                <RealTimeTracking />
              </AdminRoute>
            } />
            
            <Route path="/admin/metrics" element={
              <AdminRoute>
                <AdvancedMetrics />
              </AdminRoute>
            } />
            
            <Route path="/admin/settings" element={
              <AdminRoute>
                <PlaceholderPage title="Configuración de Rutas" />
              </AdminRoute>
            } />
            
            <Route path="/admin/advisors" element={
              <AdminRoute>
                <PlaceholderPage title="Gestión de Asesores" />
              </AdminRoute>
            } />
            
            <Route path="/admin/notifications" element={
              <AdminRoute>
                <PlaceholderPage title="Notificaciones y Alertas" />
              </AdminRoute>
            } />

            {/* Ruta 404 */}
            <Route path="*" element={<div>Página no encontrada</div>} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;