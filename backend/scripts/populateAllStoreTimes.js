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

async function populateAllStoresTimes() {
  const connection = await createConnection();

  try {
    console.log('🚀 Asignando tiempos a TODAS las tiendas...');

    // Obtener tiempos reales de Alberto
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
    console.log(`✅ Tiendas con tiempos reales de Alberto: ${Object.keys(storeTimes).length}`);

    // Obtener TODAS las tiendas
    const [allStores] = await connection.execute(`SELECT id FROM stores`);
    console.log(`📊 Total tiendas en sistema: ${allStores.length}`);

    // Limpiar tabla de referencias
    await connection.execute(`DELETE FROM store_time_references`);
    console.log(`🧹 Tabla store_time_references limpiada`);

    let realCount = 0;
    let syntheticCount = 0;

    for (const store of allStores) {
      const storeId = store.id;
      let avgTime;
      let isSynthetic;
      
      if (storeTimes[storeId]) {
        avgTime = storeTimes[storeId];
        isSynthetic = false;
        realCount++;
      } else {
        avgTime = generateSyntheticDuration(GENERAL_AVG, STD_DEV);
        isSynthetic = true;
        syntheticCount++;
      }
      
      await connection.execute(`
        INSERT INTO store_time_references (store_id, avg_duration, is_synthetic)
        VALUES (?, ?, ?)
      `, [storeId, avgTime, isSynthetic]);
    }

    console.log(`\n📊 Resumen:`);
    console.log(`   - Tiendas con tiempos reales: ${realCount}`);
    console.log(`   - Tiendas con tiempos sintéticos: ${syntheticCount}`);
    console.log(`   - Total: ${realCount + syntheticCount}`);

    console.log('\n🎉 Proceso completado!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await connection.end();
  }
}

populateAllStoresTimes();