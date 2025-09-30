// backend/src/config/database.js
import mysql from 'mysql2/promise';

export const createConnection = async () => {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '12345Paez',
      database: process.env.DB_NAME || 'smartpath',
      charset: 'utf8mb4',
      timezone: 'local'
    });
    
    console.log('✅ Conectado a MySQL');
    return connection;
  } catch (error) {
    console.error('❌ Error conectando a MySQL:', error);
    throw error;
  }
};