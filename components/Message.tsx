
import React, { useState } from 'react';
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

const Message: React.FC<MessageProps> = ({ role, content, isStreaming, isLoading }) => {
  const isUser = role === 'user';
  const [copied, setCopied] = useState(false);

  const containerClasses = `flex items-start gap-3 sm:gap-4 max-w-full ${isUser ? 'ml-auto justify-end' : 'mr-auto justify-start'}`;
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
      {!isUser && (
        <div className={iconClasses}>
          <IconComponent />
        </div>
      )}
      <div className={`${bubbleClasses} group`}>
        {isLoading ? <TypingIndicator /> : <p>{content}</p>}
        {isStreaming && !isLoading && <span className="inline-block w-2 h-4 bg-accent ml-1 animate-pulse shadow-glow" />}
        {!isUser && !isLoading && content && (
          <button
            onClick={handleCopy}
            className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-200 p-2 rounded-xl hover:bg-accent/20 text-text-secondary hover:text-accent hover:shadow-glow"
            title={copied ? "Copied!" : "Copy message"}
          >
            <CopyIcon className="h-4 w-4" />
          </button>
        )}
      </div>
      {isUser && (
        <div className={iconClasses}>
          <IconComponent />
        </div>
      )}
    </div>
  );
};

export default Message;
