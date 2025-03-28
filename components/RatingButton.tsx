import React, { useState } from 'react';
import { Button } from './ui/button';
import { Star } from 'lucide-react';
import { FeedbackModal } from './FeedbackModal';

interface RatingButtonProps {
  conversationId: string;
  userId?: string;
}

export function RatingButton({ conversationId, userId }: RatingButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  return (
    <>
      <Button 
        variant="outline" 
        size="sm" 
        onClick={() => setIsModalOpen(true)}
        className="flex items-center gap-1 text-amber-500 hover:text-amber-600 dark:text-amber-400 dark:hover:text-amber-300 border-amber-200 hover:border-amber-300 dark:border-amber-800/30 dark:hover:border-amber-700/50"
      >
        <Star className="h-4 w-4" />
        <span>Rate Response</span>
      </Button>
      
      <FeedbackModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        conversationId={conversationId}
        userId={userId}
      />
    </>
  );
} 