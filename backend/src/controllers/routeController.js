// backend/src/controllers/routeController.js
import { createConnection } from '../config/database.js';

console.log('🔄 routeController.js CARGADO - VERSIÓN ACTUALIZADA CON storeId');

export const routeController = {
  async getCurrentRoute(req, res) {
    console.log('🎯 getCurrentRoute EJECUTADO - VERSIÓN NUEVA');
    const connection = await createConnection();
    try {
      const { advisorId } = req.params;
      
      if (!advisorId) {
        return res.status(400).json({ message: 'ID de asesor requerido' });
      }

      const today = new Date().toISOString().split('T')[0];

      console.log('🔍 Buscando ruta para asesor:', advisorId, 'fecha:', today);

      // Buscar ruta de hoy
      const [routeRows] = await connection.execute(
        `SELECT dr.*, u.name as advisor_name, u.email as advisor_email, u.vehicle_type
         FROM daily_routes dr
         JOIN users u ON dr.user_id = u.id
         WHERE dr.user_id = ? AND DATE(dr.route_date) = ?`,
        [advisorId, today]
      );

      console.log('📦 Rutas encontradas:', routeRows.length);

      if (routeRows.length === 0) {
        return res.status(404).json({ message: 'No se encontró ruta para hoy' });
      }

      const route = routeRows[0];
      console.log('✅ Ruta encontrada ID:', route.id);

      // Obtener tiendas de la ruta - ✅ INCLUIR TODAS LAS COLUMNAS NECESARIAS
      const [storeRows] = await connection.execute(
        `SELECT rs.*, s.name as store_name, s.address as store_address, 
                s.latitude, s.longitude, s.priority, s.category, s.zone,
                s.contact_name, s.contact_phone, s.contact_email
         FROM route_stores rs
         JOIN stores s ON rs.store_id = s.id
         WHERE rs.route_id = ?
         ORDER BY rs.visit_order`,
        [route.id]
      );

      console.log('🏪 Tiendas en ruta:', storeRows.length);

      // ✅ ESTRUCTURA CORRECTA PARA EL FRONTEND
      const formattedRoute = {
        id: route.id.toString(),
        advisor_id: route.user_id.toString(),
        date: route.route_date,
        status: route.status,
        total_stores: route.total_stores,
        completed_stores: route.completed_stores,
        total_distance: route.total_distance?.toString() || '0',
        estimated_duration: route.estimated_duration?.toString() || '0',
        stores: storeRows.map(store => ({
          id: store.id.toString(), // ✅ ID de route_stores
          storeId: { // ✅ OBJETO storeId CON TODOS LOS DATOS
            id: store.store_id.toString(),
            name: store.store_name,
            address: store.store_address,
            coordinates: {
              lat: parseFloat(store.latitude) || 0,
              lng: parseFloat(store.longitude) || 0
            },
            priority: store.priority || 'medium',
            category: store.category,
            zone: store.zone,
            contact_name: store.contact_name,
            contact_phone: store.contact_phone,
            contact_email: store.contact_email
          },
          status: store.status,
          visit_order: store.visit_order,
          plannedArrival: store.planned_arrival,
          actualArrival: store.actual_arrival,
          actualDeparture: store.actual_departure,
          visitDuration: store.visit_duration
        }))
      };

      console.log('🚀 Enviando ruta formateada al frontend');
      res.json(formattedRoute);
    } catch (error) {
      console.error('❌ Error obteniendo ruta:', error);
      res.status(500).json({ message: 'Error obteniendo ruta' });
    } finally {
      await connection.end();
    }
  },

  async startStoreVisit(req, res) {
    const connection = await createConnection();
    try {
      const { routeId, storeVisitId } = req.body;

      if (!routeId || !storeVisitId) {
        return res.status(400).json({ message: 'routeId y storeVisitId requeridos' });
      }

      const [result] = await connection.execute(
        `UPDATE route_stores 
         SET status = 'in-progress', actual_arrival = NOW() 
         WHERE id = ? AND route_id = ?`,
        [storeVisitId, routeId]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Visita no encontrada' });
      }

      console.log('✅ Visita iniciada:', { routeId, storeVisitId });
      res.json({ message: 'Visita iniciada exitosamente' });
    } catch (error) {
      console.error('Error iniciando visita:', error);
      res.status(500).json({ message: 'Error iniciando visita' });
    } finally {
      await connection.end();
    }
  },

  async completeStoreVisit(req, res) {
    const connection = await createConnection();
    try {
      const { routeId, storeVisitId, visitData } = req.body;

      if (!routeId || !storeVisitId) {
        return res.status(400).json({ message: 'routeId y storeVisitId requeridos' });
      }

      const [result] = await connection.execute(
        `UPDATE route_stores 
         SET status = 'completed', actual_departure = NOW(),
             visit_duration = ?, notes = ?
         WHERE id = ? AND route_id = ?`,
        [visitData?.duration || 0, visitData?.notes || '', storeVisitId, routeId]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Visita no encontrada' });
      }

      // Actualizar contador en daily_routes
      await connection.execute(
        `UPDATE daily_routes 
         SET completed_stores = completed_stores + 1 
         WHERE id = ?`,
        [routeId]
      );

      console.log('✅ Visita completada:', { routeId, storeVisitId, visitData });
      res.json({ message: 'Visita completada exitosamente' });
    } catch (error) {
      console.error('Error completando visita:', error);
      res.status(500).json({ message: 'Error completando visita' });
    } finally {
      await connection.end();
    }
  }
};