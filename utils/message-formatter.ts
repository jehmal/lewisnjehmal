import { DatabaseMessage, Message } from '@/types/chat';
import { formatDateForDisplay } from '@/utils/date-formatter';
import { findClauseById } from '@/lib/waClauses';
import { findAusnzClauseByIdSync } from '@/lib/ausnzClauses';
import { ClauseSection } from '@/types/clauses';
import { extractClauseReferences, safeMatch } from '@/utils/figure-references';
import { v4 as uuidv4 } from 'uuid';

// After the compareClauseIds function, add this map of standard IDs to their versioned directory names
const standardVersions: Record<string, string> = {
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

// Helper function to get the versioned standard directory
function getVersionedStandardDoc(standardId: string): string {
  if (!standardId) return '3000-2018';
  
  // Normalize the standard ID
  let normalizedId = standardId
    .replace(/^(AS|NZS|AS\/NZS)\s+/i, '')  // Remove AS/NZS prefix
    .replace(/\s+/g, '')                   // Remove all whitespace
    .trim();                               // Trim any remaining whitespace
  
  // Handle special cases with ASNZS prefix (no slash)
  if (normalizedId.startsWith('ASNZS')) {
    normalizedId = normalizedId.replace(/^ASNZS/, '');
    console.log(`getVersionedStandardDoc: Removed ASNZS prefix, normalized to ${normalizedId}`);
  }
  
  // Special handling for 4777
  if (normalizedId === '4777' || normalizedId.includes('4777.1')) {
    console.log(`getVersionedStandardDoc: Handling 4777.1 reference: ${standardId} -> 4777.1-2016`);
    return '4777.1-2016';
  }
  
  // If standard already includes version, use it
  if (normalizedId.includes('-')) {
    return normalizedId;
  }
  
  // Map standard IDs to their versioned directories
  const versionMap: Record<string, string> = {
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
  
  // Return versioned standard or default to 3000-2018
  return versionMap[normalizedId] || '3000-2018';
}

// Helper function to compare clause IDs for sorting
function compareClauseIds(a: string, b: string): number {
  // Extract the numeric parts of the clause IDs
  const getNumericParts = (id: string): number[] => {
    // Remove any standard prefix (WA: or AUSNZ:)
    const numericPart = id.includes(':') ? id.split(':')[1] : id;
    // Split by dots and convert to numbers
    return numericPart.split('.').map(Number);
  };
  
  const aParts = getNumericParts(a);
  const bParts = getNumericParts(b);
  
  // Compare each part in sequence
  for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
    // If a part doesn't exist, treat it as 0
    const aVal = i < aParts.length ? aParts[i] : 0;
    const bVal = i < bParts.length ? bParts[i] : 0;
    
    if (aVal !== bVal) {
      return aVal - bVal;
    }
  }
  
  return 0;
}

export function formatDatabaseMessage(dbMessage: DatabaseMessage): Message {
  try {
    console.log('Formatting message:', dbMessage);
    
    if (!dbMessage) {
      console.error('formatDatabaseMessage: Received null/undefined message');
      throw new Error('Invalid database message');
    }

    // Check if ID is in UUID format - if not, generate a new UUID
    let messageId = dbMessage?.id;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    
    if (!messageId || !uuidRegex.test(messageId) || messageId.startsWith('assistant-') || messageId.startsWith('error-')) {
      const oldId = messageId;
      messageId = uuidv4();
      console.log(`⚠️ Non-UUID format ID detected during formatting: "${oldId}". Generated new UUID: "${messageId}"`);
    }

    // Create a default object to avoid undefined fields
    const defaultMessage: Message = {
      id: messageId,  // Use the validated/generated UUID
      role: dbMessage?.role as 'user' | 'assistant' || 'assistant',
      content: dbMessage?.content || 'No content available',
      created_at: dbMessage?.created_at || new Date().toISOString(),
      timestamp: formatDateForDisplay(dbMessage?.created_at || new Date().toISOString()),
      isComplete: dbMessage?.is_complete || true,
      threadId: dbMessage?.thread_id || '',
      runId: dbMessage?.run_id || '',
      assistantId: dbMessage?.assistant_id || null,
      user_id: dbMessage?.user_id || '',
      related_question_id: dbMessage?.related_question_id || '',
      referencedClauses: [],
      figures: []
    };
    
    // Check for IES content to use 4777.1 as default standard
    const isAboutIES = dbMessage.content?.toLowerCase().includes('inverter energy system') || 
                    dbMessage.content?.toLowerCase().includes(' ies ') ||
                    dbMessage.content?.toLowerCase().includes('grid connection') ||
                    dbMessage.content?.toLowerCase().includes('grid-connected inverter') ||
                    dbMessage.content?.toLowerCase().includes('as/nzs 4777') ||
                    dbMessage.content?.toLowerCase().includes('asnzs4777');
    
    const defaultStandardDoc = isAboutIES ? '4777.1-2016' : '3000-2018';
    
    if (isAboutIES) {
      console.log(`Content is about IES: ${isAboutIES}, using default standard: 4777.1-2016`);
    }
    
    // Format referenced clauses for display if they exist
    if (dbMessage.referenced_clauses && dbMessage.referenced_clauses.length > 0) {
      try {
        const referencedClauses = dbMessage.referenced_clauses.map(clause => {
          try {
            if (!clause || !clause.id) {
              console.warn('Invalid clause in referenced_clauses', clause);
              return null;
            }
            
            // Determine the standard prefix
            let standardPrefix = 'AUSNZ';
            let clauseId = clause.id;
            
            // Get the base standard ID 
            let baseStandardId = clause.standard ? 
              (typeof clause.standard === 'string' ? clause.standard : clause.standard.id) : 
              (isAboutIES ? '4777.1' : '3000');
            
            // Special handling for 4777.1 references
            if (baseStandardId?.includes('4777') || 
               (isAboutIES && ['2.3', '3.1', '3.4.4', '5.3.1', '7.3.1'].includes(clauseId))) {
              baseStandardId = '4777.1';
              console.log(`Special handling for 4777.1 clause: ${clauseId}`);
            }
            
            // CRITICAL FIX: Use the versioned standard directory instead of just the ID
            let standardDoc = getVersionedStandardDoc(baseStandardId);
            
            // Handle WA prefixes
            if (clause.id.startsWith('WA:')) {
              standardPrefix = 'WA';
              clauseId = clause.id.substring(3); // Remove 'WA:' prefix
            }
            
            // IMPORTANT: Log the exact clause ID to verify it's not being truncated
            console.log(`Formatting exact clause reference: id=${clauseId}, title=${clause.title}, standardDoc=${standardDoc}`);
            
            return {
              id: `${standardPrefix}:${clauseId}`,
              name: `${standardPrefix} Clause ${clauseId} - ${clause.title || 'Untitled'}`,
              isSelectable: true,
              standardDoc: standardDoc
            };
          } catch (error) {
            console.error('Error formatting clause reference:', error, clause);
            return null;
          }
        }).filter(Boolean); // Filter out nulls

        if (referencedClauses && referencedClauses.length > 0) {
          defaultMessage.referencedClauses = referencedClauses as any[]; // Use any[] instead of ClauseTreeViewElement[]
        }
      } catch (error) {
        console.error('Error processing referenced clauses:', error);
      }
    } else {
      // Try to extract clauses from content if none were provided
      try {
        console.log('No referenced clauses found in database message, extracting from content...');
        if (dbMessage.content) {
          const extractedRefs = extractClauseReferences(dbMessage.content);
          
          // Also look for standard-specific references in the content
          // For example "ASNZS4777.1 Clause 2.3"
          const defaultStandard = isAboutIES ? '4777.1-2016' : '3000-2018';
          
          // Convert extracted references to the expected format
          const extractedClauses = extractedRefs.map(ref => {
            // Ensure the reference has a valid ID format
            const id = ref.id.includes(':') ? ref.id : `AUSNZ:${ref.id}`;
            
            // Determine if this is a 4777.1 clause
            const is4777Clause = isAboutIES && 
                              (['2.3', '3.1', '3.4.4', '5.3.1', '7.3.1'].includes(ref.id) || 
                               ref.standardDoc?.includes('4777'));
            
            // CRITICAL FIX: Use the versioned standard directory
            const baseStandardId = is4777Clause ? '4777.1' : (ref.standardDoc || '3000');
            const versionedStandardDoc = getVersionedStandardDoc(baseStandardId);
            
            if (is4777Clause) {
              console.log(`Detected 4777.1 clause: ${ref.id} - using standardDoc=${versionedStandardDoc}`);
            }
            
            return {
              id: id,
              name: ref.name || `Clause ${ref.id}`,
              isSelectable: true,
              standardDoc: versionedStandardDoc
            };
          });
          
          console.log('Extracted clauses from content:', extractedClauses);
          defaultMessage.referencedClauses = extractedClauses;
        }
      } catch (error) {
        console.error('Error extracting clauses from content:', error);
      }
    }

    // Add figures if they exist
    if (dbMessage.figures && dbMessage.figures.length > 0) {
      defaultMessage.figures = dbMessage.figures;
    }

    // Add isFollowUp if it exists
    if (dbMessage.is_follow_up !== undefined) {
      defaultMessage.isFollowUp = dbMessage.is_follow_up;
    }
    
    console.log('Formatted result:', defaultMessage);
    return defaultMessage;
  } catch (error) {
    console.error('Error in formatDatabaseMessage:', error);
    
    // Return a safe default message rather than throwing an error
    return {
      id: uuidv4(),
      role: dbMessage.role as 'user' | 'assistant',
      content: dbMessage.content || 'No content available',
      created_at: dbMessage.created_at || new Date().toISOString(),
      timestamp: formatDateForDisplay(dbMessage.created_at || new Date().toISOString()),
      isComplete: dbMessage.is_complete || true,
      threadId: dbMessage.thread_id || '',
      runId: dbMessage.run_id || '',
      assistantId: dbMessage.assistant_id || null,
      user_id: dbMessage.user_id || '',
      related_question_id: dbMessage.related_question_id || '',
    };
  }
}

export function formatMessageForDatabase(message: Message): DatabaseMessage {
  // Filter out any references to the main standard documents
  const filteredClauses = message.referencedClauses?.filter(clause => {
    const clauseId = clause.id.includes(':') ? clause.id.split(':')[1] : clause.id;
    return clauseId !== '3000' && clauseId !== '3000.0' && clauseId !== '3000.0.0' &&
           clauseId !== '3001' && clauseId !== '3001.0' && clauseId !== '3001.0.0' &&
           clauseId !== '3001.1' && clauseId !== '3001.1.0' && clauseId !== '3001.1-2022' &&
           clauseId !== '3001.2' && clauseId !== '3001.2.0' && clauseId !== '3001.2-2022';
  });
  
  const referencedClauses = filteredClauses?.map(element => {
    // Parse the clause ID to extract standard and number
    let standard = 'AUSNZ';
    let number = element.id;
    
    if (element.id.includes(':')) {
      [standard, number] = element.id.split(':');
    } else if (element.id.startsWith('WA')) {
      standard = 'WA';
      number = element.id.substring(2); // Remove 'WA' prefix
    }
    
    // Use the standardDoc property if available
    // Use type assertion to avoid TypeScript error
    const standardDoc = (element as { standardDoc?: string }).standardDoc || '3000';
    
    return standard === 'WA' ? 
      findClauseById(number) : 
      findAusnzClauseByIdSync(number, standardDoc);
  }).filter((clause): clause is ClauseSection => clause !== null);

  return {
    id: message.id,
    role: message.role,
    content: message.content,
    created_at: message.created_at,
    user_id: message.user_id,
    related_question_id: message.related_question_id,
    is_complete: message.isComplete,
    thread_id: message.threadId,
    run_id: message.runId,
    assistant_id: message.assistantId,
    referenced_clauses: referencedClauses,
    figures: message.figures,
    is_follow_up: message.isFollowUp || false
  };
} 