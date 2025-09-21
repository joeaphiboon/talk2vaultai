
import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../types';
import Message from './Message';
import { SendIcon, MicIcon, SettingsIcon, BrainCircuitIcon } from './Icons';
import useSpeechToText from '../hooks/useSpeechToText';

interface ChatInterfaceProps {
  messages: ChatMessage[];
  currentAiResponse: string;
  isLoading: boolean;
  error: string;
  vaultFileCount: number;
  onSubmit: (prompt: string) => void;
  onSettingsClick: () => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  messages,
  currentAiResponse,
  isLoading,
  error,
  vaultFileCount,
  onSubmit,
  onSettingsClick,
}) => {
  const [prompt, setPrompt] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { isListening, transcript, startListening, stopListening, isInterim } = useSpeechToText({ 
    autoDetectLanguage: true 
  });

  useEffect(() => {
    if (transcript) {
      setPrompt(transcript);
    }
  }, [transcript]);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages, currentAiResponse]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim()) {
      onSubmit(prompt);
      setPrompt('');
    }
  };

  const handleMicClick = () => {
    if (isListening) {
      stopListening();
    } else {
      setPrompt('');
      startListening();
    }
  };

  return (
    <div className="flex flex-col h-screen max-h-screen w-full mx-auto">
      <header className="flex justify-between items-center p-3 sm:p-4 border-b border-secondary bg-primary/95 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-2 sm:gap-3">
          <BrainCircuitIcon className="h-6 w-6 sm:h-8 sm:w-8 text-accent" />
          <h1 className="text-lg sm:text-xl font-bold text-text-primary">Talk2MyVault</h1>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          <span className="text-xs sm:text-sm text-text-secondary hidden sm:block">{vaultFileCount} notes</span>
          <button 
            onClick={onSettingsClick} 
            className="text-text-secondary hover:text-accent transition-colors p-1 rounded-lg hover:bg-accent/10"
          >
            <SettingsIcon className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4 sm:space-y-6">
        {messages.map((msg, index) => (
          <Message key={index} role={msg.role} content={msg.content} />
        ))}
        {currentAiResponse && <Message role="model" content={currentAiResponse} isStreaming />}
        {isLoading && messages.length > 0 && messages[messages.length - 1].role === 'user' && !currentAiResponse && (
           <Message role="model" content="" isLoading />
        )}
        <div ref={messagesEndRef} />
      </main>

      {error && (
        <div className="mx-3 sm:mx-4 mb-3 sm:mb-4 px-3 py-2 text-red-400 bg-red-900/50 border border-red-500 rounded-lg text-sm">
          {error}
        </div>
      )}

      <footer className="p-3 sm:p-4 bg-primary/95 backdrop-blur-sm border-t border-secondary">
        <form onSubmit={handleSubmit} className="flex items-end gap-2 bg-secondary rounded-xl p-2 focus-within:ring-2 focus-within:ring-accent transition-shadow">
          <div className="flex-1 min-w-0">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              placeholder="ถามคำถามเกี่ยวกับบันทึกของคุณ... (Ask a question about your notes...)"
              className="w-full bg-transparent p-2 text-text-primary placeholder-text-secondary focus:outline-none resize-none max-h-32 text-sm sm:text-base"
              rows={1}
              disabled={isLoading}
            />
            {isListening && (
              <div className="px-2 pb-1 text-xs text-accent flex items-center gap-1">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                {isInterim ? 'Listening...' : 'Processing...'}
              </div>
            )}
          </div>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={handleMicClick}
              className={`p-2 sm:p-3 rounded-full transition-colors ${isListening ? 'bg-red-500 text-white animate-pulse' : 'text-text-secondary hover:bg-accent-hover/20 hover:text-accent'}`}
              disabled={isLoading}
              title={isListening ? 'Stop recording' : 'Start voice input'}
            >
              <MicIcon className="h-5 w-5 sm:h-6 sm:w-6" />
            </button>
            <button
              type="submit"
              className="bg-accent text-primary p-2 sm:p-3 rounded-lg hover:bg-accent-hover disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors"
              disabled={isLoading || !prompt.trim()}
              title="Send message"
            >
              <SendIcon className="h-5 w-5 sm:h-6 sm:w-6" />
            </button>
          </div>
        </form>
      </footer>
    </div>
  );
};

export default ChatInterface;
