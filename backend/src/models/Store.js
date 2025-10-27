// src/models/Store.js
import { createConnection } from '../config/database.js';
import mysql from 'mysql2';

export class Store {
  static async findAll() {
    const connection = await createConnection();
    try {
      // ✅ CORREGIDO - Sin WHERE is_active
      const [rows] = await connection.execute(
        'SELECT * FROM stores ORDER BY name'
      );
      return rows;
    } finally {
      await connection.end();
    }
  }

  static async findById(id) {
    const connection = await createConnection();
    try {
      // ✅ CORREGIDO - Sin WHERE is_active
      const [rows] = await connection.execute(
        'SELECT * FROM stores WHERE id = ?',
        [id]
      );
      return rows[0] || null;
    } finally {
      await connection.end();
    }
  }

  static async create(storeData) {
    const connection = await createConnection();
    try {
      const [result] = await connection.execute(
        `INSERT INTO stores 
         (name, address, latitude, longitude, contact_name, contact_phone, contact_email, 
          priority, category, estimated_visit_duration, zone) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          storeData.name,
          storeData.address,
          storeData.lat,  // Se mapea a latitude
          storeData.lng,  // Se mapea a longitude
          storeData.contact_name,
          storeData.contact_phone,
          storeData.contact_email || null,
          storeData.priority || 'medium',
          storeData.category || 'supermarket',
          storeData.estimated_visit_time || 40,
          storeData.zone || 'Centro'
        ]
      );
      return result.insertId;
    } finally {
      await connection.end();
    }
  }

  static async assignToAdvisor(storeId, advisorId) {
    const connection = await createConnection();
    try {
      const [result] = await connection.execute(
        'UPDATE stores SET assigned_advisor_id = ? WHERE id = ?',
        [advisorId, storeId]
      );
      return result.affectedRows > 0;
    } finally {
      await connection.end();
    }
  }

  static async findByAdvisor(advisorId) {
    const connection = await createConnection();
    try {
      const [rows] = await connection.execute(
        'SELECT * FROM stores WHERE assigned_advisor_id = ? ORDER BY priority DESC, name',
        [advisorId]
      );
      return rows;
    } finally {
      await connection.end();
    }
  }

  static async update(id, storeData) {
    const connection = await createConnection();
    try {
      let query = 'UPDATE stores SET ';
      const values = [];
      const updates = [];
      
      // ✅ CORREGIDO - Usando los nombres de columna correctos
      if (storeData.name) updates.push('name = ?'), values.push(storeData.name);
      if (storeData.address) updates.push('address = ?'), values.push(storeData.address);
      if (storeData.lat !== undefined) updates.push('latitude = ?'), values.push(storeData.lat);
      if (storeData.lng !== undefined) updates.push('longitude = ?'), values.push(storeData.lng);
      if (storeData.contact_name) updates.push('contact_name = ?'), values.push(storeData.contact_name);
      if (storeData.contact_phone) updates.push('contact_phone = ?'), values.push(storeData.contact_phone);
      if (storeData.contact_email !== undefined) updates.push('contact_email = ?'), values.push(storeData.contact_email);
      if (storeData.priority) updates.push('priority = ?'), values.push(storeData.priority);
      if (storeData.category) updates.push('category = ?'), values.push(storeData.category);
      if (storeData.estimated_visit_time) updates.push('estimated_visit_duration = ?'), values.push(storeData.estimated_visit_time);
      if (storeData.zone) updates.push('zone = ?'), values.push(storeData.zone);
      
      if (updates.length === 0) throw new Error('No fields to update');
      
      query += updates.join(', ') + ' WHERE id = ?';
      values.push(id);
      
      const [result] = await connection.execute(query, values);
      return result.affectedRows > 0;
    } finally {
      await connection.end();
    }
  }

  static async deactivate(id) {
    const connection = await createConnection();
    try {
      // ❌ NO IMPLEMENTADO - no hay columna is_active
      return false;
    } finally {
      await connection.end();
    }
  }
}