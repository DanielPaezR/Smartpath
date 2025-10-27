import api from './api';

export const authService = {
  async login(email, password) {
    console.log('🔐 Intentando login para:', email);
    const response = await api.post('/auth/login', { email, password });
    
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      console.log('✅ Login exitoso, token guardado');
      console.log('👤 Usuario:', response.data.user);
    }
    
    return response.data;
  },

  logout() {
    console.log('🔐 Cerrando sesión...');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  getCurrentUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  getToken() {
    return localStorage.getItem('token');
  }
};