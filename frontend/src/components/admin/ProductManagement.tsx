// frontend/src/components/admin/ProductManagement.tsx
import React, { useState, useEffect } from 'react';
import { productService, Product } from '../../services/productService';
import '../../styles/ProductManagement.css';

const ProductManagement: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    barcode: '',
    name: '',
    category: '',
    brand: '',
    price: 0,
    stock: 0,
    description: ''
  });
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const data = await productService.getAllProducts();
      setProducts(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingProduct) {
        await productService.updateProduct(editingProduct.id, formData);
      } else {
        await productService.createProduct(formData);
      }
      setShowModal(false);
      setEditingProduct(null);
      setFormData({
        barcode: '',
        name: '',
        category: '',
        brand: '',
        price: 0,
        stock: 0,
        description: ''
      });
      loadProducts();
    } catch (err: any) {
      alert('Error al guardar producto: ' + err.message);
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      barcode: product.barcode,
      name: product.name,
      category: product.category || '',
      brand: product.brand || '',
      price: product.price,
      stock: product.stock,
      description: product.description || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm('¿Estás seguro de eliminar este producto?')) {
      try {
        await productService.deleteProduct(id);
        loadProducts();
      } catch (err: any) {
        alert('Error al eliminar producto: ' + err.message);
      }
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(value);
  };

  if (loading) return <div className="loading">Cargando productos...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <div className="product-management">
      <div className="header">
        <h1>📦 Gestión de Productos</h1>
        <button className="btn-primary" onClick={() => {
          setEditingProduct(null);
          setFormData({
            barcode: '',
            name: '',
            category: '',
            brand: '',
            price: 0,
            stock: 0,
            description: ''
          });
          setShowModal(true);
        }}>
          + Nuevo Producto
        </button>
      </div>

      {/* Vista en tabla para desktop, tarjetas para móvil */}
      {isMobile ? (
        <div className="products-cards">
          {products.map(product => (
            <div key={product.id} className="product-card">
              <div className="product-card-header">
                <span className="product-card-name">{product.name}</span>
                <span className={`stock-badge ${product.stock < 10 ? 'low' : ''}`}>
                  Stock: {product.stock}
                </span>
              </div>
              <div className="product-card-info">
                <div className="info-row">
                  <span className="info-label">Código:</span>
                  <span className="info-value">{product.barcode}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Categoría:</span>
                  <span className="info-value">{product.category || '-'}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Marca:</span>
                  <span className="info-value">{product.brand || '-'}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Precio:</span>
                  <span className="info-value price">{formatCurrency(product.price)}</span>
                </div>
              </div>
              <div className="product-card-actions">
                <button className="btn-edit" onClick={() => handleEdit(product)}>✏️ Editar</button>
                <button className="btn-delete" onClick={() => handleDelete(product.id)}>🗑️ Eliminar</button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="products-table-container">
          <table className="products-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Nombre</th>
                <th>Categoría</th>
                <th>Marca</th>
                <th>Precio</th>
                <th>Stock</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {products.map(product => (
                <tr key={product.id}>
                  <td className="barcode">{product.barcode}</td>
                  <td className="name">{product.name}</td>
                  <td>{product.category || '-'}</td>
                  <td>{product.brand || '-'}</td>
                  <td className="price">{formatCurrency(product.price)}</td>
                  <td className={`stock ${product.stock < 10 ? 'low-stock' : ''}`}>
                    {product.stock}
                  </td>
                  <td className="actions">
                    <button className="btn-edit" onClick={() => handleEdit(product)}>✏️</button>
                    <button className="btn-delete" onClick={() => handleDelete(product.id)}>🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal responsivo */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className={`modal-content ${isMobile ? 'mobile-modal' : ''}`} onClick={e => e.stopPropagation()}>
            <h2>{editingProduct ? 'Editar Producto' : 'Nuevo Producto'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Código de Barras *</label>
                <input
                  type="text"
                  name="barcode"
                  value={formData.barcode}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Nombre *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Categoría</label>
                  <input
                    type="text"
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    placeholder="Ej: Lácteos, Cereales..."
                  />
                </div>
                <div className="form-group">
                  <label>Marca</label>
                  <input
                    type="text"
                    name="brand"
                    value={formData.brand}
                    onChange={handleInputChange}
                    placeholder="Ej: Alpina, Vitamarket..."
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Precio *</label>
                  <input
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleInputChange}
                    step="0.01"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Stock</label>
                  <input
                    type="number"
                    name="stock"
                    value={formData.stock}
                    onChange={handleInputChange}
                    min="0"
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Descripción</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  {editingProduct ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductManagement;