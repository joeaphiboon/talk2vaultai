
import React, { useState, useRef, useEffect } from 'react';
import { Settings } from '../types';
import { CloseIcon, FolderIcon } from './Icons';

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update current settings when settings prop changes
  useEffect(() => {
    setCurrentSettings(settings);
  }, [settings]);

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
    <div className="fixed inset-0 bg-primary/90 backdrop-blur-md flex justify-center items-center z-50 animate-fadeIn p-4">
      <div className="glass-card rounded-3xl shadow-glow-lg w-full max-w-lg max-h-[90vh] overflow-y-auto border border-border">
        <div className="flex justify-between items-center p-8 pb-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-text-primary">Settings</h2>
          <button onClick={onClose} className="text-text-secondary hover:text-accent transition-all duration-200 p-2 rounded-xl hover:bg-accent/10 hover:shadow-glow">
            <CloseIcon className="h-6 w-6 sm:h-7 sm:w-7" />
          </button>
        </div>

        <div className="px-8 pb-8 space-y-6 sm:space-y-8">
          <div className="animate-slideUp">
            <label htmlFor="apiKey" className="block text-base font-semibold text-text-primary mb-3">
              Gemini API Key
            </label>
            <input
              id="apiKey"
              type="password"
              value={currentSettings.apiKey}
              onChange={(e) => setCurrentSettings({ ...currentSettings, apiKey: e.target.value })}
              placeholder="Enter your Gemini API key"
              className="w-full glass-input rounded-xl p-4 text-text-primary focus:outline-none text-base"
            />
            <p className="text-sm text-text-secondary mt-2">
              Get your API key from <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline font-medium">Google AI Studio</a>
            </p>
          </div>

          <div className="animate-slideUp" style={{ animationDelay: '0.1s' }}>
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
              className="w-full glass-input rounded-xl p-4 text-text-primary hover:bg-accent/10 transition-all duration-200 flex justify-between items-center hover:shadow-glow"
            >
              <span className="font-medium">{fileName || 'Browse for folder...'}</span>
              <FolderIcon className="h-6 w-6 text-accent" />
            </button>
          </div>

        </div>

        <div className="px-8 pb-8 pt-6 flex flex-col sm:flex-row gap-4 sm:gap-0 sm:justify-between">
          <button
            onClick={onClear}
            className="bg-error text-white font-bold py-4 px-8 rounded-xl hover:bg-error/90 transition-all duration-200 text-base hover:shadow-glow animate-slideUp"
            style={{ animationDelay: '0.2s' }}
          >
            Clear All
          </button>
          <button
            onClick={handleSave}
            className="bg-gradient-accent text-white font-bold py-4 px-8 rounded-xl hover:shadow-glow-lg transition-all duration-200 text-base animate-slideUp"
            style={{ animationDelay: '0.3s' }}
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
