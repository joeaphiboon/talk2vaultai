import React from 'react';
import { AppIcon } from './Icons';

interface WelcomeScreenProps {
  onSettingsClick: () => void;
  hasApiKey: boolean;
  hasVaultFiles: boolean;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onSettingsClick, hasApiKey, hasVaultFiles }) => {
  return (
    <div className="absolute inset-0 flex items-center justify-center p-6">
      <div className="text-center max-w-md mx-auto">
        {/* App Icon */}
        <div className="mb-6 flex justify-center">
          <div className="p-3 bg-gradient-accent rounded-2xl animate-pulse">
            <AppIcon className="h-12 w-12 text-white" />
          </div>
        </div>

        {/* Main Title */}
        <h1 className="text-2xl sm:text-3xl font-bold text-text-primary mb-2">
          Talk2MyVault
        </h1>

        {/* Powered by */}
        <p className="text-xs text-text-muted mb-6">
          powered by JTIAPBN.Ai
        </p>

        {/* Setup Status */}
        {(!hasApiKey || !hasVaultFiles) && (
          <div className="space-y-3 mb-6">
            {!hasApiKey && (
              <div className="flex items-center justify-center gap-3">
                <div className="w-2 h-2 bg-error rounded-full"></div>
                <span className="text-sm text-text-secondary">API Key Required</span>
              </div>
            )}
            {!hasVaultFiles && (
              <div className="flex items-center justify-center gap-3">
                <div className="w-2 h-2 bg-warning rounded-full"></div>
                <span className="text-sm text-text-secondary">Vault Files Not Selected</span>
              </div>
            )}
          </div>
        )}

        {hasApiKey && hasVaultFiles && (
          <p className="text-text-secondary">Ready to chat with your notes!</p>
        )}
      </div>
    </div>
  );
};

export default WelcomeScreen;