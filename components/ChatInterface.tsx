
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
  const [isPWA, setIsPWA] = useState(false);
  const [initialViewportHeight, setInitialViewportHeight] = useState(0);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [inputOffset, setInputOffset] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);


  // Mobile keyboard handling with improved detection
  useEffect(() => {
    // Detect if running in PWA mode
    const isPWAMode = window.matchMedia('(display-mode: standalone)').matches || 
                     (window.navigator as any).standalone === true ||
                     document.referrer.includes('android-app://');
    setIsPWA(isPWAMode);

    // Detect mobile device
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    console.log('Device detection:', { isPWAMode, isMobile, userAgent: navigator.userAgent });

    let initialHeight = window.visualViewport?.height || window.innerHeight;
    setInitialViewportHeight(initialHeight);
    console.log('Initial height set:', initialHeight);

    const handleResize = () => {
      const currentHeight = window.visualViewport?.height || window.innerHeight;
      const heightDifference = initialHeight - currentHeight;
      
      // More sensitive detection for mobile
      const keyboardOpen = heightDifference > 50;
      console.log('Keyboard detection:', { 
        initialHeight, 
        currentHeight, 
        heightDifference, 
        keyboardOpen,
        isPWA: isPWAMode 
      });
      
      setIsKeyboardOpen(keyboardOpen);
      
      if (keyboardOpen) {
        setKeyboardHeight(heightDifference);
        setInputOffset(heightDifference);
        console.log('Keyboard opened, height:', heightDifference);
      } else {
        setKeyboardHeight(0);
        setInputOffset(0);
        console.log('Keyboard closed');
      }
      
      // Update CSS custom property for viewport height
      const vh = currentHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };

    // Listen for viewport changes
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize);
      console.log('Added visualViewport listener');
    } else {
      window.addEventListener('resize', handleResize);
      console.log('Added window resize listener');
    }
    
    // Also listen to window resize as backup
    window.addEventListener('resize', handleResize);
    
    // Add a more aggressive mobile detection
    if (isMobile) {
      // For mobile, also listen to orientation change and window resize
      const handleMobileResize = () => {
        setTimeout(() => {
          const currentHeight = window.visualViewport?.height || window.innerHeight;
          const heightDiff = initialHeight - currentHeight;
          console.log('Mobile resize check:', { currentHeight, heightDiff, initialHeight });
          
          if (heightDiff > 50) {
            console.log('Mobile keyboard detected');
            setIsKeyboardOpen(true);
            setKeyboardHeight(heightDiff);
            setInputOffset(heightDiff);
          } else if (heightDiff <= 20) {
            console.log('Mobile keyboard closed');
            setIsKeyboardOpen(false);
            setKeyboardHeight(0);
            setInputOffset(0);
          }
        }, 100);
      };
      
      window.addEventListener('resize', handleMobileResize);
      window.addEventListener('orientationchange', handleMobileResize);
    }

    // Handle orientation changes
    const handleOrientationChange = () => {
      setTimeout(() => {
        initialHeight = window.visualViewport?.height || window.innerHeight;
        setInitialViewportHeight(initialHeight);
        handleResize();
      }, 500);
    };

    window.addEventListener('orientationchange', handleOrientationChange);

    // Focus/blur handlers for better keyboard detection
    const handleInputFocus = () => {
      console.log('Input focused');
      setTimeout(() => {
        const currentHeight = window.visualViewport?.height || window.innerHeight;
        const heightDiff = initialHeight - currentHeight;
        console.log('Focus check:', { currentHeight, heightDiff, initialHeight });
        if (heightDiff > 30) {
          console.log('Keyboard detected on focus');
          setIsKeyboardOpen(true);
          setKeyboardHeight(heightDiff);
          setInputOffset(heightDiff);
        }
      }, 200); // Increased delay for mobile
    };

    const handleInputBlur = () => {
      console.log('Input blurred');
      setTimeout(() => {
        const currentHeight = window.visualViewport?.height || window.innerHeight;
        const heightDiff = initialHeight - currentHeight;
        console.log('Blur check:', { currentHeight, heightDiff, initialHeight });
        if (heightDiff <= 30) {
          console.log('Keyboard closed on blur');
          setIsKeyboardOpen(false);
          setKeyboardHeight(0);
          setInputOffset(0);
        }
      }, 500); // Increased delay for mobile
    };

    // Add focus/blur listeners
    if (textareaRef.current) {
      textareaRef.current.addEventListener('focus', handleInputFocus);
      textareaRef.current.addEventListener('blur', handleInputBlur);
    }

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleResize);
      } else {
        window.removeEventListener('resize', handleResize);
      }
      window.removeEventListener('orientationchange', handleOrientationChange);
      if (textareaRef.current) {
        textareaRef.current.removeEventListener('focus', handleInputFocus);
        textareaRef.current.removeEventListener('blur', handleInputBlur);
      }
    };
  }, []);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages, currentAiResponse]);

  // Auto-scroll when keyboard opens
  useEffect(() => {
    if (isKeyboardOpen) {
      if (isPWA) {
        // More aggressive scrolling for PWA
        setTimeout(() => {
          scrollToBottom();
          // Additional scroll after a longer delay for PWA
          setTimeout(scrollToBottom, 500);
        }, 100);
      } else {
        setTimeout(scrollToBottom, 100); // Small delay to ensure layout is updated
      }
    }
  }, [isKeyboardOpen, isPWA]);

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


  return (
    <div 
      className={`flex flex-col h-screen w-full mx-auto relative z-10 ${isPWA ? 'pwa-container' : ''}`}
      style={{ 
        height: 'calc(var(--vh, 1vh) * 100)',
        position: isPWA ? 'fixed' : 'relative',
        top: isPWA ? '0' : 'auto',
        left: isPWA ? '0' : 'auto',
        right: isPWA ? '0' : 'auto',
        bottom: isPWA ? '0' : 'auto'
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
        className="flex-1 overflow-y-auto relative" 
        style={{ 
          minHeight: 0,
          marginTop: '60px', // Account for fixed header
          marginBottom: isKeyboardOpen ? `${inputOffset}px` : '80px', // Account for fixed footer + keyboard offset
          position: isPWA ? 'absolute' : 'relative',
          top: isPWA ? '60px' : 'auto',
          left: isPWA ? '0' : 'auto',
          right: isPWA ? '0' : 'auto',
          bottom: isPWA ? (isKeyboardOpen ? `${inputOffset}px` : '80px') : 'auto',
          height: isPWA ? `calc(100vh - 60px - ${isKeyboardOpen ? inputOffset : 80}px)` : 'auto',
          zIndex: 10 // Ensure main content stays below footer
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
        className="p-3 sm:p-4 glass border-t border-border fixed bottom-0 left-0 right-0 z-30"
        style={{
          position: 'fixed',
          bottom: isKeyboardOpen ? `${keyboardHeight}px` : '0px',
          left: '0',
          right: '0',
          zIndex: 30,
          transition: 'bottom 0.3s ease-out',
          transform: 'none' // Remove transform, use bottom positioning instead
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
              onFocus={() => {
                console.log('Textarea focused');
                
                // Prevent default mobile behavior that moves input to middle
                if (isPWA) {
                  // Prevent the browser from scrolling the input into view
                  setTimeout(() => {
                    window.scrollTo(0, 0);
                    if (textareaRef.current) {
                      textareaRef.current.scrollIntoView = () => {}; // Disable scrollIntoView
                    }
                  }, 0);
                }
                
                // Prevent textarea from breaking out of footer
                if (textareaRef.current) {
                  const textarea = textareaRef.current;
                  const footer = textarea.closest('footer');
                  if (footer) {
                    // Ensure footer stays fixed
                    footer.style.position = 'fixed';
                    footer.style.bottom = isKeyboardOpen ? `${keyboardHeight}px` : '0px';
                    footer.style.left = '0';
                    footer.style.right = '0';
                    footer.style.zIndex = '30';
                    footer.style.overflow = 'hidden';
                    
                    // Ensure textarea stays within footer
                    textarea.style.position = 'relative';
                    textarea.style.zIndex = '32';
                    textarea.style.transform = 'none';
                  }
                }
                
                // Force keyboard detection on focus
                setTimeout(() => {
                  const currentHeight = window.visualViewport?.height || window.innerHeight;
                  const heightDiff = initialViewportHeight - currentHeight;
                  console.log('Focus immediate check:', { currentHeight, heightDiff, initialViewportHeight });
                  
                  if (heightDiff > 30) {
                    console.log('Keyboard detected immediately on focus');
                    setIsKeyboardOpen(true);
                    setKeyboardHeight(heightDiff);
                    setInputOffset(heightDiff);
                  }
                }, 100);
                
                // Ensure textarea is visible when focused
                if (isPWA) {
                  // More aggressive scrolling for PWA
                  setTimeout(() => {
                    if (textareaRef.current) {
                      // Force scroll to input
                      textareaRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
                      // Also scroll the page to ensure input is visible
                      window.scrollTo({ 
                        top: document.body.scrollHeight, 
                        behavior: 'smooth' 
                      });
                    }
                    scrollToBottom();
                  }, 100);
                  setTimeout(() => {
                    scrollToBottom();
                    // Additional scroll after keyboard appears
                    if (textareaRef.current) {
                      textareaRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
                    }
                  }, 500);
                } else {
                  setTimeout(() => {
                    if (textareaRef.current) {
                      textareaRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                  }, 300);
                }
              }}
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
