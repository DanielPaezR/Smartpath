// frontend/src/contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
// @ts-ignore
import { authService } from '../services/authService';

// Eliminar interfaces TypeScript y usar any temporalmente
const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const userData = authService.getCurrentUser();
      if (userData) {
        setUser({
          id: userData._id || userData.id || '',
          email: userData.email,
          name: userData.name,
          role: userData.role,
          vehicleType: userData.vehicleType
        });
      }
    } catch (error) {
      console.error('Error verificando autenticación:', error);
      authService.logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await authService.login(email, password);
      const userData = response.user;
      
      console.log('🔑 User data del login:', userData);
      
      const mappedUser = {
        id: userData._id || userData.id || '',
        email: userData.email,
        name: userData.name,
        role: userData.role,
        vehicleType: userData.vehicleType
      };
      
      setUser(mappedUser);
    } catch (error) {
      console.error('Error en login:', error);
      throw error;
    }
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  const value = {
    user,
    login,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading ? children : (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh' 
        }}>
          <div>Cargando SmartPath...</div>
        </div>
      )}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};