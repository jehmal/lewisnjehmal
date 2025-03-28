import { StructuredAssistantResponse, Figure } from '@/types/chat';
import { extractClauseReferences, extractFiguresFromAllStandards, safeMatch, validateFigureReferences } from '@/utils/figure-references';
import { findAusnzClauseByIdSync } from '@/lib/ausnzClauses';
import { findClauseById } from '@/lib/waClauses';
import { ClauseSection } from '@/types/clauses';
import { normalizeElectricalTerms, suggestCorrectTerms } from '@/utils/term-normalizer';

/**
 * Verifies technical terms in the assistant's response against the clause content
 * @param responseText The assistant's response
 * @param referencedClauses The clauses referenced in the response
 * @returns The response with corrected technical terms, or the original if no corrections needed
 */
export function verifyTechnicalTerms(
  responseText: string, 
  referencedClauses: ClauseSection[]
): { 
  correctedResponse: string, 
  corrections: Array<{original: string, corrected: string}> 
} {
  // Initialize result
  let correctedResponse = responseText;
  const corrections: Array<{original: string, corrected: string}> = [];
  
  // Special case for Rphe/Rpne confusion
  const rphePattern = /\b(RPHE|rphe|Rphe)\b/g;
  if (rphePattern.test(responseText)) {
    // Check if any clause mentions Rpne
    const hasRpne = referencedClauses.some(clause => 
      clause.fullText && /\b(Rpne|RPNE|rpne)\b/.test(clause.fullText)
    );
    
    if (hasRpne) {
      // Replace all instances of RPHE with Rpne
      correctedResponse = correctedResponse.replace(/\bRPHE\b/g, 'Rpne');
      correctedResponse = correctedResponse.replace(/\brphe\b/g, 'Rpne');
      correctedResponse = correctedResponse.replace(/\bRphe\b/g, 'Rpne');
      
      corrections.push({
        original: 'RPHE',
        corrected: 'Rpne'
      });
      
      console.log('Corrected RPHE to Rpne based on clause content');
    }
  }
  
  // Extract all potential technical terms from the response
  // This is a simple approach - we're looking for uppercase words or words with numbers
  const potentialTerms = responseText.match(/\b([A-Z][A-Za-z0-9]*|[a-z]+[0-9]+[a-z0-9]*)\b/g) || [];
  
  // Also look for terms that might be acronyms in all caps
  const acronyms = responseText.match(/\b[A-Z]{2,}\b/g) || [];
  
  // Combine and deduplicate
  const allTerms = [...new Set([...potentialTerms, ...acronyms])];
  
  // For each clause, check if its content contains any of the technical terms
  for (const clause of referencedClauses) {
    if (!clause.fullText) continue;
    
    // Extract technical terms from the clause content
    const clauseTerms = clause.fullText.match(/\b([A-Z][A-Za-z0-9]*|[a-z]+[0-9]+[a-z0-9]*)\b/g) || [];
    const clauseAcronyms = clause.fullText.match(/\b[A-Z]{2,}\b/g) || [];
    const allClauseTerms = [...new Set([...clauseTerms, ...clauseAcronyms])];
    
    // Look for special cases like (Rpne) - terms in parentheses
    const specialTerms = clause.fullText.match(/\(([A-Za-z0-9]+)\)/g) || [];
    const extractedSpecialTerms = specialTerms.map(term => term.replace(/[()]/g, ''));
    
    // Add extracted special terms to the clause terms
    allClauseTerms.push(...extractedSpecialTerms);
    
    // Check each term in the response against the clause terms
    for (const term of allTerms) {
      // Skip common words and short terms
      if (term.length < 3 || ['THE', 'AND', 'FOR', 'WITH'].includes(term)) continue;
      
      // Check if there's a similar term in the clause
      for (const clauseTerm of allClauseTerms) {
        // Skip if the terms are identical
        if (term === clauseTerm) continue;
        
        // Check if the terms are similar but not identical
        if (term.toLowerCase() === clauseTerm.toLowerCase() || 
            isTermSimilarWithThreshold(term.toLowerCase(), clauseTerm.toLowerCase(), 0.8)) {
          // Found a potential correction
          correctedResponse = correctedResponse.replace(
            new RegExp(`\\b${escapeRegExp(term)}\\b`, 'g'), 
            clauseTerm
          );
          
          corrections.push({
            original: term,
            corrected: clauseTerm
          });
          
          break;
        }
      }
    }
  }
  
  return { correctedResponse, corrections };
}

/**
 * Calculates similarity between two strings using Levenshtein distance
 * @param str1 First string
 * @param str2 Second string
 * @param threshold Similarity threshold (0-1)
 * @returns True if strings are similar above the threshold
 */
function isTermSimilarWithThreshold(str1: string, str2: string, threshold: number): boolean {
  // If length difference is too great, they're not similar
  if (Math.abs(str1.length - str2.length) > 2) return false;
  
  // Calculate Levenshtein distance
  const distance = levenshteinDistance(str1, str2);
  
  // Calculate similarity as 1 - (distance / max length)
  const maxLength = Math.max(str1.length, str2.length);
  const similarity = 1 - (distance / maxLength);
  
  return similarity >= threshold;
}

/**
 * Calculates Levenshtein distance between two strings
 * @param str1 First string
 * @param str2 Second string
 * @returns The edit distance between the strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;
  
  // Create a matrix of size (m+1) x (n+1)
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
  
  // Initialize the matrix
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  
  // Fill the matrix
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(
          dp[i - 1][j],     // deletion
          dp[i][j - 1],     // insertion
          dp[i - 1][j - 1]  // substitution
        );
      }
    }
  }
  
  return dp[m][n];
}

/**
 * Escapes special characters in a string for use in a RegExp
 * @param string The string to escape
 * @returns The escaped string
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Parses the assistant's natural language response and extracts structured data
 * @param responseText The raw text response from the assistant
 * @returns A structured response object with both the original text and extracted metadata
 */
export function parseAssistantResponse(responseText: string): {
  structuredResponse: StructuredAssistantResponse;
  referencedClauses: ClauseSection[];
} {
  // Extract clause references using our enhanced extraction function
  console.log('Parsing assistant response for structured data...');
  const clauseReferences = extractClauseReferences(responseText);
  console.log('Extracted clause references:', clauseReferences);
  
  // Extract figure references from all standards mentioned in the text
  const figures = extractFiguresFromAllStandards(responseText);
  console.log(`Extracted ${figures.length} figure references`);
  
  // Load the actual clause data
  const referencedClauses: ClauseSection[] = [];
  const structuredClauseRefs: Array<{id: string; title: string; standard: string; standardDoc?: string}> = [];
  
  for (const reference of clauseReferences) {
    // Make sure reference.id is defined before splitting
    if (!reference.id) {
      console.warn(`Skipping invalid reference with undefined id`);
      continue;
    }
    
    // Split into standard and clauseId with defaults if the split fails
    let standardPart = 'AUSNZ', clauseId = '';
    
    if (reference.id.includes(':')) {
      const parts = reference.id.split(':');
      standardPart = parts[0] || 'AUSNZ';
      clauseId = parts[1] || '';
    } else {
      // If there's no colon, treat the whole thing as clauseId
      clauseId = reference.id;
    }
    
    // Skip if clauseId is undefined or empty
    if (!clauseId) {
      console.warn(`Skipping reference with empty clause ID from: ${reference.id}`);
      continue;
    }
    
    console.log(`Loading clause ${standardPart}:${clauseId} for structured response...`);
    
    // Skip standard document references
    if (clauseId === '3000' || clauseId === '3000.0' || clauseId === '3000.0.0' ||
        clauseId === '3001' || clauseId === '3001.0' || clauseId === '3001.0.0' ||
        clauseId === '3001.1' || clauseId === '3001.1.0' || clauseId === '3001.1-2022' ||
        clauseId === '3001.2' || clauseId === '3001.2.0' || clauseId === '3001.2-2022') {
      console.log(`Skipping standard document reference: ${clauseId}`);
      continue;
    }
    
    let clause: ClauseSection | null = null;
    
    if (standardPart === 'WA') {
      clause = findClauseById(clauseId);
    } else {
      // Use the standardDoc property if available
      const standardDoc = reference.standardDoc || '3000';
      console.log(`Using standard document: ${standardDoc} for clause ${clauseId}`);
      
      clause = findAusnzClauseByIdSync(clauseId, standardDoc);
    }
    
    if (clause) {
      console.log(`Successfully loaded clause ${clauseId}: ${clause.title}`);
      
      // Add the standard document information to the clause
      if (reference.standardDoc) {
        clause.standard = {
          id: reference.standardDoc,
          name: `AS/NZS ${reference.standardDoc}`,
          version: "2018" // Default version, modify as needed
        };
      }
      
      referencedClauses.push(clause);
      
      // Add to structured metadata
      structuredClauseRefs.push({
        id: clauseId,
        title: clause.title,
        standard: standardPart,
        standardDoc: reference.standardDoc
      });
    } else {
      console.warn(`Failed to load clause ${clauseId} for structured response`);
    }
  }
  
  // Validate figures against clause references
  const validatedFigures = validateFigureReferences(figures, referencedClauses);
  console.log(`Validated ${validatedFigures.length} figure references out of ${figures.length}`);
  
  // Create the structured response
  const structuredResponse: StructuredAssistantResponse = {
    response: responseText,
    metadata: {
      referencedClauses: structuredClauseRefs,
      figures: validatedFigures // Use validated figures only
    }
  };
  
  return {
    structuredResponse,
    referencedClauses
  };
}

/**
 * Extracts the "List of Related Clauses" section from the assistant's response
 * @param text The assistant's response text
 * @returns The extracted section or null if not found
 */
export function extractRelatedClausesSection(text: string): string | null {
  const listSectionRegex = /List of Related Clauses\s*\n([\s\S]*?)(?:\n\n|\n$|$)/i;
  const listSection = safeMatch(text, listSectionRegex);
  
  if (listSection && listSection[1]) {
    return listSection[1].trim();
  }
  
  return null;
}