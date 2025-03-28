import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Input } from '../ui/input';
import ShimmerButton from '../magicui/shimmer-button';
import { Button } from '../ui/button';
import type { FollowUpInputProps } from '../../types/card-types';

export const FollowUpInput: React.FC<FollowUpInputProps> = ({ messageId, onSubmit, onCancel }) => {
  const [input, setInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let progressInterval: NodeJS.Timeout;
    if (isSubmitting) {
      setProgress(0);
      progressInterval = setInterval(() => {
        setProgress((prev) => (prev >= 90 ? 90 : prev + 10));
      }, 500);
    } else {
      setProgress(0);
    }
    return () => clearInterval(progressInterval);
  }, [isSubmitting]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmedInput = input.trim();
    if (trimmedInput) {
      setIsSubmitting(true);
      try {
        await onSubmit(trimmedInput);
        setInput('');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="mt-4 bg-gray-50 dark:bg-gray-700 p-4 rounded-lg shadow-sm"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <div className="flex-grow">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Follow-up Question
          </label>
          <Input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your follow-up question..."
            className="w-full bg-white dark:bg-gray-600"
            disabled={isSubmitting}
          />
        </div>
        {isSubmitting && (
          <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2.5 mb-2">
            <div
              className="bg-orange-500 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
        <div className="flex justify-end gap-2">
          <ShimmerButton
            type="submit"
            disabled={!input.trim() || isSubmitting}
            shimmerColor="#eca72c"
            background="#ee5622"
            className="px-4 py-2"
          >
            {isSubmitting ? 'Sending...' : 'Send'}
          </ShimmerButton>
          <Button
            type="button"
            onClick={onCancel}
            variant="outline"
            className="px-4 py-2"
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        </div>
      </form>
    </motion.div>
  );
};
