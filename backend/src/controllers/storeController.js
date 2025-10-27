// backend/src/controllers/storeController.js
import { Store } from '../models/Store.js';

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
      const { id } = req.params; // ID de la tienda
      const { advisorId } = req.body; // ID del asesor
      
      console.log(`📋 Asignando tienda ${id} al asesor ${advisorId}`);
      
      // Lógica para asignar la tienda
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
      const { id } = req.params; // Cambiado de storeId a id
      const store = await Store.findById(parseInt(id));
      
      if (!store) {
        res.status(404).json({ message: 'Tienda no encontrada' });
        return;
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
      const { id } = req.params; // Cambiado de storeId a id
      const storeData = req.body;
      
      const success = await Store.update(parseInt(id), storeData);
      
      if (!success) {
        res.status(404).json({ message: 'Tienda no encontrada' });
        return;
      }
      
      res.json({ message: 'Tienda actualizada exitosamente' });
    } catch (error) {
      console.error('Error actualizando tienda:', error);
      res.status(500).json({ message: 'Error interno del servidor' });
    }
  },

  // Desactivar tienda - COMENTADO porque no hay columna is_active
  async deactivateStore(req, res) {
    try {
      res.status(501).json({ 
        message: 'Funcionalidad no implementada. La tabla no tiene columna para desactivar tiendas.' 
      });
    } catch (error) {
      console.error('Error en desactivación:', error);
      res.status(500).json({ message: 'Error interno del servidor' });
    }
  },

  // Obtener tiendas por asesor - COMENTADO porque no hay columna
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

  // Búsqueda de tiendas (para la ruta /search)
  async searchStores(req, res) {
    try {
      // Implementación básica de búsqueda - por ahora devuelve todas
      const stores = await Store.findAll();
      res.json(stores);
    } catch (error) {
      console.error('Error buscando tiendas:', error);
      res.status(500).json({ message: 'Error interno del servidor' });
    }
  },

  // Eliminar tienda - COMENTADO porque no hay soft delete
  async deleteStore(req, res) {
    try {
      const { id } = req.params;
      
      
      const connection = await createConnection();
      try {
        const [result] = await connection.execute(
          'DELETE FROM stores WHERE id = ?',
          [id]
        );
        
        if (result.affectedRows === 0) {
          return res.status(404).json({ message: 'Tienda no encontrada' });
        }
        
        res.json({ message: 'Tienda eliminada exitosamente' });
      } finally {
        await connection.end();
      }
    } catch (error) {
      console.error('Error eliminando tienda:', error);
      res.status(500).json({ message: 'Error interno del servidor' });
    }
  }
};