import React, { useState, useEffect } from 'react';
import { CloseIcon } from './Icons';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const InstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowInstallPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    } else {
      console.log('User dismissed the install prompt');
    }
    
    setDeferredPrompt(null);
    setShowInstallPrompt(false);
  };

  const handleDismiss = () => {
    setShowInstallPrompt(false);
  };

  if (!showInstallPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm bg-secondary border border-accent/30 rounded-xl p-4 shadow-2xl z-50 animate-fadeIn">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-text-primary font-semibold text-sm">Install Talk2MyVault</h3>
          <p className="text-text-secondary text-xs mt-1">
            Install this app for a better experience
          </p>
        </div>
        <button
          onClick={handleDismiss}
          className="text-text-secondary hover:text-accent transition-colors p-1"
        >
          <CloseIcon className="h-4 w-4" />
        </button>
      </div>
      <div className="flex gap-2">
        <button
          onClick={handleInstallClick}
          className="flex-1 bg-accent text-primary font-medium py-2 px-3 rounded-lg hover:bg-accent-hover transition-colors text-sm"
        >
          Install
        </button>
        <button
          onClick={handleDismiss}
          className="px-3 py-2 text-text-secondary hover:text-accent transition-colors text-sm"
        >
          Later
        </button>
      </div>
    </div>
  );
};

export default InstallPrompt;