import React, { useState, useCallback, useEffect } from 'react';
import { ChatMessage, Settings, VaultFile } from './types';
import ChatInterface from './components/ChatInterface';
import SettingsModal from './components/SettingsModal';
import InstallPrompt from './components/InstallPrompt';
// Removed: import { getStreamingResponse } from './services/geminiService';
import { getOrCreateGuestId } from './services/geminiService'; // Import guest ID helper
import { readFilesFromInput } from './services/fileService';
import { loadSettings, saveSettings, clearSettings, loadVaultFiles, saveVaultFiles } from './services/storageService';
// Removed: import { UsageSnapshot, subscribeToUsage, resetUsage } from './services/usageService';