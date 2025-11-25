// backend/src/config/database.js - VERSIÓN DUAL (MySQL local / PostgreSQL producción)
import pkg from 'pg';

const { Pool } = pkg;

// Configuración para PostgreSQL (Render)
const postgresConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 5432,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

const pool = new Pool(postgresConfig);

// Función para obtener conexión (PostgreSQL)
export async function createConnection() {
  try {
    const client = await pool.connect();
    console.log('✅ Conectado a PostgreSQL en Render');
    return client;
  } catch (error) {
    console.error('❌ Error conectando a PostgreSQL:', error.message);
    throw error;
  }
}

// Función para ejecutar queries
export async function executeQuery(sql, params = []) {
  try {
    const client = await pool.connect();
    const result = await client.query(sql, params);
    client.release();
    return result;
  } catch (error) {
    console.error('❌ Error en query:', error.message);
    console.error('📋 Query:', sql);
    throw error;
  }
}

// Para compatibilidad con código existente
export async function execute(sql, params = []) {
  return executeQuery(sql, params);
}

export default pool;