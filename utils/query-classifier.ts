/**
 * Determines if a query is related to WA standards based on its content
 */
export function isWAStandardsQuery(query: string): boolean {
  if (!query) return false;
  
  const waKeywords = [
    'wa',
    'w.a',
    'w.a.',
    'w/a',
    'western australia',
    'western australian',
    'wa standards',
    'wa regulations',
    'wa electrical',
    'wa standard',
    'western power',
    'waes',
    'western australian electrical'
  ];
  
  const lowerQuery = query.toLowerCase().trim();
  
  // Check for exact keyword matches
  for (const keyword of waKeywords) {
    if (lowerQuery.includes(keyword)) {
      return true;
    }
  }
  
  // Check for word boundaries to prevent partial matches
  const queryWords = lowerQuery.split(/\s+/);
  const waMatch = queryWords.some(word => 
    word === 'wa' || 
    word === 'w.a' || 
    word === 'w.a.' || 
    word === 'w/a'
  );
  
  return waMatch;
} 