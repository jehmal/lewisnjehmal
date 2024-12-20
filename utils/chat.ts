export function checkResponseComplete(content: string): boolean {
  // Check for common truncation indicators
  const truncationMarkers = [
    '...',
    '[continued]',
    'To be continued',
    content.endsWith('.') === false,
    content.endsWith('?') === false,
    content.endsWith('!') === false
  ];
  
  return !truncationMarkers.some(marker => 
    typeof marker === 'boolean' ? marker : content.includes(marker)
  );
} 