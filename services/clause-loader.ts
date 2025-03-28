import { 
  BaseReference, 
  ClauseReference, 
  StandardReference,
  ReferenceType,
  SourceType
} from '@/types/references';
import path from 'path';
import { standardDetector } from './standard-detector';
import { clauseLoaderProvider } from './clause-loader-provider';

// Add this type extension
type EnhancedClauseReference = ClauseReference & {
  note?: string;
};

// Define the module structure
interface ClauseData {
  id: string;
  title: string;
  fullText?: string;
  subsections?: Record<string, string> | string[];
}

// Define a clause instance type
interface ClauseInstance {
  id: string;
  title: string;
  fullText: string;
  standard?: string;
}

// Define a comprehensive standard definition
interface StandardDefinition {
  id: string;
  name: string;
  version: string;
  directoryName: string;
  context: string[];
}

// Define comprehensive standards registry
const STANDARDS_REGISTRY: Record<string, StandardDefinition> = {
  '3000': {
    id: '3000',
    name: 'AS/NZS 3000',
    version: '2018',
    directoryName: '3000-2018',
    context: ['electrical', 'wiring']
  },
  '2293.2': {
    id: '2293.2',
    name: 'AS/NZS 2293.2',
    version: '2019',
    directoryName: '2293.2-2019',
    context: ['emergency', 'lighting', 'exit']
  },
  '3001.1': {
    id: '3001.1',
    name: 'AS/NZS 3001.1',
    version: '2022',
    directoryName: '3001.1-2022',
    context: ['transportable', 'structures', 'vehicles']
  },
  '3001.2': {
    id: '3001.2',
    name: 'AS/NZS 3001.2',
    version: '2022',
    directoryName: '3001.2-2022',
    context: ['transportable', 'vehicles']
  },
  '3003': {
    id: '3003',
    name: 'AS/NZS 3003',
    version: '2018',
    directoryName: '3003-2018',
    context: ['patient', 'medical', 'hospital']
  },
  '3004.2': {
    id: '3004.2',
    name: 'AS/NZS 3004.2',
    version: '2014',
    directoryName: '3004.2-2014',
    context: ['marine', 'marina', 'boat']
  },
  '3010': {
    id: '3010',
    name: 'AS/NZS 3010',
    version: '2017',
    directoryName: '3010-2017',
    context: ['generator', 'generating sets']
  },
  '3012': {
    id: '3012',
    name: 'AS/NZS 3012',
    version: '2019',
    directoryName: '3012-2019',
    context: ['construction', 'demolition']
  },
  '3017': {
    id: '3017',
    name: 'AS/NZS 3017',
    version: '2022',
    directoryName: '3017-2022',
    context: ['verification', 'testing']
  },
  '3019': {
    id: '3019',
    name: 'AS/NZS 3019',
    version: '2022',
    directoryName: '3019-2022',
    context: ['periodic', 'verification']
  },
  '3019-2018': {
    id: '3019',
    name: 'AS/NZS 3019',
    version: '2018',
    directoryName: '3019-2022', // Use 2022 directory as fallback
    context: ['periodic', 'verification']
  },
  '3760': {
    id: '3760',
    name: 'AS/NZS 3760',
    version: '2022',
    directoryName: '3760-2022',
    context: ['testing', 'inspection', 'equipment']
  },
  '3820': {
    id: '3820',
    name: 'AS/NZS 3820',
    version: '2009',
    directoryName: '3820-2009',
    context: ['safety', 'equipment']
  },
  '4509.1': {
    id: '4509.1',
    name: 'AS/NZS 4509.1',
    version: '2009',
    directoryName: '4509.1-2009',
    context: ['stand-alone', 'power']
  },
  '4509.2': {
    id: '4509.2',
    name: 'AS/NZS 4509.2',
    version: '2010',
    directoryName: '4509.2-2010',
    context: ['stand-alone', 'power']
  },
  '4777.1': {
    id: '4777.1',
    name: 'AS/NZS 4777.1',
    version: '2016',
    directoryName: '4777.1-2016',
    context: ['grid', 'inverter', 'connection']
  },
  '4836': {
    id: '4836',
    name: 'AS/NZS 4836',
    version: '2023',
    directoryName: '4836-2023',
    context: ['safety', 'working']
  },
  '5033': {
    id: '5033',
    name: 'AS/NZS 5033',
    version: '2021',
    directoryName: '5033-2021',
    context: ['solar', 'pv', 'photovoltaic']
  },
  '5139': {
    id: '5139',
    name: 'AS/NZS 5139',
    version: '2019',
    directoryName: '5139-2019',
    context: ['battery', 'energy storage']
  }
};

// Extract version map from registry
const standardVersionMap: Record<string, string> = Object.entries(STANDARDS_REGISTRY).reduce(
  (acc, [id, def]) => ({ ...acc, [id]: def.version }), 
  {}
);

// Import all standard modules statically
import asnzs3000Clauses from '../components/clauses/3000-2018';
import asnzs2293Clauses from '../components/clauses/2293.2-2019';
import asnzs3003Clauses from '../components/clauses/3003-2018';
import asnzs3001_1Clauses from '../components/clauses/3001.1-2022';
import asnzs3001_2Clauses from '../components/clauses/3001.2-2022';
import asnzs3004_2Clauses from '../components/clauses/3004.2-2014';
import asnzs3010Clauses from '../components/clauses/3010-2017';
import asnzs3012Clauses from '../components/clauses/3012-2019';
import asnzs3017Clauses from '../components/clauses/3017-2022';
import asnzs3019Clauses from '../components/clauses/3019-2022';
import asnzs3760Clauses from '../components/clauses/3760-2022';
import asnzs3820Clauses from '../components/clauses/3820-2009';
import asnzs4509_1Clauses from '../components/clauses/4509.1-2009';
import asnzs4509_2Clauses from '../components/clauses/4509.2-2010';
import asnzs4777_1Clauses from '../components/clauses/4777.1-2016';
import asnzs4836Clauses from '../components/clauses/4836-2023';
import asnzs5033Clauses from '../components/clauses/5033-2021';
import asnzs5139Clauses from '../components/clauses/5139-2019';

// Map standard IDs to their respective clause modules
const standardModules: Record<string, any> = {
  '3000': asnzs3000Clauses,
  '2293.2': asnzs2293Clauses,
  '3003': asnzs3003Clauses,
  '3001.1': asnzs3001_1Clauses,
  '3001.2': asnzs3001_2Clauses,
  '3004.2': asnzs3004_2Clauses,
  '3010': asnzs3010Clauses,
  '3012': asnzs3012Clauses,
  '3017': asnzs3017Clauses,
  '3019': asnzs3019Clauses,
  '3760': asnzs3760Clauses,
  '3820': asnzs3820Clauses,
  '4509.1': asnzs4509_1Clauses,
  '4509.2': asnzs4509_2Clauses,
  '4777.1': asnzs4777_1Clauses,
  '4836': asnzs4836Clauses,
  '5033': asnzs5033Clauses,
  '5139': asnzs5139Clauses
};

/**
 * Responsible for loading clause references from various sources
 */
export class ClauseLoader {
  private static instance: ClauseLoader;
  private cache: Map<string, EnhancedClauseReference>;
  
  private constructor() {
    this.cache = new Map<string, EnhancedClauseReference>();
    console.log('ClauseLoader initialized');
  }
  
  public static getInstance(): ClauseLoader {
    if (!ClauseLoader.instance) {
      ClauseLoader.instance = new ClauseLoader();
      
      // Register with the provider to avoid circular dependencies
      clauseLoaderProvider.registerClauseLoader(() => ClauseLoader.instance);
    }
    return ClauseLoader.instance;
  }
  
  /**
   * Parse a standard reference in the format "AS/NZS 3000:2018 Clause 5.7.4"
   */
  public parseStandardReference(text: string): { standardId: string, referenceNumber: string } | null {
    // Various regex patterns for different ways standards might be referenced
    const patterns = [
      /AS\/NZS\s+(\d+(?:\.\d+)?)[:-]?(\d{4})?\s+(?:Clause|Section|Table|Figure)\s+([0-9A-Z.]+)/i,
      /AS\/NZS\s+(\d+(?:\.\d+)?)\s+(?:Clause|Section|Table|Figure)\s+([0-9A-Z.]+)/i,
      /(?:Clause|Section|Table|Figure)\s+([0-9A-Z.]+)\s+of\s+AS\/NZS\s+(\d+(?:\.\d+)?)/i
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        // Different patterns have different capture group indices
        if (pattern.toString().includes('of')) {
          return { standardId: match[2], referenceNumber: match[1] };
        } else {
          return { standardId: match[1], referenceNumber: match[3] || match[2] };
        }
      }
    }
    
    return null;
  }
  
  /**
   * Get a standard definition by ID
   */
  public getStandardDefinition(standardId: string): StandardDefinition | null {
    return STANDARDS_REGISTRY[standardId] || null;
  }
  
  /**
   * Try to detect which standard a clause belongs to based on its pattern
   */
  public detectStandardFromClausePattern(clauseNumber: string): string {
    if (clauseNumber.startsWith('2.') && clauseNumber.length <= 6) {
      return '2293.2';
    }
    
    if (clauseNumber.startsWith('5.') || clauseNumber.startsWith('8.')) {
      return '3000';
    }
    
    return '3000'; // Default to 3000 if we can't determine
  }
  
  /**
   * Extract reference information from a reference string or object
   */
  public extractReferenceInfo(ref: string | BaseReference): { standardId: string, referenceNumber: string } {
    if (typeof ref === 'string') {
      // Check if reference contains a standard ID (e.g., '3000/5.7.4')
      if (ref.includes('/')) {
        const [standardId, ...rest] = ref.split('/');
        return { standardId, referenceNumber: rest.join('/') };
      }
      
      // Try to parse from a text reference
      const parsed = this.parseStandardReference(ref);
      if (parsed) {
        return parsed;
      }
      
      // If it starts with a number and doesn't contain a slash, it's likely just a clause reference
      // Try to detect the standard from the pattern
      return {
        standardId: this.detectStandardFromClausePattern(ref),
        referenceNumber: ref
      };
    } else {
      // Extract from a reference object
      return {
        standardId: ref.standard?.id || this.detectStandardFromClausePattern(ref.referenceNumber),
        referenceNumber: ref.referenceNumber
      };
    }
  }
  
  /**
   * Generate a cache key from standard ID and reference number
   */
  private getCacheKey(standardId: string, referenceNumber: string): string {
    return `${standardId}/${referenceNumber}`;
  }
  
  /**
   * Get the correct directory name for a standard
   * @param standardId - Standard ID (e.g. '3000', '3001.1')
   * @returns The formatted directory name (e.g. '3000-2018', '3001.1-2021')
   */
  private getDirectoryName(standardId: string): string {
    // Handle special cases
    if (standardId === '3001.1') return '3001.1-2021';
    if (standardId === '3001.2') return '3001.2-2021';
    if (standardId === '3000') return '3000-2018';
    if (standardId === '2293.2') return '2293.2-2019';
    if (standardId === '3003') return '3003-2018';
    if (standardId === '3019-2018') return '3019-2022'; // Map 2018 version to 2022 directory
    if (standardId === '3019') return '3019-2022';
    
    // Check if standard is in the registry
    const standardDef = STANDARDS_REGISTRY[standardId];
    if (standardDef?.directoryName) {
      return standardDef.directoryName;
    }
    
    // Default formatting
    const normalizedId = standardId.replace(/\./g, '-');
    const version = standardVersionMap[standardId] || '2018';
    return `${normalizedId}-${version}`;
  }

  /**
   * Normalize a standard ID to a consistent format
   * 
   * @param standardId - The standard ID to normalize
   * @returns The normalized standard ID
   */
  private normalizeStandardId(standardId: string): string {
    if (!standardId) {
      return '3000';
    }
    
    // Handle common formats and variations
    let normalized = standardId
      .replace(/^(AS|NZS|AS\/NZS)\s+/i, '')  // Remove AS/NZS prefix
      .replace(/\s+/g, '')                    // Remove all whitespace
      .trim();                                // Trim any remaining whitespace
    
    // Special handling for specific standards
    if (normalized === '4777' || normalized === '4777.1') {
      normalized = '4777.1';
      console.log(`ClauseLoader: Normalized '${standardId}' to '${normalized}'`);
    }
    
    // Strip any version suffix for base standard ID
    if (normalized.includes('-')) {
      const [baseId] = normalized.split('-');
      normalized = baseId;
      console.log(`ClauseLoader: Extracting base ID '${normalized}' from '${standardId}'`);
    }
    
    // Special case with ASNZS prefix (no slash)
    if (normalized.startsWith('ASNZS')) {
      normalized = normalized.replace(/^ASNZS/, '');
      console.log(`ClauseLoader: Removed ASNZS prefix, normalized to '${normalized}'`);
    }
    
    // Parse complex references like "2293.2:2019"
    if (normalized.includes(':')) {
      const [baseId] = normalized.split(':');
      normalized = baseId;
      console.log(`ClauseLoader: Extracted base ID '${normalized}' from version notation '${standardId}'`);
    }
    
    // Special case for 4777.1 - ensure we get the standard detection right
    if (normalized.includes('4777') || standardId.includes('4777')) {
      normalized = '4777.1';
      console.log(`ClauseLoader: Special handling for 4777 reference, setting to '${normalized}'`);
    }
    
    // Default to 3000 if we don't recognize the standard
    const validStandards = Object.keys(STANDARDS_REGISTRY);
    if (!validStandards.includes(normalized)) {
      console.warn(`ClauseLoader: Unrecognized standard '${standardId}', normalized to '${normalized}', defaulting to '3000'`);
      return '3000';
    }
    
    console.log(`ClauseLoader: Normalized '${standardId}' to '${normalized}'`);
    return normalized;
  }

  /**
   * Extract context keywords from a clause ID or reference
   * @param clauseId - Clause ID or reference text
   * @returns Context keywords for standard detection
   */
  private extractContextKeywords(clauseId: string): string {
    // Extract keywords from the clause ID or reference
    const keywords = [];
    
    if (clauseId.toLowerCase().includes('caravan') || 
        clauseId.toLowerCase().includes('vehicle') || 
        clauseId.toLowerCase().includes('transportable')) {
      keywords.push('caravan', '3001');
    }
    
    if (clauseId.toLowerCase().includes('emergency') || 
        clauseId.toLowerCase().includes('lighting') || 
        clauseId.toLowerCase().includes('exit sign')) {
      keywords.push('emergency lighting', '2293');
    }
    
    if (clauseId.toLowerCase().includes('patient') || 
        clauseId.toLowerCase().includes('hospital') || 
        clauseId.toLowerCase().includes('medical')) {
      keywords.push('patient', '3003');
    }
    
    // Add special detection for LP Gas and hazardous areas
    if (clauseId.toLowerCase().includes('lp gas') || 
        clauseId.toLowerCase().includes('lpg') || 
        clauseId.toLowerCase().includes('gas cylinder') ||
        (clauseId.toLowerCase().includes('hazardous') && 
         (clauseId.toLowerCase().includes('area') || 
          clauseId.toLowerCase().includes('zone')))) {
      keywords.push('LP Gas', 'hazardous area', '3001.2');
    }
    
    return keywords.join(' ');
  }

  /**
   * Add validation function to check if a clause ID is valid
   */
  public isValidClauseId(clauseId: string): boolean {
    // Undefined or null check
    if (!clauseId) {
      console.warn('Rejected null or undefined clause ID');
      return false;
    }
    
    // Trim the input to handle whitespace
    const trimmedClauseId = clauseId.trim();
    
    // Empty string check
    if (trimmedClauseId === '') {
      console.warn('Rejected empty clause ID');
      return false;
    }
    
    // First check if it's an appendix reference (like "Appendix P") which is not a valid clause
    if (/appendix\s+[a-z]/i.test(trimmedClauseId)) {
      console.warn(`Rejected appendix reference masquerading as clause ID: "${trimmedClauseId}"`);
      return false;
    }
    
    // Check if it contains the word "clause" - this indicates the reference wasn't properly parsed
    if (/\s*clause\s+/i.test(trimmedClauseId)) {
      console.warn(`Rejected raw clause reference: "${trimmedClauseId}"`);
      return false;
    }
    
    // Reject single letters, which could be fragments of other references
    if (/^[A-Za-z]$/.test(trimmedClauseId)) {
      console.warn(`Rejected invalid single-letter clause ID: "${trimmedClauseId}"`);
      return false;
    }
    
    // Basic pattern for valid clause IDs
    const validPattern = /^([A-Z]\.)?(\d+)(\.\d+)*$/i;
    const isValid = validPattern.test(trimmedClauseId);
    
    if (!isValid) {
      console.warn(`Clause ID "${trimmedClauseId}" does not match valid pattern`);
    }
    
    return isValid;
  }

  /**
   * Load a clause by reference ID
   * @param reference - A reference ID string or ClauseReference object
   * @returns The requested clause or null if not found
   */
  public async loadClause(reference: string | BaseReference): Promise<EnhancedClauseReference | null> {
    try {
      // Add debug logging for 3019 clauses
      const debugInfo = this.extractReferenceInfo(reference);
      if (debugInfo.standardId === '3019') {
        console.log('Loading 3019 clause:', debugInfo.referenceNumber);
        console.log('Standard modules:', Object.keys(standardModules));
        console.log('3019 clauses:', Object.keys(standardModules['3019']));
      }

      // Extract reference information
      let standardId: string | undefined;
      let referenceNumber: string;
      let context: string | undefined;

      if (typeof reference === 'string') {
        if (reference.includes('/')) {
          const parts = reference.split('/');
          standardId = this.normalizeStandardId(parts[0]);
          referenceNumber = parts.slice(1).join('/');
        } else {
          referenceNumber = reference;
          context = this.extractContextKeywords(reference);
        }
      } else {
        standardId = reference.standard?.id;
        referenceNumber = reference.referenceNumber;
        context = this.extractContextKeywords(reference.referenceNumber);
      }

      // Validate the clause ID before proceeding
      if (!this.isValidClauseId(referenceNumber)) {
        return null;
      }

      // Auto-detect standard if not provided, using context
      if (!standardId) {
        if (context?.toLowerCase().includes('ies') || 
            context?.toLowerCase().includes('inverter') ||
            context?.toLowerCase().includes('grid-connected')) {
          standardId = '4777.1';
        } else {
          const detectedStandard = standardDetector.detectStandardFromClause(referenceNumber, context);
          standardId = detectedStandard || '3000';
        }
      }

      // Check if this is actually a standard ID
      const knownStandardIds = ['3000', '2293.2', '3001.1', '3001.2', '3003', '4777.1'];
      if (knownStandardIds.includes(referenceNumber) || (/^\d{4,}$/.test(referenceNumber))) {
        return this.createStandardInfoClause(referenceNumber);
      }

      // Define fallback standards based on clause patterns
      const fallbackStandards: string[] = [];
      
      if (standardId) {
        fallbackStandards.push(standardId);
      }
      
      if (referenceNumber === '2.3' || referenceNumber === '3.1' || 
          referenceNumber === '5.3.1' || referenceNumber === '7.3.1') {
        if (!fallbackStandards.includes('4777.1')) {
          fallbackStandards.push('4777.1');
        }
      } else if (referenceNumber.startsWith('2.10.')) {
        if (!fallbackStandards.includes('3000')) {
          fallbackStandards.push('3000');
        }
      } else if (referenceNumber === '1.4.12' || 
                (referenceNumber.startsWith('1.4.') &&
                 context &&
                 (context.includes('hazardous') || context.includes('LP Gas') || context.includes('LPG')))) {
        if (!fallbackStandards.includes('3001.2')) {
          fallbackStandards.push('3001.2');
        }
      } else if (referenceNumber.startsWith('2.') && !fallbackStandards.includes('2293.2')) {
        fallbackStandards.push('2293.2');
      } else if (referenceNumber.startsWith('4.4.5.') && !fallbackStandards.includes('5033')) {
        fallbackStandards.push('5033');
      }
      
      if (!fallbackStandards.includes('3000')) {
        fallbackStandards.push('3000');
      }

      // Try each standard in sequence until we find the clause
      for (const tryStandardId of fallbackStandards) {
        const cacheKey = `${tryStandardId}/${referenceNumber}`;
        
        if (this.cache.has(cacheKey)) {
          const cachedClause = this.cache.get(cacheKey) as EnhancedClauseReference;
          
          if (standardId && tryStandardId !== standardId) {
            cachedClause.note = `Note: This clause was found in AS/NZS ${tryStandardId} rather than AS/NZS ${standardId}.`;
          }
          
          if (cachedClause && cachedClause.fullText === "Loading content...") {
            this.cache.delete(cacheKey);
          } else if (cachedClause) {
            return cachedClause;
          }
        }
        
        try {
          if (standardModules[tryStandardId]) {
            const clauseData = standardModules[tryStandardId][referenceNumber];
            
            if (clauseData) {
              if (clauseData.fullText === "Loading content...") {
                continue;
              }
              
              const result: EnhancedClauseReference = {
                id: clauseData.id || referenceNumber,
                referenceNumber: clauseData.id || referenceNumber,
                type: 'clause' as const,
                title: clauseData.title || `Clause ${referenceNumber}`,
                fullText: clauseData.fullText || '',
                standard: {
                  id: tryStandardId,
                  name: `AS/NZS ${tryStandardId}`,
                  version: standardVersionMap[tryStandardId] || '2018'
                },
                source: 'direct' as const,
                validated: true,
                lastUpdated: Date.now(),
                formatVersion: '1.0',
                referenceChain: []
              };
              
              if (standardId && tryStandardId !== standardId) {
                result.note = `Note: This clause was found in AS/NZS ${tryStandardId} rather than AS/NZS ${standardId}.`;
              }
              
              this.cache.set(cacheKey, result);
              return result;
            }
          }
        } catch (error) {
          if (tryStandardId === '3019') {
            console.error(`Error loading clause ${referenceNumber} from standard ${tryStandardId}:`, error);
          }
        }
      }

      return null;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.error(`Error in loadClause: ${error.message}`);
      return null;
    }
  }
  
  /**
   * Creates a clause with standard information
   */
  private createStandardInfoClause(standardId: string): EnhancedClauseReference {
    // Normalize standard ID first
    const normalizedId = this.normalizeStandardId(standardId);
    
    // Get standard information
    const info = {
      '3000': {
        title: 'Electrical installations (known as the Australian/New Zealand Wiring Rules)',
        version: '2018',
        description: 'This Standard sets out requirements for the design, construction and verification of electrical installations.'
      },
      '2293.2': {
        title: 'Emergency lighting and exit signs for buildings',
        version: '2019',
        description: 'Specifies requirements for the inspection and maintenance of emergency lighting and exit sign systems.'
      },
      '3001.1': {
        title: 'Electrical installations — Transportable structures and vehicles',
        version: '2021',
        description: 'Specifies the electrical installation requirements for transportable structures and vehicles.'
      },
      '3001.2': {
        title: 'Electrical installations — Transportable structures and vehicles',
        version: '2021',
        description: 'Sets out the electrical safety requirements for caravans, camping trailers, and relocatable homes.'
      },
      '3003': {
        title: 'Electrical installations — Patient areas',
        version: '2018',
        description: 'Sets out the requirements for electrical installations in hospitals, medical and dental practices.'
      }
    }[normalizedId] || {
      title: `AS/NZS ${normalizedId}`,
      version: '',
      description: `Standard AS/NZS ${normalizedId}`
    };
    
    return {
      id: normalizedId,
      referenceNumber: normalizedId,
      type: 'clause' as const,
      title: `AS/NZS ${normalizedId} - ${info.title}`,
      fullText: info.description,
      standard: {
        id: normalizedId,
        name: `AS/NZS ${normalizedId}`,
        version: info.version
      },
      source: 'direct' as const,
      validated: true,
      lastUpdated: Date.now(),
      formatVersion: '1.0',
      referenceChain: []
    };
  }
  
  /**
   * Get all available standards
   */
  public getAllStandards(): StandardDefinition[] {
    return Object.values(STANDARDS_REGISTRY);
  }
  
  /**
   * Clear the clause cache
   */
  public clearCache(): void {
    this.cache.clear();
    console.log('Clause cache cleared');
  }

  private async loadTextFromStandards(
    referenceNumber: string,
    fallbackStandards: string[],
    context?: string
  ): Promise<ClauseInstance[]> {
    const results: ClauseInstance[] = [];
    const loadedIds = new Set<string>(); // Track loaded clause IDs to prevent duplicates
    
    console.log(`Attempting to load clause ${referenceNumber} from fallback standards:`, fallbackStandards);

    // Special case for clause 1.4.12 - try 3001.2 first
    if (referenceNumber === '1.4.12' || 
        (referenceNumber.startsWith('1.4.') && 
         context && 
         (context.toLowerCase().includes('hazardous') || 
          context.toLowerCase().includes('lp gas') || 
          context.toLowerCase().includes('lpg')))) {
      console.log(`Special case detected for hazardous areas clause: ${referenceNumber}`);
      
      try {
        const hazardousAreaClause = await this.loadClauseFromStandard(referenceNumber, '3001.2');
        if (hazardousAreaClause && !this.isLoadingPlaceholder(hazardousAreaClause.fullText)) {
          console.log(`Successfully loaded ${referenceNumber} from 3001.2 standard`);
          results.push(hazardousAreaClause);
          loadedIds.add(hazardousAreaClause.id);
        }
      } catch (error) {
        console.error(`Error loading hazardous areas clause ${referenceNumber} from 3001.2:`, error);
      }
    }
    
    // Continue with regular fallback standards if needed
    for (const standardId of fallbackStandards) {
      try {
        const clause = await this.loadClauseFromStandard(referenceNumber, standardId);
        
        // Skip if we already loaded this exact clause or if it's a loading placeholder
        if (clause && 
            !loadedIds.has(clause.id) && 
            !this.isLoadingPlaceholder(clause.fullText)) {
          console.log(`Loaded clause ${referenceNumber} from standard ${standardId}`);
          results.push(clause);
          loadedIds.add(clause.id);
        }
      } catch (error) {
        console.error(`Error loading clause ${referenceNumber} from standard ${standardId}:`, error);
      }
    }

    return results;
  }

  /**
   * Check if the text is a loading placeholder
   * @param text - The text to check
   * @returns True if the text is a loading placeholder
   */
  private isLoadingPlaceholder(text?: string): boolean {
    if (!text) return true;
    return text.includes('Loading...') || text.trim() === '';
  }

  /**
   * Load a clause from a specific standard
   * @param referenceNumber - The clause reference number
   * @param standardId - The standard ID
   * @returns The clause instance or null if not found
   */
  private async loadClauseFromStandard(
    referenceNumber: string,
    standardId: string
  ): Promise<ClauseInstance | null> {
    try {
      // Normalize the standard ID
      const normalizedStandardId = this.normalizeStandardId(standardId);
      
      // Get the directory name for the standard
      const directoryName = this.getDirectoryName(normalizedStandardId);
      
      // Instead of using dynamic import with @/standards path, 
      // try to get the clause from the static modules first
      if (standardModules[normalizedStandardId] && 
          standardModules[normalizedStandardId][referenceNumber]) {
        
        const moduleData = standardModules[normalizedStandardId][referenceNumber];
        
        // Return the clause instance
        return {
          id: moduleData.id,
          title: moduleData.title,
          fullText: moduleData.fullText || 'Loading...',
          standard: normalizedStandardId
        };
      }
      
      // If not found in modules, try to load from components/clauses directory
      try {
        // Construct a require path instead of using @/standards
        // This will look in the components/clauses directory
        const components = await import(`../components/clauses/${directoryName}/${referenceNumber}.json`);
        
        if (components) {
          return {
            id: components.id,
            title: components.title,
            fullText: components.fullText || 'Loading...',
            standard: normalizedStandardId
          };
        }
      } catch (importError) {
        console.warn(`Clause ${referenceNumber} not found in components/clauses/${directoryName}: ${importError}`);
      }
      
      // Log the failure and return null
      console.warn(`Clause ${referenceNumber} not found in standard ${standardId}`);
      return null;
    } catch (error) {
      console.error(`Error loading clause ${referenceNumber} from standard ${standardId}:`, error);
      return null;
    }
  }

  /**
   * Tests loading a sample clause from each standard directory
   * This function can be used to verify all standards are properly configured
   * @returns A report of which standards were successfully tested
   */
  public async testAllStandards(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};
    const allStandards = Object.keys(standardVersionMap);
    
    console.log(`ClauseLoader: Testing clause loading for ${allStandards.length} standards`);
    
    // Common clause IDs to test - these are likely to exist in most standards
    const testClauseIds = ['1.1', '1.2', '1.3', '1.4', '2.1', '3.1'];
    
    for (const standardId of allStandards) {
      try {
        // Get the directory name for this standard
        const directoryName = this.getDirectoryName(standardId);
        let success = false;
        
        console.log(`ClauseLoader: Testing standard ${standardId} (${directoryName})`);
        
        // Try each test clause ID until one succeeds
        for (const clauseId of testClauseIds) {
          try {
            const clause = await this.loadClauseFromStandard(clauseId, standardId);
            if (clause) {
              console.log(`ClauseLoader: Successfully loaded clause ${clauseId} from ${standardId}`);
              success = true;
              break;
            }
          } catch (e) {
            // Continue to next clause ID
          }
        }
        
        results[standardId] = success;
        console.log(`ClauseLoader: Standard ${standardId} test ${success ? 'PASSED' : 'FAILED'}`);
      } catch (error) {
        console.error(`ClauseLoader: Error testing standard ${standardId}:`, error);
        results[standardId] = false;
      }
    }
    
    // Log summary
    const successful = Object.values(results).filter(Boolean).length;
    console.log(`ClauseLoader: Successfully tested ${successful} of ${allStandards.length} standards`);
    
    return results;
  }
}

// Export a singleton instance
export const clauseLoader = ClauseLoader.getInstance(); 