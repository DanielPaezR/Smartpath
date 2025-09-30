// src/scripts/generateTestRoute.ts

// Importar desde la ruta donde se generó el cliente
const { PrismaClient } = require('../generated/prisma');

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🚀 Iniciando generación de ruta de prueba...');
    
    // 1. Buscar o crear asesor
    let advisor = await prisma.advisor.findFirst({
      where: { email: 'asesor@test.com' }
    });

    if (!advisor) {
      console.log('📝 Creando asesor de prueba...');
      advisor = await prisma.advisor.create({
        data: {
          name: 'Asesor de Prueba',
          email: 'asesor@test.com',
          password: 'password123',
          specialization: 'General',
          status: 'ACTIVE'
        }
      });
      console.log('✅ Asesor creado:', advisor.name);
    } else {
      console.log('✅ Asesor encontrado:', advisor.name);
    }

    // 2. Crear ruta para hoy
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Verificar si ya existe ruta
    const existingRoute = await prisma.route.findFirst({
      where: {
        advisorId: advisor.id,
        date: {
          gte: today,
          lt: tomorrow
        }
      },
      include: {
        visits: true
      }
    });

    if (existingRoute) {
      console.log('⚠️ Ya existe una ruta para hoy con', existingRoute.visits.length, 'visitas');
      console.log('ID de la ruta:', existingRoute.id);
      return;
    }

    // 3. Crear la ruta
    const route = await prisma.route.create({
      data: {
        date: today,
        advisorId: advisor.id,
        status: 'PENDING'
      }
    });

    console.log('✅ Ruta creada ID:', route.id);

    // 4. Crear visitas de prueba
    const testVisits = [
      {
        clientName: 'Cliente Ejemplo 1',
        address: 'Carrera 15 # 32-45, Bogotá',
        scheduledTime: new Date(today.getTime() + (9 * 60 * 60 * 1000)), // 9:00 AM
        status: 'PENDING',
        notes: 'Primera visita al cliente'
      },
      {
        clientName: 'Cliente Ejemplo 2', 
        address: 'Avenida 68 # 12-34, Medellín',
        scheduledTime: new Date(today.getTime() + (11 * 60 * 60 * 1000)), // 11:00 AM
        status: 'PENDING',
        notes: 'Seguimiento de cotización'
      },
      {
        clientName: 'Cliente Ejemplo 3',
        address: 'Calle 100 # 25-60, Cali',
        scheduledTime: new Date(today.getTime() + (14 * 60 * 60 * 1000)), // 2:00 PM
        status: 'PENDING',
        notes: 'Presentación de nuevos productos'
      }
    ];

    for (const visitData of testVisits) {
      const visit = await prisma.visit.create({
        data: {
          ...visitData,
          routeId: route.id
        }
      });
      console.log(`✅ Visita creada: ${visit.clientName}`);
    }

    console.log('🎉 ¡Ruta de prueba generada exitosamente!');
    console.log('📊 Resumen:');
    console.log('   - Asesor:', advisor.name);
    console.log('   - Ruta ID:', route.id);
    console.log('   - Fecha:', today.toLocaleDateString());
    console.log('   - Total visitas:', testVisits.length);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();