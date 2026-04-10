// frontend/src/components/advisor/RestockModal.tsx
import React, { useState, useRef, useEffect } from 'react';
import { restockService, IRestockItem } from '../../services/restockService';
import BarcodeScannerButton from './BarcodeScannerButton';
import { API_BASE_URL } from '../../services/api';
import '../../styles/RestockModal.css';

interface IRestockModalProps {
    routeStoreId: number;
    storeId: number;
    reportedBy: number;
    existingItems?: IRestockItem[];  // 🆕 Productos ya registrados
    onClose: () => void;
    onSave: (items: IRestockItem[]) => void;
}

interface TempItem {
    barcode: string;
    product: any;
    quantity: number;
    unitPrice?: number;
}

const RestockModal: React.FC<IRestockModalProps> = ({
    routeStoreId,
    storeId,
    reportedBy,
    existingItems = [],
    onClose,
    onSave
}) => {
    const [items, setItems] = useState<IRestockItem[]>(existingItems); 
    const [tempItem, setTempItem] = useState<TempItem | null>(null);
    const [showScanner, setShowScanner] = useState(true);
    const [loading, setLoading] = useState(false);
    const [manualMode, setManualMode] = useState(false);
    const [barcodeInput, setBarcodeInput] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    // Enfocar input cuando se muestra el área de escaneo
    useEffect(() => {
        if (showScanner && !tempItem && inputRef.current) {
            inputRef.current.focus();
        }
    }, [showScanner, tempItem]);

    // Buscar producto por código de barras
    const searchProduct = async (barcode: string) => {
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/products/barcode/${barcode}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });

            if (response.ok) {
                const product = await response.json();
                setTempItem({
                    barcode,
                    product,
                    quantity: 1,
                    unitPrice: product.price
                });
                setShowScanner(false);
                setBarcodeInput('');
            } else {
                if (confirm(`Producto con código ${barcode} no encontrado.\n¿Quieres ingresarlo manualmente?`)) {
                    setTempItem({
                        barcode,
                        product: { name: '', brand: '', category: '' },
                        quantity: 1,
                        unitPrice: undefined
                    });
                    setManualMode(true);
                    setShowScanner(false);
                }
            }
        } catch (error) {
            console.error('Error buscando producto:', error);
            alert('Error al buscar el producto');
        } finally {
            setLoading(false);
        }
    };

    // Manejar escaneo desde el input manual
    const handleBarcodeSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (barcodeInput.trim()) {
            searchProduct(barcodeInput.trim());
        }
    };

    // Agregar producto actual a la lista
    const addCurrentItem = () => {
        if (!tempItem) return;

        if (tempItem.quantity < 1) {
            alert('La cantidad debe ser mayor a 0');
            return;
        }

        const newItem: IRestockItem = {
            route_store_id: routeStoreId,
            store_id: storeId,
            product_barcode: tempItem.barcode,
            product_name: tempItem.product.name || 'Producto manual',
            product_brand: tempItem.product.brand,
            product_category: tempItem.product.category,
            quantity: tempItem.quantity,
            unit_price: tempItem.unitPrice,
            reported_by: reportedBy,
            notes: ''
        };

        setItems(prev => [...prev, newItem]);
        setTempItem(null);
        setManualMode(false);
        setShowScanner(true);
        setBarcodeInput('');
        
        setTimeout(() => {
            if (inputRef.current) inputRef.current.focus();
        }, 100);
    };

    // 🆕 NUEVA FUNCIÓN: Manejar cambio de cantidad desde input numérico
    const handleQuantityChange = (value: number) => {
        // Asegurar que el valor sea válido (mínimo 1)
        const finalValue = Math.max(1, value);
        setTempItem(prev => prev ? { ...prev, quantity: finalValue } : null);
    };

    // Finalizar y guardar todos los productos
    const handleFinish = async () => {
        if (tempItem) {
            alert('Por favor, agrega el producto actual antes de finalizar');
            return;
        }

        if (items.length === 0) {
            if (!confirm('No has registrado ningún producto. ¿Continuar sin registrar?')) {
                return;
            }
            onSave([]);
            onClose();
            return;
        }

        setLoading(true);
        try {
            const savedItems: IRestockItem[] = [];
            for (const item of items) {
                const saved = await restockService.addRestockItem(item);
                savedItems.push(saved);
            }
            alert(`✅ ${savedItems.length} productos registrados correctamente`);
            onSave(savedItems);
            onClose();
        } catch (error) {
            console.error('Error guardando productos:', error);
            alert('Error al guardar los productos');
        } finally {
            setLoading(false);
        }
    };

    const removeItem = (index: number) => {
        setItems(prev => prev.filter((_, i) => i !== index));
    };

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0
        }).format(price);
    };

    const handleScannerScan = (barcode: string) => {
        searchProduct(barcode);
    };

    return (
        <div className="restock-modal-overlay">
            <div className="restock-modal agile">
                <div className="restock-modal-header">
                    <h3>📦 Registrar Productos Repuestos</h3>
                    <button onClick={onClose} className="close-btn">×</button>
                </div>

                <div className="restock-modal-content">
                    {/* Lista de productos ya agregados */}
                    {items.length > 0 && (
                        <div className="items-list">
                            <h4>Productos registrados ({items.length})</h4>
                            {items.map((item, index) => (
                                <div key={index} className="item-row">
                                    <div className="item-info">
                                        <span className="item-name">{item.product_name}</span>
                                        {item.product_brand && (
                                            <span className="item-brand">{item.product_brand}</span>
                                        )}
                                    </div>
                                    <div className="item-actions">
                                        <span className="item-quantity">x{item.quantity}</span>
                                        {item.unit_price && (
                                            <span className="item-price">{formatPrice(item.quantity * item.unit_price)}</span>
                                        )}
                                        <button 
                                            className="remove-item-btn"
                                            onClick={() => removeItem(index)}
                                            title="Eliminar"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Área de escaneo con cámara y input manual */}
                    {showScanner && !tempItem && (
                        <div className="scan-area">
                            <p className="scan-instruction">
                                {items.length === 0 
                                    ? '🔍 Escanea el código de barras del producto repuesto'
                                    : '➕ Escanea otro producto o finaliza'}
                            </p>
                            
                            {/* Botón de cámara */}
                            <BarcodeScannerButton 
                                onScan={handleScannerScan}
                                disabled={loading}
                            />
                        </div>
                    )}

                    {/* Área de confirmación de producto */}
                    {tempItem && (
                        <div className="product-confirmation-area">
                            <h4>📦 Producto encontrado</h4>
                            
                            <div className="product-details-card">
                                <div className="product-info-row">
                                    <span className="product-label">Código:</span>
                                    <span className="product-value barcode">{tempItem.barcode}</span>
                                </div>
                                
                                {manualMode ? (
                                    <>
                                        <div className="product-info-row">
                                            <span className="product-label">Nombre:</span>
                                            <input
                                                type="text"
                                                value={tempItem.product.name || ''}
                                                onChange={(e) => setTempItem({
                                                    ...tempItem,
                                                    product: { ...tempItem.product, name: e.target.value }
                                                })}
                                                className="product-input"
                                                placeholder="Nombre del producto"
                                                autoFocus
                                            />
                                        </div>
                                        <div className="product-info-row">
                                            <span className="product-label">Marca:</span>
                                            <input
                                                type="text"
                                                value={tempItem.product.brand || ''}
                                                onChange={(e) => setTempItem({
                                                    ...tempItem,
                                                    product: { ...tempItem.product, brand: e.target.value }
                                                })}
                                                className="product-input"
                                                placeholder="Marca"
                                            />
                                        </div>
                                        <div className="product-info-row">
                                            <span className="product-label">Categoría:</span>
                                            <select
                                                value={tempItem.product.category || ''}
                                                onChange={(e) => setTempItem({
                                                    ...tempItem,
                                                    product: { ...tempItem.product, category: e.target.value }
                                                })}
                                                className="product-select"
                                            >
                                                <option value="">Seleccionar</option>
                                                <option value="lacteos">Lácteos</option>
                                                <option value="carnicos">Cárnicos</option>
                                                <option value="bebidas">Bebidas</option>
                                                <option value="aseo">Aseo</option>
                                                <option value="granos">Granos</option>
                                                <option value="otros">Otros</option>
                                            </select>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="product-info-row">
                                            <span className="product-label">Producto:</span>
                                            <span className="product-value name">{tempItem.product.name}</span>
                                        </div>
                                        {tempItem.product.brand && (
                                            <div className="product-info-row">
                                                <span className="product-label">Marca:</span>
                                                <span className="product-value">{tempItem.product.brand}</span>
                                            </div>
                                        )}
                                        {tempItem.product.category && (
                                            <div className="product-info-row">
                                                <span className="product-label">Categoría:</span>
                                                <span className="product-value">{tempItem.product.category}</span>
                                            </div>
                                        )}
                                        {tempItem.product.price && (
                                            <div className="product-info-row">
                                                <span className="product-label">Precio ref:</span>
                                                <span className="product-value price">{formatPrice(tempItem.product.price)}</span>
                                            </div>
                                        )}
                                    </>
                                )}
                                
                                {/* SELECTOR DE CANTIDAD CON INPUT NUMÉRICO - CORREGIDO */}
                                <div className="quantity-selector">
                                    <span className="product-label">Cantidad:</span>
                                    <div className="quantity-controls">
                                        <button 
                                            type="button" 
                                            className="qty-btn"
                                            onClick={() => {
                                                const currentQty = tempItem?.quantity || 1;
                                                if (currentQty > 1) {
                                                    handleQuantityChange(currentQty - 1);
                                                }
                                            }}
                                            disabled={tempItem?.quantity <= 1}
                                        >
                                            -
                                        </button>
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            pattern="[0-9]*"
                                            value={tempItem?.quantity === 0 ? '' : tempItem?.quantity || ''}
                                            onChange={(e) => {
                                                const rawValue = e.target.value;
                                                // Permitir campo vacío
                                                if (rawValue === '') {
                                                    setTempItem(prev => prev ? { ...prev, quantity: 0 } : null);
                                                    return;
                                                }
                                                // Validar que solo sean números
                                                const numValue = parseInt(rawValue, 10);
                                                if (!isNaN(numValue) && numValue >= 0) {
                                                    setTempItem(prev => prev ? { ...prev, quantity: numValue } : null);
                                                }
                                            }}
                                            onBlur={() => {
                                                // Al salir, si está vacío o es 0, poner 1
                                                if (!tempItem || tempItem.quantity < 1) {
                                                    handleQuantityChange(1);
                                                }
                                            }}
                                            className="quantity-input"
                                            placeholder="0"
                                        />
                                        <button 
                                            type="button" 
                                            className="qty-btn"
                                            onClick={() => handleQuantityChange((tempItem?.quantity || 1) + 1)}
                                        >
                                            +
                                        </button>
                                    </div>
                                </div>

                                {manualMode && (
                                    <div className="product-info-row">
                                        <span className="product-label">Precio unitario:</span>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={tempItem.unitPrice || ''}
                                            onChange={(e) => setTempItem({
                                                ...tempItem,
                                                unitPrice: e.target.value ? parseFloat(e.target.value) : undefined
                                            })}
                                            className="product-input price-input"
                                            placeholder="$0.00"
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="product-actions">
                                <button 
                                    className="btn-secondary"
                                    onClick={() => {
                                        setTempItem(null);
                                        setManualMode(false);
                                        setShowScanner(true);
                                        setBarcodeInput('');
                                        setTimeout(() => inputRef.current?.focus(), 100);
                                    }}
                                >
                                    🔄 Cancelar
                                </button>
                                <button 
                                    className="btn-primary"
                                    onClick={addCurrentItem}
                                    disabled={manualMode && !tempItem.product.name}
                                >
                                    ➕ Agregar producto
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="restock-modal-footer">
                    <button className="btn-secondary" onClick={onClose}>
                        Cancelar
                    </button>
                    {items.length > 0 ? (
                        <button 
                            className="btn-primary"
                            onClick={handleFinish}
                            disabled={loading}
                        >
                            {loading ? '⏳ Guardando...' : `✅ Finalizar (${items.length} productos)`}
                        </button>
                    ) : (
                        !tempItem && (
                            <button 
                                className="btn-primary outline"
                                onClick={() => {
                                    if (confirm('No has registrado ningún producto. ¿Continuar sin registrar?')) {
                                        onSave([]);
                                        onClose();
                                    }
                                }}
                            >
                                ⏭️ Continuar sin productos
                            </button>
                        )
                    )}
                </div>

                {items.length > 0 && (
                    <div className="items-summary">
                        Total: {items.reduce((sum, item) => sum + item.quantity, 0)} unidades
                        {items.some(i => i.unit_price) && (
                            <> | Valor: {formatPrice(items.reduce((sum, item) => sum + (item.quantity * (item.unit_price || 0)), 0))}</>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default RestockModal;