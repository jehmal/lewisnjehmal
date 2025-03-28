import { Message } from '../../types/chat';
import { DatabaseMessage } from '../../types/database';
import { formatDateForDisplay } from '../../utils/date-formatter';
import { formatDatabaseMessage } from '../../utils/message-formatter';
import { v4 as uuidv4 } from 'uuid';

/**
 * Database schema verification to help with debugging
 */
export const verifyDatabaseSchema = async (supabase: any): Promise<boolean> => {
  if (!supabase) return false;
  
  try {
    console.log('🔍 Verifying database schema...');
    
    // Try to fetch a single record from the conversations table
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .limit(1);
      
    if (error) {
      console.error('❌ Error verifying database schema:', error);
      return false;
    }
    
    // Check if the table exists and has data
    if (!data || data.length === 0) {
      console.warn('⚠️ No records found in conversations table');
      return true; // Table exists but is empty
    }
    
    // Get the first record and verify its structure
    const record = data[0];
    const expectedFields = [
      'id', 'user_id', 'role', 'content', 'context',
      'timestamp', 'created_at', 'updated_at',
      'good_response', 'neutral_response', 'bad_response',
      'related_question_id', 'is_complete', 'thread_id',
      'run_id', 'assistant_id', 'is_follow_up'
    ];
    
    // Check if all expected fields exist in the record
    const missingFields = expectedFields.filter(field => !(field in record));
    
    if (missingFields.length > 0) {
      console.warn('⚠️ Some expected fields are missing from database schema:', missingFields);
    } else {
      console.log('✅ Database schema verification passed');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Exception in verifyDatabaseSchema:', error);
    return false;
  }
};

/**
 * Process raw database messages into the format expected by the UI
 */
export const processDatabaseMessages = (data: DatabaseMessage[]): Message[] => {
  if (!data || !Array.isArray(data) || data.length === 0) {
    console.log('No messages to process from database');
    return [];
  }

  console.log(`Processing ${data.length} messages from database`);
  
  try {
    // Ensure messages are ordered by created_at
    const sortedData = [...data].sort((a, b) => {
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });

    // Process each message and add UI-specific properties
    const messages = sortedData.map(item => {
      const baseMessage: Message = {
        id: item.id,
        role: item.role,
        content: item.content,
        created_at: item.created_at,
        timestamp: formatDateForDisplay(item.created_at),
        user_id: item.user_id,
        related_question_id: item.related_question_id,
        isComplete: item.is_complete !== false, // Default to true if null/undefined
        threadId: item.thread_id || '',
        runId: item.run_id || '',
        assistantId: item.assistant_id || null,
        isFollowUp: item.is_follow_up || false,
        good_response: item.good_response || false,
        bad_response: item.bad_response || false,
        neutral_response: item.neutral_response || false
      };

      // Process context data if present (for figures, clauses, etc.)
      if (item.context && typeof item.context === 'string' && item.context.trim() !== '') {
        try {
          // Check if the context starts with a valid JSON character
          const trimmedContext = item.context.trim();
          if (trimmedContext.startsWith('{') || trimmedContext.startsWith('[')) {
            const contextData = JSON.parse(trimmedContext);
            
            // Add figures if available
            if (contextData.figures && Array.isArray(contextData.figures)) {
              baseMessage.figures = contextData.figures;
            }
            
            // Add clause references if available
            if (contextData.referencedClauses && Array.isArray(contextData.referencedClauses)) {
              baseMessage.referencedClauses = contextData.referencedClauses;
            }
          } else {
            console.warn(`Context field doesn't appear to be JSON: "${trimmedContext.substring(0, 30)}..."`);
            // Store as a plain text context property instead
            baseMessage.contextText = item.context;
          }
        } catch (err) {
          console.error(`Error parsing message context: ${err}`);
          // Store the raw context as a text field so we don't lose data
          baseMessage.contextText = item.context;
        }
      }
      
      return baseMessage;
    });

    console.log(`Successfully processed ${messages.length} messages for UI display`);
    return messages;
  } catch (error) {
    console.error('Error processing database messages:', error);
    return [];
  }
};

/**
 * Saves an assistant response to the database
 */
export const saveAssistantResponseToDatabase = async (
  supabase: any,
  assistantMessage: Message, 
  userId: string
): Promise<boolean> => {
  if (!supabase || !assistantMessage || !userId) {
    console.error('❌ Cannot save assistant response - missing required parameters');
    return false;
  }
  
  try {
    console.log('💾 Saving assistant response to database:', {
      id: assistantMessage.id,
      content_preview: assistantMessage.content.substring(0, 50) + '...',
      related_question_id: assistantMessage.related_question_id || 'none'
    });
    
    // Check if ID is in UUID format - if not, generate a new UUID
    let messageId = assistantMessage.id;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    
    if (!messageId || !uuidRegex.test(messageId) || messageId.startsWith('assistant-') || messageId.startsWith('error-')) {
      const oldId = messageId;
      messageId = uuidv4();
      console.log(`⚠️ Non-UUID format ID detected: "${oldId}". Generated new UUID: "${messageId}"`);
    }
    
    // Make sure we have the correct format for Supabase
    // Create a database-compatible message object matching the schema
    const dbMessage = {
      id: messageId,  // Use the validated/generated UUID
      role: 'assistant',
      content: assistantMessage.content,
      created_at: assistantMessage.created_at,
      user_id: userId,
      related_question_id: assistantMessage.related_question_id || null,
      assistant_id: assistantMessage.assistantId || null,
      thread_id: assistantMessage.threadId || '',
      run_id: assistantMessage.runId || '',
      is_complete: assistantMessage.isComplete === false ? false : true,
      // Don't include fields that don't exist in the schema
      // Any additional context can be stored as JSON in the context field
      context: JSON.stringify({
        figures: assistantMessage.figures || [],
        referencedClauses: assistantMessage.referencedClauses || []
      })
    };
    
    console.log('📝 Database message structure:', JSON.stringify(dbMessage, null, 2));
    
    // First, try a direct insert as it's less likely to have conflicts
    let result = await supabase
      .from('conversations')
      .insert(dbMessage)
      .select();
      
    // If insert fails with a conflict error, try an update instead
    if (result.error && result.error.code === '23505') { // Unique violation code
      console.log('⚠️ Record already exists, attempting update instead');
      
      result = await supabase
        .from('conversations')
        .update(dbMessage)
        .eq('id', assistantMessage.id)
        .select();
    }
    
    // If we still have an error, try the upsert as a last resort
    if (result.error) {
      console.log('⚠️ Direct operations failed, attempting upsert as fallback');
      
      result = await supabase
        .from('conversations')
        .upsert(dbMessage, { onConflict: 'id' })
        .select();
    }
    
    if (result.error) {
      console.error('❌ All database operations failed:', result.error);
      console.error('Error details:', result.error.message, result.error.details, result.error.hint);
      
      // One last desperate attempt - simplified insert with only critical fields
      console.log('🔄 Attempting minimal insert with only critical fields');
      const minimalDbMessage = {
        id: assistantMessage.id,
        role: 'assistant',
        content: assistantMessage.content,
        created_at: assistantMessage.created_at || new Date().toISOString(),
        user_id: userId,
        related_question_id: assistantMessage.related_question_id || null,
        is_complete: true
      };
      
      const lastResult = await supabase
        .from('conversations')
        .insert(minimalDbMessage);
        
      if (lastResult.error) {
        console.error('❌ Even minimal insert failed:', lastResult.error);
        return false;
      }
      
      console.log('✅ Minimal insert succeeded as last resort');
      return true;
    }
    
    console.log('✅ Successfully saved assistant response to database.');
    return true;
  } catch (error) {
    console.error('❌ Exception in saveAssistantResponseToDatabase:', error);
    return false;
  }
};
