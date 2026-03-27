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

  static async completeVisit(routeId, storeVisitId, visitData) {
    let connection;
    try {
      connection = await createConnection();
      
      const { duration, notes, damageReports, signature } = visitData;
      
      // Actualizar la visita en route_stores
      await connection.execute(
        `UPDATE route_stores 
         SET status = 'completed', 
             end_time = NOW(),
             actual_duration = ?,
             notes = ?,
             signature_url = ?
         WHERE id = ? AND route_id = ?`,
        [duration, notes, signature, storeVisitId, routeId]
      );
      
      // Incrementar completed_stores en la ruta
      await connection.execute(
        `UPDATE routes 
         SET completed_stores = completed_stores + 1,
             status = CASE 
               WHEN completed_stores + 1 >= total_stores THEN 'completed'
               ELSE 'in_progress'
             END
         WHERE id = ?`,
        [routeId]
      );
      
      // Guardar reportes de daño si existen
      if (damageReports && damageReports.length > 0) {
        for (const report of damageReports) {
          await connection.execute(
            `INSERT INTO damage_reports 
             (barcode, product_name, product_brand, product_category, damage_type, 
              description, severity, store_id, reported_by, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
            [
              report.barcode,
              report.product.name,
              report.product.brand,
              report.product.category,
              report.damageType,
              report.description,
              report.severity,
              report.storeId,
              report.reportedBy
            ]
          );
        }
      }
      
      return true;
    } finally {
      if (connection) await connection.end();
    }
  }

  static async skipStoreVisit(routeId, storeVisitId, skipReason) {
    let connection;
    try {
      connection = await createConnection();
      await connection.execute(
        `UPDATE route_stores 
         SET status = 'skipped', 
             skip_reason = ?,
             end_time = NOW()
         WHERE id = ? AND route_id = ?`,
        [skipReason, storeVisitId, routeId]
      );
      return true;
    } finally {
      if (connection) await connection.end();
    }
  }
}