// frontend/src/components/advisor/BarcodeScannerButton.tsx
import React, { useRef, useState } from 'react';
import '../../styles/BarcodeScannerButton.css';

// Librería para detección de códigos de barras
declare const window: any;

interface IBarcodeScannerButtonProps {
  onScan: (barcode: string) => void;
  disabled?: boolean;
}

const BarcodeScannerButton: React.FC<IBarcodeScannerButtonProps> = ({ onScan, disabled = false }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [manualBarcode, setManualBarcode] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<number | null>(null);

  // Cargar librería de detección de códigos de barras dinámicamente
  const loadBarcodeDecoder = async () => {
    return new Promise((resolve) => {
      if (window.BarcodeDetector) {
        resolve(window.BarcodeDetector);
        return;
      }

      // Si el navegador no soporta BarcodeDetector, usamos una librería alternativa
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/@ericblade/quagga2@1.8.2/dist/quagga.min.js';
      script.onload = () => resolve(window.Quagga);
      document.head.appendChild(script);
    });
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' } // Usar cámara trasera
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        await videoRef.current.play();
        
        // Iniciar detección después de que el video esté reproduciéndose
        setTimeout(() => startBarcodeDetection(), 1000);
      }
    } catch (error) {
      console.error('Error accediendo a la cámara:', error);
      alert('No se pudo acceder a la cámara. Por favor, usa ingreso manual.');
      setShowManualInput(true);
    }
  };

  const startBarcodeDetection = async () => {
    setIsScanning(true);
    
    try {
      const detector = await loadBarcodeDecoder();
      
      if (window.BarcodeDetector) {
        // Usar BarcodeDetector API nativa
        const barcodeDetector = new window.BarcodeDetector({
          formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'qr_code']
        });
        
        scanIntervalRef.current = window.setInterval(async () => {
          if (!videoRef.current || !canvasRef.current) return;
          
          const canvas = canvasRef.current;
          const context = canvas.getContext('2d');
          
          if (!context) return;
          
          // Dibujar frame del video en canvas
          canvas.width = videoRef.current.videoWidth;
          canvas.height = videoRef.current.videoHeight;
          context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
          
          try {
            const barcodes = await barcodeDetector.detect(canvas);
            
            if (barcodes.length > 0) {
              const barcode = barcodes[0].rawValue;
              stopScanner();
              onScan(barcode);
            }
          } catch (error) {
            // Error en detección, continuar
          }
        }, 500);
      } else {
        // Usar Quagga como fallback
        if (window.Quagga) {
          window.Quagga.init({
            inputStream: {
              name: "Live",
              type: "LiveStream",
              target: videoRef.current,
              constraints: {
                facingMode: "environment"
              }
            },
            decoder: {
              readers: ["ean_reader", "ean_8_reader", "code_128_reader", "code_39_reader"]
            }
          }, (err: any) => {
            if (err) {
              console.error('Error inicializando Quagga:', err);
              setShowManualInput(true);
              return;
            }
            
            window.Quagga.start();
            
            window.Quagga.onDetected((data: any) => {
              const barcode = data.codeResult.code;
              if (barcode) {
                stopScanner();
                onScan(barcode);
              }
            });
          });
        }
      }
    } catch (error) {
      console.error('Error iniciando detección:', error);
      setShowManualInput(true);
    }
  };

  const stopScanner = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    
    if (window.Quagga) {
      window.Quagga.stop();
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    setIsScanning(false);
    setShowScanner(false);
  };

  const handleManualSubmit = () => {
    if (manualBarcode.trim()) {
      onScan(manualBarcode.trim());
      setShowManualInput(false);
      setManualBarcode('');
      setShowScanner(false);
    } else {
      alert('Por favor ingresa un código de barras válido');
    }
  };

  const openScanner = () => {
    setShowScanner(true);
    setTimeout(() => startCamera(), 100);
  };

  return (
    <div className="barcode-scanner-container">
      {/* Botón principal */}
      <button
        type="button"
        onClick={openScanner}
        disabled={disabled || isScanning}
        className="barcode-scanner-btn"
      >
        {isScanning ? (
          <>⏳ Escaneando...</>
        ) : (
          <>
            📱 Escanear Código de Barras
          </>
        )}
      </button>

      {/* Botón de ingreso manual */}
      <button
        type="button"
        onClick={() => setShowManualInput(true)}
        disabled={disabled || isScanning}
        className="manual-input-btn"
      >
        ⌨️ Ingresar Manualmente
      </button>

      {/* Modal de escáner */}
      {showScanner && (
        <div className="scanner-modal-overlay">
          <div className="scanner-modal">
            <div className="scanner-header">
              <h3>📱 Escanear Código de Barras</h3>
              <button onClick={stopScanner} className="close-btn">×</button>
            </div>
            
            <div className="scanner-content">
              <video
                ref={videoRef}
                className="scanner-video"
                playsInline
                muted
              />
              <canvas
                ref={canvasRef}
                className="scanner-canvas"
                style={{ display: 'none' }}
              />
              
              <div className="scanner-overlay">
                <div className="scan-region"></div>
              </div>
              
              <p className="scanner-instruction">
                Centra el código de barras en el recuadro
              </p>
              
              {isScanning && (
                <div className="scanning-indicator">
                  <div className="scan-line"></div>
                </div>
              )}
            </div>
            
            <div className="scanner-footer">
              <button onClick={stopScanner} className="cancel-btn">
                Cancelar
              </button>
              <button onClick={() => setShowManualInput(true)} className="manual-btn">
                Ingresar Manualmente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de ingreso manual */}
      {showManualInput && (
        <div className="manual-modal-overlay">
          <div className="manual-modal">
            <div className="manual-header">
              <h3>⌨️ Ingresar Código Manualmente</h3>
              <button onClick={() => setShowManualInput(false)} className="close-btn">×</button>
            </div>
            
            <div className="manual-content">
              <input
                type="text"
                value={manualBarcode}
                onChange={(e) => setManualBarcode(e.target.value)}
                placeholder="Ej: 7701234567890"
                className="manual-input"
                autoFocus
              />
              
              <div className="manual-actions">
                <button onClick={() => setShowManualInput(false)} className="cancel-btn">
                  Cancelar
                </button>
                <button onClick={handleManualSubmit} className="submit-btn">
                  Aceptar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BarcodeScannerButton;