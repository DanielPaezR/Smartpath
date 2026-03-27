// frontend/src/components/common/InstallPWA.tsx
import React, { useEffect, useState } from 'react';
import './InstallPWA.css';

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
    // Verificar si ya está instalada
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
    }, 24 * 60 * 60 * 1000);
  };

  // No mostrar si ya está instalada
  if (isInstalled) return null;

  // No mostrar si el usuario ya la desestimó
  if (!showInstallButton) return null;

  return (
    <button 
      onClick={handleInstallClick}
      className="install-pwa-button"
      aria-label="Instalar aplicación"
    >
      📲 Instalar SmartPath
    </button>
  );
};

export default InstallPWA;