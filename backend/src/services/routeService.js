// backend/src/services/routeService.js
import { createConnection } from '../config/database.js';

export class RouteService {
  static async getCurrentRoute(advisorId) {
    let connection;
    try {
      connection = await createConnection();
      const [rows] = await connection.execute(
        `SELECT r.*, u.name as advisor_name 
         FROM routes r 
         JOIN users u ON r.advisor_id = u.id 
         WHERE r.advisor_id = ? AND r.date = CURDATE()`,
        [advisorId]
      );
      return rows[0] || null;
    } finally {
      if (connection) await connection.end();
    }
  }

  static async getRouteStores(routeId) {
    let connection;
    try {
      connection = await createConnection();
      const [rows] = await connection.execute(
        `SELECT rs.*, s.name, s.address, s.latitude, s.longitude, s.zone
         FROM route_stores rs
         JOIN stores s ON rs.store_id = s.id
         WHERE rs.route_id = ?
         ORDER BY rs.visit_order`,
        [routeId]
      );
      return rows;
    } finally {
      if (connection) await connection.end();
    }
  }

  static async startVisit(routeStoreId) {
    let connection;
    try {
      connection = await createConnection();
      await connection.execute(
        'UPDATE route_stores SET status = "in_progress", start_time = NOW() WHERE id = ?',
        [routeStoreId]
      );
      return true;
    } finally {
      if (connection) await connection.end();
    }
  }
}