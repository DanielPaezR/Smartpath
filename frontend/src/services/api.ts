import axios from 'axios';

const API_BASE_URL = 'https://ingenieria.unac.edu.co:10000/api';

console.log('🌐 Conectando a backend HTTP:', API_BASE_URL);

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Interceptor para agregar token automáticamente
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para manejar errores
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('❌ Error:', error.message, error.config?.url);
    
    // Si es error de red (backend no responde)
    if (error.code === 'ERR_NETWORK') {
      console.error('🔌 Error de red - Verificar que el backend esté corriendo en puerto 10000');
    }
    
    // Si es error de autenticación
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Redirigir al login con HashRouter
      window.location.href = '/~daniel.paez/smartpath/#/login';
    }
    
    return Promise.reject(error);
  }
);

export { api };
export default api;
export { API_BASE_URL };