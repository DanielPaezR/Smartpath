// frontend/src/contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
// @ts-ignore
import { authService } from '../services/authService';

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
      console.log('🔄 UserData from localStorage:', userData);
      
      if (userData) {
        // ✅ CORREGIDO: Usar la estructura EXACTA que viene del backend
        setUser({
          id: userData.id,  // ← número, no _id
          email: userData.email,
          name: userData.name,
          role: userData.role,
          vehicleType: userData.vehicleType || 'car' // valor por defecto
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
      
      // ✅ CORREGIDO: Mapeo exacto con el backend
      const mappedUser = {
        id: userData.id,  // ← número directo
        email: userData.email,
        name: userData.name,
        role: userData.role,
        vehicleType: userData.vehicleType || 'car'
      };
      
      console.log('✅ Usuario mapeado:', mappedUser);
      setUser(mappedUser);
      
      return response;
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