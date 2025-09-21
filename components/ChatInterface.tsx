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
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  };

  const scrollToTop = () => {
    const mainElement = document.querySelector('main');
    if (mainElement) {
      mainElement.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Track if user has manually scrolled up
  const [userScrolledUp, setUserScrolledUp] = useState(false);

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
      setUserScrolledUp(false); // Reset scroll state when new message added
    }
  }, [messages.length]);

  // Auto-scroll during AI streaming (always follow the response)
  useEffect(() => {
    if (currentAiResponse && !userScrolledUp) {
      scrollToBottom();
    }
  }, [currentAiResponse, userScrolledUp]);

  // Track manual scrolling
  useEffect(() => {
    const mainElement = document.querySelector('main');
    if (!mainElement) return;

    const handleScroll = () => {
      const isNearBottom = mainElement.scrollTop + mainElement.clientHeight >= mainElement.scrollHeight - 100;
      setUserScrolledUp(!isNearBottom);
    };

    mainElement.addEventListener('scroll', handleScroll);
    return () => mainElement.removeEventListener('scroll', handleScroll);
  }, []);

  // Keyboard detection
  useEffect(() => {
    const updateViewportHeight = () => {
      const height = window.visualViewport?.height || window.innerHeight;
      const fullHeight = window.innerHeight;
      const heightDifference = fullHeight - height;
      
      // Detect keyboard state
      const keyboardOpen = heightDifference > 150; // Threshold for keyboard detection
      setIsKeyboardOpen(keyboardOpen);
      setKeyboardHeight(keyboardOpen ? heightDifference : 0);
      
      // If keyboard just opened, ensure input is visible
      if (keyboardOpen && textareaRef.current) {
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'center' 
            });
          }
        }, 100);
      }
    };

    updateViewportHeight();

    // Listen for viewport changes (keyboard show/hide)
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', updateViewportHeight);
    } else {
      window.addEventListener('resize', updateViewportHeight);
    }

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', updateViewportHeight);
      }
      window.removeEventListener('resize', updateViewportHeight);
    };
  }, []);

  // Auto-focus textarea after AI response completes
  useEffect(() => {
    if (!currentAiResponse && messages.length > 0) {
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
        }
      }, 500);
    }
  }, [currentAiResponse, messages.length]);

  // Reset textarea height when prompt is cleared
  useEffect(() => {
    if (!prompt && textareaRef.current) {
      textareaRef.current.style.height = '36px';
    }
  }, [prompt]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim()) {
      onSubmit(prompt);
      setPrompt('');
      
      // Force focus on AI response and follow to end
      setUserScrolledUp(false);
      setTimeout(() => {
        scrollToBottom();
      }, 100);
    }
  };

  const handleTextareaFocus = () => {
    if (textareaRef.current) {
      // Force focus immediately
      textareaRef.current.focus();
      
      // Scroll input into view to ensure it's visible
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
          });
        }
      }, 100);
      
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
          });
        }
      }, 300);
      
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
          });
        }
      }, 600);
    }
  };

  return (
    <div className="h-screen flex flex-col">
      {/* 1. Header - Fixed */}
      <header className="flex justify-between items-center px-4 py-2 sm:px-6 sm:py-3 border-b border-border glass fixed top-0 left-0 right-0 z-20">
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
      <main 
        className="flex-1 overflow-y-auto pt-16"
        style={{
          height: 'calc(100vh - 60px - 80px)',
          paddingBottom: isKeyboardOpen ? `${keyboardHeight + 80}px` : '80px'
        }}
      >
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

      {/* 3. Text Input - Fixed */}
      <footer 
        className="p-3 sm:p-4 glass border-t border-border fixed left-0 right-0 z-30 cursor-pointer"
        style={{
          bottom: isKeyboardOpen ? `${keyboardHeight}px` : '0px',
          transition: 'bottom 0.3s ease-out'
        }}
        onClick={handleTextareaFocus}
      >
        <form onSubmit={handleSubmit} className="flex items-center gap-2 glass-card rounded-xl p-2 focus-within:ring-2 focus-within:ring-accent focus-within:shadow-glow transition-all duration-200">
          <div className="flex-1 min-w-0">
            <textarea
              ref={textareaRef}
              value={prompt}
              onChange={(e) => {
                setPrompt(e.target.value);
                // Auto-resize textarea
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px';
              }}
              onFocus={handleTextareaFocus}
              onClick={handleTextareaFocus}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              placeholder="ถามคำถามเกี่ยวกับบันทึกของคุณ... (Ask a question about your notes...)"
              className="w-full glass-input rounded-lg px-3 py-2 text-text-primary placeholder-text-secondary focus:outline-none resize-none text-sm sm:text-base leading-normal transition-all duration-200"
              rows={1}
              style={{ minHeight: '36px', maxHeight: '100px' }}
            />
          </div>
          <button
            type="submit"
            className="bg-gradient-accent text-white p-2 rounded-lg hover:shadow-glow disabled:bg-text-muted disabled:cursor-not-allowed transition-all duration-200"
            disabled={isLoading || !prompt.trim() || !hasApiKey}
            title={!hasApiKey ? 'Set API key first' : 'Send message'}
          >
            <SendIcon className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
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