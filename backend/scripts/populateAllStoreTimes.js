// backend/scripts/populateMissingStoreTimes.js
import { createConnection } from '../src/config/database.js';
import dotenv from 'dotenv';
dotenv.config();

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

async function populateMissingStoreTimes() {
  const connection = await createConnection();

  try {
    console.log('🚀 Asignando tiempos a tiendas sin datos...');

    // Obtener tiempos reales de Alberto como referencia
    const [albertoTimes] = await connection.execute(`
      SELECT store_id, AVG(actual_duration) as avg_duration
      FROM route_stores rs
      JOIN routes r ON rs.route_id = r.id
      WHERE r.advisor_id = 11
        AND rs.status = 'completed'
        AND rs.actual_duration > 0
      GROUP BY store_id
    `);

    const storeTimes = {};
    albertoTimes.forEach(row => {
      storeTimes[row.store_id] = row.avg_duration;
    });
    console.log(`✅ Referencia: ${Object.keys(storeTimes).length} tiendas con tiempos de Alberto`);

    // Obtener tiendas sin tiempo
    const [missingStores] = await connection.execute(`
      SELECT DISTINCT s.id, s.name
      FROM stores s
      WHERE s.id NOT IN (
        SELECT DISTINCT store_id
        FROM route_stores
        WHERE actual_duration > 0
      )
    `);

    console.log(`📊 Tiendas sin tiempo: ${missingStores.length}`);

    // Crear tabla de referencias si no existe
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS store_time_references (
        store_id INT PRIMARY KEY,
        avg_duration DECIMAL(10,2),
        is_synthetic BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (store_id) REFERENCES stores(id)
      )
    `);

    let syntheticCount = 0;

    for (const store of missingStores) {
      const syntheticTime = generateSyntheticDuration(GENERAL_AVG, STD_DEV);
      
      await connection.execute(`
        INSERT INTO store_time_references (store_id, avg_duration, is_synthetic)
        VALUES (?, ?, TRUE)
        ON DUPLICATE KEY UPDATE avg_duration = VALUES(avg_duration), is_synthetic = TRUE
      `, [store.id, syntheticTime]);
      
      syntheticCount++;
      console.log(`🆕 ${store.name}: tiempo sintético ${syntheticTime} min`);
    }

    // También insertar tiempos reales de Alberto
    for (const [storeId, avgTime] of Object.entries(storeTimes)) {
      await connection.execute(`
        INSERT INTO store_time_references (store_id, avg_duration, is_synthetic)
        VALUES (?, ?, FALSE)
        ON DUPLICATE KEY UPDATE avg_duration = VALUES(avg_duration), is_synthetic = FALSE
      `, [storeId, avgTime]);
    }

    console.log(`\n📊 Resumen:`);
    console.log(`   - Tiendas con tiempos reales: ${Object.keys(storeTimes).length}`);
    console.log(`   - Tiendas con tiempos sintéticos: ${syntheticCount}`);
    console.log(`   - Total en tabla referencias: ${Object.keys(storeTimes).length + syntheticCount}`);

    console.log('\n🎉 Proceso completado!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await connection.end();
  }
}

populateMissingStoreTimes();