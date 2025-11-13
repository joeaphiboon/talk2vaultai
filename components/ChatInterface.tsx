import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../types';
import Message from './Message';
import { SettingsIcon, AppIcon, ClearIcon, PaperAirplaneIcon } from './Icons';
import LoadingSpinner from './LoadingSpinner';
import WelcomeScreen from './WelcomeScreen';

interface ChatInterfaceProps {
  messages: ChatMessage[];
  currentAiResponse: string;
  isLoading: boolean;
  error: string;
  vaultFileCount: number;
  onSubmit: (prompt: string) => void;
  onSettingsClick: () => void;
  onClearConversation: () => void;
  usage?: import('../types').UsageStatus;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  messages,
  currentAiResponse,
  isLoading,
  error,
  vaultFileCount,
  // Removed: hasApiKey,
  onSubmit,
  onSettingsClick,
  onClearConversation,
  usage,
}) => {
  const [prompt, setPrompt] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, currentAiResponse]);

  // Auto-focus input after AI response completes
  useEffect(() => {
    if (!isLoading && messages.length > 0) {
      inputRef.current?.focus();
    }
  }, [isLoading, messages.length]);
  
  // Reset input when prompt is cleared (no height reset needed for input)
  useEffect(() => {
    // Input doesn't need height reset like textarea
  }, [prompt]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim()) {
      onSubmit(prompt);
      setPrompt('');
    }
  };

  return (
    <div className="h-screen flex flex-col">
      {/* 1. Header */}
      <header className="flex justify-between items-center px-4 py-2 sm:px-6 sm:py-3 border-b border-border glass z-20">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="p-1.5 bg-gradient-accent rounded-lg shadow-glow">
            <AppIcon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
          </div>
          <h1 className="text-lg sm:text-xl font-bold text-text-primary">Talk2MyVault</h1>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          {usage && (
            <div className="text-xs text-text-secondary px-2 py-1 rounded-lg border border-border/60">
              RL {usage.rateLimit.remaining}/{usage.rateLimit.limit} · {usage.quota.mode === 'count' ? `Free ${usage.quota.remaining ?? 0}/${usage.quota.total ?? 0}` : `Window ${usage.quota.windowMinutes}m`}
            </div>
          )}
          
          {messages.length > 0 && (
            <button 
              onClick={onClearConversation}
              className="text-text-secondary hover:text-error transition-all duration-200 p-1.5 rounded-lg hover:bg-error/10 hover:shadow-glow"
              title="Clear conversation"
            >
              <ClearIcon className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
          )}
          <button 
            onClick={onSettingsClick} 
            className="text-text-secondary hover:text-accent transition-all duration-200 p-1.5 rounded-lg hover:bg-accent/10 hover:shadow-glow"
            title="Settings"
          >
            <SettingsIcon className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
        </div>
      </header>

      {/* 2. Content Area - Scrollable */}
      <main className="flex-1 overflow-y-auto min-h-0">
        {messages.length === 0 && !currentAiResponse ? (
          <WelcomeScreen 
            onSettingsClick={onSettingsClick}
            hasVaultFiles={vaultFileCount > 0}
          />
        ) : (
          <div className="flex flex-col gap-4 p-4 sm:p-6">
            {messages.map((message, index) => (
              <Message
                key={index}
                role={message.role}
                content={message.content}
                isLoading={false}
              />
            ))}
            {currentAiResponse && (
              <Message
                role="model"
                content={currentAiResponse}
                isStreaming={true}
                isLoading={false}
              />
            )}
            {isLoading && (
              <Message
                role="model"
                content=""
                isLoading={true}
              />
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </main>

      {/* 3. Text Input - Exact DAYQUEST DP Copy */}
      <footer className="w-full px-2 py-2 glass border-t border-border">
        <form onSubmit={handleSubmit} className="w-full max-w-4xl mx-auto">
          <div className="relative group">
            <input
              ref={inputRef}
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ask me anything about your vault..."
              disabled={isLoading}
              className="w-full px-3 py-2.5 pr-12 text-sm glass-effect border-2 border-gray-600/50 rounded-2xl focus-enhanced focus:border-teal-400 focus:bg-gray-700 outline-none transition-smooth text-gray-100 placeholder-gray-400 disabled:opacity-50 shadow-premium hover:shadow-premium-lg hover:border-gray-500"
            />
            <button
              type="submit"
              // Removed !hasApiKey from disabled condition
              disabled={isLoading || !prompt.trim()}
              className="absolute inset-y-0 right-0 flex items-center justify-center w-10 h-10 my-auto mr-1 bg-gradient-to-r from-teal-500 to-blue-500 hover:from-teal-600 hover:to-blue-600 text-white rounded-xl hover:scale-105 transform transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-teal-500/50 disabled:from-gray-500 disabled:to-gray-500 disabled:scale-100 shadow-lg group-hover:shadow-xl"
              aria-label="Send Message"
            >
              {isLoading ? <LoadingSpinner /> : <PaperAirplaneIcon className="w-4 h-4" />}
            </button>
          </div>
        </form>
      </footer>

      {/* Error Display */}
      {error && (
        <div className="fixed top-20 left-4 right-4 z-40">
          <div className="bg-destructive/90 text-destructive-foreground px-4 py-3 rounded-lg shadow-lg border border-destructive/20">
            {error}
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatInterface;