
import React, { useState, useRef, useEffect } from 'react';
import { Settings } from '../types';
import { CloseIcon, FolderIcon } from './Icons';
import { verifyApiKey } from '../services/geminiService';

interface SettingsModalProps {
  settings: Settings;
  onSave: (settings: Settings) => void;
  onClose: () => void;
  onFilesSelected: (fileList: FileList | null) => void;
  onClear: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ settings, onSave, onClose, onFilesSelected, onClear }) => {
  const [currentSettings, setCurrentSettings] = useState<Settings>(settings);
  const [fileName, setFileName] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'verifying' | 'valid' | 'invalid'>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update current settings when settings prop changes
  useEffect(() => {
    setCurrentSettings(settings);
  }, [settings]);

  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newApiKey = e.target.value;
    setCurrentSettings({ ...currentSettings, apiKey: newApiKey });
    setVerificationStatus('idle');
  };

  const handleVerifyApiKey = async () => {
    if (!currentSettings.apiKey.trim()) {
      setVerificationStatus('invalid');
      return;
    }

    setIsVerifying(true);
    setVerificationStatus('verifying');

    try {
      const isValid = await verifyApiKey(currentSettings.apiKey, currentSettings.model);
      setVerificationStatus(isValid ? 'valid' : 'invalid');
    } catch (error) {
      console.error('API key verification error:', error);
      setVerificationStatus('invalid');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSave = () => {
    onSave(currentSettings);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setFileName(`${files.length} files selected`);
      onFilesSelected(files);
    }
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="fixed inset-0 bg-primary/90 backdrop-blur-md flex justify-center items-start sm:items-center z-50 animate-fadeIn p-2 sm:p-4 overflow-y-auto">
      <div className="glass-card rounded-2xl sm:rounded-3xl shadow-glow-lg w-full max-w-lg my-4 sm:my-0 max-h-[95vh] overflow-y-auto border border-border">
        <div className="flex justify-between items-center p-4 sm:p-8 pb-4 sm:pb-6 sticky top-0 bg-secondary/80 backdrop-blur-sm rounded-t-2xl sm:rounded-t-3xl">
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-text-primary">Settings</h2>
          <button onClick={onClose} className="text-text-secondary hover:text-accent transition-all duration-200 p-2 rounded-xl hover:bg-accent/10 hover:shadow-glow">
            <CloseIcon className="h-5 w-5 sm:h-6 sm:w-6 lg:h-7 lg:w-7" />
          </button>
        </div>

        <div className="px-4 sm:px-8 pb-6 sm:pb-8 space-y-4 sm:space-y-6 lg:space-y-8">
          <div className="animate-slideUp">
            <label htmlFor="apiKey" className="block text-base font-semibold text-text-primary mb-3">
              Gemini API Key
            </label>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-2">
              <input
                id="apiKey"
                type="password"
                value={currentSettings.apiKey}
                onChange={handleApiKeyChange}
                placeholder="Enter your Gemini API key"
                className={`flex-1 glass-input rounded-xl p-3 sm:p-4 text-text-primary focus:outline-none text-sm sm:text-base ${
                  verificationStatus === 'valid' ? 'border-success' : 
                  verificationStatus === 'invalid' ? 'border-error' : ''
                }`}
              />
              <button
                onClick={handleVerifyApiKey}
                disabled={isVerifying || !currentSettings.apiKey.trim()}
                className={`px-3 sm:px-4 py-2 sm:py-2 rounded-xl font-medium transition-all duration-200 text-sm sm:text-base whitespace-nowrap ${
                  verificationStatus === 'valid' 
                    ? 'bg-success text-white' 
                    : verificationStatus === 'invalid'
                    ? 'bg-error text-white'
                    : 'bg-accent text-white hover:bg-accent-hover'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isVerifying ? 'Verifying...' : 
                 verificationStatus === 'valid' ? '✓ Valid' :
                 verificationStatus === 'invalid' ? '✗ Invalid' : 'Verify'}
              </button>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <p className="text-sm text-text-secondary">
                Get your API key from <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline font-medium">Google AI Studio</a>
              </p>
              {verificationStatus === 'valid' && (
                <span className="text-xs text-success font-medium">✓ API key verified</span>
              )}
              {verificationStatus === 'invalid' && (
                <span className="text-xs text-error font-medium">✗ Invalid API key</span>
              )}
            </div>
          </div>

          <div className="animate-slideUp" style={{ animationDelay: '0.1s' }}>
            <label htmlFor="model" className="block text-base font-semibold text-text-primary mb-3">
              Gemini Model
            </label>
            <select
              id="model"
              value={currentSettings.model}
              onChange={(e) => setCurrentSettings({ ...currentSettings, model: e.target.value })}
              className="w-full glass-input rounded-xl p-3 sm:p-4 text-text-primary focus:outline-none text-sm sm:text-base border border-border focus:border-accent"
            >
              <option value="gemini-flash-latest">Gemini Flash Latest</option>
              <option value="gemini-flash-lite-latest">Gemini Flash Lite Latest</option>
            </select>
            <p className="mt-2 text-sm text-text-secondary">
              Choose between the full Gemini Flash model or the lighter Flash Lite version for faster responses.
            </p>
          </div>

          <div className="animate-slideUp" style={{ animationDelay: '0.2s' }}>
            <label className="block text-base font-semibold text-text-primary mb-3">
              Select Vault Folder
            </label>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              // @ts-ignore
              webkitdirectory="true"
              directory="true"
              multiple
            />
            <button
              onClick={handleBrowseClick}
              className="w-full glass-input rounded-xl p-3 sm:p-4 text-text-primary hover:bg-accent/10 transition-all duration-200 flex justify-between items-center hover:shadow-glow"
            >
              <span className="font-medium text-sm sm:text-base truncate">{fileName || 'Browse for folder...'}</span>
              <FolderIcon className="h-5 w-5 sm:h-6 sm:w-6 text-accent flex-shrink-0" />
            </button>
          </div>

        </div>

        <div className="px-4 sm:px-8 pb-6 sm:pb-8 pt-4 sm:pt-6 flex flex-col sm:flex-row gap-3 sm:gap-4 lg:gap-0 sm:justify-between sticky bottom-0 bg-secondary/80 backdrop-blur-sm rounded-b-2xl sm:rounded-b-3xl">
          <button
            onClick={onClear}
            className="bg-error text-white font-bold py-3 sm:py-4 px-6 sm:px-8 rounded-xl hover:bg-error/90 transition-all duration-200 text-sm sm:text-base hover:shadow-glow animate-slideUp order-2 sm:order-1"
            style={{ animationDelay: '0.3s' }}
          >
            Clear All
          </button>
          <button
            onClick={handleSave}
            className="bg-gradient-accent text-white font-bold py-3 sm:py-4 px-6 sm:px-8 rounded-xl hover:shadow-glow-lg transition-all duration-200 text-sm sm:text-base animate-slideUp order-1 sm:order-2"
            style={{ animationDelay: '0.4s' }}
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
