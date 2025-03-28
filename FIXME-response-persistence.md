# TradeGuru - Fixing Assistant Response Persistence

## Problem Description

The TradeGuru application currently has an issue where assistant responses are being displayed correctly when users ask questions, but these responses disappear after a page refresh. The root cause is that the application is not properly saving assistant responses to Supabase or recovering them on page load.

## Investigation Findings

1. The application has a `saveAssistantResponseToDatabase` function in `feature-block-animated-card.tsx` that attempts to save assistant responses to Supabase, but it doesn't implement proper error handling or backup mechanisms.

2. The application also has helper functions in `utils/db-helpers.js` that include better error handling and backup mechanisms, but they might not be properly used in the main component.

3. The current implementation doesn't include a mechanism to recover messages from local storage if database operations fail.

## Fix Implementation - Direct Code Changes

Following the failed attempts to edit the files directly, here are specific code snippets that should be manually applied to the files:

### Step 1: Create a new utility file `lewisnjehmal/utils/db-fixes.js`

```javascript
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
```

### Step 2: Modify `lewisnjehmal/components/feature-block-animated-card.tsx`

1. Add the import at the top of the file:

```typescript
import { saveMessageWithRetry, recoverFromBackup } from '@/utils/db-fixes';
```

2. Replace the existing `saveAssistantResponseToDatabase` function (around line 2275) with:

```typescript
// Update the saveAssistantResponseToDatabase function with better error handling
const saveAssistantResponseToDatabase = async (assistantMessage: Message) => {
  if (!user || !assistantMessage) {
    console.error('❌ Cannot save assistant response - missing user or message data');
    return false;
  }
  
  // Use the new utility function for better persistence
  return await saveMessageWithRetry(supabase, assistantMessage, user.id);
};
```

3. Modify the `fetchLatestConversation` function to add recovery logic at the end (after the existing code that checks for empty data):

```typescript
if (!data || data.length === 0 || (data && data.length > 0 && !data.some(msg => msg.role === 'assistant'))) {
  // Try to recover from backup if no conversation or no assistant messages found
  try {
    const recoveredMessages = await recoverFromBackup(supabase, user.id);
    if (recoveredMessages && recoveredMessages.length > 0) {
      console.log('Recovered messages from local backup');
      
      // Fetch conversation again after recovery attempt
      const { data: refreshedData } = await supabase
        .from('conversations')
        .select('*, good_response, neutral_response, bad_response')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });
        
      if (refreshedData && refreshedData.length > 0) {
        const processedMessages = processDatabaseMessages(refreshedData);
        setConversation(processedMessages);
      }
    }
  } catch (recoveryError) {
    console.error('Error during recovery:', recoveryError);
  }
}
```

## Additional Fix Option - Use Recovery Tool

If direct code modifications are difficult, you can use the recovery tool:

1. Use the `fix-messages.html` file we provided
2. Open it in a web browser
3. Use it to check for, back up, and save messages to Supabase

## Testing the Fix

After applying these changes:

1. Ask a new question to get an assistant response
2. Verify it appears correctly
3. Refresh the page
4. Verify the response is still visible
5. Check the database to ensure the message was saved

This targeted approach focuses only on fixing the persistence issue without changing other functionality. 