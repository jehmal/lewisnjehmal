/**
 * Utilities for validating clause references before loading them
 * This helps prevent unnecessary calls to load non-existent clauses
 */

import { standardVersions } from '../services/standards-registry';

// Define standard versions mapping similar to what's in the clause loader
const standardsMap: Record<string, string> = standardVersions || {
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
  '3019-2018': '3019-2022', // Map 2018 version to 2022
  '3760': '3760-2022',
  '3820': '3820-2009',
  '4509.1': '4509.1-2009',
  '4509.2': '4509.2-2010',
  '4777.1': '4777.1-2016',
  '4836': '4836-2023',
  '5033': '5033-2021',
  '5139': '5139-2019'
};

/**
 * Gets the versioned standard directory name
 */
function getVersionedStandard(standardId: string): string {
  // If standard ID already has version info, return as is
  if (standardId.includes('-')) {
    return standardId;
  }
  
  // Map to versioned standard or use default
  return standardsMap[standardId] || `${standardId}-2018`;
}

// Build a cached list of known clauses for quick validation
const knownClausesCache = new Set<string>();

/**
 * Add a list of known clauses to the cache for validation
 * This should be called during app initialization with a list of clause IDs that exist
 */
export function registerKnownClauses(clauses: string[]): void {
  for (const clause of clauses) {
    knownClausesCache.add(clause);
  }
  console.log(`Registered ${clauses.length} known clauses in the validator cache`);
}

/**
 * Check if a clause exists in the system
 * @param standardId The standard ID (e.g., '3000')
 * @param clauseId The clause ID (e.g., '8.3.9.2.3')
 * @returns True if the clause likely exists, false otherwise
 */
export function validateClauseExists(standardId: string, clauseId: string): boolean {
  // For development with limited data, we can do a simple check
  // In production, this would check against a full database of clauses
  
  // Create a unique key for the clause
  const clauseKey = `${standardId}:${clauseId}`;
  
  // First check the cache
  if (knownClausesCache.has(clauseKey)) {
    return true;
  }
  
  // Basic validation rules based on observed patterns
  // This could be expanded with more sophisticated logic or a backend call
  
  // AS/NZS 3000 clauses - most common
  if (standardId === '3000') {
    // Many 3000 clauses follow these patterns
    const hasManyLevels = clauseId.split('.').length > 4;
    const isVerySpecific = clauseId.includes('.4.') || clauseId.includes('.9.');
    
    // Filter out fabricated deep references that are often wrong
    if (hasManyLevels && isVerySpecific) {
      // Check for known good deep hierarchy patterns
      const validDeepPatterns = ['8.3.9.2'];
      const matchesKnownGoodPattern = validDeepPatterns.some(pattern => clauseId.startsWith(pattern));
      
      if (!matchesKnownGoodPattern) {
        console.log(`Rejecting suspicious deep clause reference: ${clauseId}`);
        return false;
      }
    }
  }
  
  // Add more standard-specific validation as needed
  
  // Default to true for most cases to avoid false negatives
  // In production, this would do a proper existence check
  return true;
}

/**
 * Filter a list of clause references to only include those that likely exist
 * @param references List of clause references to validate
 * @returns List of validated clause references
 */
export function filterValidClauses(references: Array<{id: string, standardId?: string}>): Array<{id: string, standardId?: string}> {
  const validatedReferences = references.filter(ref => {
    const standardId = ref.standardId || '3000';
    const isValid = validateClauseExists(standardId, ref.id);
    
    if (!isValid) {
      console.log(`Filtering out invalid clause reference: ${standardId} Clause ${ref.id}`);
    }
    
    return isValid;
  });
  
  console.log(`Filtered clause references: ${validatedReferences.length} valid out of ${references.length} total`);
  return validatedReferences;
}

/**
 * Verify clause references against source material
 * This checks if the references appear in the source text to catch fabricated references
 */
export function verifyClauseReferences(
  references: Array<{id: string, standardId?: string}>, 
  sourceText: string
): Array<{id: string, standardId?: string, verified: boolean}> {
  return references.map(ref => {
    // Look for exact mentions of this clause ID in the source text
    const clausePattern = new RegExp(`[Cc]lause\\s+${escapeRegExp(ref.id)}\\b`);
    const verified = clausePattern.test(sourceText);
    
    if (!verified) {
      console.log(`Reference to clause ${ref.id} not found in source text, may be fabricated`);
    }
    
    return { ...ref, verified };
  });
}

/**
 * Escape special regex characters in a string
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
} 