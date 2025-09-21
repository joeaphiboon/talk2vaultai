
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
  const [isPWA, setIsPWA] = useState(false);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);


  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages, currentAiResponse]);

  // PWA detection and viewport height handling
  useEffect(() => {
    // Detect PWA mode
    const isPWAMode = window.matchMedia('(display-mode: standalone)').matches || 
                     (window.navigator as any).standalone === true ||
                     document.referrer.includes('android-app://');
    setIsPWA(isPWAMode);

    // Set initial viewport height
    const updateViewportHeight = () => {
      const height = window.visualViewport?.height || window.innerHeight;
      const fullHeight = window.innerHeight;
      const heightDifference = fullHeight - height;
      
      setViewportHeight(height);
      
      // Detect keyboard state
      const keyboardOpen = heightDifference > 150; // Threshold for keyboard detection
      setIsKeyboardOpen(keyboardOpen);
      setKeyboardHeight(keyboardOpen ? heightDifference : 0);
      
      // Update CSS custom property for viewport height
      const vh = height * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
      document.documentElement.style.setProperty('--keyboard-height', `${keyboardHeight}px`);
    };

    updateViewportHeight();

    // Listen for viewport changes (keyboard show/hide)
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', updateViewportHeight);
    } else {
      window.addEventListener('resize', updateViewportHeight);
    }

    // Also listen to window resize as backup
    window.addEventListener('resize', updateViewportHeight);

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', updateViewportHeight);
      }
      window.removeEventListener('resize', updateViewportHeight);
    };
  }, []);

  // Apply keyboard-open class to body when keyboard is open
  useEffect(() => {
    if (isKeyboardOpen) {
      document.body.classList.add('keyboard-open');
    } else {
      document.body.classList.remove('keyboard-open');
    }
    
    return () => {
      document.body.classList.remove('keyboard-open');
    };
  }, [isKeyboardOpen]);

  // Auto-focus textarea after AI response completes
  useEffect(() => {
    if (!currentAiResponse && messages.length > 0) {
      // AI response just completed, focus textarea after a short delay
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
    }
  };

  const handleTextareaFocus = () => {
    // Force focus and ensure textarea is visible
    if (textareaRef.current) {
      textareaRef.current.focus();
      
      // Small delay to ensure keyboard is fully open
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          // Scroll textarea into view if needed
          textareaRef.current.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
          });
        }
      }, 300);
    }
  };


  return (
    <div 
      className="w-full h-screen flex flex-col bg-gradient-to-br from-background via-background to-background/50"
      style={{
        height: 'calc(var(--vh, 1vh) * 100)',
        transform: isKeyboardOpen ? `translateY(-${Math.min(keyboardHeight * 0.5, keyboardHeight - 100)}px)` : 'none',
        transition: 'transform 0.3s ease-out'
      }}
    >
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

      <main 
        className="flex-1 overflow-y-auto pt-16 pb-20 min-h-0"
        style={{
          height: 'calc(var(--vh, 1vh) * 100 - 60px - 80px)',
          minHeight: 'calc(var(--vh, 1vh) * 100 - 60px - 80px)',
          paddingBottom: isKeyboardOpen ? `${Math.min(keyboardHeight * 0.1, 100)}px` : '80px'
        }}
      >
        {messages.length === 0 && !currentAiResponse ? (
          <WelcomeScreen 
            onSettingsClick={onSettingsClick}
            hasApiKey={hasApiKey}
            hasVaultFiles={vaultFileCount > 0}
          />
        ) : (
          <div className="p-4 sm:p-6 space-y-6 sm:space-y-8">
            {messages.map((msg, index) => (
              <div key={index} className="animate-slideUp" style={{ animationDelay: `${index * 0.1}s` }}>
                <Message role={msg.role} content={msg.content} />
              </div>
            ))}
            {currentAiResponse && (
              <div className="animate-slideUp">
                <Message role="model" content={currentAiResponse} isStreaming />
              </div>
            )}
            {isLoading && messages.length > 0 && messages[messages.length - 1].role === 'user' && !currentAiResponse && (
               <div className="animate-slideUp">
                 <Message role="model" content="" isLoading />
               </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </main>

      {error && (
        <div className="mx-4 sm:mx-6 mb-4 sm:mb-6 px-4 py-3 text-error bg-error/10 border border-error/30 rounded-xl text-sm animate-slideUp backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-error rounded-full animate-pulse"></div>
            {error}
          </div>
        </div>
      )}

      <footer 
        className="p-3 sm:p-4 glass border-t border-border fixed left-0 right-0 z-30"
        style={{
          bottom: isKeyboardOpen ? `${Math.min(keyboardHeight * 0.2, keyboardHeight - 50)}px` : '0px',
          transition: 'bottom 0.3s ease-out'
        }}
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
              onClick={handleTextareaFocus}
              onFocus={handleTextareaFocus}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              placeholder={hasApiKey ? "ถามคำถามเกี่ยวกับบันทึกของคุณ... (Ask a question about your notes...)" : "Please set your API key in settings first..."}
              className={`w-full glass-input rounded-lg px-3 py-2 text-text-primary placeholder-text-secondary focus:outline-none resize-none text-sm sm:text-base leading-normal transition-all duration-200 ${!hasApiKey ? 'opacity-50 cursor-not-allowed' : ''}`}
              style={{ 
                minHeight: '36px', 
                maxHeight: '100px',
                height: '36px'
              }}
              rows={1}
              disabled={isLoading || !hasApiKey}
            />
          </div>
          <button
            type="submit"
            className={`bg-gradient-accent text-white p-2 rounded-lg hover:shadow-glow disabled:bg-text-muted disabled:cursor-not-allowed transition-all duration-200 ${!hasApiKey ? 'opacity-50' : ''}`}
            disabled={isLoading || !prompt.trim() || !hasApiKey}
            title={!hasApiKey ? 'Set API key first' : 'Send message'}
          >
            <SendIcon className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
        </form>
      </footer>
    </div>
  );
};

export default ChatInterface;
