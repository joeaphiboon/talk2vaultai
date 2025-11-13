
import React, { useState, useRef, useEffect } from 'react';
import { Settings } from '../types';
import { CloseIcon, FolderIcon } from './Icons';
// Removed: import { verifyApiKey } from '../services/geminiService';

interface SettingsModalProps {
  settings: Settings;
  onSave: (settings: Settings) => void;
  onClose: () => void;
  onFilesSelected: (fileList: FileList | null) => void;
  onClear: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ settings, onSave, onClose, onFilesSelected, onClear }) => {
  // Removed apiKey from currentSettings
  const [currentSettings, setCurrentSettings] = useState<Settings>(settings);
  const [fileName, setFileName] = useState<string>('');
  // Removed isVerifying and verificationStatus states
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update current settings when settings prop changes
  useEffect(() => {
    // Filter out apiKey if it's still present in the prop, to avoid re-introducing it
    const { apiKey, ...restOfSettings } = settings;
    setCurrentSettings(restOfSettings);
  }, [settings]);

  // Removed handleApiKeyChange and handleVerifyApiKey functions

  const handleSave = () => {
    // Ensure only relevant settings are passed back
    const { apiKey, ...settingsToSave } = currentSettings;
    onSave(settingsToSave);
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
          {/* Removed API Key input section */}

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
