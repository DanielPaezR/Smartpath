import { createConnection } from '../config/database.js';
import { ResultSetHeader, RowDataPacket } from 'mysql2';

export interface TimeWindow {
  start: string;
  end: string;
  priority: number;
}

export interface StoreData {
  name: string;
  address: string;
  lat: number;
  lng: number;
  contact_name: string;
  contact_phone: string;
  contact_email?: string;
  optimal_visit_windows?: TimeWindow[];
  priority?: number;
  estimated_visit_time?: number;
}

// Interface para las filas de la tabla stores
interface StoreRow extends RowDataPacket {
  id: number;
  name: string;
  address: string;
  lat: number;
  lng: number;
  contact_name: string;
  contact_phone: string;
  contact_email: string | null;
  optimal_visit_windows: string;
  assigned_advisor_id: number | null;
  priority: number;
  estimated_visit_time: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export class Store {
  static async findAll(): Promise<StoreRow[]> {
    const connection = await createConnection();
    try {
      const [rows] = await connection.execute<StoreRow[]>(
        'SELECT * FROM stores WHERE is_active = TRUE ORDER BY name'
      );
      return rows;
    } finally {
      await connection.end();
    }
  }

  static async findById(id: number): Promise<StoreRow | null> {
    const connection = await createConnection();
    try {
      const [rows] = await connection.execute<StoreRow[]>(
        'SELECT * FROM stores WHERE id = ? AND is_active = TRUE',
        [id]
      );
      return rows[0] || null;
    } finally {
      await connection.end();
    }
  }

  static async create(storeData: StoreData): Promise<number> {
    const connection = await createConnection();
    try {
      const [result] = await connection.execute<ResultSetHeader>(
        `INSERT INTO stores 
         (name, address, lat, lng, contact_name, contact_phone, contact_email, 
          optimal_visit_windows, priority, estimated_visit_time, is_active) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)`,
        [
          storeData.name,
          storeData.address,
          storeData.lat,
          storeData.lng,
          storeData.contact_name,
          storeData.contact_phone,
          storeData.contact_email || null,
          JSON.stringify(storeData.optimal_visit_windows || []),
          storeData.priority || 3,
          storeData.estimated_visit_time || 40
        ]
      );
      return result.insertId;
    } finally {
      await connection.end();
    }
  }

  static async assignToAdvisor(storeId: number, advisorId: number): Promise<boolean> {
    const connection = await createConnection();
    try {
      const [result] = await connection.execute<ResultSetHeader>(
        'UPDATE stores SET assigned_advisor_id = ? WHERE id = ?',
        [advisorId, storeId]
      );
      return result.affectedRows > 0;
    } finally {
      await connection.end();
    }
  }

  static async findByAdvisor(advisorId: number): Promise<StoreRow[]> {
    const connection = await createConnection();
    try {
      const [rows] = await connection.execute<StoreRow[]>(
        'SELECT * FROM stores WHERE assigned_advisor_id = ? AND is_active = TRUE ORDER BY priority DESC, name',
        [advisorId]
      );
      return rows;
    } finally {
      await connection.end();
    }
  }

  static async update(id: number, storeData: Partial<StoreData>): Promise<boolean> {
    const connection = await createConnection();
    try {
      let query = 'UPDATE stores SET ';
      const values: any[] = [];
      const updates: string[] = [];
      
      if (storeData.name) {
        updates.push('name = ?');
        values.push(storeData.name);
      }
      if (storeData.address) {
        updates.push('address = ?');
        values.push(storeData.address);
      }
      if (storeData.lat !== undefined) {
        updates.push('lat = ?');
        values.push(storeData.lat);
      }
      if (storeData.lng !== undefined) {
        updates.push('lng = ?');
        values.push(storeData.lng);
      }
      if (storeData.contact_name) {
        updates.push('contact_name = ?');
        values.push(storeData.contact_name);
      }
      if (storeData.contact_phone) {
        updates.push('contact_phone = ?');
        values.push(storeData.contact_phone);
      }
      if (storeData.contact_email !== undefined) {
        updates.push('contact_email = ?');
        values.push(storeData.contact_email);
      }
      if (storeData.priority) {
        updates.push('priority = ?');
        values.push(storeData.priority);
      }
      if (storeData.estimated_visit_time) {
        updates.push('estimated_visit_time = ?');
        values.push(storeData.estimated_visit_time);
      }
      if (storeData.optimal_visit_windows) {
        updates.push('optimal_visit_windows = ?');
        values.push(JSON.stringify(storeData.optimal_visit_windows));
      }
      
      if (updates.length === 0) {
        throw new Error('No fields to update');
      }
      
      query += updates.join(', ') + ' WHERE id = ?';
      values.push(id);
      
      const [result] = await connection.execute<ResultSetHeader>(query, values);
      return result.affectedRows > 0;
    } finally {
      await connection.end();
    }
  }

  static async deactivate(id: number): Promise<boolean> {
    const connection = await createConnection();
    try {
      const [result] = await connection.execute<ResultSetHeader>(
        'UPDATE stores SET is_active = FALSE WHERE id = ?',
        [id]
      );
      return result.affectedRows > 0;
    } finally {
      await connection.end();
    }
  }
}