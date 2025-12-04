import axios from 'axios';

const API_BASE_URL = 'https://ingenieria.unac.edu.co:10000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 segundos timeout
});

// Interceptor para agregar token automáticamente
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('🔐 Token agregado a request:', config.url);
    } else {
      console.log('⚠️  Sin token para request:', config.url);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para manejar errores de respuesta
api.interceptors.response.use(
  (response) => {
    console.log('✅ Response success:', response.status, response.config.url);
    return response;
  },
  (error) => {
    console.error('❌ Response error:', error.response?.status, error.config?.url);
    
    // Manejar errores de autenticación
    if (error.response?.status === 401 || error.response?.status === 403) {
      console.log('🔐 Error de autenticación detectado');
      
      // Solo redirigir si no es una ruta pública
      const publicRoutes = ['/auth/login', '/auth/register'];
      const isPublicRoute = publicRoutes.some(route => error.config?.url?.includes(route));
      
      if (!isPublicRoute) {
        console.log('🔐 Limpiando token y redirigiendo al login...');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        // Usar window.location para redirección confiable
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }
    
    return Promise.reject(error);
  }
);

export { api };
export default api;
export { API_BASE_URL };