import { Figure } from '@/types/chat';
import { TreeViewElement } from '@/types/clauses';

export function extractFigureReferences(text: string): Figure[] {
  const references = new Map<string, Figure>();
  
  // Handle Tables
  const tablePattern = /Table\s+([A-Za-z0-9][._][0-9](?:[._][0-9])?)/gi;
  const tableMatches = Array.from(text.matchAll(tablePattern));
  
  for (const match of tableMatches) {
    const tableNumber = match[1];
    const formattedNumber = tableNumber
      .toLowerCase()
      .replace(/\./g, '_')
      .replace(/([a-z])_(\d)/g, '$1_$2');
      
    let imagePath = `/All Tables & Figures/AN3000_Table_${formattedNumber}.png`;
    
    // Check if special case with jpg extension
    if (tableNumber.toLowerCase().startsWith('c')) {
      imagePath = `/All Tables & Figures/AN3000_Table_${formattedNumber}.jpg`;
    }

    // Use the table number as the key to prevent duplicates
    const key = `Table_${tableNumber}`;
    if (!references.has(key)) {
      references.set(key, {
        name: `Table ${tableNumber}`,
        title: `Reference to Table ${tableNumber}`,
        image: imagePath,
        quote: `This is Table ${tableNumber} from AS/NZS 3000`
      });
    }
  }

  // Handle Figures
  const figurePattern = /Figure\s+(\d+\.\d+)/gi;
  const figureMatches = Array.from(text.matchAll(figurePattern));

  for (const match of figureMatches) {
    const figureNumber = match[1];
    const formattedNumber = figureNumber.replace('.', '_');
    
    // Use the figure number as the key to prevent duplicates
    const key = `Figure_${figureNumber}`;
    if (!references.has(key)) {
      references.set(key, {
        name: `Figure ${figureNumber}`,
        title: `Reference to Figure ${figureNumber}`,
        image: `/All Tables & Figures/AN3000_Figure_${formattedNumber}.png`,
        quote: `This is Figure ${figureNumber} from AS/NZS 3000`
      });
    }
  }

  return Array.from(references.values());
}

export function extractClauseReferences(text: string): TreeViewElement[] {
  // Updated regex pattern to match more clause reference formats
  const clauseRegex = /(?:(?:WA|AUSNZ|AS\/NZS|AS|NZS)(?:\s*:?\s*|\s+)|(?:clause|section)\s+)(\d+(?:\.\d+)*)/gi;
  const matches: TreeViewElement[] = [];
  const seen = new Set<string>();
  
  let match;
  while ((match = clauseRegex.exec(text)) !== null) {
    const standard = text.slice(match.index, match.index + 2).toUpperCase() === 'WA' ? 'WA' : 'AUSNZ';
    const clauseId = `${standard}:${match[1]}`;
    
    // Avoid duplicate entries
    if (!seen.has(clauseId)) {
      seen.add(clauseId);
      matches.push({
        id: clauseId,
        name: `${standard} Clause ${match[1]}`,
        isSelectable: true
      });
    }
  }
  
  return matches;
} 