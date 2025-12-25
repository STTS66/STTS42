import React from 'react';
import { User, Sparkles, Copy, Check } from 'lucide-react';
import Markdown from './Markdown';
import { Message } from '../types';

interface MessageBubbleProps {
  message: Message;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isUser = message.role === 'user';
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`flex w-full mb-6 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex max-w-4xl w-full gap-4 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        
        {/* Avatar */}
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isUser ? 'bg-blue-600' : 'bg-gradient-to-br from-purple-500 to-pink-500'
        } shadow-lg`}>
          {isUser ? <User size={16} className="text-white" /> : <Sparkles size={16} className="text-white" />}
        </div>

        {/* Content Bubble */}
        <div className={`relative group flex-1 min-w-0 ${isUser ? 'bg-gray-800/80' : 'bg-transparent'} rounded-2xl px-5 py-3 ${isUser ? 'rounded-tr-none' : 'px-0'}`}>
          {!isUser && (
             <div className="absolute -left-12 top-2 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-2">
                 {/* Action buttons could go here */}
             </div>
          )}
          
          <div className="text-gray-100 text-base">
            <Markdown content={message.content} />
          </div>

          {/* Footer actions for model messages */}
          {!isUser && (
            <div className="mt-2 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
               <button 
                onClick={handleCopy}
                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 px-2 py-1 rounded bg-gray-800/50 hover:bg-gray-700 transition-colors"
               >
                 {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                 {copied ? 'Copied' : 'Copy'}
               </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;