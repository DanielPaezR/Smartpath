// frontend/src/components/common/InstallPWA.tsx
import React, { useEffect, useState } from 'react';
import '../../styles/common/InstallPWA.css';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

const InstallPWA: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallButton, setShowInstallButton] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Verificar si ya está instalada (diferentes modos)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                        window.matchMedia('(display-mode: fullscreen)').matches ||
                        (window.navigator as any).standalone === true;
    
    if (isStandalone) {
      setIsInstalled(true);
      console.log('📱 App instalada y ejecutándose en modo standalone');
    }

    // Escuchar el evento beforeinstallprompt
    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      console.log('📱 Evento beforeinstallprompt disparado');
      e.preventDefault();
      setDeferredPrompt(e);
      
      // Solo mostrar si no ha sido instalada ni dismissada
      if (!isInstalled && !isDismissed) {
        setShowInstallButton(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Escuchar cuando se instala
    window.addEventListener('appinstalled', () => {
      console.log('📱 PWA instalada exitosamente');
      setIsInstalled(true);
      setShowInstallButton(false);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, [isInstalled, isDismissed]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    console.log('📱 Mostrando prompt de instalación');
    
    try {
      deferredPrompt.prompt();
      
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('📱 Usuario aceptó instalar la PWA');
      } else {
        console.log('📱 Usuario canceló la instalación');
        // No ocultamos permanentemente por si quiere intentar después
      }
    } catch (error) {
      console.error('Error en instalación PWA:', error);
    }

    setDeferredPrompt(null);
    setShowInstallButton(false);
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    setShowInstallButton(false);
    
    // Mostrar de nuevo después de 24 horas si no está instalada
    setTimeout(() => {
      if (!isInstalled) {
        setIsDismissed(false);
        if (deferredPrompt) {
          setShowInstallButton(true);
        }
      }
    }, 24 * 60 * 60 * 1000); // 24 horas
  };

  if (isInstalled || !showInstallButton) return null;

  return (
    <div className="install-pwa-container">
      <div className="install-pwa-card">
        <div className="install-icon">
          <img src="/icon-192x192.png" alt="SmartPath Vitamarket" />
        </div>
        <div className="install-content">
          <h3>Instala SmartPath</h3>
          <p>Accede más rápido a tus rutas y tareas</p>
          <div className="install-actions">
            <button 
              onClick={handleInstallClick}
              className="install-btn"
            >
              📲 Instalar App
            </button>
            <button 
              onClick={handleDismiss}
              className="later-btn"
            >
              Ahora no
            </button>
          </div>
          <p className="install-note">
            <small>La app se abrirá directamente en el login</small>
          </p>
        </div>
        <button 
          className="close-install"
          onClick={handleDismiss}
          aria-label="Cerrar"
        >
          ×
        </button>
      </div>
    </div>
  );
};

export default InstallPWA;