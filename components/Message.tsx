
import React from 'react';
import { UserIcon, BrainCircuitIcon } from './Icons';

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

  const containerClasses = `flex items-start gap-2 sm:gap-4 max-w-full ${isUser ? 'ml-auto justify-end' : 'mr-auto justify-start'}`;
  const bubbleClasses = `relative px-3 py-2 sm:px-5 sm:py-3 rounded-2xl max-w-[85%] sm:max-w-xl xl:max-w-2xl whitespace-pre-wrap break-words text-sm sm:text-base ${isUser ? 'bg-accent text-primary rounded-br-none' : 'bg-secondary text-text-primary rounded-bl-none'}`;
  const iconClasses = `h-6 w-6 sm:h-8 sm:w-8 flex-shrink-0 p-1 sm:p-1.5 rounded-full ${isUser ? 'bg-accent text-primary' : 'bg-secondary text-text-primary'}`;

  const IconComponent = isUser ? UserIcon : BrainCircuitIcon;

  return (
    <div className={containerClasses}>
      {!isUser && (
        <div className={iconClasses}>
          <IconComponent />
        </div>
      )}
      <div className={bubbleClasses}>
        {isLoading ? <TypingIndicator /> : <p>{content}</p>}
        {isStreaming && !isLoading && <span className="inline-block w-2 h-4 bg-accent ml-1 animate-pulse" />}
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
