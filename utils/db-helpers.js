/**
 * Database helper functions for TradeGuru
 * These functions handle saving and retrieving assistant messages to/from Supabase
 */

// Import necessary utilities
import { formatDateForDisplay } from './date-formatter';

/**
 * Saves an assistant message to the database
 * @param {Object} supabase - Supabase client
 * @param {Object} message - Message to save
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} - Success status
 */
export async function saveAssistantMessage(supabase, message, userId) {
  if (!supabase || !message || !userId) {
    console.error('❌ Missing required parameters for saving assistant message');
    return false;
  }
  
  try {
    console.log('💾 Saving assistant response to database...', {
      id: message.id,
      content_preview: message.content.substring(0, 50) + '...',
      clauses_count: message.referencedClauses?.length || 0,
      figures_count: message.figures?.length || 0
    });
    
    // CRITICAL FIX: Ensure standardDoc includes version information
    // Create a mapping of standard IDs to their versioned directory names
    const standardVersions = {
      '3000': '3000-2018',
      '2293.2': '2293.2-2019',
      '3001.1': '3001.1-2022',
      '3001.2': '3001.2-2022',
      '3003': '3003-2018',
      '3004.2': '3004.2-2014',
      '3010': '3010-2017',
      '3012': '3012-2019',
      '3017': '3017-2022',
      '3019': '3019-2022',
      '3760': '3760-2022',
      '3820': '3820-2009',
      '4509.1': '4509.1-2009',
      '4509.2': '4509.2-2010',
      '4777.1': '4777.1-2016',
      '4836': '4836-2023',
      '5033': '5033-2021',
      '5139': '5139-2019'
    };
    
    // Process clauses to ensure they contain version information
    let processedClauses = [];
    if (Array.isArray(message.referencedClauses)) {
      processedClauses = message.referencedClauses.map(clause => {
        // If clause is already properly formatted, return as is
        if (clause && typeof clause === 'object' && clause.standardDoc) {
          return clause;
        }
        
        // Otherwise, try to format it
        try {
          if (typeof clause === 'string') {
            // Try to parse if it's a JSON string
            const parsed = JSON.parse(clause);
            return parsed;
          } else if (clause && typeof clause === 'object') {
            // Process an object
            const standardId = clause.standard || clause.standardId;
            if (standardId && !clause.standardDoc) {
              return {
                ...clause,
                standardDoc: standardVersions[standardId] || `${standardId}-unknown`
              };
            }
            return clause;
          }
          return clause;
        } catch (e) {
          console.error('Error processing clause:', e);
          return clause;
        }
      });
    }
    
    // Prepare database message with correctly formatted clauses
    const dbMessage = {
      id: message.id,
      role: 'assistant',
      content: message.content,
      created_at: message.created_at,
      user_id: userId,
      related_question_id: message.related_question_id || null,
      assistant_id: message.assistantId || null,
      thread_id: message.threadId || null,
      run_id: message.runId || null,
      is_complete: true,
      referenced_clauses: processedClauses,
      figures: Array.isArray(message.figures) ? message.figures : []
    };
    
    console.log('📊 Database message prepared:', {
      ...dbMessage,
      content: dbMessage.content.substring(0, 100) + '...' // Truncate for logging
    });
    
    // CRITICAL FIX: Store message in persistent backup location first
    // This ensures we can recover messages even if database operations fail
    try {
      storeMessageInLocalBackup(dbMessage);
    } catch (backupError) {
      console.warn('⚠️ Failed to create local backup:', backupError);
      // Continue with database operations even if backup fails
    }
    
    // Try direct upsert first
    console.log('🔄 Attempting upsert operation...');
    const { data, error } = await supabase
      .from('conversations')
      .upsert(dbMessage)
      .select();
    
    if (error) {
      console.error('❌ Upsert failed:', error);
      console.error('Error details:', error.message, error.details);
      
      // Try with insert as fallback
      console.log('🔄 Attempting insert as fallback...');
      const insertResult = await supabase
        .from('conversations')
        .insert(dbMessage);
        
      if (insertResult.error) {
        console.error('❌ Insert also failed:', insertResult.error);
        
        // Last resort: Try with a simplified object
        console.log('🔄 Attempting simplified insert as last resort...');
        const simplifiedMessage = {
          id: message.id,
          role: 'assistant',
          content: message.content,
          created_at: message.created_at,
          user_id: userId,
          related_question_id: message.related_question_id || null,
          is_complete: true
        };
        
        const lastResult = await supabase
          .from('conversations')
          .insert(simplifiedMessage);
          
        if (lastResult.error) {
          console.error('❌ Simplified insert also failed:', lastResult.error);
          return false;
        }
        
        console.log('✅ Simplified insert succeeded');
        return true;
      }
      
      console.log('✅ Insert succeeded as fallback');
      return true;
    }
    
    console.log('✅ Assistant response saved successfully');
    return true;
  } catch (error) {
    console.error('❌ Exception saving assistant response:', error);
    return false;
  }
}

/**
 * Store message in local storage as backup
 * @param {Object} message - Message to store
 */
function storeMessageInLocalBackup(message) {
  try {
    // Get existing backed up messages
    const existingBackup = localStorage.getItem('tradeGuru_messages_backup');
    let messages = [];
    
    if (existingBackup) {
      messages = JSON.parse(existingBackup);
    }
    
    // Add new message
    messages.push(message);
    
    // Store back in local storage
    localStorage.setItem('tradeGuru_messages_backup', JSON.stringify(messages));
    
    console.log('✅ Message backed up to local storage:', message.id);
  } catch (error) {
    console.error('❌ Failed to back up message to local storage:', error);
    throw error;
  }
}

/**
 * Retrieves conversation messages from the database
 * @param {Object} supabase - Supabase client
 * @param {string} userId - User ID
 * @returns {Promise<Array>} - Conversation messages
 */
export async function fetchConversationMessages(supabase, userId) {
  if (!supabase || !userId) {
    console.error('❌ Missing required parameters for fetching conversation');
    return [];
  }
  
  try {
    console.log('🔄 Fetching conversation for user:', userId);
    
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });
      
    if (error) {
      console.error('❌ Error fetching conversation:', error);
      return [];
    }
    
    if (!data || data.length === 0) {
      console.log('📭 No conversation data found');
      // CRITICAL FIX: Try to recover from local backup if no data found
      const recoveredMessages = recoverMessagesFromLocalBackup(userId);
      if (recoveredMessages.length > 0) {
        console.log('🔄 Recovered messages from local backup:', recoveredMessages.length);
        
        // Attempt to save recovered messages back to database
        for (const message of recoveredMessages) {
          try {
            await supabase.from('conversations').insert(message);
          } catch (saveError) {
            console.error('❌ Failed to save recovered message to database:', saveError);
          }
        }
        
        return recoveredMessages;
      }
      return [];
    }
    
    // Log the distribution of message types
    const messageCounts = {
      total: data.length,
      user: data.filter(msg => msg.role === 'user').length,
      assistant: data.filter(msg => msg.role === 'assistant').length
    };
    console.log(`📊 Retrieved ${data.length} messages:`, messageCounts);
    
    // Process the messages to ensure they have the correct format
    const processedMessages = data.map(message => {
      try {
        // Create a standard Message object
        const processed = {
          id: message.id,
          role: message.role,
          content: message.content,
          created_at: message.created_at,
          timestamp: formatDateForDisplay(message.created_at),
          isComplete: message.is_complete || true,
          threadId: message.thread_id || '',
          runId: message.run_id || '',
          assistantId: message.assistant_id || null,
          user_id: message.user_id,
          related_question_id: message.related_question_id || '',
          referencedClauses: [],
          figures: []
        };
        
        // Process referenced_clauses if they exist
        if (message.referenced_clauses && Array.isArray(message.referenced_clauses)) {
          processed.referencedClauses = message.referenced_clauses;
        }
        
        // Process figures array
        if (message.figures && Array.isArray(message.figures)) {
          processed.figures = message.figures;
        }
        
        return processed;
      } catch (err) {
        console.error(`❌ Error processing message ${message.id}:`, err);
        // Return a basic version of the message
        return {
          id: message.id,
          role: message.role,
          content: message.content,
          created_at: message.created_at,
          timestamp: formatDateForDisplay(message.created_at),
          isComplete: true,
          threadId: '',
          runId: '',
          assistantId: null,
          user_id: message.user_id,
          related_question_id: message.related_question_id || '',
          referencedClauses: [],
          figures: []
        };
      }
    });
    
    return processedMessages;
  } catch (error) {
    console.error('❌ Exception fetching conversation:', error);
    return [];
  }
}

/**
 * Recovers messages from local backup
 * @param {string} userId - User ID to filter messages by
 * @returns {Array} - Recovered messages
 */
export function recoverMessagesFromLocalBackup(userId) {
  try {
    const backupData = localStorage.getItem('tradeGuru_messages_backup');
    if (!backupData) return [];
    
    const messages = JSON.parse(backupData);
    
    // Filter by userId if available
    if (userId) {
      return messages.filter(msg => msg.user_id === userId);
    }
    
    return messages;
  } catch (error) {
    console.error('❌ Error recovering messages from backup:', error);
    return [];
  }
}

/**
 * Store conversation in local storage
 * @param {Array} conversation - Conversation messages
 */
export function storeConversationInLocalStorage(conversation) {
  try {
    if (Array.isArray(conversation) && conversation.length > 0) {
      localStorage.setItem('tradeGuru_conversation', JSON.stringify(conversation));
      console.log('✅ Conversation stored in local storage:', conversation.length, 'messages');
      return true;
    }
    return false;
  } catch (error) {
    console.error('❌ Error storing conversation in local storage:', error);
    return false;
  }
}

/**
 * Recover conversation from local storage
 * @returns {Array} - Recovered conversation
 */
export function recoverConversationFromLocalStorage() {
  try {
    const storedConversation = localStorage.getItem('tradeGuru_conversation');
    if (!storedConversation) return [];
    
    const conversation = JSON.parse(storedConversation);
    if (Array.isArray(conversation)) {
      console.log('✅ Recovered conversation from local storage:', conversation.length, 'messages');
      return conversation;
    }
    
    return [];
  } catch (error) {
    console.error('❌ Error recovering conversation from local storage:', error);
    return [];
  }
}

/**
 * Simple date formatter for display
 * @param {string} dateString - ISO date string
 * @returns {string} - Formatted date
 */
function formatDateForDisplay(dateString) {
  try {
    const date = new Date(dateString);
    return date.toLocaleString();
  } catch (e) {
    return dateString || 'Unknown date';
  }
} 