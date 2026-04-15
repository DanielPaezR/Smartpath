// frontend/src/components/advisor/DamageModal.tsx
import React, { useState, useRef, useEffect } from 'react';
import BarcodeScannerButton from './BarcodeScannerButton';
import { API_BASE_URL } from '../../services/api';
import '../../styles/DamageModal.css';

interface DamageModalProps {
  storeId: number;
  routeStoreId: number;
  reportedBy: number;
  onClose: () => void;
  onSave: (damages: any[]) => void;
  existingDamages?: any[];
}

const DamageModal: React.FC<DamageModalProps> = ({
  storeId,
  routeStoreId,
  reportedBy,
  onClose,
  onSave,
  existingDamages = []
}) => {
  const [damages, setDamages] = useState<any[]>(existingDamages);
  const [currentDamage, setCurrentDamage] = useState<any | null>(null);
  const [showScanner, setShowScanner] = useState(true);
  const [loading, setLoading] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const maxPhotos = 3;

  useEffect(() => {
    if (showScanner && !currentDamage && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showScanner, currentDamage]);

  const searchProduct = async (barcode: string) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/products/barcode/${barcode}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });

      if (response.ok) {
        const product = await response.json();
        setCurrentDamage({
          barcode,
          product_name: product.name,
          product_brand: product.brand || '',
          product_category: product.category || '',
          quantity: 1,
          photos: [],
          severity: 'medium'
        });
        setShowScanner(false);
        setBarcodeInput('');
        setPhotos([]);
      } else {
        if (confirm(`Producto con código ${barcode} no encontrado.\n¿Quieres registrarlo manualmente?`)) {
          setCurrentDamage({
            barcode,
            product_name: '',
            product_brand: '',
            product_category: '',
            quantity: 1,
            photos: [],
            severity: 'medium'
          });
          setShowScanner(false);
        } else {
          setShowScanner(true);
        }
      }
    } catch (error) {
      console.error('Error buscando producto:', error);
      alert('Error al buscar el producto');
    } finally {
      setLoading(false);
    }
  };

  const handleQuantityChange = (value: number) => {
    if (currentDamage) {
      setCurrentDamage({ ...currentDamage, quantity: Math.max(1, value) });
    }
  };

  const handleQuantityInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    if (rawValue === '') {
      setCurrentDamage(prev => prev ? { ...prev, quantity: 0 } : null);
      return;
    }
    const numValue = parseInt(rawValue, 10);
    if (!isNaN(numValue) && numValue >= 0) {
      setCurrentDamage(prev => prev ? { ...prev, quantity: numValue } : null);
    }
  };

  const handleQuantityBlur = () => {
    if (currentDamage && currentDamage.quantity < 1) {
      setCurrentDamage({ ...currentDamage, quantity: 1 });
    }
  };

  const handlePhotoCapture = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    if (photos.length + files.length > maxPhotos) {
      alert(`Máximo ${maxPhotos} fotos permitidas`);
      return;
    }

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const photoData = reader.result as string;
        setPhotos(prev => [...prev, photoData]);
        if (currentDamage) {
          setCurrentDamage({ ...currentDamage, photos: [...currentDamage.photos, photoData] });
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
    if (currentDamage) {
      setCurrentDamage({ ...currentDamage, photos: currentDamage.photos.filter((_: any, i: number) => i !== index) });
    }
  };

  const addDamage = () => {
    if (!currentDamage) return;

    if (!currentDamage.product_name) {
      alert('Debes ingresar el nombre del producto');
      return;
    }

    if (currentDamage.photos.length === 0) {
      if (!confirm('No has tomado fotos del daño. ¿Continuar sin fotos?')) {
        return;
      }
    }

    const newDamage = { ...currentDamage, id: Date.now().toString() };
    setDamages(prev => [...prev, newDamage]);
    setCurrentDamage(null);
    setShowScanner(true);
    setPhotos([]);
    setBarcodeInput('');
    
    setTimeout(() => {
      if (inputRef.current) inputRef.current.focus();
    }, 100);
  };

  const removeDamage = (index: number) => {
    setDamages(prev => prev.filter((_, i) => i !== index));
  };

  const handleFinish = async () => {
    if (currentDamage) {
      alert('Por favor, agrega el producto actual antes de finalizar');
      return;
    }

    setLoading(true);
    try {
      const savedDamages = [];
      for (const damage of damages) {
        const damageToSave = {
          store_id: storeId,
          route_store_id: routeStoreId,
          product_barcode: damage.barcode,
          product_name: damage.product_name,
          product_brand: damage.product_brand,
          product_category: damage.product_category,
          quantity: damage.quantity,
          severity: damage.severity,
          photos: damage.photos,
          reported_by: reportedBy
        };
        savedDamages.push(damageToSave);
      }
      onSave(savedDamages);
      onClose();
    } catch (error) {
      console.error('Error guardando daños:', error);
      alert('Error al guardar los reportes de daño');
    } finally {
      setLoading(false);
    }
  };

  const handleScannerScan = (barcode: string) => {
    searchProduct(barcode);
  };

  return (
    <div className="damage-modal-overlay">
      <div className="damage-modal">
        <div className="damage-modal-header">
          <h3>⚠️ Reportar Productos Dañados</h3>
          <button onClick={onClose} className="close-btn">×</button>
        </div>

        <div className="damage-modal-content">
          {/* Lista de daños ya agregados */}
          {damages.length > 0 && (
            <div className="damages-list">
              <h4>Productos dañados ({damages.length})</h4>
              {damages.map((damage, index) => (
                <div key={index} className="damage-row">
                  <div className="damage-info">
                    <span className="damage-name">{damage.product_name}</span>
                    <span className="damage-quantity">x{damage.quantity}</span>
                  </div>
                  <div className="damage-photos">
                    {damage.photos.length > 0 && <span>📸 {damage.photos.length}</span>}
                  </div>
                  <button className="remove-damage-btn" onClick={() => removeDamage(index)}>🗑️</button>
                </div>
              ))}
            </div>
          )}

          {/* Área de escaneo */}
          {showScanner && !currentDamage && (
            <div className="scan-area">
              <p className="scan-instruction">
                {damages.length === 0 
                  ? '🔍 Escanea el código de barras del producto dañado'
                  : '➕ Escanea otro producto o finaliza'}
              </p>
              <BarcodeScannerButton onScan={handleScannerScan} disabled={loading} />
            </div>
          )}

          {/* Formulario de daño - INFORMACIÓN NO EDITABLE */}
          {currentDamage && (
            <div className="damage-form">
              <h4>📦 Producto Dañado</h4>
              
              <div className="form-row">
                <label>Código:</label>
                <div className="info-display">
                  <span className="barcode-value">{currentDamage.barcode}</span>
                </div>
              </div>

              {/* Producto - solo texto, no editable */}
              <div className="form-row">
                <label>Producto:</label>
                <div className="info-display">
                  <span className="product-name">{currentDamage.product_name || 'Producto no encontrado'}</span>
                </div>
              </div>

              {/* Marca - solo texto, no editable */}
              {currentDamage.product_brand && (
                <div className="form-row">
                  <label>Marca:</label>
                  <div className="info-display">
                    <span className="product-brand">{currentDamage.product_brand}</span>
                  </div>
                </div>
              )}

              {/* Categoría - solo texto, no editable */}
              {currentDamage.product_category && (
                <div className="form-row">
                  <label>Categoría:</label>
                  <div className="info-display">
                    <span className="product-category">{currentDamage.product_category}</span>
                  </div>
                </div>
              )}

              {/* Cantidad - input editable que permite borrar */}
              <div className="form-row">
                <label>Cantidad dañada:</label>
                <div className="quantity-controls">
                  <button 
                    type="button" 
                    onClick={() => handleQuantityChange((currentDamage?.quantity || 1) - 1)}
                    disabled={currentDamage?.quantity <= 1}
                  >
                    -
                  </button>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={currentDamage?.quantity === 0 ? '' : currentDamage?.quantity || ''}
                    onChange={handleQuantityInputChange}
                    onBlur={handleQuantityBlur}
                    className="quantity-input"
                    placeholder="1"
                  />
                  <button 
                    type="button" 
                    onClick={() => handleQuantityChange((currentDamage?.quantity || 1) + 1)}
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Severidad */}
              <div className="form-row">
                <label>Severidad:</label>
                <select
                  value={currentDamage.severity}
                  onChange={(e) => setCurrentDamage({ ...currentDamage, severity: e.target.value as 'low' | 'medium' | 'high' })}
                  className="severity-select"
                >
                  <option value="low">🟢 Baja</option>
                  <option value="medium">🟡 Media</option>
                  <option value="high">🔴 Alta</option>
                </select>
              </div>

              {/* Fotos */}
              <div className="form-row">
                <label>📸 Fotos ({currentDamage.photos.length}/{maxPhotos}):</label>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  multiple
                  onChange={handlePhotoCapture}
                  className="photo-input"
                />
                {currentDamage.photos.length > 0 && (
                  <div className="photos-preview">
                    {currentDamage.photos.map((photo: string, idx: number) => (
                      <div key={idx} className="photo-preview">
                        <img src={photo} alt={`Daño ${idx + 1}`} />
                        <button onClick={() => removePhoto(idx)}>✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="damage-actions">
                <button className="btn-secondary" onClick={() => {
                  setCurrentDamage(null);
                  setShowScanner(true);
                  setPhotos([]);
                }}>
                  Cancelar
                </button>
                <button className="btn-primary" onClick={addDamage}>
                  Agregar Producto Dañado
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="damage-modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          {damages.length > 0 && (
            <button className="btn-primary" onClick={handleFinish} disabled={loading}>
              {loading ? '⏳ Guardando...' : `✅ Finalizar (${damages.length} productos)`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default DamageModal;