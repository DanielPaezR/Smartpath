// frontend/src/components/common/InstallPWA.tsx
import React, { useEffect, useState } from 'react';
import '../../styles/common/InstallPWA.css';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const InstallPWA: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallButton, setShowInstallButton] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Verificar si ya está instalada
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // Escuchar el evento beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowInstallButton(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Escuchar cuando se instala
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setShowInstallButton(false);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();

    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('Usuario aceptó instalar la PWA');
    } else {
      console.log('Usuario canceló la instalación');
    }

    setDeferredPrompt(null);
    setShowInstallButton(false);
  };

  if (isInstalled || !showInstallButton) return null;

  return (
    <div className="install-pwa-container">
      <div className="install-pwa-card">
        <div className="install-icon">
          <img src="/icon-72x72.png" alt="SmartPath" />
        </div>
        <div className="install-content">
          <h3>Instala SmartPath</h3>
          <p>Instala la aplicación en tu dispositivo para acceso rápido</p>
          <div className="install-actions">
            <button 
              onClick={handleInstallClick}
              className="install-btn"
            >
              📱 Instalar App
            </button>
            <button 
              onClick={() => setShowInstallButton(false)}
              className="later-btn"
            >
              Ahora no
            </button>
          </div>
        </div>
        <button 
          className="close-install"
          onClick={() => setShowInstallButton(false)}
        >
          ×
        </button>
      </div>
    </div>
  );
};

export default InstallPWA;