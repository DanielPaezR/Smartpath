// backend/src/server.js - VERSIÓN CORREGIDA
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import adminRoutes from './routes/adminRoutes.js';
import authRoutes from './routes/authRoutes.js'; // ✅ AGREGAR ESTA LÍNEA


// Configurar dotenv
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors());
app.use(express.json());

// ✅ RUTA DE TRACKING (sin autenticación para testing)
app.post('/api/tracking/update-location', async (req, res) => {
  try {
    req.user = { id: req.body.userId || 'mock_user_id' };
    await trackingController.updateLocation(req, res);
  } catch (error) {
    console.error('Error en ruta de tracking:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ✅ USAR RUTAS DE AUTH (en lugar de login duplicado)
app.use('/api/auth', authRoutes);

// ✅ RUTAS DEL ADMIN (con autenticación)
app.use('/api/admin', adminRoutes);

// 1. HEALTH CHECK (GET)
app.get('/api/health', (req, res) => {
  res.json({ 
    message: 'SmartPath Backend funcionando correctamente', 
    timestamp: new Date().toISOString(),
    database: 'MongoDB',
    status: 'OK'
  });
});

// 3. OBTENER TIENDAS (GET)
app.get('/api/stores', (req, res) => {
  try {
    const stores = [
      {
        id: 1,
        name: "Vitamarket El Poblado",
        address: "Carrera 43A # 1-50, El Poblado",
        latitude: 6.208588,
        longitude: -75.571050,
        zone: "El Poblado"
      },
      {
        id: 2,
        name: "Vitamarket Laureles", 
        address: "Calle 70 # 40-20, Laureles",
        latitude: 6.245670,
        longitude: -75.587890,
        zone: "Laureles"
      },
      {
        id: 3,
        name: "Vitamarket Centro",
        address: "Calle 50 # 45-20, Centro",
        latitude: 6.245678,
        longitude: -75.571234,
        zone: "Centro"
      }
    ];
    
    console.log('📦 Enviando', stores.length, 'tiendas');
    res.json(stores);
  } catch (error) {
    console.error('Error obteniendo tiendas:', error);
    res.status(500).json({ message: 'Error obteniendo tiendas' });
  }
});

// 4. OBTENER RUTA ACTUAL (GET)
app.get('/api/routes/advisor/:advisorId/current', (req, res) => {
  try {
    const { advisorId } = req.params;
    
    console.log('🛣️ Solicitando ruta para asesor:', advisorId);
    
    const route = {
      id: 1,
      advisor_id: parseInt(advisorId),
      date: new Date().toISOString().split('T')[0],
      status: 'in_progress',
      total_stores: 4,
      completed_stores: 1,
      total_distance: 8.5,
      estimated_duration: 180,
      stores: [
        { id: 1, name: "Vitamarket El Poblado", status: "completed", visit_order: 1 },
        { id: 2, name: "Vitamarket Laureles", status: "in_progress", visit_order: 2 },
        { id: 3, name: "Vitamarket Centro", status: "pending", visit_order: 3 }
      ]
    };

    res.json(route);
  } catch (error) {
    console.error('Error obteniendo ruta:', error);
    res.status(500).json({ message: 'Error obteniendo ruta' });
  }
});

// 5. INICIAR VISITA (PATCH)
app.patch('/api/routes/start-visit', (req, res) => {
  try {
    const { routeStoreId } = req.body;
    
    console.log('▶️ Iniciando visita:', routeStoreId);
    
    res.json({ 
      message: 'Visita iniciada correctamente', 
      routeStoreId,
      startTime: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error iniciando visita:', error);
    res.status(500).json({ message: 'Error iniciando visita' });
  }
});

// Ruta 404
app.use((req, res) => {
  res.status(404).json({ 
    message: 'Ruta no encontrada',
    path: req.originalUrl,
    method: req.method,
    suggestion: 'Verifica el método HTTP (GET, POST, PATCH)'
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
  console.log('');
  console.log('📍 ENDPOINTS DISPONIBLES:');
  console.log(`✅ GET  http://localhost:${PORT}/api/health`);
  console.log(`✅ GET  http://localhost:${PORT}/api/stores`);
  console.log(`✅ GET  http://localhost:${PORT}/api/routes/advisor/2/current`);
  console.log(`🔐 POST http://localhost:${PORT}/api/auth/login`);
  console.log(`🔄 PATCH http://localhost:${PORT}/api/routes/start-visit`);
  console.log(`📍 POST http://localhost:${PORT}/api/tracking/update-location`);
  console.log('');
  console.log('🏢 ENDPOINTS ADMIN:');
  console.log(`📊 GET  http://localhost:${PORT}/api/admin/dashboard/overview`);
  console.log(`👥 GET  http://localhost:${PORT}/api/admin/tracking/live-status`);
  console.log('');
  console.log('👤 CREDENCIALES:');
  console.log('   📧 admin@vitamarket.com / 🔑 admin123');
  console.log('   📧 asesor1@vitamarket.com / 🔑 asesor123');
});