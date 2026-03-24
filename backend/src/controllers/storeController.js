// backend/src/controllers/storeController.js
import { Store } from '../models/Store.js';
import { createConnection } from '../config/database.js';

export const storeController = {
  // Listar todas las tiendas
  async getStores(req, res) {
    try {
      const stores = await Store.findAll();
      res.json(stores);
    } catch (error) {
      console.error('Error obteniendo tiendas:', error);
      res.status(500).json({ message: 'Error interno del servidor' });
    }
  },

  // Crear tienda
  async createStore(req, res) {
    try {
      const storeData = req.body;
      const storeId = await Store.create(storeData);
      res.status(201).json({ 
        message: 'Tienda creada exitosamente', 
        storeId 
      });
    } catch (error) {
      console.error('Error creando tienda:', error);
      res.status(500).json({ message: 'Error interno del servidor' });
    }
  },

  // Asignar tienda a asesor 
  async assignStore(req, res) {
    try {
      const { id } = req.params;
      const { advisorId } = req.body;
      
      console.log(`📋 Asignando tienda ${id} al asesor ${advisorId}`);
      
      const success = await Store.assignToAdvisor(parseInt(id), parseInt(advisorId));
      
      if (!success) {
        return res.status(404).json({ message: 'Tienda no encontrada' });
      }
      
      res.json({ 
        message: 'Tienda asignada exitosamente al asesor',
        storeId: parseInt(id),
        advisorId: parseInt(advisorId)
      });
    } catch (error) {
      console.error('Error asignando tienda:', error);
      res.status(500).json({ 
        message: 'Error interno del servidor',
        error: error.message 
      });
    }
  },

  // Obtener tienda por ID
  async getStoreById(req, res) {
    try {
      const { id } = req.params;
      const store = await Store.findById(parseInt(id));
      
      if (!store) {
        return res.status(404).json({ message: 'Tienda no encontrada' });
      }
      
      res.json(store);
    } catch (error) {
      console.error('Error obteniendo tienda:', error);
      res.status(500).json({ message: 'Error interno del servidor' });
    }
  },

  // Actualizar tienda
  async updateStore(req, res) {
    try {
      const { id } = req.params;
      const storeData = req.body;
      
      const success = await Store.update(parseInt(id), storeData);
      
      if (!success) {
        return res.status(404).json({ message: 'Tienda no encontrada' });
      }
      
      res.json({ message: 'Tienda actualizada exitosamente' });
    } catch (error) {
      console.error('Error actualizando tienda:', error);
      res.status(500).json({ message: 'Error interno del servidor' });
    }
  },

  // Desactivar tienda
  async deactivateStore(req, res) {
    try {
      const { id } = req.params;
      
      const connection = await createConnection();
      try {
        const [result] = await connection.execute(
          'UPDATE stores SET is_active = 0 WHERE id = ?',
          [id]
        );
        
        if (result.affectedRows === 0) {
          return res.status(404).json({ message: 'Tienda no encontrada' });
        }
        
        res.json({ message: 'Tienda desactivada exitosamente' });
      } finally {
        await connection.end();
      }
    } catch (error) {
      console.error('Error desactivando tienda:', error);
      res.status(500).json({ message: 'Error interno del servidor' });
    }
  },

  // Obtener tiendas por asesor
  async getStoresByAdvisor(req, res) {
    try {
      const { advisorId } = req.params;
      const stores = await Store.findByAdvisor(parseInt(advisorId));
      res.json(stores);
    } catch (error) {
      console.error('Error obteniendo tiendas por asesor:', error);
      res.status(500).json({ message: 'Error interno del servidor' });
    }
  },

  // Búsqueda de tiendas
  async searchStores(req, res) {
    try {
      const stores = await Store.findAll();
      res.json(stores);
    } catch (error) {
      console.error('Error buscando tiendas:', error);
      res.status(500).json({ message: 'Error interno del servidor' });
    }
  },

  // ✅ ELIMINAR TIENDA - CORREGIDO
  async deleteStore(req, res) {
    const connection = await createConnection();
    try {
      const { id } = req.params;
      
      const [result] = await connection.execute(
        'DELETE FROM stores WHERE id = ?',
        [id]
      );
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Tienda no encontrada' });
      }
      
      res.json({ message: 'Tienda eliminada exitosamente' });
    } catch (error) {
      console.error('Error eliminando tienda:', error);
      res.status(500).json({ message: 'Error interno del servidor' });
    } finally {
      await connection.end();
    }
  }
};