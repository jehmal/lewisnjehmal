/**
 * Utility functions for normalizing electrical terms and acronyms
 * to handle common variations, misspellings, and confusions
 */

// Map of common term variations to their standard form
const TERM_VARIATIONS: Record<string, string> = {
  // Resistance terms
  'rphe': 'rpne',
  'rpme': 'rpne',
  'rpnc': 'rpne',
  'rpnf': 'rpne',
  
  // Other common electrical terms with variations
  'rcd': 'rcd',
  'rcds': 'rcd',
  'gfci': 'rcd', // US equivalent term
  'elcb': 'rcd', // Older term sometimes confused
  
  'mcb': 'mcb',
  'mcbs': 'mcb',
  
  'mccb': 'mccb',
  'mccbs': 'mccb',
  
  'mims': 'mims',
  'mi': 'mims',
  
  'tps': 'tps',
  
  'ocpd': 'ocpd', // Overcurrent protective device
  'ocpds': 'ocpd',
  
  'ipxx': 'ip rating',
  'ip': 'ip rating',
  
  'ewis': 'ewis', // Emergency warning and intercommunication system
  
  'mech': 'mechanical protection',
  'mechanical': 'mechanical protection',
  
  'wc': 'wiring certificate',
  'cert': 'wiring certificate',
  'certificate': 'wiring certificate',
  
  'cec': 'cec', // Clean Energy Council
  
  'dli': 'dli', // Department of Labour and Industry
  'worksafe': 'worksafe',
  
  'switchboard': 'switchboard',
  'sb': 'switchboard',
  'db': 'distribution board',
  'mdb': 'main distribution board',
  
  'pit': 'pit',
  'pits': 'pit',
  
  'conduit': 'conduit',
  'duct': 'conduit',
  
  'catenary': 'catenary',
  'cat wire': 'catenary',
  
  'cabling': 'cabling',
  'wiring': 'cabling',
  
  'earthing': 'earthing',
  'grounding': 'earthing', // US term
  
  'bonding': 'bonding',
  'equipotential': 'bonding',
  
  'zs': 'zs', // Earth fault-loop impedance
  'ze': 'ze', // External earth fault-loop impedance
  'z loop': 'zs',
  'loop impedance': 'zs',
  'earth loop': 'zs',
  'fault loop': 'zs',
};

/**
 * Normalizes electrical terms in a query string
 * @param query The user's query string
 * @returns The normalized query with standardized terms
 */
export function normalizeElectricalTerms(query: string): string {
  if (!query) return query;
  
  const lowerQuery = query.toLowerCase();
  let normalizedQuery = lowerQuery;
  
  // Replace known variations with standard terms
  for (const [variation, standard] of Object.entries(TERM_VARIATIONS)) {
    // Use word boundary to ensure we're replacing whole words
    const regex = new RegExp(`\\b${variation}\\b`, 'gi');
    normalizedQuery = normalizedQuery.replace(regex, standard);
  }
  
  return normalizedQuery;
}

/**
 * Suggests possible correct terms for a potentially misspelled term
 * @param term The potentially misspelled term
 * @returns An array of suggested correct terms, or empty array if none found
 */
export function suggestCorrectTerms(term: string): string[] {
  if (!term) return [];
  
  const lowerTerm = term.toLowerCase();
  
  // If the term is already a known standard term, return it
  if (Object.values(TERM_VARIATIONS).includes(lowerTerm)) {
    return [lowerTerm];
  }
  
  // If the term is a known variation, return the standard form
  if (TERM_VARIATIONS[lowerTerm]) {
    return [TERM_VARIATIONS[lowerTerm]];
  }
  
  // Otherwise, suggest terms that are similar (simple edit distance)
  const suggestions: string[] = [];
  const standardTerms = new Set(Object.values(TERM_VARIATIONS));
  
  for (const standardTerm of standardTerms) {
    if (isTermSimilar(lowerTerm, standardTerm)) {
      suggestions.push(standardTerm);
    }
  }
  
  return suggestions;
}

/**
 * Checks if two terms are similar based on a simple edit distance
 * @param term1 First term
 * @param term2 Second term
 * @returns True if the terms are similar
 */
function isTermSimilar(term1: string, term2: string): boolean {
  // If one term is a substring of the other, they're similar
  if (term1.includes(term2) || term2.includes(term1)) {
    return true;
  }
  
  // If the terms have the same first letter and are within 2 characters in length, check edit distance
  if (term1[0] === term2[0] && Math.abs(term1.length - term2.length) <= 2) {
    // Simple edit distance calculation
    let differences = 0;
    const minLength = Math.min(term1.length, term2.length);
    
    for (let i = 0; i < minLength; i++) {
      if (term1[i] !== term2[i]) {
        differences++;
      }
      
      // More than 2 differences means not similar
      if (differences > 2) {
        return false;
      }
    }
    
    // Add the length difference to the differences count
    differences += Math.abs(term1.length - term2.length);
    
    return differences <= 2;
  }
  
  return false;
} 