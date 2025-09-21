import React from 'react';
import { BrainCircuitIcon, SettingsIcon } from './Icons';

interface WelcomeScreenProps {
  onSettingsClick: () => void;
  hasApiKey: boolean;
  hasVaultFiles: boolean;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onSettingsClick, hasApiKey, hasVaultFiles }) => {
  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="text-center max-w-md mx-auto">
        {/* App Icon */}
        <div className="mb-6 flex justify-center">
          <div className="p-4 bg-accent/20 rounded-2xl">
            <BrainCircuitIcon className="h-16 w-16 text-accent" />
          </div>
        </div>

        {/* Main Title */}
        <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mb-3">
          Talk2MyVault
        </h1>

        {/* Subtitle */}
        <p className="text-lg sm:text-xl text-text-secondary mb-2">
          Chat with your Obsidian Vault using AI
        </p>

        {/* Powered by */}
        <p className="text-sm text-text-secondary/70 mb-8">
          powered by JTIAPBN.Ai
        </p>

        {/* Setup Status */}
        <div className="space-y-4 mb-8">
          <div className="flex items-center justify-center gap-3">
            <div className={`w-3 h-3 rounded-full ${hasApiKey ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-sm text-text-secondary">
              {hasApiKey ? 'API Key Configured' : 'API Key Required'}
            </span>
          </div>
          
          <div className="flex items-center justify-center gap-3">
            <div className={`w-3 h-3 rounded-full ${hasVaultFiles ? 'bg-green-500' : 'bg-gray-500'}`}></div>
            <span className="text-sm text-text-secondary">
              {hasVaultFiles ? 'Vault Files Loaded' : 'Vault Files Not Selected'}
            </span>
          </div>
        </div>

        {/* Setup Instructions */}
        {(!hasApiKey || !hasVaultFiles) && (
          <div className="bg-secondary/50 rounded-xl p-4 mb-6">
            <h3 className="text-text-primary font-semibold mb-2">Get Started</h3>
            <div className="text-sm text-text-secondary space-y-1">
              {!hasApiKey && (
                <p>• Set your Gemini API key in settings</p>
              )}
              {!hasVaultFiles && (
                <p>• Select your Obsidian vault folder</p>
              )}
            </div>
          </div>
        )}

        {/* Settings Button */}
        <button
          onClick={onSettingsClick}
          className="bg-accent text-primary font-semibold px-6 py-3 rounded-xl hover:bg-accent-hover transition-colors flex items-center gap-2 mx-auto"
        >
          <SettingsIcon className="h-5 w-5" />
          Open Settings
        </button>

        {/* Additional Info */}
        <div className="mt-8 text-xs text-text-secondary/60">
          <p>Select your Obsidian vault folder and start chatting with your notes using AI</p>
        </div>
      </div>
    </div>
  );
};

export default WelcomeScreen;