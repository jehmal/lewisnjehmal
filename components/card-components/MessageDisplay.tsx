import React from 'react';
import { motion } from 'framer-motion';
import { ThumbsUp, ThumbsDown, MessageSquare } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Message } from '../../types/chat';
import { renderMessageWithContent } from '../../utils/card-utils/formatting-helpers';

interface MessageDisplayProps {
  message: Message;
  index: number;
  onRate: (messageId: string, rating: 'up' | 'down' | 'neutral') => void;
  onExpand: (index: number) => void;
  onFollowUp: (messageId: string) => void;
}

export const MessageDisplay: React.FC<MessageDisplayProps> = ({
  message,
  index,
  onRate,
  onExpand,
  onFollowUp
}) => {
  const isAssistant = message.role === 'assistant';
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-4 rounded-lg mb-4 ${
        isAssistant ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-gray-50 dark:bg-gray-800'
      }`}
    >
      <div className="flex items-start">
        <div className="flex-1">
          <div className="mb-1 text-sm font-semibold">
            {isAssistant ? 'Assistant' : 'You'}
            {message.timestamp && (
              <span className="ml-2 font-normal text-gray-500 dark:text-gray-400">
                {message.timestamp}
              </span>
            )}
          </div>
          <div className="prose dark:prose-invert max-w-none">
            <ReactMarkdown className="whitespace-pre-wrap">
              {message.content}
            </ReactMarkdown>
          </div>
        </div>
      </div>
      
      {isAssistant && (
        <div className="flex items-center justify-end mt-2 space-x-2">
          <button
            onClick={() => onRate(message.id || '', 'up')}
            className="p-1 text-gray-500 hover:text-green-500 dark:text-gray-400 dark:hover:text-green-400"
            aria-label="Thumbs up"
          >
            <ThumbsUp size={16} />
          </button>
          <button
            onClick={() => onRate(message.id || '', 'down')}
            className="p-1 text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400"
            aria-label="Thumbs down"
          >
            <ThumbsDown size={16} />
          </button>
          <button
            onClick={() => onExpand(index)}
            className="p-1 text-gray-500 hover:text-blue-500 dark:text-gray-400 dark:hover:text-blue-400"
            aria-label="Expand"
          >
            <MessageSquare size={16} />
          </button>
          <button
            onClick={() => onFollowUp(message.id || '')}
            className="px-2 py-1 text-xs text-blue-600 border border-blue-300 rounded hover:bg-blue-50 dark:text-blue-400 dark:border-blue-700 dark:hover:bg-blue-900/20"
          >
            Follow up
          </button>
        </div>
      )}
    </motion.div>
  );
};
