// backend/src/controllers/productController.js - VERSIÓN CON ANALYTICS
import { createConnection } from '../config/database.js';
import { mlService } from '../services/mlService.js';

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
      console.log('📝 Recibiendo reporte de daño');
      
      // Manejar FormData
      let damageData;
      let photos = [];
      
      if (req.headers['content-type']?.includes('multipart/form-data')) {
        // Usando multer o similar para manejar archivos
        damageData = JSON.parse(req.body.data);
        
        // Procesar archivos subidos
        if (req.files && req.files.length > 0) {
          photos = req.files.map(file => ({
            filename: file.filename,
            path: file.path,
            url: `/uploads/damages/${file.filename}`
          }));
        }
      } else {
        // Método antiguo JSON
        damageData = req.body;
        photos = req.body.photos || [];
      }
      
      const { barcode, product, damageType, description, severity, storeId, reportedBy } = damageData;
      
      console.log('📊 Datos del reporte:', {
        barcode,
        productName: product?.name,
        damageType,
        severity,
        photosCount: photos.length
      });
      
      // Guardar en la base de datos
      const [result] = await connection.execute(
        `INSERT INTO damage_reports 
        (barcode, product_name, damage_type, description, severity, store_id, reported_by, photos) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          barcode,
          product?.name || 'Producto desconocido',
          damageType,
          description,
          severity,
          storeId,
          reportedBy,
          JSON.stringify(photos) // Guardar como JSON
        ]
      );
      
      res.status(201).json({
        success: true,
        message: 'Reporte de daño guardado exitosamente',
        reportId: result.insertId
      });
      
    } catch (error) {
      console.error('❌ Error guardando reporte de daño:', error);
      res.status(500).json({ 
        success: false,
        message: 'Error guardando reporte de daño',
        error: error.message 
      });
    } finally {
      await connection.end();
    }
  },

  async getStoreDamageReports(req, res) {
    const connection = await createConnection();
    try {
      const { storeId } = req.params;

      console.log('📋 Obteniendo reportes de daño para tienda:', storeId);

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

      console.log(`✅ ${formattedReports.length} reportes de daño obtenidos`);
      res.json(formattedReports);

    } catch (error) {
      console.error('❌ Error obteniendo reportes:', error);
      res.status(500).json({ 
        message: 'Error obteniendo reportes de daño',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    } finally {
      await connection.end();
    }
  },

  // 🆕 ENDPOINT PARA OBTENER MÉTRICAS DE DAÑOS POR TIENDA
  async getDamageAnalytics(req, res) {
    const connection = await createConnection();
    try {
      const { storeId, startDate, endDate } = req.query;

      console.log('📊 Obteniendo analytics de daños:', { storeId, startDate, endDate });

      let query = `
        SELECT 
          COUNT(*) as total_damage_reports,
          AVG(CASE severity WHEN 'high' THEN 1 WHEN 'medium' THEN 0.5 ELSE 0.25 END) as avg_severity_score,
          damage_type,
          COUNT(*) as damage_count,
          product_category,
          COUNT(*) as category_count
        FROM damage_reports 
        WHERE 1=1
      `;
      
      const params = [];

      if (storeId) {
        query += ' AND store_id = ?';
        params.push(storeId);
      }

      if (startDate) {
        query += ' AND DATE(created_at) >= ?';
        params.push(startDate);
      }

      if (endDate) {
        query += ' AND DATE(created_at) <= ?';
        params.push(endDate);
      }

      query += ' GROUP BY damage_type, product_category ORDER BY damage_count DESC';

      const [analytics] = await connection.execute(query, params);

      // Obtener tendencias temporales
      const [trends] = await connection.execute(
        `SELECT 
          DATE(created_at) as date,
          COUNT(*) as daily_damages,
          AVG(CASE severity WHEN 'high' THEN 1 WHEN 'medium' THEN 0.5 ELSE 0.25 END) as daily_severity
         FROM damage_reports 
         WHERE store_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
         GROUP BY DATE(created_at) 
         ORDER BY date DESC`,
        [storeId]
      );

      const response = {
        summary: {
          total_damage_reports: analytics.reduce((sum, item) => sum + item.damage_count, 0),
          avg_severity: analytics.length > 0 ? 
            analytics.reduce((sum, item) => sum + item.avg_severity_score, 0) / analytics.length : 0
        },
        by_damage_type: analytics.reduce((acc, item) => {
          if (!acc[item.damage_type]) {
            acc[item.damage_type] = 0;
          }
          acc[item.damage_type] += item.damage_count;
          return acc;
        }, {}),
        by_category: analytics.reduce((acc, item) => {
          if (!acc[item.product_category]) {
            acc[item.product_category] = 0;
          }
          acc[item.product_category] += item.category_count;
          return acc;
        }, {}),
        trends: trends
      };

      console.log('✅ Analytics de daños obtenidos exitosamente');
      res.json(response);

    } catch (error) {
      console.error('❌ Error obteniendo analytics de daños:', error);
      res.status(500).json({ 
        message: 'Error obteniendo analytics de daños',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    } finally {
      await connection.end();
    }
  },

  // 🆕 ENDPOINT PARA OBTENER PRODUCTOS MÁS PROPENSOS A DAÑOS
  async getHighRiskProducts(req, res) {
    const connection = await createConnection();
    try {
      const { limit = 10 } = req.query;

      console.log('🎯 Identificando productos de alto riesgo');

      const [highRiskProducts] = await connection.execute(
        `SELECT 
          barcode,
          product_name,
          product_category,
          COUNT(*) as damage_count,
          AVG(CASE severity WHEN 'high' THEN 1 WHEN 'medium' THEN 0.5 ELSE 0.25 END) as risk_score
         FROM damage_reports 
         GROUP BY barcode, product_name, product_category
         HAVING damage_count >= 2
         ORDER BY risk_score DESC, damage_count DESC
         LIMIT ?`,
        [parseInt(limit)]
      );

      console.log(`✅ ${highRiskProducts.length} productos de alto riesgo identificados`);
      res.json(highRiskProducts);

    } catch (error) {
      console.error('❌ Error identificando productos de alto riesgo:', error);
      res.status(500).json({ 
        message: 'Error identificando productos de alto riesgo',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    } finally {
      await connection.end();
    }
  }
};

export default productController;