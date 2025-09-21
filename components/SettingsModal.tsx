
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
    <div className="fixed inset-0 bg-primary/80 backdrop-blur-sm flex justify-center items-center z-50 animate-fadeIn p-4">
      <div className="bg-secondary rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto border border-accent/20">
        <div className="flex justify-between items-center p-6 pb-4">
          <h2 className="text-xl sm:text-2xl font-bold text-text-primary">Settings</h2>
          <button onClick={onClose} className="text-text-secondary hover:text-accent transition-colors p-1 rounded-lg hover:bg-accent/10">
            <CloseIcon className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>
        </div>

        <div className="px-6 pb-6 space-y-4 sm:space-y-6">
          <div>
            <label htmlFor="apiKey" className="block text-sm font-medium text-text-secondary mb-2">
              Gemini API Key
            </label>
            <input
              id="apiKey"
              type="password"
              value={currentSettings.apiKey}
              onChange={(e) => setCurrentSettings({ ...currentSettings, apiKey: e.target.value })}
              placeholder="Enter your Gemini API key"
              className="w-full bg-primary border border-accent/30 rounded-lg p-3 text-text-primary focus:ring-2 focus:ring-accent focus:outline-none"
            />
            <p className="text-xs text-text-secondary mt-1">
              Get your API key from <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">Google AI Studio</a>
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
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
              className="w-full bg-primary border border-accent/30 rounded-lg p-3 text-text-primary hover:bg-accent/10 transition-colors flex justify-between items-center"
            >
              <span>{fileName || 'Browse for folder...'}</span>
              <FolderIcon className="h-5 w-5" />
            </button>
          </div>

        </div>

        <div className="px-6 pb-6 pt-4 flex flex-col sm:flex-row gap-3 sm:gap-0 sm:justify-between">
          <button
            onClick={onClear}
            className="bg-red-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-red-700 transition-colors text-sm sm:text-base"
          >
            Clear All
          </button>
          <button
            onClick={handleSave}
            className="bg-accent text-primary font-bold py-3 px-6 rounded-lg hover:bg-accent-hover transition-colors text-sm sm:text-base"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
