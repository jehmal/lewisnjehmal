// Core reference types with industry-standard documentation
export type ReferenceType = 'clause' | 'figure' | 'table' | 'standard';

export type SourceType = 'direct' | 'extracted' | 'imported' | 'direct_file' | 'Standards Australia';

export interface ReferenceContext {
  currentStandard: string;
  currentVersion: string;
  depth: number;
  processingChain: string[];
  metadata: Record<string, any>;
}

export interface ReferenceMetadata {
  id: string;
  type: ReferenceType;
  standard: StandardReference;
  lastUpdated: number;
  formatVersion: string;
  source: 'direct' | 'extracted' | 'imported';
  validated: boolean;
  referenceChain: string[];
}

export interface ReferenceContent {
  id: string;
  title: string;
  text: string;
  type: string;
  metadata?: {
    lastUpdated?: number;
    formatVersion?: string;
    source?: string;
    validated?: boolean;
    referenceChain?: string[];
  };
  [key: string]: unknown;
}

export interface BaseReference extends ReferenceMetadata {
  content?: ReferenceContent;
  relatedReferences?: BaseReference[];
  referenceNumber: string;
  note?: string;
}

export interface ClauseContent extends ReferenceContent {
  type: 'clause';
  standard: StandardReference;
  relatedReferences?: BaseReference[];
  [key: string]: unknown;
}

export interface ClauseReference extends BaseReference {
  type: 'clause';
  title?: string;
  fullText?: string;
  content?: ClauseContent;
  relatedReferences?: BaseReference[];
  metadata?: ReferenceMetadata;
  note?: string;
}

export interface EnhancedClauseReference extends ClauseReference {
  id: string;
  referenceNumber: string;
  type: 'clause';
  title: string;
  fullText: string;
  standard: StandardReference;
  lastUpdated: number;
  formatVersion: string;
  source: 'direct' | 'extracted' | 'imported';
  validated: boolean;
  referenceChain: string[];
  note?: string;
}

export interface FigureReference extends BaseReference {
  type: 'figure';
  caption?: string;
  imagePath?: string;
}

export interface TableReference extends BaseReference {
  type: 'table';
  title?: string;
  content?: ReferenceContent;
}

// Standard version mapping
export const STANDARD_VERSIONS: Record<string, string> = {
  '3000': '2018',
  '3001.1': '2022',
  '3001.2': '2022',
  '3003': '2018',
  '2293.2': '2019'
};

// Context mapping for standards
export const STANDARD_CONTEXTS: Record<string, string[]> = {
  'wiring': ['3000', '3001.1', '3001.2'],
  'emergency': ['2293.2'],
  'installation': ['3000', '3003']
};

// Add ValidationState interface
export interface ValidationState {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  lastValidated: number;
  validatedBy: string;
}

// Add ValidationError interface
export interface ValidationError {
  code: string;
  message: string;
  severity: 'error' | 'warning' | 'critical';
  context?: Record<string, any>;
}

// Add ValidationWarning interface
export interface ValidationWarning {
  code: string;
  message: string;
  severity: 'warning';
  context?: Record<string, any>;
}

// Update the ReferenceError class
export class ReferenceError extends Error {
  constructor(
    message: string,
    public code: string,
    public context?: Record<string, any>
  ) {
    super(message);
    this.name = 'ReferenceError';
  }
}

// Validation result type
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// Standard document mappings
export const STANDARD_DOCUMENTS = {
  ASNZS3003: {
    id: 'ASNZS3003',
    version: '2018',
    name: 'Electrical installations - Patient areas',
    context: ['medical', 'patient', 'healthcare'] as const
  },
  ASNZS2293: {
    id: 'ASNZS2293.2',
    version: '2019',
    name: 'Emergency lighting and exit signs - Inspection and maintenance',
    context: ['emergency', 'lighting', 'maintenance'] as const
  },
  ASNZS3000: {
    id: 'ASNZS3000',
    version: '2018',
    name: 'Wiring Rules',
    context: ['general', 'wiring'] as const
  }
} as const;

// Reference relationship types
export type ReferenceRelationship = 'parent' | 'child' | 'related' | 'cross-reference';

export interface ReferenceRelationshipInfo {
  type: ReferenceRelationship;
  sourceStandard: string;
  targetStandard: string;
  description?: string;
}

export interface TreeViewElement {
  id: string;
  name: string;
  standardDoc?: string;
  isSelectable: boolean;
  children?: TreeViewElement[];
}

export interface StandardReference {
  id: string;
  name: string;
  version: string;
}

export type StandardReferenceOrUndefined = StandardReference | undefined; 