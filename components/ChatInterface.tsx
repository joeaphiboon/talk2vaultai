import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../types';
import Message from './Message';
import { SendIcon, SettingsIcon, AppIcon, ClearIcon } from './Icons';
import WelcomeScreen from './WelcomeScreen';

interface ChatInterfaceProps {
  messages: ChatMessage[];
  currentAiResponse: string;
  isLoading: boolean;
  error: string;
  vaultFileCount: number;
  hasApiKey: boolean;
  onSubmit: (prompt: string) => void;
  onSettingsClick: () => void;
  onClearConversation: () => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  messages,
  currentAiResponse,
  isLoading,
  error,
  vaultFileCount,
  hasApiKey,
  onSubmit,
  onSettingsClick,
  onClearConversation,
}) => {
  const [prompt, setPrompt] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, currentAiResponse]);

  // Auto-focus textarea after AI response completes
  useEffect(() => {
    if (!isLoading && messages.length > 0) {
      textareaRef.current?.focus();
    }
  }, [isLoading, messages.length]);
  
  // Reset textarea height when prompt is cleared
  useEffect(() => {
    if (!prompt && textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
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
          <div className="hidden sm:flex items-center gap-2 px-2 py-1 bg-secondary/50 rounded-lg border border-border">
            <div className="w-1.5 h-1.5 bg-success rounded-full animate-pulse"></div>
            <span className="text-xs text-text-secondary">{vaultFileCount} notes</span>
          </div>
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
            hasApiKey={hasApiKey}
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

      {/* 3. Text Input */}
      <footer className="w-full px-2 py-2 glass border-t border-border">
        <form onSubmit={handleSubmit} className="w-full max-w-4xl mx-auto">
          <div className="relative group">
            <textarea
              ref={textareaRef}
              value={prompt}
              onChange={(e) => {
                setPrompt(e.target.value);
                // Auto-resize textarea
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px';
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              placeholder="ถามคำถามเกี่ยวกับบันทึกของคุณ... (Ask a question about your notes...)"
              className="w-full px-3 py-2.5 pr-12 text-sm glass-effect border-2 border-gray-600/50 rounded-2xl focus:border-accent focus:bg-gray-700 outline-none transition-smooth text-text-primary placeholder-text-secondary resize-none"
              rows={1}
              style={{ minHeight: '36px', maxHeight: '100px' }}
            />
            <button
              type="submit"
              disabled={isLoading || !prompt.trim() || !hasApiKey}
              className="absolute inset-y-0 right-0 flex items-center justify-center w-10 h-10 my-auto mr-1 bg-gradient-accent hover:opacity-90 text-white rounded-xl hover:scale-105 transform transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-accent/50 disabled:opacity-50 disabled:scale-100 shadow-lg group-hover:shadow-xl"
              title={!hasApiKey ? 'Set API key first' : 'Send message'}
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <SendIcon className="h-4 w-4" />
              )}
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