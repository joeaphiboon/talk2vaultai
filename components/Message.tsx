
import React, { useState } from 'react';
import { UserIcon, BrainCircuitIcon, CopyIcon } from './Icons';

interface MessageProps {
  role: 'user' | 'model';
  content: string;
  isStreaming?: boolean;
  isLoading?: boolean;
}

const TypingIndicator: React.FC = () => (
  <div className="flex items-center gap-1.5">
    <span className="h-2 w-2 bg-accent rounded-full animate-typing" style={{ animationDelay: '0s' }}></span>
    <span className="h-2 w-2 bg-accent rounded-full animate-typing" style={{ animationDelay: '0.2s' }}></span>
    <span className="h-2 w-2 bg-accent rounded-full animate-typing" style={{ animationDelay: '0.4s' }}></span>
  </div>
);

const Message: React.FC<MessageProps> = ({ role, content, isStreaming, isLoading }) => {
  const isUser = role === 'user';
  const [copied, setCopied] = useState(false);

  const containerClasses = `flex items-start gap-2 sm:gap-4 max-w-full ${isUser ? 'ml-auto justify-end' : 'mr-auto justify-start'}`;
  const bubbleClasses = `relative px-3 py-2 sm:px-5 sm:py-3 rounded-2xl max-w-[85%] sm:max-w-xl xl:max-w-2xl whitespace-pre-wrap break-words text-sm sm:text-base leading-relaxed ${isUser ? 'bg-accent text-primary rounded-br-none' : 'bg-secondary text-text-primary rounded-bl-none'}`;
  const iconClasses = `h-6 w-6 sm:h-8 sm:w-8 flex-shrink-0 p-1 sm:p-1.5 rounded-full ${isUser ? 'bg-accent text-primary' : 'bg-secondary text-text-primary'}`;

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
        {isStreaming && !isLoading && <span className="inline-block w-2 h-4 bg-accent ml-1 animate-pulse" />}
        {!isUser && !isLoading && content && (
          <button
            onClick={handleCopy}
            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-accent/20 text-text-secondary hover:text-accent"
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
