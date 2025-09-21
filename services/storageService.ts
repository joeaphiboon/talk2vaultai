import { Settings, VaultFile } from '../types';

const SETTINGS_STORAGE_KEY = 'talk2myvault-settings';
const VAULT_FILES_STORAGE_KEY = 'talk2myvault-vault-files';

export const saveSettings = (settings: Settings): void => {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Failed to save settings to localStorage:', error);
  }
};

export const loadSettings = (): Settings | null => {
  try {
    const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored) as Settings;
    }
  } catch (error) {
    console.error('Failed to load settings from localStorage:', error);
  }
  return null;
};

export const saveVaultFiles = (vaultFiles: VaultFile[]): void => {
  try {
    localStorage.setItem(VAULT_FILES_STORAGE_KEY, JSON.stringify(vaultFiles));
  } catch (error) {
    console.error('Failed to save vault files to localStorage:', error);
  }
};

export const loadVaultFiles = (): VaultFile[] => {
  try {
    const stored = localStorage.getItem(VAULT_FILES_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored) as VaultFile[];
    }
  } catch (error) {
    console.error('Failed to load vault files from localStorage:', error);
  }
  return [];
};

export const clearSettings = (): void => {
  try {
    localStorage.removeItem(SETTINGS_STORAGE_KEY);
    localStorage.removeItem(VAULT_FILES_STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear settings from localStorage:', error);
  }
};