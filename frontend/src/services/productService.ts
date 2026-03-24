// frontend/src/services/productService.ts
import api from './api';

export interface Product {
  id: number;
  barcode: string;
  name: string;
  category: string;
  brand: string;
  price: number;
  stock: number;
  description: string;
  created_at: string;
  updated_at: string;
}

export const productService = {
  // Obtener todos los productos
  async getAllProducts(): Promise<Product[]> {
    try {
      const response = await api.get('/products');
      return response.data.products;
    } catch (error) {
      console.error('Error al obtener productos:', error);
      throw error;
    }
  },

  // Obtener un producto por ID
  async getProductById(id: number): Promise<Product> {
    try {
      const response = await api.get(`/products/${id}`);
      return response.data.product;
    } catch (error) {
      console.error('Error al obtener producto:', error);
      throw error;
    }
  },

  // Crear producto
  async createProduct(product: Omit<Product, 'id' | 'created_at' | 'updated_at'>): Promise<any> {
    try {
      const response = await api.post('/products', product);
      return response.data;
    } catch (error) {
      console.error('Error al crear producto:', error);
      throw error;
    }
  },

  // Actualizar producto
  async updateProduct(id: number, product: Partial<Product>): Promise<any> {
    try {
      const response = await api.put(`/products/${id}`, product);
      return response.data;
    } catch (error) {
      console.error('Error al actualizar producto:', error);
      throw error;
    }
  },

  // Eliminar producto
  async deleteProduct(id: number): Promise<any> {
    try {
      const response = await api.delete(`/products/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error al eliminar producto:', error);
      throw error;
    }
  }
};