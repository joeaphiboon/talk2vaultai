
import React, { useState, useCallback, useEffect } from 'react';
import { ChatMessage, Settings, VaultFile } from './types';
import ChatInterface from './components/ChatInterface';
import SettingsModal from './components/SettingsModal';
import InstallPrompt from './components/InstallPrompt';
import { getStreamingResponse } from './services/geminiService';
import { readFilesFromInput } from './services/fileService';
import { loadSettings, saveSettings, clearSettings, loadVaultFiles, saveVaultFiles } from './services/storageService';

const App: React.FC = () => {
  const [settings, setSettings] = useState<Settings>({
    apiKey: '',
    vaultSource: 'local',
  });
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [vaultFiles, setVaultFiles] = useState<VaultFile[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentAiResponse, setCurrentAiResponse] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  // Load settings and vault files from localStorage on component mount
  useEffect(() => {
    const savedSettings = loadSettings();
    if (savedSettings) {
      setSettings(savedSettings);
    }
    
    const savedVaultFiles = loadVaultFiles();
    if (savedVaultFiles.length > 0) {
      setVaultFiles(savedVaultFiles);
    }
  }, []);

  const handleSaveSettings = (newSettings: Settings) => {
    setSettings(newSettings);
    saveSettings(newSettings);
    setIsSettingsModalOpen(false);
    setError('');
  };

  const handleClearSettings = () => {
    clearSettings();
    setSettings({
      apiKey: '',
      vaultSource: 'local',
    });
    setVaultFiles([]);
    setMessages([]);
    setError('');
  };

  const handleClearConversation = () => {
    setMessages([]);
    setCurrentAiResponse('');
    setError('');
  };

  const handleFilesSelected = async (fileList: FileList | null) => {
    if (fileList) {
      setIsLoading(true);
      setError('');
      try {
        const files = await readFilesFromInput(fileList);
        setVaultFiles(files);
        saveVaultFiles(files);
      } catch (e) {
        setError('Failed to read vault files.');
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleSubmitMessage = useCallback(async (prompt: string) => {
    if (!prompt.trim() || isLoading) return;

    if (!settings.apiKey.trim()) {
      setError('Please set your Gemini API key in the settings.');
      setIsSettingsModalOpen(true);
      return;
    }

    if (vaultFiles.length === 0) {
      setError('Please select your Obsidian vault folder in the settings.');
      setIsSettingsModalOpen(true);
      return;
    }

    setError('');
    setIsLoading(true);
    setCurrentAiResponse('');

    const userMessage: ChatMessage = { role: 'user', content: prompt };
    setMessages(prev => [...prev, userMessage]);

    // Simple RAG: concatenate all file content.
    // For a real app, you'd use vector search to find relevant chunks.
    const context = vaultFiles.map(file => `--- NOTE: ${file.name} ---\n${file.content}`).join('\n\n');

    try {
      const stream = await getStreamingResponse(prompt, context, settings.apiKey);
      
      let fullResponse = '';
      for await (const chunk of stream) {
        const text = chunk.text;
        fullResponse += text;
        setCurrentAiResponse(fullResponse);
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
  }, [isLoading, vaultFiles, settings.apiKey]);

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
        onSubmit={handleSubmitMessage}
        onSettingsClick={() => setIsSettingsModalOpen(true)}
        onClearConversation={handleClearConversation}
        vaultFileCount={vaultFiles.length}
        hasApiKey={!!settings.apiKey.trim()}
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
