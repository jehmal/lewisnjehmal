/**
 * Utility functions for parsing clause references from text content
 */

/**
 * Extract clause references from text content
 * Ensures that multi-level clauses (like 3.9.3.3.1) are preserved in full
 */
export function parseClauseReferences(text: string): string[] {
  if (!text) return [];
  
  console.log('Parsing clause references from text');
  
  try {
    // Match patterns like "Clause X.Y.Z" or "Clause X.Y.Z.W"
    // This pattern is crucial to match ALL decimal levels in a clause reference
    const clauseRegex = /[Cc]lause\s+(\d+(?:\.\d+)*)/g;
    
    // Also match patterns like "ASNZS4777.1-2016 Clause 2.3" or "AS\/NZS 4777.1-2016 Clause 2.3"
    const standardClauseRegex = /(?:ASNZS|AS\/NZS)\s*(\d+(?:\.\d+)?(?:-\d+)?)\s+[Cc]lause\s+(\d+(?:\.\d+)*)/g;
    
    let matches = text.match(clauseRegex) || [];
    const standardMatches = [];
    
    // Extract standard-specific clause references
    let match;
    while ((match = standardClauseRegex.exec(text)) !== null) {
      const standardId = match[1]; // e.g., "4777.1-2016"
      const clauseId = match[2];   // e.g., "2.3"
      console.log(`Found standard-specific reference: ${standardId} Clause ${clauseId}`);
      standardMatches.push(`${clauseId}`); // Store just the clause number
    }
    
    // Combine both types of matches
    const allMatches = [...matches, ...standardMatches];
    
    if (allMatches.length === 0) return [];
    
    // Extract just the clause numbers from the matches
    const references = allMatches.map(match => {
      if (match.toLowerCase().startsWith('clause')) {
        const clauseNumber = match.replace(/[Cc]lause\s+/, '').trim();
        console.log(`Found clause reference: ${clauseNumber} (from "${match}")`);
        return clauseNumber;
      }
      return match; // For standard matches that are already processed
    });
    
    // Remove duplicates but preserve full multi-level references
    const uniqueReferences = [...new Set(references)];
    console.log(`Extracted ${uniqueReferences.length} unique clause references:`, uniqueReferences);
    
    return uniqueReferences;
  } catch (error) {
    console.error('Error parsing clause references:', error);
    return [];
  }
}

/**
 * Deduplicates clauses based on both standardDoc and id
 * Ensures each clause is only included once in the final list
 */
export function deduplicateClauses<T extends { standardDoc?: string; id: string }>(clauses: T[]): T[] {
  const clauseMap = new Map<string, T>();

  clauses.forEach(clause => {
    const key = `${clause.standardDoc || 'unknown'}-${clause.id}`;
    if (!clauseMap.has(key)) {
      clauseMap.set(key, clause);
    } else {
      console.log(`Skipping duplicate clause: ${key}`);
    }
  });

  return Array.from(clauseMap.values());
} 