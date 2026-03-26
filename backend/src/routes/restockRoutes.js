// backend/src/routes/restockRoutes.js
import express from 'express';
import { createConnection } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Agregar item de reposición
router.post('/add-item', async (req, res) => {
    const connection = await createConnection();
    try {
        const {
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
            product_barcode,
            product_name,
            quantity
        });

        const [result] = await connection.execute(
            `INSERT INTO restock_items 
            (route_store_id, store_id, product_barcode, product_name, 
             product_brand, product_category, quantity, unit_price, 
             reported_by, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [route_store_id, store_id, product_barcode, product_name,
             product_brand || null, product_category || null, quantity, 
             unit_price || null, reported_by, notes || null]
        );

        console.log('✅ Reposición registrada con ID:', result.insertId);

        res.json({
            id: result.insertId,
            route_store_id,
            store_id,
            product_barcode,
            product_name,
            product_brand,
            product_category,
            quantity,
            unit_price,
            reported_by,
            notes,
            reported_at: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Error adding restock item:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error al registrar producto',
            error: error.message 
        });
    } finally {
        await connection.end();
    }
});

// Obtener items por route_store
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

// Obtener resumen de reposición
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