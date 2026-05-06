// backend/scripts/populateDurations.js
import { createConnection } from '../src/config/database.js';

const ADVISOR_IDS = [8, 9, 10, 12];
const GENERAL_AVG = 65.7;
const STD_DEV = 41.2;
const MIN_DURATION = 5;
const MAX_DURATION = 180;

// Función para generar duración sintética
function generateSyntheticDuration(mean, stdDev) {
  // Usar distribución normal con Box-Muller
  let u1 = Math.random();
  let u2 = Math.random();
  let z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  let duration = mean + z0 * stdDev;

  // Asegurar límites
  duration = Math.max(MIN_DURATION, Math.min(MAX_DURATION, duration));
  return Math.round(duration);
}

async function populateDurations() {
  const connection = await createConnection();

  try {
    console.log('🚀 Iniciando población de duraciones sintéticas...');

    // Obtener datos de Alberto (asumiendo id=8)
    const albertoId = 8;
    console.log('📊 Obteniendo datos de referencia de Alberto...');

    const [albertoTimes] = await connection.execute(`
      SELECT store_id, AVG(actual_duration) as avg_duration
      FROM route_stores
      WHERE route_id IN (SELECT id FROM routes WHERE advisor_id = ?)
        AND status = 'completed'
        AND actual_duration > 0
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

      // Obtener visitas completadas con duration = 0 o NULL
      const [visits] = await connection.execute(`
        SELECT rs.id, rs.store_id, rs.actual_duration
        FROM route_stores rs
        JOIN routes r ON rs.route_id = r.id
        WHERE r.advisor_id = ?
          AND rs.status = 'completed'
          AND (rs.actual_duration IS NULL OR rs.actual_duration = 0)
      `, [advisorId]);

      console.log(`📋 Encontradas ${visits.length} visitas para actualizar`);

      let updatedCount = 0;

      for (const visit of visits) {
        // Determinar media
        const mean = storeTimes[visit.store_id] || GENERAL_AVG;

        // Generar duración sintética
        const syntheticDuration = generateSyntheticDuration(mean, STD_DEV);

        // Actualizar en la base de datos
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

// Ejecutar si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  populateDurations();
}

export { populateDurations };