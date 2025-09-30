// backend/src/server.js - VERSIÓN COMPLETA FUNCIONAL
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Configurar dotenv
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors());
app.use(express.json());

// 1. HEALTH CHECK (GET) - ✅ Esta funciona
app.get('/api/health', (req, res) => {
  res.json({ 
    message: 'SmartPath Backend funcionando correctamente', 
    timestamp: new Date().toISOString(),
    database: 'MySQL',
    status: 'OK'
  });
});

// 2. LOGIN (POST) - 🚨 Necesita método POST
app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;
    
    console.log('📨 Login attempt:', email);
    
    // Credenciales de prueba
    const users = {
      'admin@vitamarket.com': { password: 'admin123', name: 'Administrador', role: 'admin', id: 1 },
      'asesor1@vitamarket.com': { password: 'asesor123', name: 'Carlos Rodríguez', role: 'advisor', id: 2 }
    };

    const user = users[email];
    
    if (!user) {
      return res.status(401).json({ message: 'Usuario no encontrado' });
    }

    if (user.password !== password) {
      return res.status(401).json({ message: 'Contraseña incorrecta' });
    }

    // Simular token
    const token = 'mock_jwt_token_' + Date.now();
    
    res.json({
      message: 'Login exitoso',
      token,
      user: {
        id: user.id,
        email: email,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// 3. OBTENER TIENDAS (GET) - ✅ Esta debería funcionar
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

// 4. OBTENER RUTA ACTUAL (GET) - ✅ Esta debería funcionar
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

// 5. INICIAR VISITA (PATCH) - 🚨 Necesita método PATCH
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

// Ruta 404 corregida
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
  console.log('');
  console.log('👤 CREDENCIALES:');
  console.log('   📧 admin@vitamarket.com / 🔑 admin123');
  console.log('   📧 asesor1@vitamarket.com / 🔑 asesor123');
});