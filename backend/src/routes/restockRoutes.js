// backend/src/routes/restockRoutes.js
const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// Agregar item de reposición
router.post('/add-item', authenticateToken, async (req, res) => {
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

    try {
        const [result] = await db.query(
            `INSERT INTO restock_items 
            (route_store_id, store_id, product_barcode, product_name, 
             product_brand, product_category, quantity, unit_price, 
             reported_by, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [route_store_id, store_id, product_barcode, product_name,
             product_brand, product_category, quantity, unit_price,
             reported_by, notes]
        );

        // Actualizar métricas de la tienda
        await updateStoreRestockMetrics(route_store_id, store_id);

        res.json({
            id: result.insertId,
            ...req.body,
            reported_at: new Date()
        });

    } catch (error) {
        console.error('Error adding restock item:', error);
        res.status(500).json({ error: 'Error al registrar producto' });
    }
});

// Obtener items por route_store
router.get('/route-store/:routeStoreId', authenticateToken, async (req, res) => {
    try {
        const [items] = await db.query(
            `SELECT * FROM restock_items 
             WHERE route_store_id = ? 
             ORDER BY reported_at DESC`,
            [req.params.routeStoreId]
        );
        res.json(items);
    } catch (error) {
        console.error('Error fetching restock items:', error);
        res.status(500).json({ error: 'Error al obtener productos' });
    }
});

// Obtener resumen de reposición
router.get('/summary/:routeStoreId', authenticateToken, async (req, res) => {
    try {
        const [items] = await db.query(
            `SELECT 
                COUNT(*) as total_items,
                SUM(quantity) as total_quantity,
                SUM(quantity * unit_price) as total_value,
                COUNT(DISTINCT product_barcode) as unique_products
             FROM restock_items 
             WHERE route_store_id = ?`,
            [req.params.routeStoreId]
        );

        const [allItems] = await db.query(
            `SELECT * FROM restock_items 
             WHERE route_store_id = ? 
             ORDER BY reported_at DESC`,
            [req.params.routeStoreId]
        );

        res.json({
            totalItems: items[0].total_quantity || 0,
            totalValue: items[0].total_value || 0,
            uniqueProducts: items[0].unique_products || 0,
            items: allItems
        });

    } catch (error) {
        console.error('Error fetching restock summary:', error);
        res.status(500).json({ error: 'Error al obtener resumen' });
    }
});

// Función para actualizar métricas agregadas
async function updateStoreRestockMetrics(routeStoreId, storeId) {
    try {
        const [items] = await db.query(
            `SELECT 
                SUM(quantity) as total_items,
                SUM(quantity * unit_price) as total_value,
                COUNT(DISTINCT product_barcode) as unique_products,
                JSON_ARRAYAGG(
                    JSON_OBJECT(
                        'barcode', product_barcode,
                        'name', product_name,
                        'quantity', quantity,
                        'category', product_category
                    )
                ) as products
             FROM restock_items 
             WHERE route_store_id = ?`,
            [routeStoreId]
        );

        if (items[0].total_items > 0) {
            await db.query(
                `INSERT INTO store_restock_metrics 
                (store_id, route_store_id, total_items, total_value, 
                 unique_products, categories, top_products)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                total_items = VALUES(total_items),
                total_value = VALUES(total_value),
                unique_products = VALUES(unique_products)`,
                [
                    storeId,
                    routeStoreId,
                    items[0].total_items || 0,
                    items[0].total_value || 0,
                    items[0].unique_products || 0,
                    '[]', // Podrías agregar lógica para categorías
                    items[0].products || '[]'
                ]
            );
        }
    } catch (error) {
        console.error('Error updating metrics:', error);
    }
}

module.exports = router;