// frontend/src/components/common/BarcodeScanner.tsx
import React, { useState, useEffect } from 'react';

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
}

// Simulador de escáner - En una app real usarías una librería como QuaggaJS o HTML5 Barcode Scanner
const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onScan, onClose }) => {
  const [manualBarcode, setManualBarcode] = useState('');
  const [scanning, setScanning] = useState(false);

  // Simular escaneo con cámara (placeholder)
  const startCameraScan = () => {
    setScanning(true);
    alert('🔍 En una aplicación real, aquí se activaría la cámara para escanear códigos de barras.\n\nPor ahora usa la entrada manual abajo.');
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualBarcode.trim()) {
      onScan(manualBarcode.trim());
      setManualBarcode('');
    }
  };

  // Simular detección por cámara (solo demo)
  useEffect(() => {
    if (scanning) {
      const timer = setTimeout(() => {
        setScanning(false);
        // En una app real, aquí procesarías el código de la cámara
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [scanning]);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.8)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000
    }}>
      <div style={{
        background: 'white',
        padding: '20px',
        borderRadius: '10px',
        width: '90%',
        maxWidth: '400px'
      }}>
        <h3 style={{ marginBottom: '15px' }}>📱 Escanear Código de Barras</h3>

        {/* Simulación de cámara */}
        <div style={{
          width: '100%',
          height: '200px',
          background: scanning ? '#000' : '#f8f9fa',
          border: '2px solid #dee2e6',
          borderRadius: '8px',
          marginBottom: '15px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          color: scanning ? 'white' : '#666',
          fontSize: scanning ? '16px' : '14px',
          textAlign: 'center'
        }}>
          {scanning ? (
            <div>
              <div>🔍 Escaneando...</div>
              <div style={{ fontSize: '12px', marginTop: '10px' }}>
                Apunta la cámara al código de barras
              </div>
            </div>
          ) : (
            <div>
              <div>📷 Cámara de escáner</div>
              <div style={{ fontSize: '12px', marginTop: '10px' }}>
                Usa el botón inferior para activar la cámara
              </div>
            </div>
          )}
        </div>

        {/* Entrada manual */}
        <form onSubmit={handleManualSubmit} style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            O ingresa el código manualmente:
          </label>
          <input
            type="text"
            value={manualBarcode}
            onChange={(e) => setManualBarcode(e.target.value)}
            placeholder="Ej: 1234567890123"
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid #dee2e6',
              borderRadius: '4px',
              fontSize: '16px',
              textAlign: 'center'
            }}
          />
          <button
            type="submit"
            disabled={!manualBarcode.trim()}
            style={{
              width: '100%',
              padding: '10px',
              background: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              marginTop: '10px',
              opacity: manualBarcode.trim() ? 1 : 0.6
            }}
          >
            ✅ Usar este código
          </button>
        </form>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'space-between' }}>
          <button
            onClick={startCameraScan}
            disabled={scanning}
            style={{
              padding: '10px 15px',
              background: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              opacity: scanning ? 0.6 : 1
            }}
          >
            {scanning ? '⏳ Escaneando...' : '📷 Usar Cámara'}
          </button>
          
          <button
            onClick={onClose}
            style={{
              padding: '10px 15px',
              background: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            ❌ Cerrar
          </button>
        </div>

        <div style={{ fontSize: '12px', color: '#666', marginTop: '10px', textAlign: 'center' }}>
          💡 Tip: En dispositivos móviles, la cámara escaneará automáticamente
        </div>
      </div>
    </div>
  );
};

export default BarcodeScanner;