import React, { useState, useEffect } from 'react';
import { CloseIcon } from './Icons';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const InstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showManualInstall, setShowManualInstall] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      console.log('beforeinstallprompt event fired');
      const promptEvent = e as BeforeInstallPromptEvent;
      
      // Store the event for our custom UI
      setDeferredPrompt(promptEvent);
      setShowInstallPrompt(true);
      
      // Clear the manual install timer since we have an automatic prompt
      setShowManualInstall(false);
      
      // Don't prevent default - let browser show its own prompt
      // We'll show our custom UI alongside it
    };

    const handleAppInstalled = () => {
      console.log('PWA was installed');
      setIsInstalled(true);
      setShowInstallPrompt(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Show manual install option after 3 seconds if no automatic prompt
    const timer = setTimeout(() => {
      if (!deferredPrompt && !isInstalled) {
        console.log('No automatic install prompt, showing manual option');
        setShowManualInstall(true);
      }
    }, 3000);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      clearTimeout(timer);
    };
  }, [deferredPrompt, isInstalled]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      console.log('No deferred prompt available');
      return;
    }

    try {
      console.log('User clicked install, calling prompt()');
      
      // Call the prompt
      await deferredPrompt.prompt();
      
      // Wait for user choice
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('User accepted the install prompt');
      } else {
        console.log('User dismissed the install prompt');
      }
    } catch (error) {
      console.error('Error showing install prompt:', error);
    } finally {
      // Always clean up
      setDeferredPrompt(null);
      setShowInstallPrompt(false);
    }
  };

  const handleDismiss = () => {
    setShowInstallPrompt(false);
  };

  // Don't show if already installed
  if (isInstalled) return null;

  // Show automatic prompt if available
  if (showInstallPrompt && deferredPrompt) {
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
  }

  // Show manual install option if no automatic prompt
  if (showManualInstall) {
    return (
      <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm bg-secondary border border-accent/30 rounded-xl p-4 shadow-2xl z-50 animate-fadeIn">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="text-text-primary font-semibold text-sm">Install Talk2MyVault</h3>
            <p className="text-text-secondary text-xs mt-1">
              Add this app to your home screen
            </p>
          </div>
          <button
            onClick={() => setShowManualInstall(false)}
            className="text-text-secondary hover:text-accent transition-colors p-1"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>
        <div className="text-xs text-text-secondary mb-3">
          <p>• On iOS: Tap Share → Add to Home Screen</p>
          <p>• On Android: Tap Menu → Add to Home Screen</p>
          <p>• On Desktop: Click Install in address bar</p>
        </div>
        <button
          onClick={() => setShowManualInstall(false)}
          className="w-full bg-accent text-primary font-medium py-2 px-3 rounded-lg hover:bg-accent-hover transition-colors text-sm"
        >
          Got it
        </button>
      </div>
    );
  }

  return null;
};

export default InstallPrompt;