/**
 * Database Fixes for TradeGuru
 * 
 * This module contains functions to fix issues with persisting assistant responses
 * to Supabase while keeping a limited local backup.
 */

/**
 * Save assistant message to Supabase with retry logic and local backup
 * @param {Object} supabase - Supabase client
 * @param {Object} message - Message to save
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} - Success status
 */
export async function saveMessageWithRetry(supabase, message, userId) {
  if (!supabase || !message || !userId) {
    console.error('Missing required parameters for saving message');
    return false;
  }
  
  try {
    // Format message for Supabase
    const dbMessage = {
      id: message.id,
      role: message.role,
      content: message.content,
      created_at: message.created_at,
      user_id: userId,
      related_question_id: message.related_question_id || null,
      assistant_id: message.assistantId || null,
      thread_id: message.threadId || '',
      run_id: message.runId || '',
      is_complete: true
    };
    
    // First create local backup (limited to last 5 messages)
    updateLimitedLocalBackup(dbMessage);
    
    // Implement retry logic
    let success = false;
    const maxRetries = 3;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Try upsert first
        const { error } = await supabase
          .from('conversations')
          .upsert(dbMessage);
        
        if (error) {
          if (attempt === maxRetries) {
            // On final attempt, try a direct insert as fallback
            const { error: insertError } = await supabase
              .from('conversations')
              .insert(dbMessage);
              
            if (!insertError) {
              success = true;
            }
          } else {
            // Wait before retrying
            await new Promise(r => setTimeout(r, 500));
            continue;
          }
        } else {
          success = true;
          break;
        }
      } catch (attemptError) {
        if (attempt < maxRetries) {
          await new Promise(r => setTimeout(r, 500));
        }
      }
    }
    
    return success;
  } catch (error) {
    console.error('Exception in saveMessageWithRetry:', error);
    return false;
  }
}

/**
 * Update limited localStorage backup (keeping only last 5 messages)
 * @param {Object} message - Message to add to backup
 */
function updateLimitedLocalBackup(message) {
  try {
    // Get existing backup or initialize
    const existingBackup = localStorage.getItem('tradeGuru_recent_messages') || '[]';
    let messages = JSON.parse(existingBackup);
    
    // Add current message
    messages.push(message);
    
    // Keep only the 5 most recent messages
    if (messages.length > 5) {
      messages = messages.slice(-5);
    }
    
    localStorage.setItem('tradeGuru_recent_messages', JSON.stringify(messages));
  } catch (error) {
    // Silently fail - this is just a backup
  }
}

/**
 * Recover messages from limited local backup
 * @param {Object} supabase - Supabase client
 * @param {string} userId - User ID
 * @returns {Promise<Array>} - Recovered messages
 */
export async function recoverFromBackup(supabase, userId) {
  try {
    const backupData = localStorage.getItem('tradeGuru_recent_messages');
    if (!backupData) return [];
    
    const messages = JSON.parse(backupData);
    const userMessages = messages.filter(msg => msg.user_id === userId);
    
    if (userMessages.length === 0) return [];
    
    console.log(`Found ${userMessages.length} messages in backup`);
    
    // Try to save these to the database
    for (const msg of userMessages) {
      try {
        await supabase.from('conversations').upsert(msg);
      } catch (saveError) {
        // Continue even if save fails
      }
    }
    
    return userMessages;
  } catch (error) {
    console.error('Error recovering from backup:', error);
    return [];
  }
} 