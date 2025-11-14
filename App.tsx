import React, { useState, useCallback, useEffect } from 'react';
import { ChatMessage, Settings, VaultFile, UsageStatus } from './types';
import ChatInterface from './components/ChatInterface';
import SettingsModal from './components/SettingsModal';
import InstallPrompt from './components/InstallPrompt';
// Removed: import { getStreamingResponse } from './services/geminiService';
import { getOrCreateGuestId } from './services/geminiService'; // Import guest ID helper
import { readFilesFromInput } from './services/fileService';
import { loadSettings, saveSettings, clearSettings, loadVaultFiles, saveVaultFiles } from './services/storageService';
import { fetchUsageStatus } from './services/usageService';

const App: React.FC = () => {
  // Removed apiKey from settings state
  const [settings, setSettings] = useState<Settings>({
    // apiKey: '', // Removed
    vaultSource: 'local',
    model: 'gemini-1.5-flash-8b-latest', // Default to Gemini Flash Lite (8B) latest
  });
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [vaultFiles, setVaultFiles] = useState<VaultFile[]>([]);
  const [vaultFileCount, setVaultFileCount] = useState<number>(0);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentAiResponse, setCurrentAiResponse] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [usage, setUsage] = useState<UsageStatus | null>(null);


  // Mobile viewport height fix
  useEffect(() => {
    const setViewportHeight = () => {
      const root = document.getElementById('root');
      if (root && window.visualViewport) {
        root.style.height = `${window.visualViewport.height}px`;
        window.scrollTo(0, 0);
      }
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', setViewportHeight);
    }

    setViewportHeight();

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', setViewportHeight);
      }
    };
  }, []);


  // Load settings and vault files from localStorage on component mount
  useEffect(() => {
    const savedSettings = loadSettings();
    if (savedSettings) {
      // Ensure apiKey is not loaded from old settings if it's no longer managed client-side
      const { apiKey, ...restOfSettings } = savedSettings;
      setSettings(restOfSettings);
    }
    
    const savedVaultFiles = loadVaultFiles();
    if (savedVaultFiles.length > 0) {
      setVaultFiles(savedVaultFiles);
    }
  }, []);

  // Fetch usage on mount and every 30s
  useEffect(() => {
    const load = async () => {
      try { setUsage(await fetchUsageStatus()); } catch {}
    };
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, []);



  const handleSaveSettings = (newSettings: Settings) => {
    setSettings(newSettings);
    saveSettings(newSettings); // Save settings that are still client-managed (e.g., model, vaultSource)
    setIsSettingsModalOpen(false);
    setError('');
    setStatus('');
  };

  const handleClearSettings = () => {
    clearSettings();
    setSettings({
      // apiKey: '', // Removed
      vaultSource: 'local',
      model: 'gemini-1.5-flash-8b-latest',
    });
  };

  const handleClearConversation = () => {
    setMessages([]);
    setCurrentAiResponse('');
    setError('');
    setStatus('');
  };

  const handleFilesSelected = async (fileList: FileList | null) => {
    if (fileList) {
      setIsLoading(true);
      setError('');
      setStatus('');
      try {
        // 1) Read files locally (old behavior) so we always have an in-memory vault
        const files = await readFilesFromInput(fileList);
        setVaultFiles(files);
        saveVaultFiles(files);
        setVaultFileCount(files.length);

        // 2) Also send files to backend upload endpoint for server-side storage
        const formData = new FormData();
        for (let i = 0; i < fileList.length; i++) {
          const file = fileList[i];
          if (file.name.endsWith('.md')) {
            formData.append('files', file);
          }
        }

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error('Failed to upload vault files');
        }

        const data = await response.json();
        setStatus(`Vault uploaded successfully: ${data.files} files`);
      } catch (e) {
        setError('Failed to upload vault files.');
        setStatus('');
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleSubmitMessage = useCallback(async (prompt: string) => {
    if (!prompt.trim() || isLoading) return;

    // Removed API key check: Backend will handle authentication/authorization
    // if (!settings.apiKey.trim()) {
    //   setError('Please set your Gemini API key in the settings.');
    //   setIsSettingsModalOpen(true);
    //   return;
    // }

    // Match previous backup behavior: require a local vault selection
    if (vaultFiles.length === 0) {
      setError('Please select your Obsidian vault folder in the settings.');
      setIsSettingsModalOpen(true);
      return;
    }

    setError('');
    setStatus('');
    setIsLoading(true);
    setCurrentAiResponse('');

    const userMessage: ChatMessage = { role: 'user', content: prompt };
    setMessages(prev => [...prev, userMessage]);

    // Simple RAG: concatenate all file content (same as previous backup).
    const context = vaultFiles
      .map(file => `--- NOTE: ${file.name} ---\n${file.content}`)
      .join('\n\n');

    try {
      // --- Call the backend proxy endpoint ---
      const guestId = getOrCreateGuestId(); // Get guest ID for the cookie
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        // If user is logged in, you'd add an Authorization header here.
        // For guests, the httpOnly cookie will be sent automatically.
        // If guest_id cookie is not httpOnly, you might need to send it explicitly:
        // 'X-Guest-ID': guestId,
      };

      // Example: If you have a JWT token for logged-in users
      // const authToken = localStorage.getItem('authToken'); // Or from context/auth provider
      // if (authToken) {
      //   headers['Authorization'] = `Bearer ${authToken}`;
      // }

      const response = await fetch('/api/proxy/chat', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({ prompt, context, model: settings.model }), // Pass model + local context
      });

      if (!response.ok) {
        // Try to parse JSON error; if HTML, fall back to text using a clone
        let message = '';
        const clone = response.clone();
        try {
          const errorData = await response.json();
          const detail = (errorData && (errorData.detail || errorData.error)) || '';
          message = [errorData?.message, detail].filter(Boolean).join(' - ');
        } catch {
          try { message = await clone.text(); } catch { message = ''; }
        }
        if (response.status === 403) {
          throw new Error(message || 'Quota exceeded. Please sign up or contact support.');
        }
        throw new Error(message || `HTTP error! status: ${response.status}`);
      }

      // Expect JSON payload { response: string }
      const data = await response.json();
      const fullResponse: string = typeof data === 'string' ? data : (data?.response ?? '');
      setCurrentAiResponse(fullResponse);
      // Update usage if present in response; otherwise refresh
      if (data?.rateLimit && data?.quota) {
        setUsage({ rateLimit: data.rateLimit, quota: data.quota });
      } else {
        try { setUsage(await fetchUsageStatus()); } catch {}
      }

      const aiMessage: ChatMessage = { role: 'model', content: fullResponse };
      setMessages(prev => [...prev, aiMessage]);

    } catch (e: any) {
      console.error(e);
      const errorMessage = `Error: ${e.message || 'Failed to get response from AI.'}`;
      setError(errorMessage);
      const errorResponseMessage: ChatMessage = { role: 'model', content: errorMessage };
      setMessages(prev => [...prev, errorResponseMessage]);
    } finally {
      setIsLoading(false);
      setCurrentAiResponse('');
    }
  }, [isLoading, settings.model, vaultFiles]); // Depend on vaultFiles like previous backup

  return (
    <div className="bg-gradient-to-br from-background via-background to-background/50 text-text-primary h-screen flex flex-col font-sans relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-0 left-0 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-accent-light/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>
      
      <ChatInterface
        messages={messages}
        currentAiResponse={currentAiResponse}
        isLoading={isLoading}
        error={error}
        status={status}
        onSubmit={handleSubmitMessage}
        onSettingsClick={() => setIsSettingsModalOpen(true)}
        onClearConversation={handleClearConversation}
        vaultFileCount={vaultFileCount}
        // Removed hasApiKey prop
        usage={usage || undefined}
      />
      {isSettingsModalOpen && (
        <SettingsModal
          settings={settings}
          onSave={handleSaveSettings}
          onClose={() => setIsSettingsModalOpen(false)}
          onFilesSelected={handleFilesSelected}
          onClear={handleClearSettings}
        />
      )}
      <InstallPrompt />
    </div>
  );
};

export default App;
