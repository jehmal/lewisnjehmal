import { useState, useEffect, useCallback } from 'react';
import { Message } from '../../types/chat';
import { useUser } from '../../contexts/UserContext';
import { supabase } from '../../lib/supabase';
import { processDatabaseMessages } from '../../utils/card-utils/database-helpers';
import { recoverFromBackup } from '../../utils/db-fixes';
import { formatDateForDisplay } from '../../utils/date-formatter';

/**
 * Hook for managing conversations, including fetching from database,
 * clearing, and providing message rating functionality.
 */
export function useConversation() {
  const [conversation, setConversation] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ratings, setRatings] = useState<{[key: string]: 'up' | 'down' | 'neutral' | null}>({});
  const { user } = useUser();

  /**
   * Fetches the latest conversation from the database
   */
  const fetchLatestConversation = useCallback(async () => {
    if (!user) {
      console.warn('No user available for fetching conversation');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('📥 Fetching conversation history from database...');
      
      // Track query start time for performance monitoring
      const startTime = performance.now();
      
      // Query the database for all user's messages, ordered chronologically
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });
      
      // Calculate and log query performance
      const queryTime = performance.now() - startTime;
      console.log(`📊 Database query completed in ${queryTime.toFixed(2)}ms`);
      
      if (error) {
        console.error('❌ Error fetching conversation:', error);
        throw error;
      }
      
      if (!data || data.length === 0) {
        console.log('ℹ️ No conversation history found in database');
        setConversation([]);
        setIsLoading(false);
        return;
      }
      
      console.log(`✅ Retrieved ${data.length} messages from database`);
      
      // Count message types for debugging
      const userMsgCount = data.filter(msg => msg.role === 'user').length;
      const assistantMsgCount = data.filter(msg => msg.role === 'assistant').length;
      console.log(`📝 Message breakdown: ${userMsgCount} user messages, ${assistantMsgCount} assistant messages`);
      
      // Verify that user questions and assistant responses are properly paired
      const questionsWithoutAnswers = data.filter(msg => 
        msg.role === 'user' && 
        !data.some(a => a.role === 'assistant' && a.related_question_id === msg.id)
      );
      
      if (questionsWithoutAnswers.length > 0) {
        console.warn(`⚠️ Found ${questionsWithoutAnswers.length} questions without paired answers`);
      }
      
      // Process the database messages into the format expected by the UI
      let processedMessages: Message[] = [];
      try {
        processedMessages = processDatabaseMessages(data);
        console.log(`✅ Successfully processed ${processedMessages.length} messages for UI display`);
      } catch (processingError) {
        console.error('❌ Error processing database messages:', processingError);
        // Fall back to a simpler processing approach that just takes the essentials
        processedMessages = data.map(item => ({
          id: item.id,
          role: item.role,
          content: item.content,
          created_at: item.created_at,
          timestamp: formatDateForDisplay(item.created_at),
          isComplete: item.is_complete || true,
          threadId: item.thread_id || '',
          runId: item.run_id || '',
          assistantId: item.assistant_id,
          user_id: item.user_id,
          related_question_id: item.related_question_id || '',
          isFollowUp: item.is_follow_up || false
        }));
        console.log('⚠️ Used fallback message processing');
      }
      
      // Ensure we maintain the correct ordering for messages
      const orderedMessages = [...processedMessages].sort((a, b) => {
        // First by timestamp
        const timeA = new Date(a.created_at).getTime();
        const timeB = new Date(b.created_at).getTime();
        if (timeA !== timeB) return timeA - timeB;
        
        // Then by role (user messages before assistant messages if same timestamp)
        if (a.role !== b.role) return a.role === 'user' ? -1 : 1;
        
        return 0;
      });
      
      setConversation(orderedMessages);
      
      console.log(`🔄 Processed ${processedMessages.length} messages for display`);
    } catch (error) {
      console.error('❌ Exception fetching conversation:', error);
      setError('Failed to load conversation history');
      
      // Try to recover from localStorage as a fallback
      try {
        console.log('🔄 Attempting to recover conversation from local storage...');
        const storedConversation = localStorage.getItem('tradeGuru_conversation');
        
        if (storedConversation) {
          const parsedConversation = JSON.parse(storedConversation);
          setConversation(parsedConversation);
          console.log('✅ Successfully recovered conversation from local storage');
        }
      } catch (storageError) {
        console.error('❌ Could not recover from local storage:', storageError);
      }
    } finally {
      setIsLoading(false);
    }
  }, [user, setConversation, setIsLoading, setError]);

  /**
   * Clears the conversation from the database
   */
  const clearConversation = async () => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;

      setConversation([]);
      setRatings({});
      localStorage.removeItem('tradeGuru_conversation');
    } catch (error) {
      console.error('Error clearing conversation:', error);
      setError('Failed to clear conversation history');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Rates a message in the conversation
   */
  const handleRating = async (messageId: string, rating: 'up' | 'down' | 'neutral') => {
    if (!user || !messageId) return;

    try {
      const updateData = {
        good_response: rating === 'up',
        neutral_response: rating === 'neutral',
        bad_response: rating === 'down'
      };

      const { error } = await supabase
        .from('conversations')
        .update(updateData)
        .eq('id', messageId);

      if (error) throw error;

      // Update local state
      setRatings(prev => ({ ...prev, [messageId]: rating }));

      // Update the conversation state to include rating information
      setConversation(prev =>
        prev.map(msg =>
          msg.id === messageId
            ? { ...msg, ...updateData }
            : msg
        )
      );
    } catch (error) {
      console.error('Error saving rating:', error);
      setError('Failed to save rating');
    }
  };

  // Initial fetch when the user is available
  useEffect(() => {
    if (user) {
      fetchLatestConversation();
    }
  }, [user, fetchLatestConversation]);

  // Save to localStorage whenever conversation changes
  useEffect(() => {
    if (conversation.length > 0) {
      try {
        localStorage.setItem('tradeGuru_conversation', JSON.stringify(conversation));
        console.log('Saved conversation to local storage:', conversation.length, 'messages');
      } catch (err) {
        console.error('Error saving conversation to local storage:', err);
      }
    }
  }, [conversation]);

  return {
    conversation,
    setConversation,
    isLoading,
    error,
    ratings,
    fetchLatestConversation,
    clearConversation,
    handleRating
  };
}
