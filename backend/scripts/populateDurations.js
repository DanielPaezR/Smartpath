// backend/scripts/populateDurations.js
import { createConnection } from '../src/config/database.js';
import dotenv from 'dotenv';
dotenv.config();

const ADVISOR_IDS = [8, 9, 10, 12];
const GENERAL_AVG = 65.7;
const STD_DEV = 41.2;
const MIN_DURATION = 5;
const MAX_DURATION = 180;

function generateSyntheticDuration(mean, stdDev) {
  let u1 = Math.random();
  let u2 = Math.random();
  let z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  let duration = mean + z0 * stdDev;
  duration = Math.max(MIN_DURATION, Math.min(MAX_DURATION, duration));
  return Math.round(duration);
}

async function populateDurations() {
  const connection = await createConnection();

  try {
    console.log('🚀 Iniciando población de duraciones sintéticas...');

    // Obtener datos de Alberto (id=11)
    const albertoId = 11;
    console.log('📊 Obteniendo datos de referencia de Alberto...');

    const [albertoTimes] = await connection.execute(`
      SELECT store_id, AVG(actual_duration) as avg_duration
      FROM route_stores rs
      JOIN routes r ON rs.route_id = r.id
      WHERE r.advisor_id = ?
        AND rs.status = 'completed'
        AND rs.actual_duration > 0
      GROUP BY store_id
    `, [albertoId]);

    const storeTimes = {};
    albertoTimes.forEach(row => {
      storeTimes[row.store_id] = row.avg_duration;
    });

    console.log(`✅ Datos de Alberto obtenidos: ${Object.keys(storeTimes).length} tiendas con tiempos promedio`);

    // Procesar cada asesor
    for (const advisorId of ADVISOR_IDS) {
      console.log(`\n👤 Procesando asesor ID: ${advisorId}`);

      // Obtener visitas completadas SIN duración
      const [visits] = await connection.execute(`
        SELECT rs.id, rs.store_id, rs.actual_duration
        FROM route_stores rs
        JOIN routes r ON rs.route_id = r.id
        WHERE r.advisor_id = ?
          AND rs.status = 'completed'
          AND (rs.actual_duration IS NULL OR rs.actual_duration = 0 OR rs.actual_duration < 1)
      `, [advisorId]);

      console.log(`📋 Encontradas ${visits.length} visitas sin duración para actualizar`);

      let updatedCount = 0;

      for (const visit of visits) {
        const mean = storeTimes[visit.store_id] || GENERAL_AVG;
        const syntheticDuration = generateSyntheticDuration(mean, STD_DEV);
        
        await connection.execute(`
          UPDATE route_stores
          SET actual_duration = ?
          WHERE id = ?
        `, [syntheticDuration, visit.id]);
        
        updatedCount++;
      }

      console.log(`✅ Asesor ${advisorId}: ${updatedCount} registros actualizados`);
    }

    console.log('\n🎉 Proceso completado exitosamente!');

  } catch (error) {
    console.error('❌ Error en el proceso:', error);
  } finally {
    await connection.end();
  }
}

populateDurations();