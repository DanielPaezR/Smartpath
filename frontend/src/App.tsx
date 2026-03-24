import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import AdminDashboard from './components/admin/AdminDashboard';
import StoresManagement from './components/admin/StoreManagement';
import StoreVisit from './components/advisor/StoreVisit';
import RouteMap from './components/advisor/RouteMap';
import RealTimeTracking from './components/admin/RealTimeTracking';
import AdvancedMetrics from './components/admin/AdvancedMetrics';
import ProductManagement from './components/admin/ProductManagement';
import AdvisorManagement from './components/admin/AdvisorManagement';
import './styles/global-fixes.css';
import InstallPWA from './components/common/InstallPWA';
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
            
            {/* Ruta principal - Redirige según rol */}
            <Route path="/" element={
              <ProtectedRoute>
                <NavigateToDashboard />
              </ProtectedRoute>
            } />
            
            {/* Dashboard general (para todos) */}
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <RoleBasedDashboard />
              </ProtectedRoute>
            } />
            
            {/* 🆕 DASHBOARD ESPECÍFICO DE ADMIN */}
            <Route path="/admin/dashboard" element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            } />
            
            {/* 🆕 RUTA STORE-VISIT FALTANTE */}
            <Route path="/store-visit" element={
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
            
            <Route path="/admin/notifications" element={
              <AdminRoute>
                <PlaceholderPage title="Notificaciones y Alertas" />
              </AdminRoute>
            } />

            <Route path="/admin/products" element={
              <AdminRoute>
                <ProductManagement />
              </AdminRoute>
            } />

            <Route path="/admin/advisors" element={
              <AdminRoute>
                <AdvisorManagement />
              </AdminRoute>
            } />

            {/* Ruta 404 */}
            <Route path="*" element={<div>Página no encontrada</div>} />
          </Routes>
          <InstallPWA />
        </div>
      </Router>
    </AuthProvider>
  );
}

// 🆕 COMPONENTE PARA REDIRIGIR AL DASHBOARD CORRECTO SEGÚN ROL
const NavigateToDashboard: React.FC = () => {
  const { user } = useAuth();
  
  if (user?.role === 'admin') {
    return <Navigate to="/admin/dashboard" />;
  } else if (user?.role === 'advisor') {
    return <Navigate to="/dashboard" />;
  } else {
    return <Navigate to="/login" />;
  }
};

// 🆕 COMPONENTE PARA MOSTRAR DASHBOARD SEGÚN ROL
const RoleBasedDashboard: React.FC = () => {
  const { user } = useAuth();
  
  if (user?.role === 'admin') {
    return <Navigate to="/admin/dashboard" />;
  } else {
    // Aquí iría el Dashboard del asesor
    return <Dashboard />;
  }
};

export default App;