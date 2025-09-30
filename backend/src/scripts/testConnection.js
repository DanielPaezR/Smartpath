// backend/src/scripts/testConnection.js
import { createConnection } from '../config/database.js';

async function testConnection() {
  let connection;
  try {
    connection = await createConnection();
    
    // Verificar usuarios
    const [users] = await connection.execute('SELECT COUNT(*) as count FROM users');
    console.log(`✅ Usuarios en la base de datos: ${users[0].count}`);
    
    // Verificar tiendas
    const [stores] = await connection.execute('SELECT COUNT(*) as count FROM stores');
    console.log(`✅ Tiendas en la base de datos: ${stores[0].count}`);
    
    // Verificar rutas
    const [routes] = await connection.execute('SELECT COUNT(*) as count FROM routes');
    console.log(`✅ Rutas en la base de datos: ${routes[0].count}`);
    
    // Mostrar algunos datos de ejemplo
    console.log('\n📊 Datos de ejemplo:');
    
    const [sampleUsers] = await connection.execute('SELECT id, name, email, role FROM users LIMIT 3');
    console.log('👥 Usuarios:', sampleUsers);
    
    const [sampleStores] = await connection.execute('SELECT id, name, zone FROM stores LIMIT 3');
    console.log('🏪 Tiendas:', sampleStores);
    
    await connection.end();
    console.log('\n🎉 ¡Conexión a MySQL funcionando correctamente!');
    
  } catch (error) {
    console.error('❌ Error en la conexión:', error.message);
  }
}

testConnection();