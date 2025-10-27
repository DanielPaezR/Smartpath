// backend/src/controllers/productController.js
import { createConnection } from '../config/database.js';

export const productController = {
  async getProductByBarcode(req, res) {
    const connection = await createConnection();
    try {
      const { barcode } = req.params;

      if (!barcode) {
        return res.status(400).json({ message: 'Código de barras requerido' });
      }

      // Buscar producto en la base de datos
      const [products] = await connection.execute(
        `SELECT * FROM products WHERE barcode = ?`,
        [barcode]
      );

      if (products.length === 0) {
        return res.status(404).json({ message: 'Producto no encontrado' });
      }

      const product = products[0];
      
      // Formatear respuesta
      const formattedProduct = {
        id: product.id.toString(),
        barcode: product.barcode,
        name: product.name,
        category: product.category,
        brand: product.brand,
        price: parseFloat(product.price),
        stock: product.stock,
        description: product.description
      };

      res.json(formattedProduct);
    } catch (error) {
      console.error('Error buscando producto:', error);
      res.status(500).json({ message: 'Error buscando producto' });
    } finally {
      await connection.end();
    }
  },

  async reportDamage(req, res) {
    const connection = await createConnection();
    try {
      const {
        barcode,
        product,
        damageType,
        description,
        photos,
        severity,
        storeId,
        reportedBy
      } = req.body;

      // Validar datos requeridos
      if (!barcode || !damageType || !storeId || !reportedBy) {
        return res.status(400).json({ 
          message: 'Datos incompletos: barcode, damageType, storeId y reportedBy son requeridos' 
        });
      }

      // Insertar reporte de daño
      const [result] = await connection.execute(
        `INSERT INTO damage_reports 
         (barcode, product_name, product_brand, product_category, damage_type, description, photos, severity, store_id, reported_by, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          barcode,
          product.name,
          product.brand,
          product.category,
          damageType,
          description || '',
          JSON.stringify(photos || []),
          severity,
          storeId,
          reportedBy
        ]
      );

      const reportId = result.insertId;

      // Obtener el reporte creado
      const [reports] = await connection.execute(
        `SELECT * FROM damage_reports WHERE id = ?`,
        [reportId]
      );

      const damageReport = reports[0];

      // Formatear respuesta
      const formattedReport = {
        id: damageReport.id.toString(),
        barcode: damageReport.barcode,
        product: {
          id: product.id,
          name: damageReport.product_name,
          brand: damageReport.product_brand,
          category: damageReport.product_category
        },
        damageType: damageReport.damage_type,
        description: damageReport.description,
        photos: JSON.parse(damageReport.photos || '[]'),
        severity: damageReport.severity,
        storeId: damageReport.store_id,
        reportedBy: damageReport.reported_by,
        timestamp: damageReport.created_at
      };

      res.status(201).json(formattedReport);
    } catch (error) {
      console.error('Error reportando daño:', error);
      res.status(500).json({ message: 'Error reportando daño' });
    } finally {
      await connection.end();
    }
  },

  async getStoreDamageReports(req, res) {
    const connection = await createConnection();
    try {
      const { storeId } = req.params;

      const [reports] = await connection.execute(
        `SELECT * FROM damage_reports WHERE store_id = ? ORDER BY created_at DESC`,
        [storeId]
      );

      const formattedReports = reports.map(report => ({
        id: report.id.toString(),
        barcode: report.barcode,
        product: {
          name: report.product_name,
          brand: report.product_brand,
          category: report.product_category
        },
        damageType: report.damage_type,
        description: report.description,
        photos: JSON.parse(report.photos || '[]'),
        severity: report.severity,
        storeId: report.store_id,
        reportedBy: report.reported_by,
        timestamp: report.created_at
      }));

      res.json(formattedReports);
    } catch (error) {
      console.error('Error obteniendo reportes:', error);
      res.status(500).json({ message: 'Error obteniendo reportes de daño' });
    } finally {
      await connection.end();
    }
  }
};