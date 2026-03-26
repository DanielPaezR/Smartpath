// frontend/src/services/restockService.ts
import { API_BASE_URL } from './api';

export interface IRestockItem {
    id?: number;
    route_store_id: number;
    store_id: number;
    product_barcode: string;
    product_name: string;
    product_brand?: string;
    product_category?: string;
    quantity: number;
    unit_price?: number;
    total_value?: number;
    reported_by: number;
    reported_at?: Date;
    notes?: string;
}

export interface IRestockSummary {
    totalItems: number;
    totalValue: number;
    uniqueProducts: number;
    items: IRestockItem[];
}

class RestockService {
    private baseUrl = `${API_BASE_URL}/routes/restock`;

    async addRestockItem(item: Omit<IRestockItem, 'id' | 'reported_at' | 'total_value'>): Promise<IRestockItem> {
        try {
            console.log('📦 Enviando reposición a:', `${this.baseUrl}/add-item`);
            console.log('📦 Datos:', item);
            
            const response = await fetch(`${this.baseUrl}/add-item`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(item)
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Error response:', response.status, errorText);
                throw new Error(`Error al registrar producto repuesto: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error en restockService.addRestockItem:', error);
            throw error;
        }
    }

    async getRestockItemsByRouteStore(routeStoreId: number): Promise<IRestockItem[]> {
        try {
            const response = await fetch(`${this.baseUrl}/route-store/${routeStoreId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) {
                throw new Error('Error al obtener productos repuestos');
            }

            return await response.json();
        } catch (error) {
            console.error('Error en restockService.getRestockItemsByRouteStore:', error);
            return [];
        }
    }

    async getRestockSummary(routeStoreId: number): Promise<IRestockSummary> {
        try {
            const response = await fetch(`${this.baseUrl}/summary/${routeStoreId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) {
                throw new Error('Error al obtener resumen de reposición');
            }

            return await response.json();
        } catch (error) {
            console.error('Error en restockService.getRestockSummary:', error);
            return {
                totalItems: 0,
                totalValue: 0,
                uniqueProducts: 0,
                items: []
            };
        }
    }
}

export const restockService = new RestockService();