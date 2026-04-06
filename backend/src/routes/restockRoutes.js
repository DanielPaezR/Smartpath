// backend/src/routes/restockRoutes.js
import express from 'express';
import { createConnection } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// ============================================
// ✅ VERSIÓN CORREGIDA - Agregar item de reposición
// ============================================
router.post('/add-item', async (req, res) => {
    const connection = await createConnection();
    try {
        let {
            route_store_id,
            store_id,
            product_barcode,
            product_name,
            product_brand,
            product_category,
            quantity,
            unit_price,
            reported_by,
            notes
        } = req.body;

        console.log('📦 Registrando reposición:', {
            route_store_id,
            store_id,
            product_name,
            quantity,
            user_id: req.user?.id
        });

        // 🆕 VALIDACIÓN 1: store_id es obligatorio
        if (!store_id) {
            return res.status(400).json({
                success: false,
                message: 'store_id es requerido'
            });
        }

        // 🆕 VALIDACIÓN 2: Si no viene route_store_id o es inválido, buscarlo automáticamente
        if (!route_store_id || route_store_id === 0 || route_store_id === 'undefined' || route_store_id === 'null') {
            console.log('🔍 route_store_id no válido, buscando automáticamente...');
            
            // Buscar la visita activa para esta tienda hoy
            const [activeVisit] = await connection.execute(`
                SELECT rs.id 
                FROM route_stores rs
                JOIN routes r ON rs.route_id = r.id
                WHERE r.advisor_id = ? 
                    AND r.date = CURDATE()
                    AND rs.store_id = ?
                    AND rs.status NOT IN ('completed', 'skipped')
                LIMIT 1
            `, [req.user.id, store_id]);
            
            if (activeVisit.length > 0) {
                route_store_id = activeVisit[0].id;
                console.log(`✅ route_store_id encontrado automáticamente: ${route_store_id}`);
            } else {
                // Buscar cualquier visita pendiente para esta tienda (días anteriores)
                const [pendingVisit] = await connection.execute(`
                    SELECT rs.id 
                    FROM route_stores rs
                    JOIN routes r ON rs.route_id = r.id
                    WHERE r.advisor_id = ? 
                        AND rs.store_id = ?
                    ORDER BY r.date DESC
                    LIMIT 1
                `, [req.user.id, store_id]);
                
                if (pendingVisit.length > 0) {
                    route_store_id = pendingVisit[0].id;
                    console.log(`⚠️ Usando visita anterior para store ${store_id}: ${route_store_id}`);
                } else {
                    return res.status(400).json({
                        success: false,
                        message: 'No hay una visita activa para esta tienda. Por favor, inicia la visita antes de registrar productos.',
                        code: 'NO_ACTIVE_VISIT'
                    });
                }
            }
        }

        // 🆕 VALIDACIÓN 3: Verificar que route_store_id existe en route_stores
        const [checkRouteStore] = await connection.execute(
            'SELECT id, status, route_id FROM route_stores WHERE id = ?',
            [route_store_id]
        );

        if (checkRouteStore.length === 0) {
            console.error(`❌ route_store_id ${route_store_id} no existe en route_stores`);
            
            // Último intento: buscar por store_id
            const [fallbackVisit] = await connection.execute(`
                SELECT rs.id 
                FROM route_stores rs
                JOIN routes r ON rs.route_id = r.id
                WHERE r.advisor_id = ? AND rs.store_id = ?
                LIMIT 1
            `, [req.user.id, store_id]);
            
            if (fallbackVisit.length > 0) {
                route_store_id = fallbackVisit[0].id;
                console.log(`🔄 Usando fallback route_store_id: ${route_store_id}`);
            } else {
                return res.status(400).json({
                    success: false,
                    message: 'La visita a esta tienda no está activa. Por favor, cierra y vuelve a abrir la visita.',
                    code: 'INVALID_VISIT'
                });
            }
        }

        // 🆕 VALIDACIÓN 4: Verificar que la visita no esté ya completada o saltada
        const [visitStatus] = await connection.execute(
            'SELECT status FROM route_stores WHERE id = ?',
            [route_store_id]
        );
        
        if (visitStatus.length > 0 && (visitStatus[0].status === 'completed' || visitStatus[0].status === 'skipped')) {
            return res.status(400).json({
                success: false,
                message: `No se pueden registrar productos en una visita que ya está ${visitStatus[0].status === 'completed' ? 'completada' : 'saltada'}.`,
                code: 'VISIT_CLOSED'
            });
        }

        // 🆕 VALIDACIÓN 5: Si la visita está 'pending', actualizarla a 'in-progress'
        if (visitStatus.length > 0 && visitStatus[0].status === 'pending') {
            await connection.execute(
                'UPDATE route_stores SET status = "in-progress", start_time = NOW() WHERE id = ?',
                [route_store_id]
            );
            console.log(`🔄 Visita ${route_store_id} actualizada a in-progress`);
        }

        // Insertar el producto
        const [result] = await connection.execute(
            `INSERT INTO restock_items 
            (route_store_id, store_id, product_barcode, product_name, 
             product_brand, product_category, quantity, unit_price, 
             reported_by, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [route_store_id, store_id, product_barcode, product_name,
             product_brand || null, product_category || null, quantity, 
             unit_price || null, req.user.id, notes || null]
        );

        console.log('✅ Reposición registrada con ID:', result.insertId);

        res.json({
            success: true,
            id: result.insertId,
            route_store_id,
            store_id,
            product_barcode,
            product_name,
            product_brand,
            product_category,
            quantity,
            unit_price,
            reported_by: req.user.id,
            notes,
            reported_at: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Error adding restock item:', error);
        
        // 🆕 Manejo específico del error de foreign key
        if (error.code === 'ER_NO_REFERENCED_ROW_2') {
            return res.status(400).json({
                success: false,
                message: 'Error: La visita a esta tienda no está activa. Por favor, reinicia la visita desde el mapa.',
                code: 'INVALID_VISIT'
            });
        }
        
        res.status(500).json({ 
            success: false, 
            message: 'Error al registrar producto',
            error: error.message 
        });
    } finally {
        await connection.end();
    }
});

// ============================================
// SIN CAMBIOS - Obtener items por route_store
// ============================================
router.get('/route-store/:routeStoreId', async (req, res) => {
    const connection = await createConnection();
    try {
        const [items] = await connection.execute(
            `SELECT * FROM restock_items 
             WHERE route_store_id = ? 
             ORDER BY reported_at DESC`,
            [req.params.routeStoreId]
        );
        res.json(items);
    } catch (error) {
        console.error('Error fetching restock items:', error);
        res.status(500).json({ error: 'Error al obtener productos' });
    } finally {
        await connection.end();
    }
});

// ============================================
// SIN CAMBIOS - Obtener resumen de reposición
// ============================================
router.get('/summary/:routeStoreId', async (req, res) => {
    const connection = await createConnection();
    try {
        const [summary] = await connection.execute(
            `SELECT 
                COUNT(*) as total_items,
                COALESCE(SUM(quantity), 0) as total_quantity,
                COALESCE(SUM(quantity * unit_price), 0) as total_value,
                COUNT(DISTINCT product_barcode) as unique_products
             FROM restock_items 
             WHERE route_store_id = ?`,
            [req.params.routeStoreId]
        );

        const [allItems] = await connection.execute(
            `SELECT * FROM restock_items 
             WHERE route_store_id = ? 
             ORDER BY reported_at DESC`,
            [req.params.routeStoreId]
        );

        res.json({
            totalItems: summary[0]?.total_quantity || 0,
            totalValue: summary[0]?.total_value || 0,
            uniqueProducts: summary[0]?.unique_products || 0,
            items: allItems
        });
    } catch (error) {
        console.error('Error fetching restock summary:', error);
        res.status(500).json({ error: 'Error al obtener resumen' });
    } finally {
        await connection.end();
    }
});

export default router;