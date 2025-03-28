import { useState } from 'react';
import { Message } from '../../types/chat';
import { useUser } from '../../contexts/UserContext';
import { supabase } from '../../lib/supabase';
import { formatDateForDatabase, formatDateForDisplay } from '../../utils/date-formatter';
import { formatDatabaseMessage } from '../../utils/message-formatter';
import { extractFiguresFromAllStandards, extractClauseReferences } from '../../utils/figure-references';
import { checkImageExists } from '../../utils/card-utils/figure-helpers';
import { saveAssistantResponseToDatabase } from '../../utils/card-utils/database-helpers';
import { v4 as uuidv4 } from 'uuid';

interface UseMessageSubmissionProps {
  onConversationUpdate: (updatedConversation: Message[]) => void;
  conversation: Message[];
  setInputValue?: React.Dispatch<React.SetStateAction<string>>;
}

/**
 * Hook for handling message submission and API interactions
 */
export function useMessageSubmission({
  onConversationUpdate,
  conversation,
  setInputValue
}: UseMessageSubmissionProps) {
  const [inputValue, setInputValueState] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isNewRequestPending, setIsNewRequestPending] = useState(false);
  const { user } = useUser();

  /**
   * Handle submission of a new message
   */
  const handleSubmit = async (message: string) => {
    if (!message.trim() || !user || isLoading) return;

    setIsLoading(true);
    setError(null);
    setIsNewRequestPending(true);
    
    const now = new Date();
    const userMessage: Message = { 
      role: 'user', 
      content: message.trim(),
      created_at: formatDateForDatabase(now),
      timestamp: formatDateForDisplay(now.toISOString()),
      user_id: user.id,
      isComplete: true,
      threadId: '',
      runId: '',
      assistantId: null
    };
    
    console.log('🚀 STARTING SUBMISSION:', userMessage);

    try {
      // Save the user message to Supabase
      const { data: savedQuestion, error: questionError } = await supabase
        .from('conversations')
        .insert([{
          role: 'user',
          content: message.trim(),
          created_at: new Date().toISOString(),
          user_id: user.id,
          context: null
        }])
        .select()
        .single();

      console.log('📝 Saved user message to database:', savedQuestion);

      if (questionError) {
        console.error('❌ Error saving question:', questionError);
        throw new Error('Failed to save question');
      }

      // Format the saved question for display
      const savedQuestionWithDisplay = formatDatabaseMessage(savedQuestion);
      console.log('💬 Formatted user message for display:', savedQuestionWithDisplay);

      // Update conversation state immediately with user message
      const updatedConversation = [...conversation, savedQuestionWithDisplay];
      onConversationUpdate(updatedConversation);
      setInputValueState(''); // Clear input immediately

      // Set up a controller to allow request cancellation
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.warn('⏱️ Request timeout - aborting fetch');
        controller.abort();
      }, 60000); // 60 second timeout
      
      try {
        console.log('🔍 Sending request to chat API...');
        // Get AI response with timeout handling
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_API_KEY}`
          },
          body: JSON.stringify({ 
            message: message.trim(),
            conversation: [userMessage]
          }),
          signal: controller.signal
        });

        // Clear the timeout since the request completed
        clearTimeout(timeoutId);
        console.log('✅ Received response from API, status:', response.status);

        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Failed to get error details');
          console.error('❌ API error response:', errorText);
          throw new Error(`Server responded with ${response.status}: ${errorText}`);
        }

        // Parse the response as JSON with error handling
        let data;
        try {
          data = await response.json();
          console.log('📊 Parsed API response data:', data);
        } catch (jsonError) {
          console.error('❌ Failed to parse response as JSON:', jsonError);
          throw new Error('Invalid response format from server');
        }
        
        if (!data || !data.response) {
          console.error('❌ Received empty or invalid response:', data);
          throw new Error('Empty or invalid response received');
        }
        
        // Function to ensure all headings in markdown are bold
        const ensureBoldHeadings = (content: string): string => {
          let formattedContent = content;

          // 1. Make markdown headings bold
          formattedContent = formattedContent.replace(
            /(#+)\s+([^#\n]+)/g, 
            (match, hashes, text) => {
              // If the text is already bold (surrounded by ** or __), leave it as is
              if (text.trim().startsWith('**') && text.trim().endsWith('**')) {
                return `${hashes} ${text}`;
              }
              // Otherwise make it bold
              return `${hashes} **${text.trim()}**`;
            }
          );
          
          // 2. Make specific section headings bold
          const sectionHeadings = [
            "User Question:",
            "Answer to the Question:",
            "Exact Paragraph\\(s\\) from the Documentation:",
            "List of Related Clauses:",
            "Further Clarification Offer:"
          ];
          
          sectionHeadings.forEach(heading => {
            // Escape regex special characters
            const escapedHeading = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            // Pattern matches the heading at the start of a line, not already bold
            const pattern = new RegExp(`(^|\\n)(${escapedHeading})\\s+`, 'g');
            formattedContent = formattedContent.replace(pattern, '$1**$2** ');
          });
          
          // 3. Make clause references bold (like "ASNZS3000 Clause 1.5.4.3")
          formattedContent = formattedContent.replace(
            /(ASNZS\d+(?:\.\d+)?)\s+(Clause\s+\d+(?:\.\d+)*)/g,
            '**$1 $2**'
          );
          
          // Also handle AS/NZS format
          formattedContent = formattedContent.replace(
            /(AS\/NZS\s*\d+(?:\.\d+)?)\s+(Clause\s+\d+(?:\.\d+)*)/gi,
            '**$1 $2**'
          );
          
          // 4. Make figure and table references bold (like "ASNZS3000 Figure 4.1" or "ASNZS3000 Table 4.1")
          formattedContent = formattedContent.replace(
            /(ASNZS\d+(?:\.\d+)?)\s+((?:Figure|Table)\s+\d+(?:\.\d+)?(?:[a-z])?)/gi,
            '**$1 $2**'
          );
          
          // Also handle AS/NZS format for figures and tables
          formattedContent = formattedContent.replace(
            /(AS\/NZS\s*\d+(?:\.\d+)?)\s+((?:Figure|Table)\s+\d+(?:\.\d+)?(?:[a-z])?)/gi,
            '**$1 $2**'
          );
          
          return formattedContent;
        };
        
        // Extract figures from all standards mentioned
        console.log('🖼️ Extracting figures from response...');
        const figures = extractFiguresFromAllStandards(data.response);
        console.log(`🖼️ Extracted ${figures.length} figures from response`);
        
        // Apply bold formatting to all headings
        const formattedResponse = ensureBoldHeadings(data.response);
        
        // Validate figure paths
        console.log('🔍 Validating figure paths...');
        const validatedFigures = await Promise.all(
          figures.map(checkImageExists)
        );
        console.log(`✅ Validated ${validatedFigures.length} figures`);
        
        // Extract clause references
        const referencedClauses = extractClauseReferences(formattedResponse);
        console.log(`📃 Extracted ${referencedClauses.length} clause references`);
        
        // Create assistant message with validated figures and clauses
        const assistantMessage: Message = {
          id: data.id || uuidv4(),
          role: 'assistant',
          content: formattedResponse,
          created_at: new Date().toISOString(),
          timestamp: formatDateForDisplay(new Date().toISOString()),
          isComplete: data.isComplete || true,
          threadId: data.threadId || '',
          runId: data.runId || '',
          assistantId: data.assistantId || null,
          user_id: user.id,
          related_question_id: savedQuestion.id || '',
          referencedClauses: referencedClauses,
          figures: validatedFigures
        };
        
        console.log('🤖 Created assistant message:', assistantMessage);

        // Update conversation with assistant response
        const finalConversation = [...updatedConversation, assistantMessage];
        onConversationUpdate(finalConversation);

        console.log('✅ Message pair verified and saved');

        // Save the assistant response to the database
        console.log('💾 Starting assistant response database save...');
        try {
          // Ensure the message has all necessary fields before saving
          const completeAssistantMessage = {
            ...assistantMessage,
            related_question_id: savedQuestion.id || null
          };
          
          const saveResult = await saveAssistantResponseToDatabase(supabase, completeAssistantMessage, user.id);
          
          if (saveResult) {
            console.log('✅ Assistant response saved to database successfully');
          } else {
            console.error('❌ Failed to save assistant response to database - check server logs');
            
            // Log the error details for debugging
            console.error('Message details for debugging:', {
              id: assistantMessage.id,
              role: assistantMessage.role,
              content_length: assistantMessage.content.length,
              has_related_question: !!savedQuestion.id,
              user_id: user.id
            });
          }
        } catch (saveError) {
          console.error('❌ Exception saving assistant response:', saveError);
        }

      } catch (fetchError) {
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          console.error('⏱️ Request timed out');
          throw new Error('Request timed out. Please try again.');
        }
        throw fetchError;
      } finally {
        // Always clear the timeout to prevent memory leaks
        clearTimeout(timeoutId);
      }
    } catch (error) {
      console.error('❌ Error in submission:', error);
      setError(error instanceof Error ? error.message : 'An unexpected error occurred');
      
      // Add the error to the conversation for visibility
      const errorMessage: Message = {
        id: uuidv4(),
        role: 'assistant',
        content: `I'm sorry, but I encountered an error: ${error instanceof Error ? error.message : 'An unexpected error occurred'}. Please try again.`,
        created_at: new Date().toISOString(),
        timestamp: formatDateForDisplay(new Date().toISOString()),
        isComplete: true,
        threadId: '',
        runId: '',
        assistantId: null,
        user_id: user?.id || '',
        related_question_id: ''
      };
      
      onConversationUpdate([...conversation, userMessage, errorMessage]);
    } finally {
      setIsLoading(false);
      setIsNewRequestPending(false);
    }
  };

  /**
   * Handle continuation of an incomplete message
   */
  const handleContinueGeneration = async (message: Message) => {
    if (!message.threadId || !message.runId || !user) {
      console.error('Missing thread or run ID for continuation');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('Continuing generation for message:', message.id);
      
      const response = await fetch('/api/chat/continue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          threadId: message.threadId,
          runId: message.runId,
          previousContent: message.content,
          assistantId: message.assistantId
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Failed to continue generation');
      }

      const data = await response.json();

      // Create a new message with the continued content
      const continuedMessage: Message = {
        ...message,
        content: message.content + '\n\n' + data.response,
        isComplete: data.isComplete,
        threadId: data.threadId,
        runId: data.runId,
        assistantId: data.assistantId,
        figures: extractFiguresFromAllStandards(data.response)
      };

      // Update the conversation with the continued message
      onConversationUpdate(
        conversation.map(msg => msg.id === message.id ? continuedMessage : msg)
      );

      // Save the update to the database
      try {
        await saveAssistantResponseToDatabase(supabase, continuedMessage, user.id);
      } catch (saveError) {
        console.error('Error saving continued message:', saveError);
      }
    } catch (error) {
      console.error('Error continuing generation:', error);
      setError(error instanceof Error ? error.message : 'Failed to continue generation');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle follow-up question submission
   */
  const handleFollowUp = async (messageId: string, input: string) => {
    if (!input.trim() || !user || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      // Find the original message that we're following up on
      const originalMessage = conversation.find(msg => msg.id === messageId);
      if (!originalMessage) {
        throw new Error('Original message not found');
      }

      // Find the root message (the first user question in the thread)
      let rootMessage = originalMessage.role === 'assistant' && originalMessage.related_question_id
        ? conversation.find(msg => msg.id === originalMessage.related_question_id) || originalMessage
        : originalMessage;

      console.log('📝 Follow-up on message:', originalMessage);
      console.log('🧠 Root message identified as:', rootMessage);
      
      if (rootMessage.role !== 'user') {
        console.warn('Root message is not a user message, adjusting...');
        // Try to find the user message this assistant message is related to
        const userMessage = conversation.find(msg => 
          msg.role === 'user' && msg.id === originalMessage.related_question_id
        );
        if (userMessage) {
          console.log('Found actual root user message:', userMessage);
          rootMessage = userMessage;
        }
      }

      // Build conversation context - include the original thread
      const conversationContext: Message[] = [];
      
      // First add the root question
      if (rootMessage.role === 'user') {
        console.log('Adding root question to context:', rootMessage.content.substring(0, 30) + '...');
        conversationContext.push(rootMessage);
        
        // Then add the initial assistant response
        const rootAnswer = conversation.find(msg => 
          msg.role === 'assistant' && 
          msg.related_question_id === rootMessage.id
        );
        
        if (rootAnswer) {
          console.log('Adding root answer to context:', rootAnswer.content.substring(0, 30) + '...');
          conversationContext.push(rootAnswer);
        }
      }

      // If we're following up on a follow-up, include the previous follow-up Q&A as well
      if (originalMessage.isFollowUp) {
        console.log('This is a follow-up to a follow-up');
        
        // Find the immediate parent follow-up question (if it exists)
        const parentQuestion = conversation.find(msg => 
          msg.role === 'user' && 
          msg.id === originalMessage.related_question_id
        );
        
        if (parentQuestion && parentQuestion.id !== rootMessage.id) {
          console.log('Adding parent follow-up question to context:', parentQuestion.content.substring(0, 30) + '...');
          conversationContext.push(parentQuestion);
          
          // Add the parent follow-up answer (originalMessage)
          console.log('Adding parent follow-up answer to context:', originalMessage.content.substring(0, 30) + '...');
          conversationContext.push(originalMessage);
        }
      }

      console.log('💬 Conversation context built with', conversationContext.length, 'messages');

      // Create follow-up question entry with explicit is_follow_up: true flag
      const now = new Date();
      const { data: followUpQuestion, error: questionError } = await supabase
        .from('conversations')
        .insert({
          role: 'user',
          content: input,
          created_at: formatDateForDatabase(now),
          user_id: user.id,
          related_question_id: rootMessage.id,  // Always link to the root message
          is_follow_up: true,  // Explicitly mark as follow-up
          thread_id: originalMessage.threadId || '',
          run_id: originalMessage.runId || '',
          assistant_id: originalMessage.assistantId
        })
        .select()
        .single();

      if (questionError) {
        console.error('Error saving follow-up question:', questionError);
        throw questionError;
      }

      console.log('✅ Follow-up question saved to database:', followUpQuestion);

      // Format the follow-up question for display, ensuring isFollowUp is set
      const followUpUserMessage = {
        ...formatDatabaseMessage(followUpQuestion),
        isFollowUp: true
      };
      
      console.log('✅ Follow-up message formatted with isFollowUp:', followUpUserMessage.isFollowUp);
      
      // Add the follow-up question to conversation immediately
      onConversationUpdate([...conversation, followUpUserMessage]);
      console.log('✅ Conversation updated with follow-up question');

      // Get AI response with full context
      const response = await fetch('/api/chat/follow-up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: input,
          originalMessageId: messageId,
          conversation: conversationContext,
          threadId: originalMessage.threadId || ''
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      const data = await response.json();
      console.log('✅ Received AI response for follow-up question:', data);
      
      // Extract figures from all standards mentioned
      const figures = extractFiguresFromAllStandards(data.response);
      
      // Validate figure paths
      const validatedFigures = await Promise.all(
        figures.map(checkImageExists)
      );
      
      // Save the assistant's response with is_follow_up: true
      const { data: followUpAnswer, error: answerError } = await supabase
        .from('conversations')
        .insert({
          role: 'assistant',
          content: data.response,
          created_at: formatDateForDatabase(now),
          user_id: user.id,
          related_question_id: followUpQuestion.id,  // Link to the follow-up question
          is_follow_up: true,  // Mark assistant response as follow-up too
          thread_id: data.threadId,
          run_id: data.runId,
          assistant_id: data.assistantId,
        })
        .select()
        .single();

      if (answerError) {
        console.error('Error saving follow-up answer:', answerError);
        throw answerError;
      }

      console.log('✅ Follow-up answer saved to database:', followUpAnswer);

      // Format the assistant's response, ensuring isFollowUp is set
      const formattedAnswer = {
        ...formatDatabaseMessage(followUpAnswer),
        isFollowUp: true,
        figures: validatedFigures,
        referencedClauses: extractClauseReferences(data.response)
      };

      console.log('✅ Follow-up answer formatted with isFollowUp:', formattedAnswer.isFollowUp);

      // Update the conversation with both the follow-up question and response
      const updatedConversation = [
        ...conversation,
        followUpUserMessage,
        formattedAnswer
      ];

      onConversationUpdate(updatedConversation);
      console.log('✅ Conversation updated with follow-up Q&A');

    } catch (error) {
      console.error('❌ Error in follow-up:', error);
      setError(error instanceof Error ? error.message : 'Failed to process follow-up');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    inputValue,
    setInputValue: setInputValueState,
    isLoading,
    isNewRequestPending,
    error,
    handleSubmit,
    handleContinueGeneration,
    handleFollowUp
  };
}
