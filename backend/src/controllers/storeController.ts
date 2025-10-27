// backend/src/controllers/storeController.ts
import { Request, Response } from 'express';
import { Store } from '../models/Store';

export const storeController = {
  // ✅ YA EXISTE - Listar todas las tiendas
  async getStores(req: Request, res: Response): Promise<void> {
    try {
      const stores = await Store.findAll();
      res.json(stores);
    } catch (error) {
      console.error('Error obteniendo tiendas:', error);
      res.status(500).json({ message: 'Error interno del servidor' });
    }
  },

  // ✅ YA EXISTE - Crear tienda
  async createStore(req: Request, res: Response): Promise<void> {
    // ... código existente
  },

  // ✅ YA EXISTE - Asignar tienda a asesor
  async assignStore(req: Request, res: Response): Promise<void> {
    // ... código existente
  },

  // 🆕 NUEVO - Obtener tienda por ID
  async getStoreById(req: Request, res: Response): Promise<void> {
    try {
      const { storeId } = req.params;
      const store = await Store.findById(parseInt(storeId));
      
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

  // 🆕 NUEVO - Actualizar tienda
  async updateStore(req: Request, res: Response): Promise<void> {
    try {
      const { storeId } = req.params;
      const storeData = req.body;
      
      const success = await Store.update(parseInt(storeId), storeData);
      
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

  // 🆕 NUEVO - Desactivar tienda (soft delete)
  async deactivateStore(req: Request, res: Response): Promise<void> {
    try {
      const { storeId } = req.params;
      
      const success = await Store.deactivate(parseInt(storeId));
      
      if (!success) {
        res.status(404).json({ message: 'Tienda no encontrada' });
        return;
      }
      
      res.json({ message: 'Tienda desactivada exitosamente' });
    } catch (error) {
      console.error('Error desactivando tienda:', error);
      res.status(500).json({ message: 'Error interno del servidor' });
    }
  },

  // 🆕 NUEVO - Obtener tiendas por asesor
  async getStoresByAdvisor(req: Request, res: Response): Promise<void> {
    try {
      const { advisorId } = req.params;
      const stores = await Store.findByAdvisor(parseInt(advisorId));
      res.json(stores);
    } catch (error) {
      console.error('Error obteniendo tiendas por asesor:', error);
      res.status(500).json({ message: 'Error interno del servidor' });
    }
  }
};