import React from 'react';
import { BrainCircuitIcon, SettingsIcon } from './Icons';

interface WelcomeScreenProps {
  onSettingsClick: () => void;
  hasApiKey: boolean;
  hasVaultFiles: boolean;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onSettingsClick, hasApiKey, hasVaultFiles }) => {
  return (
    <div className="flex-1 flex items-center justify-center p-6 animate-fadeIn">
      <div className="text-center max-w-lg mx-auto">
        {/* App Icon */}
        <div className="mb-8 flex justify-center">
          <div className="p-6 bg-gradient-accent rounded-3xl shadow-glow-lg animate-pulse">
            <BrainCircuitIcon className="h-20 w-20 text-white" />
          </div>
        </div>

        {/* Main Title */}
        <h1 className="text-4xl sm:text-5xl font-bold text-text-primary mb-4 bg-gradient-to-r from-text-primary to-accent-light bg-clip-text text-transparent">
          Talk2MyVault
        </h1>

        {/* Subtitle */}
        <p className="text-xl sm:text-2xl text-text-secondary mb-3 font-medium">
          Chat with your Obsidian Vault using AI
        </p>

        {/* Powered by */}
        <p className="text-sm text-text-muted mb-10 font-medium">
          powered by JTIAPBN.Ai
        </p>

        {/* Setup Status */}
        <div className="space-y-4 mb-10">
          <div className="flex items-center justify-center gap-4">
            <div className={`w-4 h-4 rounded-full shadow-glow ${hasApiKey ? 'bg-success animate-pulse' : 'bg-error animate-pulse'}`}></div>
            <span className="text-base text-text-secondary font-medium">
              {hasApiKey ? 'API Key Configured' : 'API Key Required'}
            </span>
          </div>
          
          <div className="flex items-center justify-center gap-4">
            <div className={`w-4 h-4 rounded-full shadow-glow ${hasVaultFiles ? 'bg-success animate-pulse' : 'bg-warning animate-pulse'}`}></div>
            <span className="text-base text-text-secondary font-medium">
              {hasVaultFiles ? 'Vault Files Loaded' : 'Vault Files Not Selected'}
            </span>
          </div>
        </div>

        {/* Setup Instructions */}
        {(!hasApiKey || !hasVaultFiles) && (
          <div className="glass-card rounded-2xl p-6 mb-8 animate-slideUp">
            <h3 className="text-text-primary font-bold mb-4 text-lg">Get Started</h3>
            <div className="text-sm text-text-secondary space-y-2">
              {!hasApiKey && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-error rounded-full"></div>
                  <p>Set your Gemini API key in settings</p>
                </div>
              )}
              {!hasVaultFiles && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-warning rounded-full"></div>
                  <p>Select your Obsidian vault folder</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Settings Button */}
        <button
          onClick={onSettingsClick}
          className="bg-gradient-accent text-white font-bold px-8 py-4 rounded-2xl hover:shadow-glow-lg transition-all duration-200 flex items-center gap-3 mx-auto text-lg"
        >
          <SettingsIcon className="h-6 w-6" />
          Open Settings
        </button>

        {/* Additional Info */}
        <div className="mt-10 text-sm text-text-muted">
          <p className="font-medium">Select your Obsidian vault folder and start chatting with your notes using AI</p>
        </div>
      </div>
    </div>
  );
};

export default WelcomeScreen;