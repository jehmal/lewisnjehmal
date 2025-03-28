import { 
  BaseReference, 
  ClauseReference, 
  FigureReference, 
  TableReference, 
  ReferenceError,
  ReferenceMetadata,
  ValidationState,
  ValidationError,
  ValidationWarning,
  ReferenceContext,
  StandardReference,
  ClauseContent,
  STANDARD_VERSIONS
} from '@/types/references';
import { ReferenceDetector } from './reference-detector';
import { ReferenceCache } from './reference-cache';
import { standardDetector } from './standard-detector';
import { clauseLoaderProvider } from './clause-loader-provider';
import path from 'path';

// Import static clause modules
import asnzs3003Clauses from '../components/clauses/3003-2018';
import asnzs2293Clauses from '../components/clauses/2293.2-2019';
import asnzs3000Clauses from '../components/clauses/3000-2018';
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

// Define the module structure
type ClauseData = {
  id: string;
  title: string;
  fullText?: string;
  subsections?: Record<string, string> | string[];
};

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
    name: 'Wiring Rules',
    version: '2018',
    directoryName: '3000-2018',
    context: ['general', 'wiring'],
  },
  '2293.2': {
    id: '2293.2',
    name: 'Emergency lighting and exit signs',
    version: '2019',
    directoryName: '2293.2-2019',
    context: ['emergency', 'lighting'],
  },
  '3003': {
    id: '3003',
    name: 'Electrical installations - Patient areas',
    version: '2018',
    directoryName: '3003-2018',
    context: ['medical', 'patient', 'healthcare'],
  },
  '3001.1': {
    id: '3001.1',
    name: 'Electrical installations - Transportable structures and vehicles - Part 1',
    version: '2022',
    directoryName: '3001.1-2022',
    context: ['transportable', 'vehicles'],
  },
  '3001.2': {
    id: '3001.2',
    name: 'Electrical installations - Transportable structures and vehicles - Part 2',
    version: '2022',
    directoryName: '3001.2-2022',
    context: ['transportable', 'vehicles'],
  },
  '3010': {
    id: '3010',
    name: 'Electrical installations - Generating sets',
    version: '2017',
    directoryName: '3010-2017',
    context: ['generator', 'generating sets'],
  },
  '3012': {
    id: '3012',
    name: 'Electrical installations - Construction and demolition sites',
    version: '2019',
    directoryName: '3012-2019',
    context: ['construction', 'demolition'],
  },
  '3017': {
    id: '3017',
    name: 'Electrical installations - Verification guidelines',
    version: '2022',
    directoryName: '3017-2022',
    context: ['verification', 'testing'],
  },
  '3019': {
    id: '3019',
    name: 'Electrical installations - Periodic verification',
    version: '2022',
    directoryName: '3019-2022',
    context: ['periodic', 'verification'],
  },
  '3760': {
    id: '3760',
    name: 'In-service safety inspection and testing of electrical equipment',
    version: '2022',
    directoryName: '3760-2022',
    context: ['testing', 'inspection', 'equipment'],
  },
  '3820': {
    id: '3820',
    name: 'Essential safety requirements for electrical equipment',
    version: '2009',
    directoryName: '3820-2009',
    context: ['safety', 'equipment'],
  },
  '4509.1': {
    id: '4509.1',
    name: 'Stand-alone power systems - Part 1: Safety and installation',
    version: '2009',
    directoryName: '4509.1-2009',
    context: ['stand-alone', 'power'],
  },
  '4509.2': {
    id: '4509.2',
    name: 'Stand-alone power systems - Part 2: System design',
    version: '2010',
    directoryName: '4509.2-2010',
    context: ['stand-alone', 'power'],
  },
  '4777.1': {
    id: '4777.1',
    name: 'Grid connection of energy systems via inverters - Part 1',
    version: '2016',
    directoryName: '4777.1-2016',
    context: ['grid', 'inverter', 'connection'],
  },
  '4836': {
    id: '4836',
    name: 'Safe working on or near low voltage electrical installations and equipment',
    version: '2023',
    directoryName: '4836-2023',
    context: ['safety', 'working'],
  },
  '5033': {
    id: '5033',
    name: 'Installation and safety requirements for photovoltaic (PV) arrays',
    version: '2021',
    directoryName: '5033-2021',
    context: ['solar', 'pv', 'photovoltaic'],
  },
  '5139': {
    id: '5139',
    name: 'Electrical installations - Safety of battery systems for use with power conversion equipment',
    version: '2019',
    directoryName: '5139-2019',
    context: ['battery', 'energy storage'],
  },
  '3004.2': {
    id: '3004.2',
    name: 'Electrical installations - Marinas and boats',
    version: '2014',
    directoryName: '3004.2-2014',
    context: ['marine', 'marina', 'boat'],
  }
};

// Map standard IDs to their respective clause modules
const standardModules: Record<string, Record<string, ClauseData>> = {
  '3003': asnzs3003Clauses,
  '2293.2': asnzs2293Clauses,
  '3000': asnzs3000Clauses,
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

// Log available standards for debugging
console.log('Available standard modules:', Object.keys(standardModules));

interface LoadOptions {
  useCache?: boolean;
  forceFresh?: boolean;
  maxDepth?: number;
  timeout?: number;
  validateReferences?: boolean;
  loadRelated?: boolean;
  context?: ReferenceContext;
}

// Update ReferenceType to include "standard"
export type ReferenceType = "clause" | "figure" | "table" | "standard";

// Update SourceType to include "direct_file" and "Standards Australia"
export type SourceType = "direct" | "extracted" | "imported" | "direct_file" | "Standards Australia";

export class ReferenceLoader {
  private static instance: ReferenceLoader;
  private cache: Map<string, any>;
  private detector: ReferenceDetector;
  private loadingPromises: Map<string, Promise<any>>;
  private modulesInitialized: boolean = false;
  private readonly DEFAULT_OPTIONS: LoadOptions = {
    useCache: true,
    forceFresh: false,
    maxDepth: 1,
    timeout: 10000,
    validateReferences: false,
    loadRelated: true
  };

  private constructor() {
    this.cache = new Map<string, any>();
    this.detector = ReferenceDetector.getInstance();
    this.loadingPromises = new Map<string, Promise<any>>();
    console.log('ReferenceLoader initialized');
  }

  public static getInstance(): ReferenceLoader {
    if (!ReferenceLoader.instance) {
      ReferenceLoader.instance = new ReferenceLoader();
    }
    return ReferenceLoader.instance;
  }

  /**
   * Initialize modules - this replaces the previous initializeStaticModules function
   * that was causing the TypeError
   */
  private async initializeModules(): Promise<void> {
    if (this.modulesInitialized) {
      return;
    }

    try {
      // No need to perform any additional initialization since we're using static imports
      // Just mark the modules as initialized
      this.modulesInitialized = true;
      console.log('Static modules successfully initialized');
      
      // Log the available modules for debugging
      const standardsList = Object.keys(standardModules);
      console.log('Available standards:', standardsList);
      
      // Check if some key standards are available
      if (standardsList.includes('3000')) {
        console.log('3000 standard module is available');
        // Check a few key clauses
        const module = standardModules['3000'];
        console.log('3000 module sample clauses:', 
          Object.keys(module).slice(0, 5),
          module['5.7.4'] ? 'Clause 5.7.4 exists' : 'Clause 5.7.4 missing'
        );
      }
    } catch (error) {
      console.error('Error initializing modules:', error);
      this.modulesInitialized = false;
    }
  }

  // Utility to get a standard definition
  private getStandardDefinition(standardId: string): StandardDefinition | null {
    return STANDARDS_REGISTRY[standardId] || null;
  }

  // Utility to get all available standards
  public getAllStandards(): StandardDefinition[] {
    return Object.values(STANDARDS_REGISTRY);
  }

  // Parse standard reference from text
  private parseStandardReference(text: string): { standardId: string, referenceNumber: string } | null {
    // Match formats like "ASNZS3000 Clause 2.1", "ASNZS2293.2 Clause 2.5.2"
    const standardMatch = text.match(/ASNZS(\d{4}(?:\.\d+)?)\s+(?:Clause|clause|Section|section)\s+(\d+(?:\.\d+)*)/i);
    
    if (standardMatch) {
      return {
        standardId: standardMatch[1],
        referenceNumber: standardMatch[2]
      };
    }
    
    return null;
  }

  /**
   * Creates metadata for a reference
   */
  private createMetadata(source: 'direct' | 'extracted' | 'imported', referenceChain: string[] = []): ReferenceMetadata {
    return {
      id: '',  // Will be populated later
      type: 'clause', // Will be overridden  
      standard: { id: '', name: '', version: '' }, // Will be populated later
      lastUpdated: Date.now(),
      formatVersion: '1.0',
      source,
      validated: false,
      referenceChain
    };
  }

  /**
   * Creates a validation state object
   */
  private createValidationState(
    isValid: boolean,
    errors: ValidationError[] = [],
    warnings: ValidationWarning[] = []
  ): ValidationState {
    return {
      isValid,
      errors,
      warnings,
      lastValidated: Date.now(),
      validatedBy: 'ReferenceLoader'
    };
  }

  /**
   * Validates a reference
   */
  private async validateReference(ref: BaseReference): Promise<ValidationState> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Validate standard
    if (!standardDetector.isValidStandard(ref.standard.id, ref.standard.version)) {
      errors.push({
        code: 'INVALID_STANDARD',
        message: `Invalid standard ${ref.standard.id} version ${ref.standard.version}`,
        severity: 'error'
      });
    }

    // Validate reference number format based on type
    const referenceNumberPattern: Record<string, RegExp> = {
      clause: /^\d+(\.\d+)*$/,
      figure: /^\d+(\.\d+)*$/,
      table: /^[A-Z]?\d+(\.\d+)*$/,
      appendix: /^[A-Z](\.\d+)*$/,
      note: /^\d+(\.\d+)*$/,
      standard: /^\d{4}(\.\d+)*(-\d{4})?$/
    };
    
    if (ref.type in referenceNumberPattern && !referenceNumberPattern[ref.type].test(ref.referenceNumber)) {
      errors.push({
        code: 'INVALID_REFERENCE_NUMBER',
        message: `Invalid ${ref.type} reference number format: ${ref.referenceNumber}`,
        severity: 'error'
      });
    }

    // Check for circular references
    const referenceChain = (ref as { metadata?: ReferenceMetadata }).metadata?.referenceChain || [];
    if (referenceChain.includes(`${ref.standard.id}:${ref.referenceNumber}`)) {
      errors.push({
        code: 'CIRCULAR_REFERENCE',
        message: 'Circular reference detected',
        severity: 'critical',
        context: { chain: referenceChain }
      });
    }

    return this.createValidationState(errors.length === 0, errors, warnings);
  }

  // Helper to extract reference info from BaseReference or string
  private extractReferenceInfo(ref: BaseReference | string): { standardId: string, referenceNumber: string } {
    if (typeof ref === 'string') {
      // Try to parse standard reference from string
      const parsed = this.parseStandardReference(ref);
      if (parsed) {
        return parsed;
      }
      // Assume it's just a clause number
      let standardId = '';
      if (ref.match(/^2\.\d/)) {
        standardId = '2293.2';
      } else {
        standardId = '3000'; // Default
      }
      return { standardId, referenceNumber: ref };
    } else {
      // Type guard to ensure we have the necessary properties
      const hasStandard = 
        ref.standard !== undefined && 
        typeof ref.standard === 'object' && 
        'id' in ref.standard && 
        typeof ref.standard.id === 'string';
      
      // Get the standard ID with fallback
      const standardId = hasStandard 
        ? (ref.standard.id.replace(/^AUSNZ:/, '') || '') 
        : '';
      
      // Get the reference number with fallback
      const referenceNumber = ref.referenceNumber || ref.id;
      
      return { standardId, referenceNumber };
    }
  }

  // Helper to create a ClauseReference object
  private createClauseReference(standardId: string, referenceNumber: string): ClauseReference {
    return {
      id: referenceNumber,
      referenceNumber,
      type: 'clause',
      standard: {
        id: standardId,
        name: `AS/NZS ${standardId}`,
        version: '2018' // Default version
      },
      lastUpdated: Date.now(),
      formatVersion: '1.0',
      source: 'direct',
      validated: false,
      referenceChain: []
    };
  }

  // Helper to create a FigureReference object
  private createFigureReference(standardId: string, referenceNumber: string): FigureReference {
    return {
      id: referenceNumber,
      referenceNumber,
      type: 'figure',
      standard: {
        id: standardId,
        name: `AS/NZS ${standardId}`,
        version: '2018' // Default version
      },
      lastUpdated: Date.now(),
      formatVersion: '1.0',
      source: 'direct',
      validated: false,
      referenceChain: []
    };
  }

  // Helper to create a TableReference object
  private createTableReference(standardId: string, referenceNumber: string): TableReference {
    return {
      id: referenceNumber,
      referenceNumber,
      type: 'table',
      standard: {
        id: standardId,
        name: `AS/NZS ${standardId}`,
        version: '2018' // Default version
      },
      lastUpdated: Date.now(),
      formatVersion: '1.0',
      source: 'direct',
      validated: false,
      referenceChain: []
    };
  }

  // Define the regex extraction patterns
  private regexExtractionPatterns: Record<string, RegExp> = {
    clause: /^(?:Clause\s+|Cl\.\s*|C|clause\s+|cl\.\s*|c\s+|\s+|\.|,|;|:|clause:)([0-9]+(?:\.[0-9]+)*(?:\.[A-Z])?)/i,
    figure: /^(?:Figure\s+|Fig\.\s*|F|figure\s+|fig\.\s*|f\s+|\s+|\.|,|;|:|figure:)([0-9]+(?:\.[0-9]+)*(?:\.[A-Z])?)/i,
    table: /^(?:Table\s+|Tab\.\s*|T|table\s+|tab\.\s*|t\s+|\s+|\.|,|;|:|table:)([0-9]+(?:\.[0-9]+)*(?:\.[A-Z])?)/i,
    appendix: /^(?:Appendix\s+|App\.\s*|A|appendix\s+|app\.\s*|a\s+|\s+|\.|,|;|:|appendix:)([0-9]+(?:\.[0-9]+)*(?:\.[A-Z])?|[A-Z])/i,
    note: /^(?:Note\s+|N|note\s+|n\s+|\s+|\.|,|;|:|note:)([0-9]+(?:\.[0-9]+)*(?:\.[A-Z])?)/i,
    standard: /^(?:Standard\s+|Std\.\s*|S|standard\s+|std\.\s*|s\s+|\s+|\.|,|;|:|standard:)((?:[A-Z]+\/)?[A-Z]+\s+)?(\d+(?:\.\d+)*(?:\.\d+)*)([\-:]\d{4})?/i
  };

  /**
   * Parses a reference ID into its type and ID components
   * @param referenceId The reference ID to parse (e.g., "clause:5.7.4" or "5.7.4")
   * @returns An object with the type and ID 
   */
  public parseReferenceId(referenceId: string): { type: string; referenceId: string } {
    // Default to clause type if no prefix
    if (!referenceId.includes(':')) {
      return { type: 'clause', referenceId: referenceId };
    }
    
    // Split by colon to get type and ID
    const [type, id] = referenceId.split(':');
    
    return { 
      type: type.toLowerCase(), 
      referenceId: id
    };
  }

  /**
   * Loads a reference by ID
   * @param id The reference ID to load (e.g., "clause:5.7.4" or "figure:3.1")
   * @returns The loaded reference or null if not found
   */
  public async loadReference(id: string): Promise<BaseReference | null> {
    try {
      // Add debug logging for 3019 references
      if (id.includes('3019')) {
        console.log('Loading 3019 reference:', id);
      }

      // Extract reference type and ID
      const { type, referenceId } = this.parseReferenceId(id);
      
      // Load based on type
      switch (type) {
        case 'clause':
          // Use the provider to access the clauseLoader singleton without circular dependencies
          const clauseLoader = clauseLoaderProvider.getClauseLoader();
          return clauseLoader.loadClause(referenceId);
          
        case 'figure':
          // TODO: Implement figure loading
          return null;
          
        case 'table':
          // TODO: Implement table loading
          return null;
          
        default:
          return null;
      }
    } catch (error) {
      console.error('Error loading reference:', error);
      return null;
    }
  }

  /**
   * Gets a static asset like a figure or table
   * @param assetType The type of asset to get
   * @param standard The standard reference
   * @param referenceNumber The reference number
   */
  private getStaticAsset(assetType: 'figure' | 'table', standard: StandardReference | string, referenceNumber: string): any {
    try {
      // Ensure standard is a proper StandardReference object
      const stdRef = typeof standard === 'object' ? standard : this.createStandardReference(standard);
      
      // Use a standard-specific module to get the asset
      const standardId = stdRef.id;
      
      // Handle special cases or return null if not found
      console.log(`Looking for ${assetType} ${referenceNumber} in standard ${standardId}`);
      
      // Return empty object for now - this would be expanded with actual assets
      return {
        caption: `${assetType.charAt(0).toUpperCase() + assetType.slice(1)} ${referenceNumber} from standard ${standardId}`,
        imagePath: `/assets/standards/${standardId}/${assetType}s/${referenceNumber}.png`
      };
    } catch (error) {
      console.error('Error getting static asset:', error);
      return null;
    }
  }

  /**
   * Loads a figure reference
   */
  private async loadFigure(ref: BaseReference | string, options: LoadOptions = {}): Promise<FigureReference | null> {
    try {
      // First, handle string reference
      if (typeof ref === 'string') {
        // Extract reference info from string
        const { standardId, referenceNumber } = this.extractReferenceInfo(ref);
        // Create a proper figure reference
        const figRef = this.createFigureReference(standardId, referenceNumber);
        // Try to load with the newly created reference
        return this.loadFigure(figRef, options);
      }

      try {
        // Get standard info ensuring it's a proper StandardReference
        const standard = (ref.standard && typeof ref.standard === 'object' && 'id' in ref.standard) ? 
          ref.standard as StandardReference : 
          this.createStandardReference(ref.standard as string || '3000');

        // Use the static method instead of dynamic import with proper types
        const figureData = this.getStaticAsset('figure', standard, ref.referenceNumber);
        
        // Create a proper FigureReference object
        const figureRef: FigureReference = {
          id: ref.id,
          type: 'figure' as const,
          standard: standard,
          referenceNumber: ref.referenceNumber,
          lastUpdated: ref.lastUpdated || Date.now(),
          formatVersion: ref.formatVersion || '1.0',
          source: ref.source || 'direct',
          validated: ref.validated || false,
          referenceChain: ref.referenceChain || [],
          caption: figureData?.caption || '',
          imagePath: figureData?.imagePath || ''
        };
        
        return figureRef;
      } catch (error) {
        throw new ReferenceError(
          `Figure ${ref.referenceNumber} not found in ${typeof ref.standard === 'object' ? ref.standard.id : ref.standard}`,
          'FIGURE_NOT_FOUND'
        );
      }
    } catch (error: unknown) {
      if (error instanceof ReferenceError) throw error;
      if (error instanceof Error) {
        throw new ReferenceError(
          `Error loading figure: ${error.message}`,
          'LOAD_FAILED'
        );
      }
      throw new ReferenceError(
        `Unknown error loading figure`,
        'UNKNOWN_ERROR'
      );
    }
  }

  // Helper method to create a StandardReference from a string
  private createStandardReference(standardId: string): StandardReference {
    const stdDef = this.getStandardDefinition(standardId);
    return {
      id: standardId,
      name: stdDef?.name || `AS/NZS ${standardId}`,
      version: stdDef?.version || STANDARD_VERSIONS[standardId] || '2018'
    };
  }

  /**
   * Loads a table reference
   */
  private async loadTable(ref: TableReference, options: LoadOptions): Promise<TableReference> {
    try {
      try {
        // Use the static method instead of dynamic import
        const tableData = this.getStaticAsset('table', ref.standard, ref.referenceNumber);

      return {
        ...ref,
          title: tableData.title || '',
          content: tableData.content || ''
      };
    } catch (error) {
        throw new ReferenceError(
          `Table ${ref.referenceNumber} not found in ${ref.standard.id}`,
          'TABLE_NOT_FOUND'
        );
      }
    } catch (error: unknown) {
      if (error instanceof ReferenceError) throw error;
      if (error instanceof Error) {
        throw new ReferenceError(
          `Error loading table ${ref.referenceNumber} from ${ref.standard.id}: ${error.message}`,
          'LOAD_FAILED'
        );
      }
      throw new ReferenceError(
        `Unknown error loading table ${ref.referenceNumber} from ${ref.standard.id}`,
        'UNKNOWN_ERROR'
      );
    }
  }

  /**
   * Loads related references from text
   */
  private async loadRelatedReferences(
    text: string,
    contextStandard: string,
    currentReferenceNumber: string
  ): Promise<BaseReference[]> {
    const references = this.detector.detectReferences(text, contextStandard);
    const loadedRefs: BaseReference[] = [];

    for (const ref of references) {
      try {
        // If loadReference is defined to accept a second parameter, pass options
        // If not, we need to modify it or call it differently
        const loadedRef = await this.loadReference(ref.referenceNumber || ref.id);
        if (loadedRef) {
          loadedRefs.push(loadedRef);
        }
      } catch (error) {
        // Use safe access for standard.id with fallbacks
        const standardId = ref.standard && typeof ref.standard === 'object' ? ref.standard.id : 
                           typeof ref.standard === 'string' ? ref.standard : 'unknown';
        console.warn(`Failed to load related reference: ${standardId} ${ref.referenceNumber}`, error);
      }
    }

    return this.deduplicateReferences(loadedRefs);
  }

  /**
   * Gets the path to a standard's directory
   */
  private getStandardPath(standard: StandardReference): string {
    // Remove AUSNZ: prefix if present
    const cleanStandardId = standard.id.replace(/^AUSNZ:/, '');
    return path.join('components', 'clauses', `${cleanStandardId}-${standard.version}`);
  }

  /**
   * Gets a cache key for a reference
   */
  private getCacheKey(ref: BaseReference): string {
    return `${ref.standard.id}-${ref.standard.version}-${ref.type}-${ref.referenceNumber}`;
  }

  /**
   * Removes duplicate references
   */
  private deduplicateReferences(refs: BaseReference[]): BaseReference[] {
    const seen = new Set<string>();
    return refs.filter(ref => {
      const key = this.getCacheKey(ref);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /**
   * Gets the text content for a reference
   * @param reference The reference to get text for
   * @returns The text content as a string, or null if not found
   */
  public async getReferenceText(reference: string): Promise<string | null> {
    if (!reference) return null;
    
    try {
      // Parse the reference ID
      const parsed = this.parseReferenceId(reference);
      
      // Delegate to the appropriate loader based on type
      switch (parsed.type) {
        case 'clause':
          return this.getClauseText(parsed.referenceId);
        case 'figure':
          return this.getFigureText(parsed.referenceId);
        case 'table':
          return this.getTableText(parsed.referenceId);
        case 'appendix':
          return this.getAppendixText(parsed.referenceId);
        case 'note':
          return this.getNoteText(parsed.referenceId);
        case 'standard':
          return this.getStandardText(parsed.referenceId);
        default:
          // If the type is unknown, try to detect it from format
          console.log(`Unknown reference type: ${parsed.type}, trying to detect from format`);
          return this.getUnknownReferenceText(reference);
      }
    } catch (error) {
      console.error('Error in getReferenceText:', error);
      return null;
    }
  }

  // Helper methods to get text for different reference types
  private async getClauseText(clauseId: string): Promise<string | null> {
    console.log(`Getting clause text for ${clauseId}`);
    // Implementation details...
    return `Clause ${clauseId}`;
  }

  private async getFigureText(figureId: string): Promise<string | null> {
    console.log(`Getting figure text for ${figureId}`);
    // Implementation details...
    return `Figure ${figureId}`;
  }

  private async getTableText(tableId: string): Promise<string | null> {
    console.log(`Getting table text for ${tableId}`);
    // Implementation details...
    return `Table ${tableId}`;
  }

  private async getAppendixText(appendixId: string): Promise<string | null> {
    console.log(`Getting appendix text for ${appendixId}`);
    // Implementation details...
    return `Appendix ${appendixId}`;
  }

  private async getNoteText(noteId: string): Promise<string | null> {
    console.log(`Getting note text for ${noteId}`);
    // Implementation details...
    return `Note ${noteId}`;
  }

  /**
   * Gets text content for a standard
   * @param standardId The standard ID to get text for
   * @returns The standard description as a string, or null if not found
   */
  private async getStandardText(standardId: string): Promise<string | null> {
    console.log(`Getting standard text for ${standardId}`);
    
    // Basic descriptions for common standards
    const standardInfo: Record<string, { title: string, description: string }> = {
      '3000': {
        title: 'Electrical installations (known as the Australian/New Zealand Wiring Rules)',
        description: 'This Standard sets out requirements for the design, construction and verification of electrical installations, including the selection and installation of electrical equipment forming part of such installations.'
      },
      '2293.2': {
        title: 'Emergency lighting and exit signs for buildings',
        description: 'Specifies requirements for the periodic inspection and maintenance of emergency lighting and exit sign systems.'
      },
      '3001.1': {
        title: 'Electrical installations — Transportable structures and vehicles',
        description: 'Specifies the electrical installation requirements for transportable structures and vehicles.'
      },
      '3001.2': {
        title: 'Electrical installations — Transportable structures and vehicles',
        description: 'Sets out the electrical safety requirements for caravans, camping trailers, and relocatable homes.'
      },
      '3003': {
        title: 'Electrical installations — Patient areas',
        description: 'Sets out the requirements for electrical installations in hospitals, medical and dental practices, and dialyzing locations.'
      },
    };
    
    // Normalize standard ID by removing any year suffix
    const normalizedId = standardId.replace(/[-:]\d{4}$/, '');
    
    if (standardInfo[normalizedId]) {
      return `**AS/NZS ${normalizedId}** - ${standardInfo[normalizedId].title}\n\n${standardInfo[normalizedId].description}`;
    }
    
    return `Standard AS/NZS ${normalizedId}`;
  }

  /**
   * Gets text content for a reference of unknown type
   * @param reference The reference to get text for
   */
  private async getUnknownReferenceText(reference: string): Promise<string | null> {
    console.log(`Attempting to detect reference type for: ${reference}`);
    
    // Try each extraction pattern to see if it matches
    for (const [type, pattern] of Object.entries(this.regexExtractionPatterns)) {
      const match = reference.match(pattern);
      if (match && match[1]) {
        console.log(`Detected reference as type: ${type}, ID: ${match[1]}`);
        
        // Call the appropriate method based on detected type
        switch (type) {
          case 'clause': return this.getClauseText(match[1]);
          case 'figure': return this.getFigureText(match[1]);
          case 'table': return this.getTableText(match[1]);
          case 'appendix': return this.getAppendixText(match[1]);
          case 'note': return this.getNoteText(match[1]);
          case 'standard': return this.getStandardText(match[1]);
          default: return null;
        }
      }
    }
    
    // If no pattern matches, return null
    console.log(`No pattern matched for reference: ${reference}`);
    return null;
  }
}

// Export a singleton instance
export const referenceLoader = ReferenceLoader.getInstance(); 