import { Request, Response } from 'express';
import { Store } from '../models/Store';

export const storeController = {
  // Obtener todas las tiendas
  async getStores(req: Request, res: Response) {
    try {
      const stores = await Store.find({ isActive: true })
        .populate('assignedAdvisor', 'name email');
      res.json(stores);
    } catch (error) {
      res.status(500).json({ message: 'Error al obtener tiendas', error });
    }
  },

  // Crear nueva tienda
  async createStore(req: Request, res: Response) {
    try {
      const storeData = req.body;
      const newStore = new Store(storeData);
      await newStore.save();
      
      const populatedStore = await Store.findById(newStore._id)
        .populate('assignedAdvisor', 'name email');
      
      res.status(201).json(populatedStore);
    } catch (error) {
      res.status(500).json({ message: 'Error al crear tienda', error });
    }
  },

  // Asignar tienda a asesor
  async assignStore(req: Request, res: Response) {
    try {
      const { storeId } = req.params;
      const { advisorId } = req.body;

      const store = await Store.findByIdAndUpdate(
        storeId,
        { assignedAdvisor: advisorId },
        { new: true }
      ).populate('assignedAdvisor', 'name email');

      if (!store) {
        return res.status(404).json({ message: 'Tienda no encontrada' });
      }

      res.json(store);
    } catch (error) {
      res.status(500).json({ message: 'Error al asignar tienda', error });
    }
  }
};