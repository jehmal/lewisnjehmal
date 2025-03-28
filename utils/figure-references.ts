import { Figure } from '@/types/chat';
import { ClauseTreeViewElement, ClauseSection } from '@/types/clauses';
import { PLACEHOLDER_IMAGE_PATH, FIGURES_BASE_PATH } from '@/lib/image-constants';

// Map of standard prefixes to use in file paths
const STANDARD_PREFIXES: Record<string, string[]> = {
  // Main standards with observed prefixes
  '3000': ['AN3000_'],
  '3003': ['3003_'],
  '3004.1': ['3004.1_'],
  '3004.2': ['3004.2_'],
  '3012': ['3012_'],
  '5033': ['5033_'],
  '5139': ['5139_'], // Only use the exact prefix needed
  '4509.2': ['4509.2_'],
  '4509.1': ['4509.1_'],
  '3017': ['3017_'],
  '3019': ['3019_'],
  '3820': ['3820_'],
  '2293.2': ['2293.2_'],
  '3001.1': ['3001.1_'],
  '3010': ['3010_'],
  
  // Additional standards from your system message
  '3001.2': ['3001.2_'],
  '3002': ['3002_'],
  '4777.1': ['4777.1_'],
  '4836': ['4836_'],
  '3760': ['3760_'], // Removed ASNZS prefix for 3760 standard
};

// File extensions to try for images - prioritize png for newer standards
const IMAGE_EXTENSIONS = ['.png', '.jpeg', '.jpg', '.bmp', '.gif'];
// Update path to use correct Next.js public asset structure
const PUBLIC_PATH = FIGURES_BASE_PATH;

/**
 * Safely executes a regex match operation with error handling
 * @param value The string value to match against
 * @param regex The regular expression to use
 * @returns The match result or null if an error occurs
 */
export function safeMatch(value: any, regex: RegExp): RegExpMatchArray | null {
  try {
    // Guard against undefined or null
    if (value === undefined || value === null) {
      console.warn('safeMatch: Value is undefined or null');
      return null;
    }
    
    // Convert to string if not already
    const strValue = String(value);
    return strValue.match(regex);
  } catch (error) {
    console.error('safeMatch error:', error);
    return null;
  }
}

export function extractFigureReferences(text: string, standardDoc: string = '3000'): Figure[] {
  console.log(`Extracting figures from text for standard: ${standardDoc}`);
  
  // Get the appropriate prefixes based on the standard document
  const prefixes = STANDARD_PREFIXES[standardDoc] || STANDARD_PREFIXES['3000'];
  console.log(`Using prefixes for standard ${standardDoc}:`, prefixes);
  
  // References map keyed by figure name to avoid duplicates
  const references = new Map<string, Figure>();
  
  // If there's no text, return an empty array
  if (!text) {
    return [];
  }
  
  // Special debug output for 4777.1 standard
  if (standardDoc === '4777.1' || standardDoc === '4777.1-2016') {
    console.log(`🔍 Looking for 4777.1 figures/tables in text: "${text.substring(0, 100)}${text.length > 100 ? '...' : ''}"`);
  }
  
  // Handle Figures with improved pattern matching
  // Now supports variations like "Figure 1.2" or "Fig 1.2" or "Fig. 1.2" and subfigures "Figure 1.2a"
  // Also support "Figures 4.1 and 4.2" pattern
  const figurePattern = /(?:Figure|Fig\.?)\s+(\d+(?:\.\d+)?(?:[a-z])?)/gi;
  const figuresPattern = /Figures?\s+(\d+(?:\.\d+)?(?:[a-z])?)(?:\s+and\s+(\d+(?:\.\d+)?(?:[a-z])?))?/gi;
  
  // Add new pattern for figure ranges like "Figures 2.19 to 2.23"
  const figuresRangePattern = /Figures?\s+(\d+(?:\.\d+)?(?:[a-z])?)\s+to\s+(\d+(?:\.\d+)?(?:[a-z])?)/gi;
  
  // Add new pattern for comma-separated figures like "Figures 3.3, 3.4 and 3.5"
  const figuresCommaListPattern = /Figures\s+((?:\d+(?:\.\d+)?(?:[a-z])?),\s+(?:\d+(?:\.\d+)?(?:[a-z])?))(?:,?\s+and\s+(\d+(?:\.\d+)?(?:[a-z])?))?/gi;
  
  // Add a specific pattern to catch "Figures 3.3, 3.4 and 3.5" and similar formats
  const specificFiguresPattern = /Figures\s+(\d+\.\d+),\s+(\d+\.\d+)(?:\s+and\s+|\s*,\s*and\s+)(\d+\.\d+)/gi;
  
  const figureMatches = Array.from(text.matchAll(figurePattern));
  const figuresMatches = Array.from(text.matchAll(figuresPattern));
  const figuresRangeMatches = Array.from(text.matchAll(figuresRangePattern));
  const figuresCommaListMatches = Array.from(text.matchAll(figuresCommaListPattern));
  const specificFiguresMatches = Array.from(text.matchAll(specificFiguresPattern));
  
  // Process single figure references
  for (const match of figureMatches) {
    const figureNumber = match[1];
    
    // Special handling for newer standards (4777.1, 4836, 4509.2)
    const isNewStandard = ['4777.1', '4836', '4509.2'].includes(standardDoc);
    
    // Extract base number and any suffix
    const baseNumber = figureNumber.replace(/[()]/g, '').match(/\d+(?:\.\d+)?/)?.[0] || figureNumber;
    const suffix = figureNumber.replace(/[()]/g, '').match(/[a-z]$/i)?.[0] || '';
    
    // Format the number based on standard
    let formattedNumber;
    if (standardDoc === '4509.2') {
      // For 4509.2, use dot notation for letters (e.g., 1.a, 1.b)
      formattedNumber = suffix 
        ? `${baseNumber}.${suffix.toLowerCase()}`  // 1.a format
        : baseNumber;  // just 1 format
    } else {
      formattedNumber = isNewStandard
        ? baseNumber // Keep the dot notation for newer standards
        : baseNumber.includes('.')
          ? baseNumber // Keep the dot notation
          : baseNumber;
      
      formattedNumber = suffix 
        ? `${formattedNumber}${suffix.toLowerCase()}`
        : formattedNumber;
    }
    
    // Generate possible paths with different prefixes and file extensions
    const possiblePaths: string[] = [];
    
    prefixes.forEach(prefix => {
      IMAGE_EXTENSIONS.forEach(ext => {
        possiblePaths.push(`${PUBLIC_PATH}/${prefix}${isNewStandard ? 'Figure_' : 'Figure_'}${formattedNumber}${ext}`);
      });
    });
    
    // Use the figure number as the key to prevent duplicates
    const key = `Figure_${figureNumber}`;
    if (!references.has(key)) {
      references.set(key, {
        name: `Figure ${figureNumber}`,
        title: `Reference to Figure ${figureNumber}`,
        image: possiblePaths[0], // Default to first path
        quote: `This is Figure ${figureNumber} from AS/NZS ${standardDoc}`,
        possiblePaths: possiblePaths,
        standardDoc: standardDoc
      });
    }
  }
  
  // Process "Figures X and Y" references
  for (const match of figuresMatches) {
    // First figure
    const figureNumber1 = match[1];
    if (figureNumber1) {
      // Handle the first figure using the same logic as for single figures
      const baseNumber = safeMatch(figureNumber1?.replace(/[()]/g, ''), /\d+(?:\.\d+)?/)?.[0] || figureNumber1;
      const suffix = safeMatch(figureNumber1?.replace(/[()]/g, ''), /[a-z]$/i)?.[0] || '';
      
      // Format the number based on standard
      let formattedNumber;
      if (standardDoc === '4509.2') {
        // For 4509.2, use dot notation for letters (e.g., 1.a, 1.b)
        formattedNumber = suffix 
          ? `${baseNumber}.${suffix.toLowerCase()}`  // 1.a format
          : baseNumber;  // just 1 format
      } else {
        formattedNumber = baseNumber.replace('.', '_');
        formattedNumber = suffix 
          ? `${formattedNumber}_${suffix.toLowerCase()}`
          : formattedNumber;
      }
      
      // Generate possible paths
      const possiblePaths: string[] = [];
      
      prefixes.forEach(prefix => {
        IMAGE_EXTENSIONS.forEach(ext => {
          possiblePaths.push(`${PUBLIC_PATH}/${prefix}Figure_${formattedNumber}${ext}`);
        });
      });
      
      // Use the figure number as the key to prevent duplicates
      const key = `Figure_${figureNumber1}`;
      if (!references.has(key)) {
        references.set(key, {
          name: `Figure ${figureNumber1}`,
          title: `Reference to Figure ${figureNumber1}`,
          image: possiblePaths[0], // Default to first path
          quote: `This is Figure ${figureNumber1} from AS/NZS ${standardDoc}`,
          possiblePaths: possiblePaths, // Store all possible paths to try
          standardDoc: standardDoc // Store the standard this figure belongs to
        });
      }
    }
    
    // Second figure (if "and" pattern was matched)
    const figureNumber2 = match[2];
    if (figureNumber2) {
      // Handle the second figure using the same logic
      const baseNumber = safeMatch(figureNumber2?.replace(/[()]/g, ''), /\d+(?:\.\d+)?/)?.[0] || figureNumber2;
      const suffix = safeMatch(figureNumber2?.replace(/[()]/g, ''), /[a-z]$/i)?.[0] || '';
      
      // Format the number based on standard
      let formattedNumber;
      if (standardDoc === '4509.2') {
        // For 4509.2, use dot notation for letters (e.g., 1.a, 1.b)
        formattedNumber = suffix 
          ? `${baseNumber}.${suffix.toLowerCase()}`  // 1.a format
          : baseNumber;  // just 1 format
      } else {
        formattedNumber = baseNumber.replace('.', '_');
        formattedNumber = suffix 
          ? `${formattedNumber}_${suffix.toLowerCase()}`
          : formattedNumber;
      }
      
      // Generate possible paths
      const possiblePaths: string[] = [];
      
      prefixes.forEach(prefix => {
        IMAGE_EXTENSIONS.forEach(ext => {
          possiblePaths.push(`${PUBLIC_PATH}/${prefix}Figure_${formattedNumber}${ext}`);
        });
      });
      
      // Use the figure number as the key to prevent duplicates
      const key = `Figure_${figureNumber2}`;
      if (!references.has(key)) {
        references.set(key, {
          name: `Figure ${figureNumber2}`,
          title: `Reference to Figure ${figureNumber2}`,
          image: possiblePaths[0], // Default to first path
          quote: `This is Figure ${figureNumber2} from AS/NZS ${standardDoc}`,
          possiblePaths: possiblePaths, // Store all possible paths to try
          standardDoc: standardDoc // Store the standard this figure belongs to
        });
      }
    }
  }
  
  // Process figure ranges like "Figures 2.19 to 2.23"
  for (const match of figuresRangeMatches) {
    const startFigure = match[1];
    const endFigure = match[2];
    
    if (!startFigure || !endFigure) continue;
    
    // Extract the base numbers (e.g., 2.19 and 2.23)
    const startBaseMatch = safeMatch(startFigure.replace(/[()]/g, ''), /(\d+)(?:\.(\d+))?/);
    const endBaseMatch = safeMatch(endFigure.replace(/[()]/g, ''), /(\d+)(?:\.(\d+))?/);
    
    if (!startBaseMatch || !endBaseMatch) continue;
    
    // Parse major and minor parts of the figure numbers
    const startMajor = parseInt(startBaseMatch[1]);
    const startMinor = startBaseMatch[2] ? parseInt(startBaseMatch[2]) : 0;
    const endMajor = parseInt(endBaseMatch[1]);
    const endMinor = endBaseMatch[2] ? parseInt(endBaseMatch[2]) : 0;
    
    // Only process if we have valid numbers and they belong to the same major section
    if (isNaN(startMajor) || isNaN(endMajor) || startMajor !== endMajor) continue;
    
    if (isNaN(startMinor) || isNaN(endMinor) || startMinor > endMinor) continue;
    
    // Generate all figures in the range
    for (let minor = startMinor; minor <= endMinor; minor++) {
      const figureNumber = `${startMajor}.${minor}`;
      
      // Format the number for the filename
      const formattedNumber = `${startMajor}_${minor}`;
      
      // Generate possible paths
      const possiblePaths: string[] = [];
      
      prefixes.forEach(prefix => {
        IMAGE_EXTENSIONS.forEach(ext => {
          possiblePaths.push(`${PUBLIC_PATH}/${prefix}Figure_${formattedNumber}${ext}`);
        });
      });
      
      // Use the figure number as the key to prevent duplicates
      const key = `Figure_${figureNumber}`;
      if (!references.has(key)) {
        references.set(key, {
          name: `Figure ${figureNumber}`,
          title: `Reference to Figure ${figureNumber}`,
          image: possiblePaths[0],
          quote: `This is Figure ${figureNumber} from AS/NZS ${standardDoc}`,
          possiblePaths: possiblePaths,
          standardDoc: standardDoc // Maintain standard context
        });
      }
    }
  }
  
  // Process comma-separated figures like "Figures 3.3, 3.4 and 3.5"
  for (const match of figuresCommaListMatches) {
    const commaList = match[1]; // This will be like "3.3, 3.4"
    const andFigure = match[2]; // This will be like "3.5" (optional)
    
    if (commaList) {
      // Split the comma list by comma and process each figure
      const commaFigures = commaList.split(',').map(f => f.trim());
      
      for (const figureNumber of commaFigures) {
        // Skip empty strings
        if (!figureNumber) continue;
        
        // Process each figure using the same logic as for single figures
        const baseNumber = safeMatch(figureNumber?.replace(/[()]/g, ''), /\d+\.\d+/)?.[0] || figureNumber;
        const suffix = safeMatch(figureNumber?.replace(/[()]/g, ''), /[a-z]$/i)?.[0] || '';
        
        const formattedBaseNumber = baseNumber.replace('.', '_');
        const formattedNumber = suffix 
          ? `${formattedBaseNumber}_${suffix.toLowerCase()}`
          : formattedBaseNumber;
        
        // Generate possible paths
        const possiblePaths: string[] = [];
        
        prefixes.forEach(prefix => {
          IMAGE_EXTENSIONS.forEach(ext => {
            possiblePaths.push(`${PUBLIC_PATH}/${prefix}Figure_${formattedNumber}${ext}`);
          });
        });
        
        // Use the figure number as the key to prevent duplicates
        const key = `Figure_${figureNumber}`;
        if (!references.has(key)) {
          references.set(key, {
            name: `Figure ${figureNumber}`,
            title: `Reference to Figure ${figureNumber}`,
            image: possiblePaths[0], // Default to first path
            quote: `This is Figure ${figureNumber} from AS/NZS ${standardDoc}`,
            possiblePaths: possiblePaths, // Store all possible paths to try
            standardDoc: standardDoc // Store the standard this figure belongs to
          });
        }
      }
    }
    
    // Process the figure after "and" if present
    if (andFigure) {
      // Handle the figure after "and" using the same logic as for single figures
      const baseNumber = safeMatch(andFigure?.replace(/[()]/g, ''), /\d+\.\d+/)?.[0] || andFigure;
      const suffix = safeMatch(andFigure?.replace(/[()]/g, ''), /[a-z]$/i)?.[0] || '';
      
      const formattedBaseNumber = baseNumber.replace('.', '_');
      const formattedNumber = suffix 
        ? `${formattedBaseNumber}_${suffix.toLowerCase()}`
        : formattedBaseNumber;
      
      // Generate possible paths
      const possiblePaths: string[] = [];
      
      prefixes.forEach(prefix => {
        IMAGE_EXTENSIONS.forEach(ext => {
          possiblePaths.push(`${PUBLIC_PATH}/${prefix}Figure_${formattedNumber}${ext}`);
        });
      });
      
      // Use the figure number as the key to prevent duplicates
      const key = `Figure_${andFigure}`;
      if (!references.has(key)) {
        references.set(key, {
          name: `Figure ${andFigure}`,
          title: `Reference to Figure ${andFigure}`,
          image: possiblePaths[0], // Default to first path
          quote: `This is Figure ${andFigure} from AS/NZS ${standardDoc}`,
          possiblePaths: possiblePaths, // Store all possible paths to try
          standardDoc: standardDoc // Store the standard this figure belongs to
        });
      }
    }
  }
  
  // Process specific format "Figures 3.3, 3.4 and 3.5"
  for (const match of specificFiguresMatches) {
    // Process each of the three figures individually
    const figures = [match[1], match[2], match[3]];
    
    for (const figureNumber of figures) {
      // Skip if there's no figure number
      if (!figureNumber) continue;
      
      // Process each figure using the same logic as for single figures
      const baseNumber = safeMatch(figureNumber?.replace(/[()]/g, ''), /\d+\.\d+/)?.[0] || figureNumber;
      const suffix = safeMatch(figureNumber?.replace(/[()]/g, ''), /[a-z]$/i)?.[0] || '';
      
      const formattedBaseNumber = baseNumber.replace('.', '_');
      const formattedNumber = suffix 
        ? `${formattedBaseNumber}_${suffix.toLowerCase()}`
        : formattedBaseNumber;
      
      // Generate possible paths
      const possiblePaths: string[] = [];
      
      prefixes.forEach(prefix => {
        IMAGE_EXTENSIONS.forEach(ext => {
          possiblePaths.push(`${PUBLIC_PATH}/${prefix}Figure_${formattedNumber}${ext}`);
        });
      });
      
      // Use the figure number as the key to prevent duplicates
      const key = `Figure_${figureNumber}`;
      if (!references.has(key)) {
        references.set(key, {
          name: `Figure ${figureNumber}`,
          title: `Reference to Figure ${figureNumber}`,
          image: possiblePaths[0], // Default to first path
          quote: `This is Figure ${figureNumber} from AS/NZS ${standardDoc}`,
          possiblePaths: possiblePaths, // Store all possible paths to try
          standardDoc: standardDoc // Store the standard this figure belongs to
        });
      }
    }
  }
  
  // Handle Tables with improved pattern matching
  // Now handles more variations in table references, including letter prefixes like "Table A.1"
  const tablePattern = /(?:Table|Tab\.?)\s+([A-Za-z]?\.?\d+(?:\.\d+)?(?:[a-z])?)/gi;
  const tablesPattern = /Tables?\s+([A-Za-z]?\.?\d+(?:\.\d+)?(?:[a-z])?)(?:\s+and\s+([A-Za-z]?\.?\d+(?:\.\d+)?(?:[a-z])?))?/gi;
  
  const tableMatches = Array.from(text.matchAll(tablePattern));
  const tablesMatches = Array.from(text.matchAll(tablesPattern));
  
  // Log all matches for debugging
  console.log(`Found ${tableMatches.length} table matches:`, tableMatches.map(m => m[0]));
  
  for (const match of tableMatches) {
    const tableNumber = match[1];
    
    // Format the number consistently with file naming convention
    const formattedNumber = tableNumber.includes('.')
      ? tableNumber // Keep the dot notation
      : tableNumber;
    
    const finalFormattedNumber = /^\d$/.test(tableNumber) ? tableNumber : formattedNumber;
    
    console.log(`Formatting table: ${tableNumber} -> ${finalFormattedNumber}`);
    
    // Generate possible paths with different prefixes and file extensions
    const possiblePaths: string[] = [];
    
    prefixes.forEach(prefix => {
      IMAGE_EXTENSIONS.forEach(ext => {
        possiblePaths.push(`${PUBLIC_PATH}/${prefix}Table_${finalFormattedNumber}${ext}`);
      });
    });
    
    // For common tables like 4.1, try with explicit paths as well
    if (tableNumber === '4.1' && standardDoc === '3000') {
      possiblePaths.push(`${PUBLIC_PATH}/AN3000_Table_4.1.png`);
      possiblePaths.push(`${PUBLIC_PATH}/WA_Table_4.1.png`);
      // Keep legacy format as fallback
      possiblePaths.push(`${PUBLIC_PATH}/AN3000_Table_4_1.png`);
      possiblePaths.push(`${PUBLIC_PATH}/WA_Table_4_1.png`);
    }
    
    console.log(`Generated ${possiblePaths.length} possible paths for Table ${tableNumber}`);
    
    // Use the table number as the key to prevent duplicates
    const key = `Table_${tableNumber}`;
    if (!references.has(key)) {
      references.set(key, {
        name: `Table ${tableNumber}`,
        title: `Reference to Table ${tableNumber}`,
        image: possiblePaths[0], // Default to first path
        quote: `This is Table ${tableNumber} from AS/NZS ${standardDoc}`,
        possiblePaths: possiblePaths, // Store all possible paths to try
        standardDoc: standardDoc // Store the standard this figure belongs to
      });
    }
  }
  
  // Process "Tables X and Y" references
  for (const match of tablesMatches) {
    // First table
    const tableNumber1 = match[1];
    if (tableNumber1) {
      // Handle the first table using the same logic as for single tables
      const formattedNumber = tableNumber1.includes('.')
        ? tableNumber1 // Keep the dot notation
        : tableNumber1;

      // Generate possible paths
      const possiblePaths: string[] = [];

      prefixes.forEach(prefix => {
        IMAGE_EXTENSIONS.forEach(ext => {
          possiblePaths.push(`${PUBLIC_PATH}/${prefix}Table_${formattedNumber}${ext}`);
        });
      });

      // For common tables like 4.1, try with explicit paths as well
      if (tableNumber1 === '4.1' && standardDoc === '3000') {
        possiblePaths.push(`${PUBLIC_PATH}/AN3000_Table_4.1.png`);
        possiblePaths.push(`${PUBLIC_PATH}/WA_Table_4.1.png`);
        // Keep legacy format as fallback
        possiblePaths.push(`${PUBLIC_PATH}/AN3000_Table_4_1.png`);
        possiblePaths.push(`${PUBLIC_PATH}/WA_Table_4_1.png`);
      }

      // Use the table number as the key to prevent duplicates
      const key = `Table_${tableNumber1}`;
      if (!references.has(key)) {
        references.set(key, {
          name: `Table ${tableNumber1}`,
          title: `Reference to Table ${tableNumber1}`,
          image: possiblePaths[0], // Default to first path
          quote: `This is Table ${tableNumber1} from AS/NZS ${standardDoc}`,
          possiblePaths: possiblePaths, // Store all possible paths to try
          standardDoc: standardDoc // Store the standard this figure belongs to
        });
      }
    }

    // Second table (if "and" pattern was matched)
    const tableNumber2 = match[2];
    if (tableNumber2) {
      // Handle the second table using the same logic
      const formattedNumber = tableNumber2.includes('.')
        ? tableNumber2 // Keep the dot notation
        : tableNumber2;

      // Generate possible paths
      const possiblePaths: string[] = [];

      prefixes.forEach(prefix => {
        IMAGE_EXTENSIONS.forEach(ext => {
          possiblePaths.push(`${PUBLIC_PATH}/${prefix}Table_${formattedNumber}${ext}`);
        });
      });

      // For common tables like 4.1, try with explicit paths as well
      if (tableNumber2 === '4.1' && standardDoc === '3000') {
        possiblePaths.push(`${PUBLIC_PATH}/AN3000_Table_4.1.png`);
        possiblePaths.push(`${PUBLIC_PATH}/WA_Table_4.1.png`);
        // Keep legacy format as fallback
        possiblePaths.push(`${PUBLIC_PATH}/AN3000_Table_4_1.png`);
        possiblePaths.push(`${PUBLIC_PATH}/WA_Table_4_1.png`);
      }

      // Use the table number as the key to prevent duplicates
      const key = `Table_${tableNumber2}`;
      if (!references.has(key)) {
        references.set(key, {
          name: `Table ${tableNumber2}`,
          title: `Reference to Table ${tableNumber2}`,
          image: possiblePaths[0], // Default to first path
          quote: `This is Table ${tableNumber2} from AS/NZS ${standardDoc}`,
          possiblePaths: possiblePaths, // Store all possible paths to try
          standardDoc: standardDoc // Store the standard this figure belongs to
        });
      }
    }
  }
  
  // Parse the AI assistant's response format for standard-specific references
  // This handles the format "ASNZS5033 Figure 2.1: [Description]" in the text
  const standardReferencePattern = /ASNZS(\d{4}(?:\.\d+)?)\s+(?:Figure|Table)\s+([A-Za-z0-9][._]?[0-9](?:[._][0-9])?(?:[a-z])?)/gi;
  const standardReferenceMatches = Array.from(text.matchAll(standardReferencePattern));
  
  for (const match of standardReferenceMatches) {
    const refStandardDoc = match[1]; // e.g., "5033" or "3004.2"
    const refNumber = match[2]; // e.g., "2.1" or "A.1"
    const isTable = /Table/i.test(match[0]);
    const type = isTable ? "Table" : "Figure";
    
    // Format the number consistently with file naming convention
    const formattedNumber = refNumber.includes('.')
      ? refNumber // Keep the dot notation
      : refNumber;
    
    // Get the appropriate prefixes for this standard
    const stdPrefixes = STANDARD_PREFIXES[refStandardDoc] || 
      [`ASNZS${refStandardDoc}_`, `AS${refStandardDoc}_`];
    
    // Generate possible paths
    const possiblePaths: string[] = [];
    
    stdPrefixes.forEach(prefix => {
      IMAGE_EXTENSIONS.forEach(ext => {
        possiblePaths.push(`${PUBLIC_PATH}/${prefix}${type}_${formattedNumber}${ext}`);
      });
    });
    
    // For common tables like 4.1, try with explicit paths as well
    if (isTable && refNumber === '4.1' && refStandardDoc === '3000') {
      possiblePaths.push(`${PUBLIC_PATH}/AN3000_Table_4.1.png`);
      possiblePaths.push(`${PUBLIC_PATH}/WA_Table_4.1.png`);
      // Keep legacy format as fallback
      possiblePaths.push(`${PUBLIC_PATH}/AN3000_Table_4_1.png`);
      possiblePaths.push(`${PUBLIC_PATH}/WA_Table_4_1.png`);
    }
    
    // Create a unique key that includes the standard
    const key = `${refStandardDoc}_${type}_${refNumber}`;
    
    if (!references.has(key)) {
      references.set(key, {
        name: `${type} ${refNumber}`,
        title: `Reference to ${type} ${refNumber} from AS/NZS ${refStandardDoc}`,
        image: possiblePaths[0], // Default to first path
        quote: `This is ${type} ${refNumber} from AS/NZS ${refStandardDoc}`,
        possiblePaths: possiblePaths, // Store all possible paths to try
        standardDoc: refStandardDoc // Store the standard this figure belongs to
      });
    }
  }
  
  // In extractFigureReferences, add an additional pattern for "Refer to" format
  // Add after the existing patterns
  const referToPattern = /Refer to (?:Figures?|Tables?)\s+(\d+(?:\.\d+)?(?:[a-z])?)(?:\s+and\s+(\d+(?:\.\d+)?(?:[a-z])?))?/gi;
  const referToMatches = Array.from(text.matchAll(referToPattern));
  
  // Process "Refer to Figure(s) X and Y" references
  for (const match of referToMatches) {
    // Process first figure/table
    const referenceNumber1 = match[1];
    if (referenceNumber1) {
      // Determine if it's a figure or table based on context (assuming Figure by default)
      const isTable = /Tables?/.test(match[0]);
      const type = isTable ? "Table" : "Figure";
      
      // Format the reference number
      const baseNumber = safeMatch(referenceNumber1?.replace(/[()]/g, ''), /\d+\.\d+/)?.[0] || referenceNumber1;
      const suffix = safeMatch(referenceNumber1?.replace(/[()]/g, ''), /[a-z]$/i)?.[0] || '';
      
      // Keep the decimal point format
      const formattedNumber = suffix 
        ? `${baseNumber}${suffix.toLowerCase()}`
        : baseNumber;
      
      // Generate possible paths
      const possiblePaths: string[] = [];
      
      prefixes.forEach(prefix => {
        IMAGE_EXTENSIONS.forEach(ext => {
          possiblePaths.push(`${PUBLIC_PATH}/${prefix}${type}_${formattedNumber}${ext}`);
        });
      });
      
      // For common tables like 4.1, try with explicit paths as well
      if (isTable && baseNumber === '4.1' && standardDoc === '3000') {
        possiblePaths.push(`${PUBLIC_PATH}/AN3000_Table_4.1.png`);
        possiblePaths.push(`${PUBLIC_PATH}/WA_Table_4.1.png`);
        // Keep legacy format as fallback
        possiblePaths.push(`${PUBLIC_PATH}/AN3000_Table_4_1.png`);
        possiblePaths.push(`${PUBLIC_PATH}/WA_Table_4_1.png`);
      }
      
      // Use type and number as key to prevent duplicates
      const key = `${type}_${referenceNumber1}`;
      if (!references.has(key)) {
        references.set(key, {
          name: `${type} ${referenceNumber1}`,
          title: `Reference to ${type} ${referenceNumber1}`,
          image: possiblePaths[0], // Default to first path
          quote: `This is ${type} ${referenceNumber1} from AS/NZS ${standardDoc}`,
          possiblePaths: possiblePaths, // Store all possible paths to try
          standardDoc: standardDoc // Store the standard this figure belongs to
        });
      }
    }
    
    // Process second figure/table (if "and" pattern was matched)
    const referenceNumber2 = match[2];
    if (referenceNumber2) {
      // Determine if it's a figure or table based on context (assuming Figure by default)
      const isTable = /Tables?/.test(match[0]);
      const type = isTable ? "Table" : "Figure";
      
      // Format the reference number
      const baseNumber = safeMatch(referenceNumber2?.replace(/[()]/g, ''), /\d+\.\d+/)?.[0] || referenceNumber2;
      const suffix = safeMatch(referenceNumber2?.replace(/[()]/g, ''), /[a-z]$/i)?.[0] || '';
      
      // Keep the decimal point format
      const formattedNumber = suffix 
        ? `${baseNumber}${suffix.toLowerCase()}`
        : baseNumber;
      
      // Generate possible paths
      const possiblePaths: string[] = [];
      
      prefixes.forEach(prefix => {
        IMAGE_EXTENSIONS.forEach(ext => {
          possiblePaths.push(`${PUBLIC_PATH}/${prefix}${type}_${formattedNumber}${ext}`);
        });
      });
      
      // For common tables like 4.1, try with explicit paths as well
      if (isTable && baseNumber === '4.1' && standardDoc === '3000') {
        possiblePaths.push(`${PUBLIC_PATH}/AN3000_Table_4.1.png`);
        possiblePaths.push(`${PUBLIC_PATH}/WA_Table_4.1.png`);
        // Keep legacy format as fallback
        possiblePaths.push(`${PUBLIC_PATH}/AN3000_Table_4_1.png`);
        possiblePaths.push(`${PUBLIC_PATH}/WA_Table_4_1.png`);
      }
      
      // Use type and number as key to prevent duplicates
      const key = `${type}_${referenceNumber2}`;
      if (!references.has(key)) {
        references.set(key, {
          name: `${type} ${referenceNumber2}`,
          title: `Reference to ${type} ${referenceNumber2}`,
          image: possiblePaths[0], // Default to first path
          quote: `This is ${type} ${referenceNumber2} from AS/NZS ${standardDoc}`,
          possiblePaths: possiblePaths, // Store all possible paths to try
          standardDoc: standardDoc // Store the standard this figure belongs to
        });
      }
    }
  }
  
  console.log(`Found ${figureMatches.length} matches for pattern 'figurePattern'`);
  console.log(`Found ${figuresMatches.length} matches for pattern 'figuresPattern'`);
  console.log(`Found ${figuresRangeMatches.length} matches for pattern 'figuresRangePattern'`);
  console.log(`Found ${tableMatches.length} matches for pattern 'tablePattern'`);
  console.log(`Found ${tablesMatches.length} matches for pattern 'tablesPattern'`);
  console.log(`Found ${referToMatches.length} matches for pattern 'referToPattern'`);

  // Add a special case function to ensure specific figures are found
  addSpecialCaseFigures(text, references, standardDoc);

  const resultFigures = Array.from(references.values());
  console.log(`Extracted ${resultFigures.length} total figures: ${resultFigures.map(f => f.name).join(', ')}`);
  return resultFigures;
}

// Update addSpecialCaseFigures to forcibly add specific needed figures even if they don't exist
function addSpecialCaseFigures(text: string, references: Map<string, Figure>, standardDoc: string): void {
  // List of special cases to look for in the text
  const specialCases = [
    { type: 'Table', number: '4.1', pattern: /Table\s+4\.1|Table\s+4_1/i, 
      quote: "Table 4.1 provides guidelines on the degree of protection (IP ratings) required for various environmental conditions" },
    { type: 'Figure', number: '4.1', pattern: /Figure\s+4\.1|Figure\s+4_1|Fig\s+4\.1|Figures\s+4\.1/i,
      quote: "Figure 4.1 illustrates areas where electrical accessories are considered to be protected from the weather" },
    { type: 'Figure', number: '4.2', pattern: /Figure\s+4\.2|Figure\s+4_2|Fig\s+4\.2|Figures\s+4\.2/i,
      quote: "Figure 4.2 shows areas where electrical accessories require additional weather protection" },
  ];
  
  // Check for specific terms in the clause text that might indicate these figures are needed
  const references4_1_4_2 = /protected\s+from\s+the\s+weather|IP\s+ratings|IP33|electrical\s+accessories\s+installed|soffit|30\s+degrees/i;

  // Force the needed figures even if not explicitly mentioned
  if (references4_1_4_2.test(text) && standardDoc === '3000') {
    for (const special of specialCases) {
      // Always add these specific figures since they're frequently needed but might not be explicitly named
      console.log(`Adding required figure ${special.type} ${special.number} for clause`);
      const formattedNumber = special.number.replace('.', '_');
      
      // Generate possible paths for this special case
      const possiblePaths: string[] = [];
      
      // Define prefixes based on the standard
      const prefixes = STANDARD_PREFIXES[standardDoc] || ['AN3000_', 'WA_'];
      
      prefixes.forEach(prefix => {
        IMAGE_EXTENSIONS.forEach(ext => {
          possiblePaths.push(`${PUBLIC_PATH}/${prefix}${special.type}_${formattedNumber}${ext}`);
        });
      });
      
      // Special case: Table 4.1 - try both formats for backward compatibility
      if (special.type === 'Table' && special.number === '4.1') {
        possiblePaths.unshift(`${PUBLIC_PATH}/AN3000_Table_4.1.png`);
        possiblePaths.unshift(`${PUBLIC_PATH}/WA_Table_4.1.png`);
        // Keep legacy format as fallback
        possiblePaths.push(`${PUBLIC_PATH}/AN3000_Table_4_1.png`);
        possiblePaths.push(`${PUBLIC_PATH}/WA_Table_4_1.png`);
      }
      const key = `${special.type}_${special.number}`;
      // Only add if not already in references
      if (!references.has(key)) {
        console.log(`Adding special case ${key}`);
        references.set(key, {
          name: `${special.type} ${special.number}`,
          title: `Reference to ${special.type} ${special.number}`,
          image: possiblePaths[0], // Default to first path
          quote: special.quote || `This is ${special.type} ${special.number} from AS/NZS ${standardDoc}`,
          possiblePaths: possiblePaths, // Store all possible paths to try
          standardDoc: standardDoc
        });
      }
    }
    return;
  }
  
  // Original specific pattern matching (keep this as a fallback)
  for (const special of specialCases) {
    // Check if the special case is mentioned in the text
    if (special.pattern.test(text)) {
      const formattedNumber = special.number.replace('.', '_');
      
      // Generate possible paths for this special case
      const possiblePaths: string[] = [];
      
      // Define prefixes based on the standard
      const prefixes = STANDARD_PREFIXES[standardDoc] || ['AN3000_', 'WA_'];
      
      prefixes.forEach(prefix => {
        IMAGE_EXTENSIONS.forEach(ext => {
          possiblePaths.push(`${PUBLIC_PATH}/${prefix}${special.type}_${formattedNumber}${ext}`);
        });
      });
      
      // Special case: Table 4.1 - try both formats for backward compatibility
      if (special.type === 'Table' && special.number === '4.1') {
        possiblePaths.unshift(`${PUBLIC_PATH}/AN3000_Table_4.1.png`);
        possiblePaths.unshift(`${PUBLIC_PATH}/WA_Table_4.1.png`);
        // Keep legacy format as fallback
        possiblePaths.push(`${PUBLIC_PATH}/AN3000_Table_4_1.png`);
        possiblePaths.push(`${PUBLIC_PATH}/WA_Table_4_1.png`);
      }
      
      // Create unique key
      const key = `${special.type}_${special.number}`;
      
      // Only add if not already in references
      if (!references.has(key)) {
        console.log(`Adding special case ${key}`);
        references.set(key, {
          name: `${special.type} ${special.number}`,
          title: `Reference to ${special.type} ${special.number}`,
          image: possiblePaths[0], // Default to first path
          quote: special.quote || `This is ${special.type} ${special.number} from AS/NZS ${standardDoc}`,
          possiblePaths: possiblePaths, // Store all possible paths to try
          standardDoc: standardDoc
        });
      }
    }
  }
}

// Add the missing parseClauseList function before extractClauseReferences
function parseClauseList(listContent: string): ClauseTreeViewElement[] {
  const clauseMap = new Map<string, ClauseTreeViewElement>();
  
  // Split by lines, bullet points, etc.
  const clauseLines = listContent.split(/\n|•|-|\*/).filter(line => line.trim() !== '');
  
  console.log(`📋 Found ${clauseLines.length} potential clause references in related clauses list`);
  
  for (const line of clauseLines) {
    // Skip empty lines
    if (!line.trim()) continue;
    
    // Log each line for debugging
    console.log(`Processing line: "${line.trim()}"`);
    
    // Skip appendix references
    if (/appendix\s+[a-z]/i.test(line)) {
      console.log(`📋 Skipping appendix reference: ${line.trim()}`);
      continue;
    }
    
    // MATCH PATTERN 1: ASNZS3000 Clause 1.5
    const standardClauseMatch = line.match(/(?:ASNZS)(\d{4}(?:\.\d+)?(?:-\d{4})?)\s+(?:Clause|clause|CLAUSE)\s+([A-Za-z0-9](?:[.-][0-9])*(?:\.\d+)*)/i);
    
    if (standardClauseMatch) {
      const standardId = standardClauseMatch[1];
      const clauseNumber = standardClauseMatch[2];
      const clauseId = `AUSNZ:${clauseNumber}`;
      
      if (!clauseMap.has(clauseId)) {
        clauseMap.set(clauseId, {
          id: clauseId,
          name: `Clause ${clauseNumber}`,
          isSelectable: true,
          standardDoc: standardId
        });
        console.log(`📑 Found clause from list: ${standardId} Clause ${clauseNumber}`);
      }
      continue;
    }
    
    // MATCH PATTERN 2: AS/NZS 3000 Clause 1.5
    const altStandardClauseMatch = line.match(/(?:AS\/NZS|AS|NZS)\s+(\d{4}(?:\.\d+)?(?:-\d{4})?)\s+(?:Clause|clause|CLAUSE)\s+([A-Za-z0-9](?:[.-][0-9])*(?:\.\d+)*)/i);
    
    if (altStandardClauseMatch) {
      const standardId = altStandardClauseMatch[1];
      const clauseNumber = altStandardClauseMatch[2];
      const clauseId = `AUSNZ:${clauseNumber}`;
      
      if (!clauseMap.has(clauseId)) {
        clauseMap.set(clauseId, {
          id: clauseId,
          name: `Clause ${clauseNumber}`,
          isSelectable: true,
          standardDoc: standardId
        });
        console.log(`📑 Found clause from list (AS/NZS format): ${standardId} Clause ${clauseNumber}`);
      }
      continue;
    }
    
    // MATCH PATTERN 3: Plain "Clause 1.5.4" (use context to determine standard)
    const plainClauseMatch = line.match(/\b(?:Clause|clause|CLAUSE)\s+([A-Za-z0-9](?:[.-][0-9])*(?:\.\d+)*)/i);
    
    if (plainClauseMatch) {
      const clauseNumber = plainClauseMatch[1];
      const clauseId = `AUSNZ:${clauseNumber}`;
      
      // Attempt to determine the standard from other parts of the line
      let detectedStandard = '';
      
      // Look for standard IDs in the line
      const standardIdMatch = line.match(/\b(\d{4}(?:\.\d+)?(?:-\d{4})?)\b/);
      if (standardIdMatch) {
        detectedStandard = standardIdMatch[1];
      } else {
        // Default to 3000 as the most common standard
        detectedStandard = '3000';
      }
      
      if (!clauseMap.has(clauseId)) {
        clauseMap.set(clauseId, {
          id: clauseId,
          name: `Clause ${clauseNumber}`,
          isSelectable: true,
          standardDoc: detectedStandard
        });
        console.log(`📑 Found plain clause: ${detectedStandard} Clause ${clauseNumber}`);
      }
    }
  }
  
  return Array.from(clauseMap.values());
}

export function extractClauseReferences(text: string): ClauseTreeViewElement[] {
  // Add a special case for identifying IES-related content and standard
  const iesKeywords = [
    'inverter energy system', 'ies', 'grid-connected inverter', 'grid connected inverter',
    'solar inverter', 'pv inverter', 'photovoltaic inverter', 'battery inverter',
    'as/nzs 4777', 'asnzs4777', '4777.1', 'as4777', 'nzs4777'
  ];
  const isAboutIES = new RegExp(iesKeywords.join('|'), 'i').test(text);
  
  // For IES-related content, default standard should be 4777.1-2016 not 3000
  const defaultStandardDoc = isAboutIES ? '4777.1-2016' : '3000-2018';
  const defaultStandardId = isAboutIES ? '4777.1' : '3000';
  
  console.log(`📋 Extracting clause references from text`);
  console.log(`Content is about IES: ${isAboutIES}, using default standard: ${defaultStandardDoc}`);
  
  // Get the List of Related Clauses from the end of the text
  const listSectionRegex = /(?:List of Related Clauses|Related Clauses|Related Standards)[\s\:]*\n([\s\S]*?)(?:\n\s*\n|$)/i;
  const listSectionMatch = text.match(listSectionRegex);
  
  // Initialize results array
  const clauseReferences: ClauseTreeViewElement[] = [];
  const visitedReferences = new Set<string>();
  
  if (listSectionMatch && listSectionMatch[1]) {
    const listSection = listSectionMatch[1];
    console.log(`📋 Found "List of Related Clauses" section`);
    
    // Extract references line by line
    const lines = listSection.split('\n');
    for (const line of lines) {
      if (!line.trim()) continue;
      
      // Look for standards references which might include clause numbers
      // This pattern can match AS/NZS 4777.1-2016 Clause 2.3 or similar
      const standardClausePattern = /(?:AS\/NZS|ASNZS)\s*(\d+(?:\.\d+)?(?:-\d+)?)\s+(?:Clause|Section|Part)\s+(\d+(?:\.\d+)*)/i;
      const standardClauseMatch = line.match(standardClausePattern);
      
      if (standardClauseMatch) {
        const standardId = standardClauseMatch[1]; // e.g., "4777.1-2016"
        const clauseId = standardClauseMatch[2];   // e.g., "2.3"
        
        // Create a unique ID for this reference
        const uniqueId = `${standardId}_${clauseId}`;
        
        // Skip if we've already processed this reference
        if (visitedReferences.has(uniqueId)) continue;
        visitedReferences.add(uniqueId);
        
        // Determine standardDoc based on the standard reference
        let standardDoc = standardId;
        if (!standardDoc.includes('-')) {
          // If no version is included, add default version
          standardDoc = standardId === '4777.1' ? '4777.1-2016' : 
                        standardId === '5033' ? '5033-2021' : 
                        `${standardId}-2018`;
        }
        
        console.log(`📑 Found standard reference: ${standardDoc} Clause ${clauseId} (from list section)`);
        
        // Add to results
        clauseReferences.push({
          id: clauseId,
          name: `Clause ${clauseId}`,
          isSelectable: true,
          standardDoc: standardDoc,
          standard: { 
            id: standardId.split('-')[0], 
            name: `AS/NZS ${standardId.split('-')[0]}`, 
            version: standardDoc.split('-')[1] || '2018' 
          }
        });
      } else {
        // Try other patterns for standalone clause references
        // This would match "Clause 2.3" or just "2.3"
        const clausePattern = /(?:Clause|Section|Part)?\s*(\d+(?:\.\d+)*)/i;
        const clauseMatch = line.match(clausePattern);
        
        if (clauseMatch) {
          const clauseId = clauseMatch[1];
          
          // Create a unique ID with the default standard
          const uniqueId = `${defaultStandardDoc}_${clauseId}`;
          
          // Skip if we've already processed this reference
          if (visitedReferences.has(uniqueId)) continue;
          visitedReferences.add(uniqueId);
          
          console.log(`📑 Found standalone clause reference: Clause ${clauseId} (from list section)`);
          
          // Add to results with the default standard
          clauseReferences.push({
            id: clauseId,
            name: `Clause ${clauseId}`,
            isSelectable: true,
            standardDoc: defaultStandardDoc,
            standard: { 
              id: defaultStandardId, 
              name: `AS/NZS ${defaultStandardId}`, 
              version: defaultStandardDoc.split('-')[1] || '2018' 
            }
          });
        }
      }
    }
  } else {
    console.log(`📋 No "List of Related Clauses" section found`);
  }
  
  // Also check for references in the main text using different patterns
  // First, look for standards/clause references in the format "AS/NZS 4777.1-2016 Clause 2.3"
  const asnzsPattern = /(?:AS\/NZS|ASNZS)\s*(\d+(?:\.\d+)?(?:-\d+)?)\s+(?:Clause|Section|Part)\s+(\d+(?:\.\d+)*)/gi;
  let match;
  
  while ((match = asnzsPattern.exec(text)) !== null) {
    const standardId = match[1]; // e.g., "4777.1-2016"
    const clauseId = match[2];   // e.g., "2.3"
    
    // Create a unique ID for this reference
    const uniqueId = `${standardId}_${clauseId}`;
    
    // Skip if we've already processed this reference
    if (visitedReferences.has(uniqueId)) continue;
    visitedReferences.add(uniqueId);
    
    // Determine standardDoc based on the standard reference
    let standardDoc = standardId;
    if (!standardDoc.includes('-')) {
      // If no version is included, add default version
      standardDoc = standardId === '4777.1' ? '4777.1-2016' : 
                    standardId === '5033' ? '5033-2021' : 
                    `${standardId}-2018`;
    }
    
    console.log(`📑 Found ${standardId.includes('4777') ? '4777.1' : standardId} clause reference: ${standardDoc} Clause ${clauseId} (full match: "${match[0]}")`);
    
    // Add to results
    clauseReferences.push({
      id: clauseId,
      name: `Clause ${clauseId}`,
      isSelectable: true,
      standardDoc: standardDoc,
      standard: { 
        id: standardDoc.split('-')[0], 
        name: `AS/NZS ${standardDoc.split('-')[0]}`, 
        version: standardDoc.split('-')[1] || '2018' 
      }
    });
  }
  
  // Handle cases where text is about IES but no specific 4777.1 references are found
  if (isAboutIES) {
    console.log(`📋 Text is about IES or grid-connected inverters - checking for critical clauses`);
    
    // Remove automatic addition of clauses - let the dynamic loading handle it
    // The clauses will still be loaded if they are explicitly referenced in the text
  }
  
  // Final sanity check for critical 4777.1-2016 clauses
  // If any references to 4777.1 exist, make sure critical clauses are included
  const has4777References = clauseReferences.some(ref => 
    ref.standardDoc && ref.standardDoc.includes('4777.1')
  );
  
  // Remove automatic addition of critical clauses
  if (has4777References) {
    // Let the dynamic loading handle any needed clauses
  }
  
  // Log the total references found
  console.log(`📋 Extracted ${clauseReferences.length} clause references`);
  
  return clauseReferences;
}

/**
 * Extracts clause references from the "List of Related Clauses" section in the assistant's response
 * or from individual clause references in the format ASNZS3000/3001 Clause X.X.X.X: [Title]
 */
export function extractRelatedClausesFromList(text: string): ClauseTreeViewElement[] {
  // Sanity check for null/undefined input
  if (!text) {
    console.warn('extractRelatedClausesFromList: received null or empty text');
    return [];
  }
  
  try {
    // Also look for the "List of Related Clauses" section
    const listSectionRegex = /List of Related Clauses\s*\n([\s\S]*?)(?:\n\n|\n$|$)/i;
    const listSection = safeMatch(text, listSectionRegex);
    
    if (!listSection || !listSection[1]) {
      console.log('No list of related clauses found in text');
      return [];
    }
    
    const listContent = listSection[1];
    const clauseLines = listContent.split('\n').filter(line => line.trim() !== '');
    
    console.log(`Found ${clauseLines.length} potential clause references in list`);
    
    // Process each line for clauses
    const allClauses: ClauseTreeViewElement[] = [];
    
    for (const line of clauseLines) {
      if (!line || typeof line !== 'string') {
        console.warn('Invalid line in clause list:', line);
        continue;
      }
      
      try {
        // Match patterns like "ASNZS3000 Clause 1.9.3.1: [Alterations]" or "ASNZS3001.1 Clause 2.1.1: [General]"
        const clauseMatch = safeMatch(line, /ASNZS(3000|3001(?:\.\d+)?|3003|3004\.2|3010|3012|3017|3019|3760|3820|4509\.1|4509\.2|4777\.1|4836|5033|5139|2293\.2)\s+Clause\s+(\d+(?:\.\d+)*)\s*:\s*\[(.*?)\]/i);
        
        if (clauseMatch && clauseMatch[1] && clauseMatch[2]) {
          const standardDoc = clauseMatch[1]; // e.g., "3000", "3001.1"
          const clauseId = clauseMatch[2]; // e.g., "1.1.3"
          const clauseTitle = clauseMatch[3] || `Clause ${clauseId}`; // e.g., "Alterations" or fallback
          
          // Create a clause reference
          const clauseRef: ClauseTreeViewElement = {
            id: `AUSNZ:${clauseId}`,
            name: `Clause ${clauseId} - ${clauseTitle}`,
            standardDoc: standardDoc,
            isSelectable: true
          };
          
          console.log(`Found clause reference: ${clauseRef.id} - ${clauseRef.name}`);
          allClauses.push(clauseRef);
        }
      } catch (error) {
        console.error('Error processing clause line:', error, { line });
      }
    }
    
    return allClauses;
  } catch (error) {
    console.error('Error in extractRelatedClausesFromList:', error);
    return [];
  }
}

// Function to get descriptions for common figures
function getFigureDescription(figureName: string, standardDoc?: string): string {
  // Standard-specific figure descriptions
  const figureMapByStandard: Record<string, Record<string, string>> = {
    // AS/NZS 3000 figures
    '3000': {
      'Figure 4.2': 'areas where electrical accessories require additional weather protection',
      'Figure 4.3': 'examples of installation configurations for socket-outlets',
      'Figure 4.5': 'protection by barriers or enclosures of live parts',
      'Figure 6.2': 'earthing system diagrams',
      'Figure 7.1': 'typical installation method for electrical equipment',
      'Figure 7.4': 'clearances for electrical equipment from gas installations',
      'Table 4.1': 'degree of protection (IP ratings) required for various environmental conditions',
      'Table 8.2': 'testing and inspection requirements for electrical installations',
      'default': 'information related to electrical installation requirements'
    },
    
    // AS/NZS 4509.1 figures
    '4509.1': {
      'Figure 4.1': 'example configuration for a stand-alone power system',
      'Figure 4.2': 'energy flow in a stand-alone power system',
      'Figure 4.3': 'system sizing process for stand-alone power systems',
      'Figure 4.4': 'power system components and their interconnections',
      'Table 1': 'system availability classes for stand-alone power systems',
      'default': 'information related to stand-alone power system requirements'
    },
    
    // AS/NZS 3004.2 figures
    '3004.2': {
      'Table 1': 'IP ratings for electrical equipment in different areas of a vessel',
      'Table 2': 'cross-sectional areas of conductors for marine applications',
      'Figure B.1': 'typical layout of shore power connection system',
      'Figure B.2': 'typical connection arrangement for shore power inlet',
      'default': 'information related to marine electrical installation requirements'
    },
    
    // AS/NZS 5033 figures
    '5033': {
      'default': 'information related to photovoltaic array installation requirements'
    },
    
    // Default descriptions for any standard
    'default': {
      'default': 'information related to electrical standards and requirements'
    }
  };
  
  // Standardize the figure name for lookup (remove prefix if present)
  const normalizedName = figureName.replace(/^(Figure|Fig\.?|Table)\s+/i, '');
  const lookupKey = figureName.toLowerCase().startsWith('table') ? `Table ${normalizedName}` : `Figure ${normalizedName}`;
  
  // Try to get description from the specific standard
  if (standardDoc && figureMapByStandard[standardDoc]) {
    // Return the specific description if we have one, otherwise return the standard's default
    return figureMapByStandard[standardDoc][lookupKey] || 
           figureMapByStandard[standardDoc]['default'] || 
           figureMapByStandard['default']['default'];
  }
  
  // If no standard specified or not found, use default
  return figureMapByStandard['default']['default'];
}

// Helper function to validate a figure path
export function validateFigurePath(figure: Figure): Figure {
  console.log(`Validating figure path for: ${figure.name}`);
  
  const is4836Standard = figure.standardDoc === '4836';
  const is4777Standard = figure.standardDoc === '4777.1';
  
  if (is4836Standard || is4777Standard) {
    console.log(`🔍 Special handling for ${figure.standardDoc} figure: ${figure.name}`);
    
    // Extract the figure/table number
    const isFigure = figure.name.toLowerCase().startsWith('figure');
    const isTable = figure.name.toLowerCase().startsWith('table');
    const typePrefix = isFigure ? 'Figure' : isTable ? 'Table' : 'Figure';
    
    // Extract just the number part (e.g., "2.3" from "Figure 2.3")
    const numberMatch = figure.name.match(/\d+(?:\.\d+)*/);
    if (numberMatch) {
      const number = numberMatch[0];
      // Convert dots to underscores for newer standards
      const formattedNumber = number.replace('.', '_');
      
      // Add direct paths at the beginning of possiblePaths
      const directPaths: string[] = [];
      
      // Add paths with exact Next.js public asset structure
      IMAGE_EXTENSIONS.forEach(ext => {
        directPaths.push(`${PUBLIC_PATH}/${figure.standardDoc}_${typePrefix}_${formattedNumber}${ext}`);
      });
      
      // Update possiblePaths with our prioritized paths at the beginning
      if (!figure.possiblePaths) {
        figure.possiblePaths = [];
      }
      
      // Add our direct paths at the beginning
      figure.possiblePaths = [...directPaths, ...figure.possiblePaths];
      
      // Update the default image to use our first direct path
      figure.image = directPaths[0];
      
      console.log(`Updated paths for ${figure.name}:`);
      console.log(`Default image path: ${figure.image}`);
      console.log(`Total possible paths: ${figure.possiblePaths.length}`);
    }
  }
  
  return figure;
}

// Function to validate multiple figures at once
export function validateFigurePaths(figures: Figure[]): Figure[] {
  if (!figures || figures.length === 0) {
    return [];
  }

  const validatedFigures = figures.map(validateFigurePath);

  return validatedFigures;
}

// Function to extract figures from a clause or standard section
export async function extractFiguresFromClause(clauseText: string, standardDoc: string): Promise<Figure[]> {
  // First extract all figure references
  const figures = extractFigureReferences(clauseText, standardDoc);
  
  // Then validate the paths
  const validatedFigures = await validateFigurePaths(figures);
  
  return validatedFigures;
}

// Modified to only return figures that are explicitly requested
// Removed hardcoded Table 4.1 to prevent hallucination
function getRequiredFigures(): Figure[] {
  return [
    // Only include figures that are explicitly required by the application
    // All other figures should be extracted from text references
    
    // AS/NZS 4509.1 required figures (Stand-alone power systems)
    {
      name: 'Figure 4.1',
      title: 'Example System Configuration',
      image: '/All Tables & Figures/4509.1_Figure_4.1.bmp',
      quote: 'Figure 4.1 shows an example configuration for a stand-alone power system',
      standardDoc: '4509.1',
      possiblePaths: [
        '/All Tables & Figures/4509.1_Figure_4.1.bmp',
        '/All Tables & Figures/4509.1_Figure_4_1.png',
        '/All Tables & Figures/ASNZS4509_1_Figure_4_1.png',
        '/All Tables & Figures/AS4509_1_Figure_4_1.png'
      ]
    }
    // Additional figures can be added here if needed, but only if they are
    // genuinely required for the application's functionality
  ];
}

// Helper function to check if a figure file exists for a specific standard
export async function checkFigureExistsForStandard(figureName: string, standardDoc: string): Promise<boolean> {
  try {
    // Get the figure object with possible paths
    const figure = getFigureByNameAndStandard(figureName, standardDoc);
    if (!figure) return false;
    
    // Try to validate that at least one path exists
    const validatedFigure = await validateFigurePath(figure);
    return !!validatedFigure.image && validatedFigure.image !== '/figure-placeholder.svg';
  } catch (error) {
    console.error(`Error checking if figure ${figureName} exists for standard ${standardDoc}:`, error);
    return false;
  }
}

// New function to get figure path with standard context
export function getFigurePathWithContext(figureName: string, standardDoc: string): string[] {
  const figure = getFigureByNameAndStandard(figureName, standardDoc);
  if (!figure || !figure.possiblePaths || figure.possiblePaths.length === 0) {
    return [];
  }
  return figure.possiblePaths;
}

// Function to handle special cases for specific standards
// Completely rewritten to only handle explicit mentions
function handleSpecialCases(text: string, figureMap: Map<string, Figure>, standards: Set<string>): void {
  // Only include figures/tables that are explicitly mentioned in the text
  // No more automatic addition of figures based on keywords or contexts
  
  // Handle only explicit mentions of tables and figures
  for (const standardId of standards) {
    // Use a regex to find all explicit mentions of figures and tables
    const explicitPatterns = [
      new RegExp(`(Figure|Table)\\s+(\\d+(?:\\.\\d+)?(?:[a-z])?)`, 'gi'),
      new RegExp(`(Figure|Table)\\s+([A-Z]\\.\\d+)`, 'gi'), // For letter-based figures (e.g., Table A.1)
      // Add pattern for comma-separated figures like "Figures 3.3, 3.4 and 3.5"
      new RegExp(`Figures\\s+(\\d+(?:\\.\\d+)?(?:[a-z])?),\\s+(\\d+(?:\\.\\d+)?(?:[a-z])?)(?:,?\\s+and\\s+(\\d+(?:\\.\\d+)?(?:[a-z])?))?`, 'gi'),
      // Add specific pattern for the format in user's example
      new RegExp(`Figures\\s+(\\d+\\.\\d+),\\s+(\\d+\\.\\d+)(?:\\s+and\\s+|\\s*,\\s*and\\s+)(\\d+\\.\\d+)`, 'gi')
    ];
    
    for (const pattern of explicitPatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        // Check if this is the comma-separated figures pattern
        if (match[0].toLowerCase().startsWith('figures') && match.length > 3) {
          // Handle comma-separated figures pattern (e.g., "Figures 3.3, 3.4 and 3.5")
          const figureType = "Figure";
          
          // Process each figure in the comma-separated list
          for (let i = 1; i < match.length; i++) {
            const figureNumber = match[i];
            if (!figureNumber) continue;
            
            const key = `${standardId}_${figureType} ${figureNumber}`;
            if (!figureMap.has(key)) {
              const figure = getFigureByNameAndStandard(`${figureType} ${figureNumber}`, standardId);
              if (figure) {
                console.log(`Adding explicitly mentioned ${figureType} ${figureNumber} from standard ${standardId} (comma list)`);
                figureMap.set(key, figure);
              }
            }
          }
        } else {
          // Handle standard single figure/table pattern
          const figureType = match[1]; // "Figure" or "Table"
          const figureNumber = match[2]; // e.g., "1.1", "4.1"
          
          const key = `${standardId}_${figureType} ${figureNumber}`;
          if (!figureMap.has(key)) {
            const figure = getFigureByNameAndStandard(`${figureType} ${figureNumber}`, standardId);
            if (figure) {
              console.log(`Adding explicitly mentioned ${figureType} ${figureNumber} from standard ${standardId}`);
              figureMap.set(key, figure);
            }
          }
        }
      }
    }
  }
}

// Add FigureReference type at the top of the file
export interface FigureReference {
  name: string;
  title: string;
  image: string;
  quote: string;
  possiblePaths: string[];
  standardDoc: string;
}

// ... existing code ...

export function getFigureByNameAndStandard(name: string, standardDoc: string = '3000'): FigureReference {
  // Determine if it's a table or figure first
  const isTable = name.toLowerCase().startsWith('table');
  
  // Normalize the figure name - use a different variable name to avoid conflicts
  const cleanName = name.replace(/^(Table|Figure|Fig\.?)\s+/i, '').trim();
  
  // Special case for AS/NZS 4836
  if (standardDoc === '4836' || standardDoc === '4836-2023') {
    console.log(`Processing AS/NZS 4836 figure/table: ${name}`);
    
    // Create array for paths
    const preferredPaths: string[] = [];
    
    // Extract number and any letters
    const numberMatch = cleanName.match(/(\d+(?:\.\d+)?)/);
    
    if (numberMatch) {
      const baseNumber = numberMatch[1];
      console.log(`Base number: ${baseNumber}`);
      
      // For 4836, we want to keep the underscore format to match the actual files
      const formattedNumber = formatFigureNumber(baseNumber);
      
      // Generate the exact path format used in the file system
      IMAGE_EXTENSIONS.forEach(ext => {
        // Use the correct path format
        const path = `/All Tables & Figures/4836_${isTable ? 'Table_' : 'Figure_'}${formattedNumber}${ext}`;
        preferredPaths.push(path);
        console.log(`Generated path: ${path}`);
      });
    }
    
    console.log(`Generated ${preferredPaths.length} possible paths for ${name}`);
    console.log('Paths:', preferredPaths);
    
    return {
      name: isTable ? `Table ${cleanName}` : `Figure ${cleanName}`,
      title: `Reference to ${isTable ? 'Table' : 'Figure'} ${cleanName}`,
      image: preferredPaths[0],
      quote: `This is ${isTable ? 'Table' : 'Figure'} ${cleanName} from AS/NZS ${standardDoc}`,
      possiblePaths: preferredPaths,
      standardDoc: standardDoc
    };
  }

  // Special case for AS/NZS 4509.2
  if (standardDoc === '4509.2') {
    console.log(`Processing AS/NZS 4509.2 figure/table: ${name}`);
    
    // Create array for paths
    const preferredPaths: string[] = [];
    
    // Extract number and letter parts separately with a more precise regex
    const numberMatch = cleanName.match(/^(\d+)(?:\.?([a-z]))?$/i);
    
    if (numberMatch) {
      const mainNumber = numberMatch[1];
      const letter = numberMatch[2]?.toLowerCase() || '';
      
      // Always format with dot notation for 4509.2
      const formattedNumber = letter 
        ? `${mainNumber}.${letter}` // For figures like 1.a, 1.b
        : mainNumber; // For figures like 1
      
      console.log(`4509.2 figure formatting: ${cleanName} -> ${formattedNumber}`);
      
      // Generate paths with consistent format
      IMAGE_EXTENSIONS.forEach(ext => {
        const path = `/All Tables & Figures/4509.2_${isTable ? 'Table_' : 'Figure_'}${formattedNumber}${ext}`;
        preferredPaths.push(path);
        console.log(`Generated 4509.2 path: ${path}`);
      });
      
      return {
        name: isTable ? `Table ${cleanName}` : `Figure ${cleanName}`,
        title: `Reference to ${isTable ? 'Table' : 'Figure'} ${cleanName}`,
        image: preferredPaths[0],
        quote: `This is ${isTable ? 'Table' : 'Figure'} ${cleanName} from AS/NZS ${standardDoc}`,
        possiblePaths: preferredPaths,
        standardDoc: standardDoc
      };
    }
  }

  // Special case for AS/NZS 2293.2
  if (standardDoc === '2293.2') {
    console.log(`Processing AS/NZS 2293.2 figure/table: ${name}`);
    
    // Create array for paths
    const preferredPaths: string[] = [];
    
    // Extract number and any suffix
    const numberMatch = cleanName.match(/(\d+(?:\.\d+)?)/);
    
    if (numberMatch) {
      const baseNumber = numberMatch[1];
      console.log(`Base number: ${baseNumber}`);
      
      // For 2293.2, use the simple format: 2293.2_Figure_1 or 2293.2_Table_1
      const formattedNumber = baseNumber;
      
      // Generate paths with consistent format
      IMAGE_EXTENSIONS.forEach(ext => {
        const path = `/All Tables & Figures/2293.2_${isTable ? 'Table_' : 'Figure_'}${formattedNumber}${ext}`;
        preferredPaths.push(path);
        console.log(`Generated 2293.2 path: ${path}`);
      });
      
      return {
        name: isTable ? `Table ${cleanName}` : `Figure ${cleanName}`,
        title: `Reference to ${isTable ? 'Table' : 'Figure'} ${cleanName}`,
        image: preferredPaths[0],
        quote: `This is ${isTable ? 'Table' : 'Figure'} ${cleanName} from AS/NZS ${standardDoc}`,
        possiblePaths: preferredPaths,
        standardDoc: standardDoc
      };
    }
  }

  // Special case for AS/NZS 3001.1
  if (standardDoc === '3001.1') {
    console.log(`Processing AS/NZS 3001.1 figure/table: ${name}`);
    
    // Create array for paths
    const preferredPaths: string[] = [];
    
    // Extract number and any suffix
    const numberMatch = cleanName.match(/(\d+(?:\.\d+)?)/);
    
    if (numberMatch) {
      const baseNumber = numberMatch[1];
      console.log(`Base number: ${baseNumber}`);
      
      // For 3001.1, use the format: 3001.1_Figure_1 or 3001.1_Table_1
      const formattedNumber = baseNumber;
      
      // Generate paths with consistent format
      IMAGE_EXTENSIONS.forEach(ext => {
        const path = `/All Tables & Figures/3001.1_${isTable ? 'Table_' : 'Figure_'}${formattedNumber}${ext}`;
        preferredPaths.push(path);
        console.log(`Generated 3001.1 path: ${path}`);
      });
      
      return {
        name: isTable ? `Table ${cleanName}` : `Figure ${cleanName}`,
        title: `Reference to ${isTable ? 'Table' : 'Figure'} ${cleanName}`,
        image: preferredPaths[0],
        quote: `This is ${isTable ? 'Table' : 'Figure'} ${cleanName} from AS/NZS ${standardDoc}`,
        possiblePaths: preferredPaths,
        standardDoc: standardDoc
      };
    }
  }

  // Special case for AS/NZS 3003
  if (standardDoc === '3003') {
    console.log(`Processing AS/NZS 3003 figure/table: ${name}`);
    
    // Create array for paths
    const preferredPaths: string[] = [];
    
    // Extract number and any suffix
    const numberMatch = cleanName.match(/(\d+(?:\.\d+)?)/);
    
    if (numberMatch) {
      const baseNumber = numberMatch[1];
      console.log(`Base number: ${baseNumber}`);
      
      // For 3003, use the format: 3003_Figure_1 or 3003_Table_1
      const formattedNumber = baseNumber;
      
      // Generate paths with consistent format
      IMAGE_EXTENSIONS.forEach(ext => {
        const path = `/All Tables & Figures/3003_${isTable ? 'Table_' : 'Figure_'}${formattedNumber}${ext}`;
        preferredPaths.push(path);
        console.log(`Generated 3003 path: ${path}`);
      });
      
      return {
        name: isTable ? `Table ${cleanName}` : `Figure ${cleanName}`,
        title: `Reference to ${isTable ? 'Table' : 'Figure'} ${cleanName}`,
        image: preferredPaths[0],
        quote: `This is ${isTable ? 'Table' : 'Figure'} ${cleanName} from AS/NZS ${standardDoc}`,
        possiblePaths: preferredPaths,
        standardDoc: standardDoc
      };
    }
  }

  // Special case for AS/NZS 3012
  if (standardDoc === '3012') {
    console.log(`Processing AS/NZS 3012 figure/table: ${name}`);
    
    // Create array for paths
    const preferredPaths: string[] = [];
    
    // Extract number and any suffix
    const numberMatch = cleanName.match(/(\d+(?:\.\d+)?)/);
    
    if (numberMatch) {
      const baseNumber = numberMatch[1];
      console.log(`Base number: ${baseNumber}`);
      
      // For 3012, use the format: 3012_Figure_1 or 3012_Table_1
      const formattedNumber = baseNumber;
      
      // Generate paths with consistent format
      IMAGE_EXTENSIONS.forEach(ext => {
        const path = `/All Tables & Figures/3012_${isTable ? 'Table_' : 'Figure_'}${formattedNumber}${ext}`;
        preferredPaths.push(path);
        console.log(`Generated 3012 path: ${path}`);
      });
      
      return {
        name: isTable ? `Table ${cleanName}` : `Figure ${cleanName}`,
        title: `Reference to ${isTable ? 'Table' : 'Figure'} ${cleanName}`,
        image: preferredPaths[0],
        quote: `This is ${isTable ? 'Table' : 'Figure'} ${cleanName} from AS/NZS ${standardDoc}`,
        possiblePaths: preferredPaths,
        standardDoc: standardDoc
      };
    }
  }

  // Special case for AS/NZS 3017
  if (standardDoc === '3017') {
    console.log(`Processing AS/NZS 3017 figure/table: ${name}`);
    
    // Create array for paths
    const preferredPaths: string[] = [];
    
    // Extract number and any suffix
    const numberMatch = cleanName.match(/(\d+(?:\.\d+)?)/);
    
    if (numberMatch) {
      const baseNumber = numberMatch[1];
      console.log(`Base number: ${baseNumber}`);
      
      // For 3017, use the format: 3017_Figure_1 or 3017_Table_1
      const formattedNumber = baseNumber;
      
      // Generate paths with consistent format
      IMAGE_EXTENSIONS.forEach(ext => {
        const path = `/All Tables & Figures/3017_${isTable ? 'Table_' : 'Figure_'}${formattedNumber}${ext}`;
        preferredPaths.push(path);
        console.log(`Generated 3017 path: ${path}`);
      });
      
      return {
        name: isTable ? `Table ${cleanName}` : `Figure ${cleanName}`,
        title: `Reference to ${isTable ? 'Table' : 'Figure'} ${cleanName}`,
        image: preferredPaths[0],
        quote: `This is ${isTable ? 'Table' : 'Figure'} ${cleanName} from AS/NZS ${standardDoc}`,
        possiblePaths: preferredPaths,
        standardDoc: standardDoc
      };
    }
  }

  // Special case for AS/NZS 3010
  if (standardDoc === '3010') {
    console.log(`Processing AS/NZS 3010 figure/table: ${name}`);
    
    // Create array for paths
    const preferredPaths: string[] = [];
    
    // Extract number and any suffix
    const numberMatch = cleanName.match(/(\d+(?:\.\d+)?)/);
    
    if (numberMatch) {
      const baseNumber = numberMatch[1];
      console.log(`Base number: ${baseNumber}`);
      
      // For 3010, use the format: 3010_Figure_1 or 3010_Table_1
      const formattedNumber = baseNumber;
      
      // Generate paths with consistent format
      IMAGE_EXTENSIONS.forEach(ext => {
        const path = `/All Tables & Figures/3010_${isTable ? 'Table_' : 'Figure_'}${formattedNumber}${ext}`;
        preferredPaths.push(path);
        console.log(`Generated 3010 path: ${path}`);
      });
      
      return {
        name: isTable ? `Table ${cleanName}` : `Figure ${cleanName}`,
        title: `Reference to ${isTable ? 'Table' : 'Figure'} ${cleanName}`,
        image: preferredPaths[0],
        quote: `This is ${isTable ? 'Table' : 'Figure'} ${cleanName} from AS/NZS ${standardDoc}`,
        possiblePaths: preferredPaths,
        standardDoc: standardDoc
      };
    }
  }

  // Special case for AS/NZS 4509.1
  if (standardDoc === '4509.1') {
    console.log(`Processing AS/NZS 4509.1 figure/table: ${name}`);
    
    // Create array for paths
    const preferredPaths: string[] = [];
    
    // Extract number and any suffix
    const numberMatch = cleanName.match(/(\d+(?:\.\d+)?)/);
    
    if (numberMatch) {
      const baseNumber = numberMatch[1];
      console.log(`Base number: ${baseNumber}`);
      
      // For 4509.1, use ONLY the exact format: 4509.1_Figure_4.1.bmp or 4509.1_Table_1.bmp
      const formattedNumber = baseNumber;
      
      // Generate ONLY the exact path format
      const path = `/All Tables & Figures/4509.1_${isTable ? 'Table_' : 'Figure_'}${formattedNumber}.bmp`;
      preferredPaths.push(path);
      console.log(`Generated 4509.1 path: ${path}`);
      
      return {
        name: isTable ? `Table ${cleanName}` : `Figure ${cleanName}`,
        title: `Reference to ${isTable ? 'Table' : 'Figure'} ${cleanName}`,
        image: path, // Use the exact path as the primary image
        quote: `This is ${isTable ? 'Table' : 'Figure'} ${cleanName} from AS/NZS ${standardDoc}`,
        possiblePaths: [path], // Only include the exact path format
        standardDoc: standardDoc
      };
    }
  }

  // Special case for AS/NZS 4777.1
  if (standardDoc === '4777.1') {
    console.log(`Processing AS/NZS 4777.1 figure/table: ${name}`);
    
    // Create array for paths
    const preferredPaths: string[] = [];
    
    // Extract number and any suffix
    const numberMatch = cleanName.match(/(\d+(?:\.\d+)?)/);
    
    if (numberMatch) {
      const baseNumber = numberMatch[1];
      console.log(`Base number: ${baseNumber}`);
      
      // For 4777.1, use the exact format with appropriate extensions
      const formattedNumber = baseNumber;
      
      // Special case for Table 4 which uses .jpeg
      if (isTable && formattedNumber === '4') {
        const path = `/All Tables & Figures/4777.1_Table_4.jpeg`;
        preferredPaths.push(path);
        console.log(`Generated 4777.1 special path for Table 4: ${path}`);
      } else {
        // All other figures and tables use .png
        const path = `/All Tables & Figures/4777.1_${isTable ? 'Table_' : 'Figure_'}${formattedNumber}.png`;
        preferredPaths.push(path);
        console.log(`Generated 4777.1 path: ${path}`);
      }
      
      return {
        name: isTable ? `Table ${cleanName}` : `Figure ${cleanName}`,
        title: `Reference to ${isTable ? 'Table' : 'Figure'} ${cleanName}`,
        image: preferredPaths[0], // Use the exact path as the primary image
        quote: `This is ${isTable ? 'Table' : 'Figure'} ${cleanName} from AS/NZS ${standardDoc}`,
        possiblePaths: preferredPaths, // Only include the exact path format
        standardDoc: standardDoc
      };
    }
  }

  // Special case for AS/NZS 5033
  if (standardDoc === '5033') {
    console.log(`Processing AS/NZS 5033 figure/table: ${name}`);
    
    // Create array for paths
    const preferredPaths: string[] = [];
    
    // Extract number and any suffix
    const numberMatch = cleanName.match(/(\d+(?:\.\d+)?)/);
    
    if (numberMatch) {
      const baseNumber = numberMatch[1];
      console.log(`Base number: ${baseNumber}`);
      
      // For 5033, use the format: 5033_Figure_2.1.png or 5033_Figure_2.2.jpg
      const formattedNumber = baseNumber;
      
      // Map of figure numbers to their correct extensions
      const extensionMap: Record<string, string> = {
        '2.1': '.png',
        '2.2': '.jpg',
        '2.3': '.jpg',
        '2.4': '.jpg',
        '2.5': '.png',
        '2.6': '.jpg'
      };
      
      // Generate the exact path with the correct extension
      const extension = extensionMap[formattedNumber] || '.png'; // Default to .png if not found
      const path = `/All Tables & Figures/5033_${isTable ? 'Table_' : 'Figure_'}${formattedNumber}${extension}`;
      preferredPaths.push(path);
      console.log(`Generated 5033 path: ${path}`);
      
      return {
        name: isTable ? `Table ${cleanName}` : `Figure ${cleanName}`,
        title: `Reference to ${isTable ? 'Table' : 'Figure'} ${cleanName}`,
        image: path, // Use the exact path as the primary image
        quote: `This is ${isTable ? 'Table' : 'Figure'} ${cleanName} from AS/NZS ${standardDoc}`,
        possiblePaths: [path], // Only include the exact path format
        standardDoc: standardDoc
      };
    }
  }

  // Special case for AS/NZS 5139
  if (standardDoc === '5139') {
    console.log(`Processing AS/NZS 5139 figure/table: ${name}`);
    
    // Create array for paths
    const preferredPaths: string[] = [];
    
    // Extract number and any suffix
    const numberMatch = cleanName.match(/(\d+(?:\.\d+)?)/);
    
    if (numberMatch) {
      const baseNumber = numberMatch[1];
      console.log(`Base number: ${baseNumber}`);
      
      // For 5139, use the format: 5139_Figure_2.1.png
      const formattedNumber = baseNumber;
      
      // Generate ONLY the exact path format with .png extension
      const path = `/All Tables & Figures/5139_${isTable ? 'Table_' : 'Figure_'}${formattedNumber}.png`;
      preferredPaths.push(path);
      console.log(`Generated 5139 path: ${path}`);
      
      return {
        name: isTable ? `Table ${cleanName}` : `Figure ${cleanName}`,
        title: `Reference to ${isTable ? 'Table' : 'Figure'} ${cleanName}`,
        image: path, // Use the exact path as the primary image
        quote: `This is ${isTable ? 'Table' : 'Figure'} ${cleanName} from AS/NZS ${standardDoc}`,
        possiblePaths: [path], // Only include the exact path format
        standardDoc: standardDoc
      };
    }
  }

  // Default case for other standards (unchanged)
  const prefixes = STANDARD_PREFIXES[standardDoc] || STANDARD_PREFIXES['3000'];
  const possiblePaths: string[] = [];

  // Generate paths with different prefixes and file extensions
  prefixes.forEach(prefix => {
    IMAGE_EXTENSIONS.forEach(ext => {
      possiblePaths.push(`${PUBLIC_PATH}/${prefix}${isTable ? 'Table_' : 'Figure_'}${cleanName}${ext}`);
      possiblePaths.push(`${PUBLIC_PATH}/${prefix}${isTable ? 'Table ' : 'Figure '}${cleanName}${ext}`);
      possiblePaths.push(`${PUBLIC_PATH}/${prefix}${isTable ? 'Table-' : 'Figure-'}${cleanName}${ext}`);
    });
  });

  // Try without prefix
  IMAGE_EXTENSIONS.forEach(ext => {
    possiblePaths.push(`${PUBLIC_PATH}/${isTable ? 'Table_' : 'Figure_'}${cleanName}${ext}`);
    possiblePaths.push(`${PUBLIC_PATH}/${isTable ? 'Table ' : 'Figure '}${cleanName}${ext}`);
    possiblePaths.push(`${PUBLIC_PATH}/${isTable ? 'Table-' : 'Figure-'}${cleanName}${ext}`);
  });

  return {
    name: isTable ? `Table ${cleanName}` : `Figure ${cleanName}`,
    title: `Reference to ${isTable ? 'Table' : 'Figure'} ${cleanName}`,
    image: possiblePaths[0],
    quote: `This is ${isTable ? 'Table' : 'Figure'} ${cleanName} from AS/NZS ${standardDoc}`,
    possiblePaths: possiblePaths,
    standardDoc: standardDoc
  };
}

// Function to extract figures from all standards mentioned in text
export function extractFiguresFromAllStandards(text: string): Figure[] {
  console.log('Extracting figures from text with length:', text.length);
  
  if (!text || text.length === 0) {
    console.warn('Empty text provided to extractFiguresFromAllStandards');
    return [];
  }
  
  try {
    // Extract standards mentioned in the text
    const standards = new Set<string>();
    
    // Default to 3000
    standards.add('3000');
    
    // Look for each standard format
    const standardPatterns = [
      /ASNZS(\d{4}(?:\.\d+)?)/gi,              // ASNZS3000, ASNZS3001.1
      /AS\/NZS\s+(\d{4}(?:\.\d+)?)/gi,         // AS/NZS 3000, AS/NZS 3001.1
      /AS\/NZS(\d{4}(?:\.\d+)?)/gi,            // AS/NZS3000, AS/NZS3001.1
      /AS\s+(\d{4}(?:\.\d+)?)/gi,              // AS 3000, AS 3001.1
      /NZS\s+(\d{4}(?:\.\d+)?)/gi              // NZS 3000, NZS 3001.1
    ];
    
    for (const pattern of standardPatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        if (match[1]) {
          standards.add(match[1]);
        }
      }
    }
    
    console.log(`Found ${standards.size} standards in text: ${Array.from(standards).join(', ')}`);
    
    // Map to store figures with their standard as part of the key
    const figureMap = new Map<string, Figure>();
    
    // Extract figures for each standard
    for (const standardDoc of standards) {
      const standardFigures = extractFigureReferences(text, standardDoc);
      standardFigures.forEach(figure => {
        // Skip Table 1.5 as it doesn't exist
        if (figure.name && figure.name.toLowerCase().includes('table 1.5')) {
          console.log('Skipping non-existent Table 1.5 during extraction');
          return;
        }
        
        const key = `${standardDoc}_${figure.name}`;
        figureMap.set(key, figure);
      });
    }
    
    // Handle special cases with a more careful approach
    handleSpecialCases(text, figureMap, standards);
    
    // REMOVED: Special cases for Table 4.1
    // Only include figures and tables explicitly mentioned in the response
    
    // Convert map to array and filter out any Table 1.5 that might have slipped through
    const result = Array.from(figureMap.values()).filter(figure => 
      !(figure.name && figure.name.toLowerCase().includes('table 1.5'))
    );
    console.log(`Extracted ${result.length} relevant figures from standards:`, result);
    
    return result;
  } catch (error) {
    console.error('Error in extractFiguresFromAllStandards:', error);
    return [];
  }
}

/**
 * Validates that figures/tables mentioned actually exist in the referenced clauses
 * @param figures Array of extracted figures/tables
 * @param referencedClauses Array of clause references
 * @returns Array of validated figures/tables that actually exist
 */
export function validateFigureReferences(figures: Figure[], referencedClauses: ClauseSection[]): Figure[] {
  if (!figures || !figures.length || !referencedClauses || !referencedClauses.length) {
    return [];
  }
  
  console.log(`Validating ${figures.length} figures against ${referencedClauses.length} clauses`);
  
  // Create a map of all referenced clauses for quick lookup
  const clauseMap = new Map();
  referencedClauses.forEach(clause => {
    clauseMap.set(clause.id, clause.fullText || '');
  });
  
  // Filter figures to only include those mentioned in the clauses
  return figures.filter(figure => {
    // Get figure/table ID in both formats (e.g., "Table 1.5" and "Table 1_5")
    const figureId = figure.name.replace(/^(Figure|Table)\s+/, '');
    const normalizedFigureId = figureId.replace(/\./g, '_');
    const figureType = figure.name.startsWith('Table') ? 'Table' : 'Figure';
    
    // Check if any clause mentions this figure/table
    for (const [clauseId, clauseText] of clauseMap.entries()) {
      if (clauseText.includes(`${figureType} ${figureId}`) || 
          clauseText.includes(`${figureType} ${normalizedFigureId}`)) {
        console.log(`✅ Validated ${figure.name} - found in clause ${clauseId}`);
        return true;
      }
    }
    
    // Also check if the figure actually exists in our file system
    if (figure.possiblePaths && figure.possiblePaths.length) {
      for (const path of figure.possiblePaths) {
        try {
          // Check if file exists (in Node.js context)
          if (typeof window === 'undefined') {
            const fs = require('fs');
            if (fs.existsSync(path.replace('/public', 'public'))) {
              console.log(`✅ Validated ${figure.name} - file exists at ${path}`);
              return true;
            }
          } else {
            // In browser context, we can't check directly
            // But if the image has been validated earlier, keep it
            if (figure.validated) {
              console.log(`✅ Validated ${figure.name} - previously validated`);
              return true;
            }
          }
        } catch (e) {
          console.error(`❌ Error checking file existence for ${figure.name}:`, e);
        }
      }
    }
    
    // Figure not found in any clause text or filesystem
    console.log(`❌ Rejected ${figure.name} - not found in any clauses or filesystem`);
    return false;
  });
}

// Function to extract standard ID from reference format in the chat
export function extractStandardIdFromReference(reference: string): string | null {
  // Match the standard ID format from the system message
  // Examples: ASNZS3000, ASNZS5033, ASNZS3004.2, ASNZS4509.1
  const match = safeMatch(reference, /\b(ASNZS\d+(?:\.\d+)?)\b/i);
  if (match) {
    // Convert to the format used in STANDARD_PREFIXES (e.g., '3000', '5033', '3004.2')
    const standardId = match[1].replace(/^ASNZS/i, '');
    return standardId;
  }
  return null;
}

// Function to determine the appropriate standard from a reference in a chat message
export function getStandardFromReference(standardRef: string): string {
  if (!standardRef) {
    return '3000';
  }
  
  // If standardRef starts with a number, assume it's just the standard number
  if (/^\d/.test(standardRef)) {
    return standardRef;
  }
  
  // Try to extract the standard number from formats like "AS/NZS 3000" or "ASNZS3000"
  const match = standardRef.match(/(?:AS\/NZS|ASNZS)\s*(\d{4}(?:\.\d+)?)/i);
  if (match && match[1]) {
    return match[1];
  }
  
  // Default to 3000 if we can't determine the standard
  return '3000';
}

/**
 * Extracts standard and clause IDs from references like 'ASNZS4777.1-2016 Clause 2.3'
 * @param text The text to extract from
 * @returns Array of objects with standardId and clauseId
 */
export function extractStandardAndClauseReferences(text: string): Array<{standardId: string, clauseId: string}> {
  const results: Array<{standardId: string, clauseId: string}> = [];
  
  if (!text) return results;
  
  console.log(`extractStandardAndClauseReferences: Analyzing text for standard-specific references`);
  
  // First check if content is about IES (Inverter Energy Systems)
  const isAboutIES = text.toLowerCase().includes('inverter energy system') || 
                   text.toLowerCase().includes('ies') ||
                   text.toLowerCase().includes('grid connection') ||
                   text.toLowerCase().includes('grid-connected') ||
                   text.toLowerCase().includes('as/nzs 4777') ||
                   text.toLowerCase().includes('asnzs4777');
  
  if (isAboutIES) {
    console.log(`extractStandardAndClauseReferences: Content is about IES: ${isAboutIES}, using default standard: 4777.1-2016`);
  }
  
  // Match patterns like "ASNZS4777.1-2016 Clause 2.3" or "AS/NZS 4777.1-2016 Clause 2.3"
  const standardClauseRegex = /(?:ASNZS|AS\/NZS)\s*(\d+(?:\.\d+)?(?:-\d+)?)\s+[Cc]lause\s+(\d+(?:\.\d+)*)/g;
  
  let match;
  while ((match = standardClauseRegex.exec(text)) !== null) {
    const standardId = match[1]; // e.g., "4777.1-2016"
    const clauseId = match[2];   // e.g., "2.3"
    
    // Extract version if present, otherwise use default versioning
    let standardDoc = standardId;
    
    // Special handling for 4777.1 standard
    if (standardId.includes('4777')) {
      standardDoc = '4777.1-2016';
      console.log(`extractStandardAndClauseReferences: Found 4777.1 reference: ${match[0]} -> using standardDoc=${standardDoc}`);
    } else if (!standardDoc.includes('-')) {
      standardDoc = standardId === '4777.1' ? '4777.1-2016' : 
                   standardId === '5033' ? '5033-2021' : 
                   `${standardId}-2018`;
    }
    
    console.log(`extractStandardAndClauseReferences: Found standard-specific reference: ${standardDoc} Clause ${clauseId}`);
    results.push({
      standardId: standardDoc,
      clauseId: clauseId
    });
  }
  
  // Special case: If the text is about IES but no specific 4777.1 references were found
  // Look for standalone clause references that might belong to 4777.1
  if (isAboutIES && results.filter(r => r.standardId.includes('4777')).length === 0) {
    // Match standalone clause references
    const standaloneClauseRegex = /[Cc]lause\s+(\d+(?:\.\d+)*)/g;
    
    while ((match = standaloneClauseRegex.exec(text)) !== null) {
      const clauseId = match[1];
      
      // Skip clauses that are already matched with other standards
      if (results.some(r => r.clauseId === clauseId)) {
        continue;
      }
      
      // Check if this could be a 4777.1 clause
      if (['2.3', '3.1', '3.4.4', '5.3.1', '7.3.1'].includes(clauseId)) {
        console.log(`extractStandardAndClauseReferences: Found potential 4777.1 standalone reference: Clause ${clauseId}`);
        results.push({
          standardId: '4777.1-2016',
          clauseId: clauseId
        });
      }
    }
  }
  
  console.log(`extractStandardAndClauseReferences: Found ${results.length} standard-clause pairs:`, results);
  return results;
}

// Helper function to format figure number for path
function formatFigureNumber(number: string): string {
  return number.replace(/\./g, '_').toLowerCase();
}

