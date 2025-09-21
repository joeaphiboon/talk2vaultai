
import React, { useState, useEffect } from 'react';
import { UserIcon, BrainCircuitIcon, CopyIcon } from './Icons';

interface MessageProps {
  role: 'user' | 'model';
  content: string;
  isStreaming?: boolean;
  isLoading?: boolean;
}

const TypingIndicator: React.FC = () => (
  <div className="flex items-center gap-2">
    <span className="h-2 w-2 bg-accent rounded-full animate-typing shadow-glow" style={{ animationDelay: '0s' }}></span>
    <span className="h-2 w-2 bg-accent rounded-full animate-typing shadow-glow" style={{ animationDelay: '0.2s' }}></span>
    <span className="h-2 w-2 bg-accent rounded-full animate-typing shadow-glow" style={{ animationDelay: '0.4s' }}></span>
  </div>
);

const TypingAnimation: React.FC<{ text: string; speed?: number }> = ({ text, speed = 30 }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayedText(prev => prev + text[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, speed);

      return () => clearTimeout(timeout);
    }
  }, [currentIndex, text, speed]);

  useEffect(() => {
    // Reset when text changes
    setDisplayedText('');
    setCurrentIndex(0);
  }, [text]);

  return <span>{displayedText}</span>;
};

const Message: React.FC<MessageProps> = ({ role, content, isStreaming, isLoading }) => {
  const isUser = role === 'user';
  const [copied, setCopied] = useState(false);

  const containerClasses = `flex flex-col gap-2 max-w-full ${isUser ? 'ml-auto items-end' : 'mr-auto items-start'}`;
  const bubbleContainerClasses = `flex items-start gap-3 sm:gap-4 max-w-full`;
  const bubbleClasses = `relative px-4 py-3 sm:px-6 sm:py-4 rounded-2xl max-w-[85%] sm:max-w-xl xl:max-w-2xl whitespace-pre-wrap break-words text-sm sm:text-base leading-relaxed transition-all duration-200 ${isUser ? 'bg-gradient-accent text-white rounded-br-none shadow-glow' : 'glass-card text-text-primary rounded-bl-none hover:shadow-glass'}`;
  const iconClasses = `h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0 p-2 rounded-full transition-all duration-200 ${isUser ? 'bg-gradient-accent text-white shadow-glow' : 'glass-card text-text-primary'}`;

  const IconComponent = isUser ? UserIcon : BrainCircuitIcon;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return (
    <div className={containerClasses}>
      <div className={bubbleContainerClasses}>
        {!isUser && (
          <div className={iconClasses}>
            <IconComponent />
          </div>
        )}
        <div className={bubbleClasses}>
          {isLoading ? (
            <TypingIndicator />
          ) : isStreaming ? (
            <p>
              <TypingAnimation text={content} speed={20} />
              <span className="inline-block w-2 h-4 bg-accent ml-1 animate-pulse shadow-glow" />
            </p>
          ) : (
            <p>{content}</p>
          )}
        </div>
        {isUser && (
          <div className={iconClasses}>
            <IconComponent />
          </div>
        )}
      </div>
      {!isUser && !isLoading && content && (
        <div className="flex items-center gap-2 text-xs text-text-muted">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-accent/10 text-text-secondary hover:text-accent transition-all duration-200"
            title={copied ? "Copied!" : "Copy message"}
          >
            <CopyIcon className="h-3 w-3" />
            <span>{copied ? "Copied!" : "Copy"}</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default Message;
