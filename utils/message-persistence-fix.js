/**
 * FIX FOR ASSISTANT RESPONSES PERSISTENCE ISSUE
 * 
 * Problem: Assistant responses disappear after refreshing the page because they
 * are not being properly saved to or retrieved from Supabase.
 * 
 * The core issue is in feature-block-animated-card.tsx:
 * 1. The saveAssistantResponseToDatabase function needs to have proper fallbacks
 * 2. The fetchLatestConversation function needs to handle recovery from local storage
 * 3. We need a local backup mechanism for all messages
 * 
 * INSTRUCTIONS:
 * 
 * 1. Add Local Storage Backup:
 *    - Open the file: lewisnjehmal/components/feature-block-animated-card.tsx
 *    - In the handleSubmit function (around line 1280), after receiving the assistant response,
 *      add this code:
 * 
 *    // Save to local storage as backup
 *    try {
 *      // Get conversation with new assistant message
 *      const updatedConversation = [...conversation, assistantMessage];
 *      localStorage.setItem('tradeGuru_conversation', JSON.stringify(updatedConversation));
 *      console.log('✅ Saved conversation to local storage');
 *    } catch (localError) {
 *      console.error('❌ Error saving to local storage:', localError);
 *    }
 * 
 * 2. Modify saveAssistantResponseToDatabase function (around line 2275):
 *    - Add local backup before database operations:
 * 
 *    // CRITICAL FIX: Save message to localStorage backup first
 *    try {
 *      const existingBackup = localStorage.getItem('tradeGuru_messages_backup') || '[]';
 *      const messages = JSON.parse(existingBackup);
 *      messages.push(dbMessage);
 *      localStorage.setItem('tradeGuru_messages_backup', JSON.stringify(messages));
 *      console.log('✅ Message backed up to local storage:', dbMessage.id);
 *    } catch (backupError) {
 *      console.warn('⚠️ Failed to create local backup:', backupError);
 *    }
 * 
 * 3. Add Recovery Function:
 *    - Add this function to recover messages from local storage:
 * 
 *    const recoverMessagesFromLocalStorage = () => {
 *      try {
 *        const savedConversation = localStorage.getItem('tradeGuru_conversation');
 *        if (savedConversation) {
 *          const parsedConversation = JSON.parse(savedConversation);
 *          if (Array.isArray(parsedConversation) && parsedConversation.length > 0) {
 *            console.log('🔄 Recovering conversation from local storage:', parsedConversation.length, 'messages');
 *            setConversation(parsedConversation);
 *            
 *            // If user is logged in, try to save recovered messages to database
 *            if (user) {
 *              // Only try to save assistant messages
 *              const assistantMessages = parsedConversation.filter(msg => msg.role === 'assistant');
 *              console.log(`📊 Found ${assistantMessages.length} assistant messages to recover`);
 *              
 *              // Save each message to database
 *              assistantMessages.forEach(async (msg) => {
 *                try {
 *                  await saveAssistantResponseToDatabase(msg);
 *                } catch (saveError) {
 *                  console.error('❌ Error saving recovered message:', saveError);
 *                }
 *              });
 *            }
 *            
 *            return true;
 *          }
 *        }
 *        return false;
 *      } catch (error) {
 *        console.error('❌ Error recovering from local storage:', error);
 *        return false;
 *      }
 *    };
 * 
 * 4. Modify the fetchLatestConversation function (around line 1030):
 *    - Add recovery from local storage when database queries fail or return empty results:
 * 
 *    if (!data || data.length === 0) {
 *      console.log('📭 No conversation data found in database');
 *      // Try to recover from local storage
 *      recoverMessagesFromLocalStorage();
 *      return;
 *    }
 * 
 * 5. Add a useEffect hook to verify conversation presence:
 *    - Add this useEffect hook to check for missing assistant responses:
 * 
 *    useEffect(() => {
 *      // Check if we have assistant responses in the conversation
 *      if (conversation.length > 0) {
 *        const assistantMessages = conversation.filter(msg => msg.role === 'assistant');
 *        if (assistantMessages.length === 0) {
 *          console.warn('⚠️ No assistant messages found in loaded conversation');
 *          // Try to recover messages from local storage
 *          recoverMessagesFromLocalStorage();
 *        }
 *      }
 *    }, [conversation]);
 * 
 * These changes will ensure that assistant responses are properly saved to both
 * localStorage and database, providing redundancy and preventing data loss on refresh.
 */

/**
 * Message Persistence Fix Utilities
 * 
 * This module provides functions to ensure assistant responses are properly
 * saved to Supabase and recovered if needed.
 */

/**
 * Save assistant message to Supabase with retry logic and limited local backup
 * @param {Object} supabase - Supabase client
 * @param {Object} message - Assistant message to save
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} - Success status
 */
export async function saveAssistantMessageWithRetry(supabase, message, userId) {
  if (!supabase || !message || !userId) {
    console.error('Missing required parameters for saving assistant message');
    return false;
  }
  
  try {
    // Format message for Supabase
    const dbMessage = {
      id: message.id,
      role: 'assistant',
      content: message.content,
      created_at: message.created_at,
      timestamp: message.created_at,
      user_id: userId,
      related_question_id: message.related_question_id || null,
      assistant_id: message.assistantId || null,
      thread_id: message.threadId || '',
      run_id: message.runId || '',
      is_complete: true,
      // Omit complex objects from the primary database save to avoid errors
      figures: [],
      referenced_clauses: []
    };
    
    // Implement retry logic
    let success = false;
    const maxRetries = 3;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 1) {
          console.log(`DB save retry attempt ${attempt}/${maxRetries}`);
        }
        
        // Try upsert first
        const { error } = await supabase
          .from('conversations')
          .upsert(dbMessage);
        
        if (error) {
          console.error(`DB save attempt ${attempt} failed:`, error.message);
          
          if (attempt === maxRetries) {
            // On final attempt, try a simplified insert
            const { error: insertError } = await supabase
              .from('conversations')
              .insert(dbMessage);
              
            if (insertError) {
              console.error('Final insert also failed');
            } else {
              console.log('Success on final insert attempt');
              success = true;
            }
          }
          
          // Wait before retrying
          if (attempt < maxRetries) await new Promise(r => setTimeout(r, 500));
          continue;
        }
        
        // Success!
        success = true;
        break;
      } catch (attemptError) {
        console.error(`Exception in save attempt ${attempt}:`, attemptError);
        if (attempt < maxRetries) await new Promise(r => setTimeout(r, 500));
      }
    }
    
    // If all database attempts failed, save to limited localStorage backup
    if (!success) {
      try {
        updateLimitedLocalBackup(message);
      } catch (backupError) {
        console.error('Local backup also failed:', backupError);
      }
    }
    
    return success;
  } catch (error) {
    console.error('Exception in saveAssistantMessageWithRetry:', error);
    return false;
  }
}

/**
 * Update limited localStorage backup (keeping only last 5 assistant messages)
 * @param {Object} message - Message to add to backup
 */
export function updateLimitedLocalBackup(message) {
  try {
    // Get existing backup or initialize
    const existingBackup = localStorage.getItem('tradeGuru_recent_messages') || '[]';
    let messages = JSON.parse(existingBackup);
    
    // Add current message (ensure we have a clean version for storage)
    const storageMessage = {
      id: message.id,
      role: message.role,
      content: message.content,
      created_at: message.created_at,
      user_id: message.user_id,
      related_question_id: message.related_question_id || null
    };
    
    messages.push(storageMessage);
    
    // Keep only the 5 most recent messages
    if (messages.length > 5) {
      messages = messages.slice(-5);
    }
    
    localStorage.setItem('tradeGuru_recent_messages', JSON.stringify(messages));
  } catch (error) {
    console.error('Failed to update limited backup:', error);
  }
}

/**
 * Recover messages from limited local backup if needed
 * @param {Object} supabase - Supabase client
 * @param {string} userId - User ID
 * @returns {Promise<Array>} - Recovered messages
 */
export async function recoverFromLimitedBackup(supabase, userId) {
  try {
    const backupData = localStorage.getItem('tradeGuru_recent_messages');
    if (!backupData) return [];
    
    const messages = JSON.parse(backupData);
    const userMessages = messages.filter(msg => msg.user_id === userId);
    
    if (userMessages.length === 0) return [];
    
    console.log(`Found ${userMessages.length} messages in limited backup`);
    
    // Try to save these to the database
    for (const msg of userMessages) {
      try {
        await supabase.from('conversations').upsert(msg);
      } catch (saveError) {
        console.error('Failed to save backup message to database:', saveError);
      }
    }
    
    return userMessages;
  } catch (error) {
    console.error('Error recovering from limited backup:', error);
    return [];
  }
} 