import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { ChatResponse } from '@/types/chat';
import { checkResponseComplete } from '@/utils/chat';
import { parseAssistantResponse, verifyTechnicalTerms } from '@/utils/response-parser';
import { ClauseSection } from '@/types/clauses';
import { StandardReference } from '@/types/references';
import { normalizeElectricalTerms, suggestCorrectTerms } from '@/utils/term-normalizer';
import { filterValidClauses, verifyClauseReferences } from '@/utils/clause-validator';
import { findAusnzClauseByIdSync } from '@/lib/ausnzClauses';

// Extended type that includes standardDoc property used in our app
interface ExtendedClauseSection extends ClauseSection {
  standardDoc?: string;
  text?: string;  // Additional property that might be used
  fullText?: string;  // Add fullText property
}

// Use the imported StandardReference type
type StandardRef = StandardReference;

interface ClauseReference {
  id: string;
  standardDoc?: string;
  title: string;
  fullText: string;
  standard?: StandardReference;
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const DEFAULT_ASSISTANT_ID = 'asst_RgmjOwHZ3YTFWsBfIKu9XVIT';

// Function to add technical term accuracy instructions to the thread
async function addTechnicalTermInstructions(threadId: string) {
  await openai.beta.threads.messages.create(threadId, {
    role: "user",
    content: `IMPORTANT INSTRUCTION: When discussing electrical standards and technical terms, please be extremely precise with acronyms and terminology. Always verify the exact spelling and capitalization of technical terms directly from the clause text. For example, if a clause mentions "Rpne" (total resistance of active and protective earthing conductors), do not change it to "Rphe" or any other variation. Quote technical terms exactly as they appear in the standards.`
  });
}

// Add this function to filter out likely fabricated or non-existent clauses
function isLikelyValidClause(clauseId: string, standardId: string): boolean {
  // Basic checks
  if (!clauseId || clauseId.trim() === '') return false;
  
  // Known patterns for invalid/fabricated clauses
  const suspiciousPatterns = [
    // Clauses that don't exist in the current standards
    /^4\.8\.3\.[34]$/,  // These are commonly fabricated
    /^4\.8\.4\.[23]$/,  // These are commonly fabricated
    
    // Excessively deep hierarchies that don't typically exist
    /^\d+\.\d+\.\d+\.\d+\.\d+$/  // 5 level deep - most standards don't go this deep
  ];
  
  // Check if it matches any suspicious pattern
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(clauseId)) {
      console.log(`Filtering out likely fabricated clause: ${standardId} Clause ${clauseId}`);
      return false;
    }
  }
  
  // Exception for known deep clauses
  if (clauseId.startsWith('8.3.9.2.')) {
    return true; // Special case for 8.3.9.2.X clauses which do exist
  }
  
  return true;
}

// Create a function to dynamically determine the correct standard for a clause
// based on where it was successfully loaded from
function correctStandardForClause(clauseId: string, initialStandardId: string): { 
  standardId: string, 
  standardDoc: string 
} {
  // Check if the query is related to Inverter Energy Systems - these are handled by 4777.1
  // These clauses/sections have specific clause numbers in 4777.1-2016
  const iesRelatedClauseIds = [
    // General requirements and definitions
    '2.3', '2.4', '2.5', 
    // Protection and wiring
    '3.1', '3.2', '3.2.1', '3.2.2', '3.3', '3.3.1', '3.4', '3.4.1', '3.4.2', '3.4.3', '3.4.7',
    // Installation 
    '5.3.1', '5.3.2', '5.3.3',
    // Commissioning
    '7.3.1', '7.3.2'
  ];
  
  if (iesRelatedClauseIds.includes(clauseId)) {
    console.log(`Special mapping: Clause ${clauseId} is an IES-related clause in 4777.1-2016`);
    return { 
      standardId: '4777.1', 
      standardDoc: '4777.1-2016' 
    };
  }
  
  // Special handling for 2.10.X clauses which we know belong to 3000
  if (clauseId.startsWith('2.10.')) {
    return { 
      standardId: '3000', 
      standardDoc: '3000-2018' 
    };
  }
  
  // Special handling for other known mappings
  // Add more mappings based on other patterns we observe
  
  // Default to the initial standard
  const standardVersion = initialStandardId === '3000' ? '2018' : 
                         initialStandardId === '2293.2' ? '2019' : 
                         initialStandardId === '5033' ? '2021' :
                         initialStandardId === '4777.1' ? '2016' :
                         '2018';
  
  return {
    standardId: initialStandardId,
    standardDoc: `${initialStandardId}-${standardVersion}`
  };
}

// Add a function to determine if content is about IES
function isContentAboutIES(text: string): boolean {
  const iesPatterns = [
    /inverter\s+energy\s+system/i,
    /\bIES\b/i,
    /grid[- ]connected\s+inverter/i,
    /\bas\/nzs\s*4777/i,
    /\b4777\.1\b/i,
    /solar\s+inverter/i,
    /\bpv\s+inverter/i,
    /photovoltaic\s+inverter/i,
    /battery\s+inverter/i,
    /grid.+connect/i,  // Added more patterns to improve detection
    /connect.+grid/i,
    /electricity distributor/i
  ];
  
  return iesPatterns.some(pattern => pattern.test(text));
}

// Add a function to prioritize 4777.1 clauses for specific clause IDs
function prioritize4777Clauses(message: string, clauseId: string): boolean {
  // These clauses should be from 4777.1-2016 when discussing IES
  const ies4777ClauseIds = [
    '2.3', '2.4', '2.5', '3.1', '3.2', '3.2.1', '3.2.2', '3.3', '3.3.1', 
    '3.4', '3.4.1', '3.4.2', '3.4.3', '3.4.4', '3.4.7', '5.3.1', '5.3.2', '5.3.3', '7.3.1', '7.3.2'
  ];
  
  // First check if the message is about IES
  const isAboutIES = isContentAboutIES(message);
  
  // Then check if the clause ID is in our list of IES clauses
  const isIESClauseId = ies4777ClauseIds.includes(clauseId);
  
  console.log(`Checking clause ${clauseId} for 4777.1 priority: isAboutIES=${isAboutIES}, isIESClauseId=${isIESClauseId}`);
  
  return isAboutIES && isIESClauseId;
}

export async function POST(req: Request) {
  try {
    const { message, assistantId, conversation, threadId } = await req.json();

    if (!Array.isArray(conversation)) {
      return NextResponse.json({ error: 'Conversation must be an array' }, { status: 400 });
    }

    // Log the incoming request
    console.log('Incoming message:', message);
    
    // Normalize electrical terms in the message
    const normalizedMessage = normalizeElectricalTerms(message);
    
    // Log if normalization changed anything
    if (normalizedMessage !== message.toLowerCase()) {
      console.log('Normalized message:', normalizedMessage);
      console.log('Term normalization applied');
    }
    
    console.log('Current assistantId:', assistantId);
    console.log('Conversation context:', conversation);

    // Always use the default assistant ID
    let selectedAssistantId = assistantId || DEFAULT_ASSISTANT_ID;
    console.log('Using assistant ID:', selectedAssistantId);

    // Use existing thread if provided, otherwise create new one
    const thread = threadId ? 
      { id: threadId } : 
      await openai.beta.threads.create();

    // If this is a new thread, add technical term instructions
    if (!threadId) {
      await addTechnicalTermInstructions(thread.id);
    }

    // Add all previous messages to the thread
    for (const msg of conversation) {
      if (typeof msg.role === 'string' && typeof msg.content === 'string') {
        await openai.beta.threads.messages.create(thread.id, {
          role: msg.role as 'user' | 'assistant',
          content: msg.content
        });
      }
    }

    // Add the new user message with clear follow-up context if needed
    const isFollowUp = message.toLowerCase().includes('follow-up');
    await openai.beta.threads.messages.create(thread.id, {
      role: "user",
      content: isFollowUp 
        ? `Previous context is above. ${message}`
        : message
    });

    // Add a system message with term normalization information if needed
    if (normalizedMessage !== message.toLowerCase()) {
      // Extract the specific terms that were normalized
      const originalTerms = message.toLowerCase().split(/\s+/);
      const normalizedTerms = normalizedMessage.split(/\s+/);
      const changedTerms: {original: string, normalized: string}[] = [];
      
      for (let i = 0; i < originalTerms.length; i++) {
        if (i < normalizedTerms.length && originalTerms[i] !== normalizedTerms[i]) {
          changedTerms.push({
            original: originalTerms[i],
            normalized: normalizedTerms[i]
          });
        }
      }
      
      if (changedTerms.length > 0) {
        const termInfo = changedTerms.map(t => `"${t.original}" → "${t.normalized}"`).join(', ');
        await openai.beta.threads.messages.create(thread.id, {
          role: "user",
          content: `Note: I've detected that you may be asking about ${termInfo}. I'll search for the standard terminology in the electrical standards.`
        });
      }
    }

    // Use the assistant's built-in system message
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: selectedAssistantId
    });

    // Poll for the run to complete
    let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    while (runStatus.status !== 'completed') {
      if (runStatus.status === 'failed') {
        throw new Error('Assistant run failed: ' + runStatus.last_error?.message);
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
      runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    }

    const messages = await openai.beta.threads.messages.list(thread.id);
    const lastMessage = messages.data[0];

    // Handle different content types
    let responseContent = '';
    if (lastMessage.content[0].type === 'text') {
      responseContent = lastMessage.content[0].text.value;
    } else if (lastMessage.content[0].type === 'image_file') {
      responseContent = 'Image response received. [Image processing not implemented]';
    }

    // Check if response is complete
    const isComplete = checkResponseComplete(responseContent);

    // Parse the assistant's response to extract structured data
    console.log('Parsing assistant response...');
    const { structuredResponse, referencedClauses } = parseAssistantResponse(responseContent);
    console.log(`Structured response extracted ${referencedClauses.length} clauses and ${structuredResponse.metadata.figures?.length || 0} figures`);
    
    // Enhanced logging for troubleshooting
    if (referencedClauses.length === 0) {
      console.warn('WARNING: No clauses were extracted from the response. Troubleshooting info:');
      console.warn('- Response length:', responseContent.length);
      console.warn('- Contains "List of Related Clauses":', responseContent.includes('List of Related Clauses'));
      
      // Extract the relevant sections for debugging
      const listSectionRegex = /(?:List of Related Clauses|Related Clauses|Related Standards)[\s\:]*\n([\s\S]*?)(?:\n\s*\n|$)/i;
      const listSectionMatch = responseContent.match(listSectionRegex);
      if (listSectionMatch && listSectionMatch[1]) {
        console.warn('- Found related clauses section content:', listSectionMatch[1]);
      } else {
        console.warn('- Could not find related clauses section');
      }
    }
    
    // Verify and correct technical terms in the response
    const { correctedResponse, corrections } = verifyTechnicalTerms(responseContent, referencedClauses);
    
    // Log any corrections made
    if (corrections.length > 0) {
      console.log('Technical term corrections made:', corrections);
      
      // Use the corrected response
      responseContent = correctedResponse;
      
      // Add a note about the corrections if there are any
      if (corrections.some(c => c.original.toLowerCase() === 'rphe' && c.corrected.toLowerCase() === 'rpne')) {
        responseContent += '\n\nNote: The correct term from the standard is "Rpne" (total resistance of the active and protective earthing conductors), not "RPHE".';
      }
    }

    // Enhanced logging
    console.log('API structured response metadata:', JSON.stringify({
      referencedClausesCount: structuredResponse.metadata.referencedClauses?.length || 0,
      figuresCount: structuredResponse.metadata.figures?.length || 0
    }));

    // Detailed clause logging
    if (structuredResponse.metadata.referencedClauses?.length > 0) {
      console.log('API referenced clauses full data:', 
        structuredResponse.metadata.referencedClauses.map(c => ({
          id: c.id,
          title: c.title,
          standard: c.standard,
          standardDoc: c.standardDoc
        }))
      );
    }

    const response: ChatResponse = {
      response: responseContent,
      isComplete,
      threadId: thread.id,
      runId: run.id,
      context: 'Context from assistant',
      assistantId: selectedAssistantId,
      referencedClauses: referencedClauses,
      figures: structuredResponse.metadata.figures
    };

    // Before returning the response, extract referenced clauses from the content
    console.log('Checking all referenced clauses from content...');
    try {
      // Parse the content to extract clause references
      const parseClauseReferences = (text: string): Array<{id: string, standardId?: string}> => {
        // Results array with extracted references
        const results: Array<{id: string, standardId?: string}> = [];
        
        // Check if the content is about IES
        const isAboutIES = isContentAboutIES(text);
        
        console.log('Parsing clause references with improved regex for deep hierarchies');
        
        // Improved standardClauseRegex to better capture 4777.1-2016 references
        const standardClauseRegex = /(?:(?:AS\/NZS|ASNZS|AS|NZS)\s*(\d+(?:\.\d+)?(?:[-.]\d+)?))\s+[Cc]lause\s+(\d+(?:\.\d+)*)/g;
        let match;
        
        // First extract references with explicit standard mention
        while ((match = standardClauseRegex.exec(text)) !== null) {
          const standardId = match[1]; // e.g., "5033"
          const clauseId = match[2];   // e.g., "4.4.5.2.3"
          
          console.log(`Extracted clause reference: Standard ${standardId}, Clause ${clauseId} (full match: "${match[0]}")`);
          
          // Only add if it passes our validity check
          if (isLikelyValidClause(clauseId, standardId)) {
            // Check if this is already in the results
            const alreadyExists = results.some(result => result.id === clauseId);
            if (!alreadyExists) {
              results.push({
                id: clauseId,
                standardId: standardId
              });
            }
          }
        }
        
        // Define the IES clause IDs we know belong to 4777.1-2016
        const ies4777ClauseIds = [
          '2.3', '2.4', '2.5', '3.1', '3.2', '3.2.1', '3.2.2', '3.3', '3.3.1', 
          '3.4', '3.4.1', '3.4.2', '3.4.3', '3.4.4', '3.4.7', '5.3.1', '5.3.2', '5.3.3', '7.3.1', '7.3.2'
        ];
        
        // Then extract standalone clause references (assuming default standard)
        // Updated pattern to ensure we capture all parts of multi-level clause IDs
        const standaloneClauseRegex = /(?<![A-Za-z0-9])[Cc]lause\s+(\d+(?:\.\d+)*)(?![A-Za-z0-9])/g;
        while ((match = standaloneClauseRegex.exec(text)) !== null) {
          const clauseId = match[1];
          
          console.log(`Extracted standalone clause reference: Clause ${clauseId} (full match: "${match[0]}")`);
          
          // Check if this clauseId is already captured
          const alreadyExists = results.some(result => result.id === clauseId);
          
          // If content is about IES and this is an IES-specific clause
          if (isAboutIES && ies4777ClauseIds.includes(clauseId)) {
            console.log(`Found IES-specific clause ${clauseId} in content about IES - forcing to 4777.1-2016`);
            
            // Only add if it passes our validity check and isn't already included
            if (!alreadyExists && isLikelyValidClause(clauseId, '4777.1')) {
              results.push({
                id: clauseId,
                standardId: '4777.1'
              });
            }
          } else {
            // For other clauses, use the prioritize function
            if (!alreadyExists && isLikelyValidClause(clauseId, isAboutIES ? '4777.1' : '3000')) {
              results.push({
                id: clauseId,
                standardId: prioritize4777Clauses(text, clauseId) ? '4777.1' : (isAboutIES ? '4777.1' : '3000')
              });
            }
          }
        }
        
        console.log(`Total extracted valid clause references: ${results.length}`);
        return results;
      };
      
      if (structuredResponse.response) {
        const extractedReferences = parseClauseReferences(structuredResponse.response);
        console.log('Dynamically extracted clause references from content:', extractedReferences);
        
        // Verify references against the source content to minimize fabricated references
        const verifiedReferences = verifyClauseReferences(
          extractedReferences, 
          structuredResponse.response
        );
        
        console.log('Verified references against source content:', 
          verifiedReferences.map((r: {id: string, standardId?: string, verified: boolean}) => 
            `${r.id}${r.verified ? ' (verified)' : ' (unverified)'}`)
        );
        
        // Only add verified references or ones with very high confidence
        const referencesToAdd = verifiedReferences.filter((ref: {id: string, standardId?: string, verified: boolean}) => 
          ref.verified
        );
        
        // Then, when adding dynamically extracted clauses:
        if (referencesToAdd.length > 0) {
          // Create clause references in the right format
          const extractedClauses = referencesToAdd.map(ref => {
            // Remove the verified property
            const { verified, ...referenceData } = ref;
            
            // Define clauses that we know belong to 4777.1-2016
            const iesRelatedClauseIds = [
              '2.3', '2.4', '2.5', '3.1', '3.2', '3.2.1', '3.2.2', '3.3', '3.3.1', 
              '3.4', '3.4.1', '3.4.2', '3.4.3', '3.4.7', '5.3.1', '5.3.2', '5.3.3', '7.3.1', '7.3.2'
            ];
            
            // Use the improved function instead
            const currentContentIsAboutIES = isContentAboutIES(structuredResponse.response);
            
            // Use our prioritization function
            const isIESClause = prioritize4777Clauses(structuredResponse.response, ref.id);
            
            // FORCE standard to 4777.1-2016 if the question is about IES AND the clause is in our list
            let standardId, standardDoc, standardName, standardVersion;
            
            if (isIESClause || currentContentIsAboutIES) {
              console.log(`Forcing clause ${ref.id} to 4777.1-2016 standard because content is about IES`);
              standardId = '4777.1';
              standardDoc = '4777.1-2016';
              standardName = 'AS/NZS 4777.1';
              standardVersion = '2016';
            } else {
              // Use the original logic for other types of content
              const standardInfo = correctStandardForClause(
                ref.id, 
                referenceData.standardId || '3000'
              );
              standardId = standardInfo.standardId;
              standardDoc = standardInfo.standardDoc;
              standardName = `AS/NZS ${standardId}`;
              standardVersion = standardDoc.split('-')[1] || '2018';
            }
            
            return {
              id: ref.id,
              title: 'Dynamically extracted reference',
              standard: {
                id: standardId,
                name: standardName,
                version: standardVersion
              },
              standardDoc: standardDoc,
              fullText: 'Loading content...'
            };
          });
          
          console.log('Adding dynamically extracted clauses:', extractedClauses);
          
          // Filter out duplicates before adding
          const existingClauseIds = new Set(
            referencedClauses.map(c => {
              const clause = c as ExtendedClauseSection;
              return `${String(clause.standardDoc || '')}_${clause.id}`;
            })
          );
          
          // Only add clauses that don't already exist
          const newClauses = extractedClauses.filter(clause => {
            // Create a simple composite key that always works
            const clauseKey = `${clause.id}`;
            
            // Check if this clause ID already exists
            const exists = referencedClauses.some(existing => {
              const existingClause = existing as ExtendedClauseSection;
              return existingClause.id === clause.id && 
                     existingClause.standardDoc === clause.standardDoc;
            });
            
            if (exists) {
              console.log(`Skipping duplicate clause: ${clause.id}`);
              return false;
            }
            return true;
          });
          
          // Add these clauses to the references
          if (newClauses.length > 0) {
            console.log(`Adding ${newClauses.length} new unique clauses`);
            referencedClauses.push(...newClauses);
          } else {
            console.log(`No new unique clauses to add`);
          }
        }
      }
    } catch (error) {
      console.error('Error extracting clause references from content:', error);
    }

    // Log the response
    console.log('Sending response with Assistant ID:', selectedAssistantId);
    console.log('Referenced clauses in response:', response.referencedClauses?.map(c => `${c.id}: ${c.title}`));

    // Process the extracted clause references
    for (const reference of referencedClauses as ExtendedClauseSection[]) {
      // Extract the ID from the reference, which might be in the format "AUSNZ:1.5.2" or just "1.5.2"
      // For the ID format, split by colon if it exists
      
      // Skip if reference or reference.id is undefined
      if (!reference || !reference.id || typeof reference.id !== 'string') {
        console.warn(`Skipping invalid clause reference (${reference ? typeof reference : 'undefined'})`);
        continue;
      }
      
      let clauseId = reference.id;
      let standardId = '3000'; // Default to 3000
      
      if (reference.id.includes(':')) {
        const parts = reference.id.split(':');
        standardId = parts[0].replace('AUSNZ', '');
        clauseId = parts[1];
      }
      
      // Skip if clauseId is empty or undefined after extraction
      if (!clauseId) {
        console.warn(`Skipping clause with empty ID after extraction from: ${reference.id}`);
        continue;
      }
      
      console.log(`Processing clause reference: ${reference.id}, standard: ${standardId}, clauseId: ${clauseId}`);
      
      // Initialize the reference as ClauseReference
      const clauseReference: ClauseReference = {
        id: reference.id,
        standardDoc: reference.standardDoc,
        title: '',
        fullText: '',
        standard: reference.standard
      };
      
      // Check if we have a standardDoc property - this is the preferred source
      if (clauseReference.standardDoc) {
        standardId = clauseReference.standardDoc.split('-')[0];
        console.log(`Using standardDoc for reference: ${clauseReference.standardDoc}, extracted standardId: ${standardId}`);
      }
      
      // Enhanced check for 4777.1-2016 references
      // Look for both explicit references and references that match the IES context
      const is4777Reference = 
        (clauseReference.standardDoc && clauseReference.standardDoc.includes('4777.1')) || 
        (standardId === '4777.1') ||
        (clauseReference.standard?.id === '4777.1') ||
        // Check if the clause ID is in our known 4777.1 clauses list
        ['2.3', '3.1', '3.2', '3.4', '5.3.1', '7.3.1'].includes(clauseId);
      
      if (is4777Reference) {
        console.log(`Special handling for 4777.1 clause: ${clauseId}`);
        
        try {
          // Always use the standardDoc parameter with findAusnzClauseByIdSync
          const standardDoc = '4777.1-2016';
          
          // Force the standardDoc to be 4777.1-2016 for these clauses
          clauseReference.standardDoc = standardDoc;
          
          console.log(`Looking up clause ${clauseId} from standard ${standardDoc}`);
          let clause = findAusnzClauseByIdSync(clauseId, standardDoc);
          
          if (clause) {
            console.log(`Successfully loaded 4777.1-2016 clause ${clauseId}: ${clause.title}`);
            
            // Update the reference with the loaded data
            clauseReference.title = clause.title || '';
            clauseReference.fullText = typeof clause.fullText === 'string' ? clause.fullText : '';
            
            // Create a new StandardReference object
            const standardRef: StandardReference = {
              id: '4777.1',
              name: 'AS/NZS 4777.1',
              version: '2016'
            };
            
            // Assign it to the reference
            clauseReference.standard = standardRef;
            
            // Ensure the standardDoc is set correctly
            clauseReference.standardDoc = '4777.1-2016';
            
            console.log(`Updated reference with loaded data: ${clauseReference.title}`);
          } else {
            console.warn(`Failed to load 4777.1-2016 clause ${clauseId} despite special handling`);
            
            // If failed to load, set known titles for critical clauses as fallback
            if (clauseId === '2.3') {
              clauseReference.title = "GENERAL REQUIREMENTS FOR INVERTER ENERGY SYSTEMS (IES)";
              
              const standardRef: StandardReference = {
                id: '4777.1',
                name: 'AS/NZS 4777.1',
                version: '2016'
              };
              
              clauseReference.standard = standardRef;
              clauseReference.standardDoc = '4777.1-2016';
              
              // Set a default fullText for this clause
              clauseReference.fullText = "An IES installation is made up of an inverter(s), an energy source(s), wiring, and control, monitoring and protection devices connected at a single point in an electrical installation.";
            } else if (clauseId === '3.1') {
              clauseReference.title = "CONTROL, PROTECTION, AND WIRING SYSTEM REQUIREMENTS";
              
              const standardRef: StandardReference = {
                id: '4777.1',
                name: 'AS/NZS 4777.1',
                version: '2016'
              };
              
              clauseReference.standard = standardRef;
              clauseReference.standardDoc = '4777.1-2016';
              
              // Set a default fullText for this clause
              clauseReference.fullText = "The control, protection and wiring system equipment and installation shall be fit for purpose for the conditions to which they are likely to be exposed within the electrical installation.";
            } else if (clauseId === '5.3.1') {
              clauseReference.title = "INVERTER INSTALLATION";
              
              const standardRef: StandardReference = {
                id: '4777.1',
                name: 'AS/NZS 4777.1',
                version: '2016'
              };
              
              clauseReference.standard = standardRef;
              clauseReference.standardDoc = '4777.1-2016';
              
              // Set a default fullText for this clause
              clauseReference.fullText = "The inverter shall be installed in a suitable, well-ventilated place, in accordance with the IP rating and manufacturer's requirements, and arranged to provide accessibility for operation, testing, inspection, maintenance and repair.";
            } else if (clauseId === '7.3.1') {
              clauseReference.title = "VERIFICATION REQUIREMENTS";
              
              const standardRef: StandardReference = {
                id: '4777.1',
                name: 'AS/NZS 4777.1',
                version: '2016'
              };
              
              clauseReference.standard = standardRef;
              clauseReference.standardDoc = '4777.1-2016';
              
              // Set a default fullText for this clause
              clauseReference.fullText = "Before commissioning, the IES shall be verified in accordance with AS/NZS 3000. A report detailing the system information, circuits inspected, test results, and verification details shall be provided.";
            }
          }
        } catch (error) {
          console.error(`Error handling 4777.1 clause ${clauseId}:`, error);
        }
      } else {
        // Handle other standard references with existing logic
        // ... existing code for handling other references ...
      }
    }

    // Before returning the response, check if the content is about IES and override any AS/NZS 3000 clauses
    // that should actually be from AS/NZS 4777.1-2016
    console.log('Finalizing response, checking for IES-related clauses...');
    try {
      // Check if the content is about IES
      const currentContentIsAboutIES = isContentAboutIES(responseContent);
      
      if (currentContentIsAboutIES && response.referencedClauses && response.referencedClauses.length > 0) {
        console.log('Content is about IES - ensuring clauses use correct standard');
        
        // List of clause IDs that belong to 4777.1-2016 standard when discussing IES
        const iesClauseIds = [
          '2.3', '2.4', '2.5', '3.1', '3.2', '3.2.1', '3.2.2', '3.3', '3.3.1', 
          '3.4', '3.4.1', '3.4.2', '3.4.3', '3.4.7', '5.3.1', '5.3.2', '5.3.3', '7.3.1', '7.3.2'
        ];
        
        // Create a map to track which clauses have already been added from 4777.1
        const added4777ClauseIds = new Set();
        
        // First, collect all clauses that need to be fixed
        const clausesToFix = [];
        
        for (const clause of response.referencedClauses) {
          // Safe cast with type checking
          const extClause = clause as ExtendedClauseSection;
          
          // If this is a clause ID that should be from 4777.1
          if (iesClauseIds.includes(extClause.id)) {
            // Check if it's incorrectly using 3000 standard
            if ((typeof extClause.standardDoc === 'string' && extClause.standardDoc === '3000-2018') || 
                (extClause.standard && typeof extClause.standard === 'object' && extClause.standard.id === '3000')) {
              
              console.log(`Overriding clause ${extClause.id} from 3000 to 4777.1-2016`);
              
              // Mark for replacement
              clausesToFix.push(extClause.id);
              
              // Replace it
              extClause.standardDoc = '4777.1-2016';
              extClause.standard = {
                id: '4777.1',
                name: 'AS/NZS 4777.1',
                version: '2016'
              };
              
              // Now load the correct content
              try {
                console.log(`Loading correct content for clause ${extClause.id} from 4777.1-2016`);
                const correctClause = findAusnzClauseByIdSync(extClause.id, '4777.1-2016');
                
                if (correctClause) {
                  // Use type-safe string assignments
                  extClause.title = correctClause.title ? String(correctClause.title) : extClause.title;
                  extClause.fullText = correctClause.fullText ? String(correctClause.fullText) : extClause.fullText;
                  console.log(`Successfully loaded correct content for ${extClause.id}: ${extClause.title}`);
                  
                  // Mark this as added
                  added4777ClauseIds.add(extClause.id);
                }
              } catch (e) {
                console.error(`Error loading content for clause ${extClause.id} from 4777.1-2016:`, e);
              }
            } else if (typeof extClause.standardDoc === 'string' && extClause.standardDoc.includes('4777.1')) {
              // This is already correctly marked as 4777.1
              added4777ClauseIds.add(extClause.id);
            }
          }
        }
        
        // Log which clauses were fixed
        if (clausesToFix.length > 0) {
          console.log(`Fixed ${clausesToFix.length} clauses to use 4777.1-2016 instead of 3000`);
        } else {
          console.log('No clauses needed to be fixed');
        }
      }
    } catch (error) {
      console.error('Error in IES clause override logic:', error);
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ 
      error: 'Failed to process the request',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}