// frontend/src/components/advisor/RestockModal.tsx
import React, { useState } from 'react';
import { restockService, IRestockItem } from '../../services/restockService';
import BarcodeScannerButton from './BarcodeScannerButton';
import '../../styles/RestockModal.css';
import { API_BASE_URL } from '../../services/api';

interface IRestockModalProps {
    routeStoreId: number;
    storeId: number;
    reportedBy: number;
    onClose: () => void;
    onSave: (items: IRestockItem[]) => void;
}

const RestockModal: React.FC<IRestockModalProps> = ({
    routeStoreId,
    storeId,
    reportedBy,
    onClose,
    onSave
}) => {
    const [items, setItems] = useState<IRestockItem[]>([]);
    const [currentBarcode, setCurrentBarcode] = useState('');
    const [currentProduct, setCurrentProduct] = useState<any>(null);
    const [quantity, setQuantity] = useState(1);
    const [unitPrice, setUnitPrice] = useState<number | undefined>();
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);
    const [showProductForm, setShowProductForm] = useState(false);
    const [manualEntry, setManualEntry] = useState(false);

    const handleBarcodeScanned = async (barcode: string) => {
        setLoading(true);
        try {
            // Buscar producto por código de barras - USANDO API_BASE_URL
            const response = await fetch(`${API_BASE_URL}/products/barcode/${barcode}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const product = await response.json();
                setCurrentProduct(product);
                setCurrentBarcode(barcode);
                setShowProductForm(true);
            } else {
                // Producto no encontrado, permitir ingreso manual
                if (confirm('Producto no encontrado. ¿Quieres ingresarlo manualmente?')) {
                    setCurrentBarcode(barcode);
                    setManualEntry(true);
                    setShowProductForm(true);
                }
            }
        } catch (error) {
            console.error('Error buscando producto:', error);
            alert('Error al buscar el producto');
        } finally {
            setLoading(false);
        }
    };

    const handleAddItem = async () => {
        if (!currentBarcode) {
            alert('Debes ingresar un código de barras');
            return;
        }

        if (quantity < 1) {
            alert('La cantidad debe ser mayor a 0');
            return;
        }

        setLoading(true);
        try {
            const newItem = await restockService.addRestockItem({
                route_store_id: routeStoreId,
                store_id: storeId,
                product_barcode: currentBarcode,
                product_name: currentProduct?.name || 'Producto manual',
                product_brand: currentProduct?.brand,
                product_category: currentProduct?.category,
                quantity,
                unit_price: unitPrice,
                reported_by: reportedBy,
                notes: notes || undefined
            });

            setItems(prev => [...prev, newItem]);
            
            // Resetear formulario
            setCurrentBarcode('');
            setCurrentProduct(null);
            setQuantity(1);
            setUnitPrice(undefined);
            setNotes('');
            setShowProductForm(false);
            setManualEntry(false);

        } catch (error) {
            console.error('Error guardando item:', error);
            alert('Error al guardar el producto');
        } finally {
            setLoading(false);
        }
    };

    const handleFinish = () => {
        if (items.length === 0 && !confirm('¿No has repuesto ningún producto? Puedes agregar productos ahora o continuar sin registrar.')) {
            return;
        }
        onSave(items);
        onClose();
    };

    return (
        <div className="restock-modal-overlay">
            <div className="restock-modal">
                <div className="restock-modal-header">
                    <h3>📦 Registrar Productos Repuestos</h3>
                    <button onClick={onClose} className="close-btn">×</button>
                </div>

                <div className="restock-modal-content">
                    {/* Lista de items ya agregados */}
                    {items.length > 0 && (
                        <div className="items-list">
                            <h4>Productos registrados ({items.length})</h4>
                            {items.map((item, index) => (
                                <div key={index} className="item-row">
                                    <span className="item-name">{item.product_name}</span>
                                    <span className="item-quantity">x{item.quantity}</span>
                                    {item.unit_price && (
                                        <span className="item-price">${(item.quantity * item.unit_price).toFixed(2)}</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Formulario para nuevo producto */}
                    {!showProductForm ? (
                        <div className="scan-section">
                            <p className="scan-instruction">
                                Escanea el código de barras del producto repuesto:
                            </p>
                            
                            <BarcodeScannerButton 
                                onScan={handleBarcodeScanned}
                                disabled={loading}
                            />

                            <button 
                                className="manual-entry-btn"
                                onClick={() => {
                                    setManualEntry(true);
                                    setShowProductForm(true);
                                }}
                            >
                                ⌨️ Registrar Producto
                            </button>
                        </div>
                    ) : (
                        <div className="product-form">
                            <h4>{manualEntry ? 'Ingreso manual' : 'Producto encontrado'}</h4>
                            
                            <div className="form-group">
                                <label>Código de barras:</label>
                                <input 
                                    type="text"
                                    value={currentBarcode}
                                    onChange={(e) => setCurrentBarcode(e.target.value)}
                                    className="form-input"
                                    disabled={!manualEntry}
                                />
                            </div>

                            {manualEntry && (
                                <>
                                    <div className="form-group">
                                        <label>Nombre del producto:</label>
                                        <input 
                                            type="text"
                                            value={currentProduct?.name || ''}
                                            onChange={(e) => setCurrentProduct({ name: e.target.value })}
                                            className="form-input"
                                            placeholder="Ej: Leche Entera"
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>Marca:</label>
                                        <input 
                                            type="text"
                                            value={currentProduct?.brand || ''}
                                            onChange={(e) => setCurrentProduct((prev: any) => ({ ...prev, brand: e.target.value }))}
                                            className="form-input"
                                            placeholder="Ej: Alpina"
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>Categoría:</label>
                                        <select 
                                            value={currentProduct?.category || ''}
                                            onChange={(e) => setCurrentProduct((prev: any) => ({ ...prev, category: e.target.value }))}
                                            className="form-select"
                                        >
                                            <option value="">Seleccionar categoría</option>
                                            <option value="lacteos">Lácteos</option>
                                            <option value="carnicos">Cárnicos</option>
                                            <option value="bebidas">Bebidas</option>
                                            <option value="aseo">Aseo</option>
                                            <option value="granos">Granos</option>
                                            <option value="otros">Otros</option>
                                        </select>
                                    </div>
                                </>
                            )}

                            <div className="form-row">
                                <div className="form-group half">
                                    <label>Cantidad repuesta:</label>
                                    <input 
                                        type="number"
                                        min="1"
                                        value={quantity}
                                        onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                                        className="form-input"
                                    />
                                </div>

                                <div className="form-group half">
                                    <label>Precio unitario (opcional):</label>
                                    <input 
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={unitPrice || ''}
                                        onChange={(e) => setUnitPrice(e.target.value ? parseFloat(e.target.value) : undefined)}
                                        className="form-input"
                                        placeholder="$0.00"
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Notas (opcional):</label>
                                <textarea 
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    className="form-textarea"
                                    rows={2}
                                    placeholder="Ej: Se repusieron 3 unidades porque estaban agotadas"
                                />
                            </div>

                            <div className="form-actions">
                                <button 
                                    className="btn-secondary"
                                    onClick={() => {
                                        setShowProductForm(false);
                                        setManualEntry(false);
                                        setCurrentProduct(null);
                                    }}
                                >
                                    Cancelar
                                </button>
                                <button 
                                    className="btn-primary"
                                    onClick={handleAddItem}
                                    disabled={loading || !currentBarcode}
                                >
                                    {loading ? '⏳ Agregando...' : '➕ Agregar producto'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="restock-modal-footer">
                    <button className="btn-secondary" onClick={onClose}>
                        Cancelar
                    </button>
                    <button 
                        className="btn-primary"
                        onClick={handleFinish}
                    >
                        {items.length > 0 ? '✅ Finalizar y guardar' : '⏭️ Continuar sin productos'}
                    </button>
                </div>

                {items.length > 0 && (
                    <div className="items-summary">
                        Total productos: {items.reduce((sum, item) => sum + item.quantity, 0)} unidades
                        {items.some(i => i.unit_price) && (
                            <> | Valor total: ${items.reduce((sum, item) => sum + (item.quantity * (item.unit_price || 0)), 0).toFixed(2)}</>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default RestockModal;