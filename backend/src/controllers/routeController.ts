import { Request, Response } from 'express';
import { Route } from '../models/Route';
import { Store } from '../models/Store';
import mongoose from 'mongoose';

export const routeController = {
  // Obtener ruta actual del asesor - ✅ CORREGIDO
  async getCurrentRoute(req: Request, res: Response) {
    try {
      const { advisorId } = req.params;
      
      // ✅ VALIDAR que advisorId sea un ObjectId válido
      if (!advisorId || advisorId === 'undefined' || !mongoose.Types.ObjectId.isValid(advisorId)) {
        return res.status(400).json({ 
          message: 'ID de asesor inválido o no proporcionado' 
        });
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const route = await Route.findOne({
        advisorId: new mongoose.Types.ObjectId(advisorId),
        date: {
          $gte: today,
          $lt: tomorrow
        }
      })
      .populate('advisorId', 'name email vehicleType')
      .populate('stores.storeId');

      if (!route) {
        return res.status(404).json({ message: 'No se encontró ruta para hoy' });
      }

      res.json(route);
    } catch (error) {
      console.error('Error obteniendo ruta:', error);
      res.status(500).json({ message: 'Error obteniendo ruta', error });
    }
  },

  // Generar ruta diaria para un asesor - ✅ CORREGIDO
  async generateDailyRoute(req: Request, res: Response) {
    try {
      const { advisorId, date } = req.body;
      
      // ✅ VALIDAR datos requeridos
      if (!advisorId || !date) {
        return res.status(400).json({ 
          message: 'advisorId y date son requeridos' 
        });
      }

      // ✅ VALIDAR que advisorId sea un ObjectId válido
      if (!mongoose.Types.ObjectId.isValid(advisorId)) {
        return res.status(400).json({ 
          message: 'ID de asesor inválido' 
        });
      }

      const objectIdAdvisor = new mongoose.Types.ObjectId(advisorId);
      
      const stores = await Store.find({ 
        assignedAdvisor: objectIdAdvisor,
        isActive: true 
      });

      if (stores.length === 0) {
        return res.status(400).json({ message: 'No hay tiendas asignadas' });
      }

      const storeVisits = stores.map((store, index) => ({
        storeId: store._id,
        plannedArrival: new Date(new Date(date).setHours(8 + index * 2, 0, 0, 0)),
        status: 'pending' as const,
        tasks: [
          { key: 'evidenceBefore', label: 'Evidencia fotográfica del como se encontró el lugar', completed: false },
          { key: 'identifySold', label: 'Identificar productos vendidos para reponer', completed: false },
          { key: 'picking', label: 'Ir a bodega y hacer picking de productos', completed: false },
          { key: 'restocking', label: 'Realizar bajada de productos y limpieza', completed: false },
          { key: 'organization', label: 'Volver productos a su sitio dejando los que ya estaban al frente', completed: false },
          { key: 'pricing', label: 'Realizar segmentación de precios', completed: false },
          { key: 'evidenceAfter', label: 'Tomar fotografía del después', completed: false },
          { key: 'damageCheck', label: 'Revisar en bodega las averías (evidencia fotográfica y escaneo)', completed: false },
          { key: 'signature', label: 'Recoger firma y sello de seguridad del almacén', completed: false }
        ],
        visitDuration: 0,
        notes: ''
      }));

      const newRoute = new Route({
        advisorId: objectIdAdvisor,
        date: new Date(date),
        stores: storeVisits,
        status: 'pending',
        totalDistance: stores.length * 5,
        totalEstimatedTime: stores.length * 45
      });

      await newRoute.save();
      
      const populatedRoute = await Route.findById(newRoute._id)
        .populate('advisorId', 'name email vehicleType')
        .populate('stores.storeId');

      res.status(201).json(populatedRoute);
    } catch (error) {
      console.error('Error generando ruta:', error);
      res.status(500).json({ message: 'Error generando ruta', error });
    }
  },

  // Iniciar visita a tienda - ✅ CORREGIDO
  async startStoreVisit(req: Request, res: Response) {
    try {
      const { routeId, storeVisitId } = req.body;

      // ✅ VALIDAR datos requeridos
      if (!routeId || !storeVisitId) {
        return res.status(400).json({ 
          message: 'routeId y storeVisitId son requeridos' 
        });
      }

      const route = await Route.findById(routeId);
      if (!route) {
        return res.status(404).json({ message: 'Ruta no encontrada' });
      }

      // ✅ CORRECCIÓN: Usar find() en lugar de id()
      const storeVisit = route.stores.find(
        (visit: any) => visit._id.toString() === storeVisitId
      );

      if (!storeVisit) {
        return res.status(404).json({ message: 'Visita no encontrada' });
      }

      // ✅ MANUAL: Inicializar tareas si no existen
      if (!storeVisit.tasks || storeVisit.tasks.length === 0) {
        storeVisit.tasks = [
          { key: 'evidenceBefore', label: 'Evidencia fotográfica del como se encontró el lugar', completed: false },
          { key: 'identifySold', label: 'Identificar productos vendidos para reponer', completed: false },
          { key: 'picking', label: 'Ir a bodega y hacer picking de productos', completed: false },
          { key: 'restocking', label: 'Realizar bajada de productos y limpieza', completed: false },
          { key: 'organization', label: 'Volver productos a su sitio dejando los que ya estaban al frente', completed: false },
          { key: 'pricing', label: 'Realizar segmentación de precios', completed: false },
          { key: 'evidenceAfter', label: 'Tomar fotografía del después', completed: false },
          { key: 'damageCheck', label: 'Revisar en bodega las averías (evidencia fotográfica y escaneo)', completed: false },
          { key: 'signature', label: 'Recoger firma y sello de seguridad del almacén', completed: false }
        ];
      }

      // ✅ MANUAL: Actualizar estado y tiempos
      storeVisit.status = 'in-progress';
      storeVisit.startedAt = new Date();
      storeVisit.actualArrival = new Date();

      if (route.status === 'pending') {
        route.status = 'in-progress';
        route.startedAt = new Date();
      }

      await route.save();
      
      const populatedRoute = await Route.findById(routeId)
        .populate('advisorId', 'name email vehicleType')
        .populate('stores.storeId');

      res.json(populatedRoute);
    } catch (error) {
      console.error('Error iniciando visita:', error);
      res.status(500).json({ message: 'Error iniciando visita', error });
    }
  },

  // ✅ CORREGIDO: Método para completar visita
  async completeStoreVisit(req: Request, res: Response) {
    try {
      const { routeId, storeVisitId, visitData } = req.body;

      if (!routeId || !storeVisitId || !visitData) {
        return res.status(400).json({ 
          message: 'routeId, storeVisitId y visitData son requeridos' 
        });
      }

      const route = await Route.findById(routeId);
      if (!route) {
        return res.status(404).json({ message: 'Ruta no encontrada' });
      }

      // ✅ CORRECCIÓN: Usar find() en lugar de id()
      const storeVisit = route.stores.find(
        (visit: any) => visit._id.toString() === storeVisitId
      );

      if (!storeVisit) {
        return res.status(404).json({ message: 'Visita no encontrada' });
      }

      if (storeVisit.status !== 'in-progress') {
        return res.status(400).json({ 
          message: 'Solo se pueden completar visitas en progreso' 
        });
      }

      // ✅ MANUAL: Actualizar datos de la visita
      storeVisit.status = 'completed';
      storeVisit.tasks = visitData.tasks || storeVisit.tasks;
      storeVisit.visitDuration = visitData.duration || storeVisit.visitDuration;
      storeVisit.notes = visitData.notes || storeVisit.notes;
      storeVisit.completedAt = new Date();
      storeVisit.actualDeparture = new Date();

      // Calcular duración si no se proporciona
      if (!visitData.duration && storeVisit.actualArrival) {
        const arrival = new Date(storeVisit.actualArrival);
        const departure = new Date(storeVisit.actualDeparture);
        storeVisit.visitDuration = Math.round((departure.getTime() - arrival.getTime()) / 60000);
      }

      // Verificar si todas las visitas están completadas
      const allCompleted = route.stores.every((visit: any) => 
        visit.status === 'completed' || visit.status === 'skipped'
      );
      
      if (allCompleted) {
        route.status = 'completed';
        route.completedAt = new Date();
      }

      await route.save();
      
      const populatedRoute = await Route.findById(routeId)
        .populate('advisorId', 'name email vehicleType')
        .populate('stores.storeId');

      res.json(populatedRoute);
    } catch (error) {
      console.error('Error completando visita:', error);
      res.status(500).json({ message: 'Error completando visita', error });
    }
  },

  // ✅ CORREGIDO: Método para saltar visita
  async skipStoreVisit(req: Request, res: Response) {
    try {
      const { routeId, storeVisitId, reason } = req.body;

      // ✅ VALIDAR datos requeridos
      if (!routeId || !storeVisitId) {
        return res.status(400).json({ 
          message: 'routeId y storeVisitId son requeridos' 
        });
      }

      const route = await Route.findById(routeId);
      if (!route) {
        return res.status(404).json({ message: 'Ruta no encontrada' });
      }

      // ✅ CORRECCIÓN: Usar find() en lugar de id()
      const storeVisit = route.stores.find(
        (visit: any) => visit._id.toString() === storeVisitId
      );

      if (!storeVisit) {
        return res.status(404).json({ message: 'Visita no encontrada' });
      }

      // ✅ MANUAL: Actualizar datos de la visita
      storeVisit.status = 'skipped';
      storeVisit.skipReason = reason || 'Sin razón especificada';
      storeVisit.completedAt = new Date();

      await route.save();
      
      const populatedRoute = await Route.findById(routeId)
        .populate('advisorId', 'name email vehicleType')
        .populate('stores.storeId');

      res.json(populatedRoute);
    } catch (error) {
      console.error('Error saltando visita:', error);
      res.status(500).json({ message: 'Error saltando visita', error });
    }
  },

  // ✅ CORREGIDO: Método para actualizar tareas en tiempo real
  async updateStoreTasks(req: Request, res: Response) {
    try {
      const { routeId, storeVisitId, tasks } = req.body;

      if (!routeId || !storeVisitId || !tasks) {
        return res.status(400).json({ 
          message: 'routeId, storeVisitId y tasks son requeridos' 
        });
      }

      const route = await Route.findById(routeId);
      if (!route) {
        return res.status(404).json({ message: 'Ruta no encontrada' });
      }

      // ✅ CORRECCIÓN: Usar find() en lugar de id()
      const storeVisit = route.stores.find(
        (visit: any) => visit._id.toString() === storeVisitId
      );

      if (!storeVisit) {
        return res.status(404).json({ message: 'Visita no encontrada' });
      }

      if (storeVisit.status !== 'in-progress') {
        return res.status(400).json({ 
          message: 'Solo se pueden actualizar tareas en visitas en progreso' 
        });
      }

      storeVisit.tasks = tasks;

      await route.save();
      
      const populatedRoute = await Route.findById(routeId)
        .populate('advisorId', 'name email vehicleType')
        .populate('stores.storeId');

      res.json(populatedRoute);
    } catch (error) {
      console.error('Error actualizando tareas:', error);
      res.status(500).json({ message: 'Error actualizando tareas', error });
    }
  },

  // ✅ Método para obtener métricas de rutas
  async getRouteMetrics(req: Request, res: Response) {
    try {
      const { startDate, endDate, advisorId } = req.query;

      const filter: any = {};
      if (startDate && endDate) {
        filter.date = {
          $gte: new Date(startDate as string),
          $lte: new Date(endDate as string)
        };
      }
      if (advisorId) {
        // ✅ VALIDAR advisorId si se proporciona
        if (advisorId !== 'all' && !mongoose.Types.ObjectId.isValid(advisorId as string)) {
          return res.status(400).json({ message: 'ID de asesor inválido' });
        }
        if (advisorId !== 'all') {
          filter.advisorId = new mongoose.Types.ObjectId(advisorId as string);
        }
      }

      const routes = await Route.find(filter)
        .populate('advisorId', 'name email')
        .populate('stores.storeId', 'name address');

      const metrics = {
        totalRoutes: routes.length,
        totalStores: routes.reduce((sum, route) => sum + route.stores.length, 0),
        completedStores: routes.reduce((sum, route) => 
          sum + route.stores.filter((store: any) => store.status === 'completed').length, 0
        ),
        skippedStores: routes.reduce((sum, route) => 
          sum + route.stores.filter((store: any) => store.status === 'skipped').length, 0
        ),
        averageVisitDuration: routes.reduce((sum, route) => {
          const completedStores = route.stores.filter((store: any) => store.status === 'completed');
          const totalDuration = completedStores.reduce((durSum: number, store: any) => 
            durSum + (store.visitDuration || 0), 0
          );
          return sum + (completedStores.length > 0 ? totalDuration / completedStores.length : 0);
        }, 0) / (routes.length || 1), // ✅ Evitar división por cero
        completionRate: 0
      };

      metrics.completionRate = metrics.totalStores > 0 
        ? (metrics.completedStores / metrics.totalStores) * 100 
        : 0;

      res.json(metrics);
    } catch (error) {
      console.error('Error obteniendo métricas:', error);
      res.status(500).json({ message: 'Error obteniendo métricas', error });
    }
  },

  // ✅ MÉTODO EXTRA: Debug para verificar IDs
  async debugRoute(req: Request, res: Response) {
    try {
      const { advisorId } = req.params;
      
      res.json({
        receivedAdvisorId: advisorId,
        type: typeof advisorId,
        isValid: mongoose.Types.ObjectId.isValid(advisorId),
        convertedId: mongoose.Types.ObjectId.isValid(advisorId) 
          ? new mongoose.Types.ObjectId(advisorId) 
          : 'INVÁLIDO'
      });
    } catch (error) {
      res.status(500).json({ error: 'Error en debug' });
    }
  }
};