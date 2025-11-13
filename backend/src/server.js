// backend/src/server.js - VERSIÓN CORREGIDA CON NOMBRE REAL
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import adminRoutes from './routes/adminRoutes.js';
import authRoutes from './routes/authRoutes.js';
import productRoutes from '../src/routes/productRoutes.js';
import storeRoutes from '../src/routes/storeRoutes.js';
import routeRoutes from '../src/routes/routes.js'; // ✅ NOMBRE CORRECTO

// Configurar dotenv
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors());
app.use(express.json());

// ✅ RUTAS PRINCIPALES
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/products', productRoutes);
app.use('/api/stores', storeRoutes);
app.use('/api/routes', routeRoutes); // ✅ USAR RUTAS REALES

// ✅ HEALTH CHECK (GET)
app.get('/api/health', (req, res) => {
  res.json({ 
    message: 'SmartPath Backend funcionando correctamente', 
    timestamp: new Date().toISOString(),
    database: 'MySQL',
    status: 'OK'
  });
});

// ✅ RUTA 404
app.use((req, res) => {
  res.status(404).json({ 
    message: 'Ruta no encontrada',
    path: req.originalUrl,
    method: req.method,
    suggestion: 'Verifica el método HTTP (GET, POST, PATCH)'
  });
});

// ✅ INICIAR SERVIDOR
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
  console.log('');
  console.log('📍 ENDPOINTS DISPONIBLES:');
  console.log(`✅ GET  http://localhost:${PORT}/api/health`);
  console.log(`✅ GET  http://localhost:${PORT}/api/stores`);
  console.log(`✅ GET  http://localhost:${PORT}/api/routes/advisor/:id/current`);
  console.log(`🔐 POST http://localhost:${PORT}/api/auth/login`);
  console.log(`🔄 PATCH http://localhost:${PORT}/api/routes/start-visit`);
  console.log('');
  console.log('🏢 ENDPOINTS ADMIN:');
  console.log(`📊 GET  http://localhost:${PORT}/api/admin/dashboard/overview`);
  console.log(`👥 GET  http://localhost:${PORT}/api/admin/tracking/live-status`);
  console.log('');
  console.log('👤 CREDENCIALES:');
  console.log('   📧 admin@vitamarket.com / 🔑 admin123');
  console.log('   📧 asesor1@vitamarket.com / 🔑 asesor123');
});