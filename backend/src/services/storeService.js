// backend/src/services/storeService.js
import { createConnection } from '../config/database.js';

export class StoreService {
  static async getAllStores() {
    let connection;
    try {
      connection = await createConnection();
      const [rows] = await connection.execute(`
        SELECT * FROM stores 
        ORDER BY name
      `);
      return rows;
    } finally {
      if (connection) await connection.end();
    }
  }

  static async getStoresByZone(zone) {
    let connection;
    try {
      connection = await createConnection();
      const [rows] = await connection.execute(
        'SELECT * FROM stores WHERE zone = ? ORDER BY name',
        [zone]
      );
      return rows;
    } finally {
      if (connection) await connection.end();
    }
  }

  static async getStoreById(id) {
    let connection;
    try {
      connection = await createConnection();
      const [rows] = await connection.execute(
        'SELECT * FROM stores WHERE id = ?',
        [id]
      );
      return rows[0] || null;
    } finally {
      if (connection) await connection.end();
    }
  }
}