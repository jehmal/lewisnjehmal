import React, { useState } from 'react';
import { Input } from '../ui/input';
import ShimmerButton from '../magicui/shimmer-button';

interface MessageInputProps {
  onSubmit: (message: string) => Promise<void>;
  isLoading: boolean;
  placeholder?: string;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  onSubmit,
  isLoading,
  placeholder = 'Ask a question about electrical standards...'
}) => {
  const [inputValue, setInputValue] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;
    
    try {
      await onSubmit(inputValue);
      setInputValue('');
    } catch (error) {
      console.error('Error submitting message:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-end space-x-2">
      <div className="flex-1">
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={placeholder}
          disabled={isLoading}
          className="w-full bg-white dark:bg-gray-700"
        />
      </div>
      <ShimmerButton
        type="submit"
        disabled={!inputValue.trim() || isLoading}
        background="#ee5622"
        shimmerColor="#eca72c"
        className="px-4 py-2"
      >
        {isLoading ? 'Sending...' : 'Send'}
      </ShimmerButton>
    </form>
  );
};
