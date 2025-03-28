import { BaseReference, ClauseReference, FigureReference, TableReference } from '@/types/references';
import { standardDetector } from './standard-detector';

interface ExtractionResult {
  references: BaseReference[];
  errors: string[];
}

export class ReferenceExtractor {
  private static instance: ReferenceExtractor;

  // Regex patterns for different reference types
  private readonly CLAUSE_PATTERN = /(?:Clause|Section|Part)\s+(\d+(?:\.\d+)*)/gi;
  private readonly FIGURE_PATTERN = /Figure\s+(\d+(?:\.\d+)*)/gi;
  private readonly TABLE_PATTERN = /Table\s+([A-Z]?\d+(?:\.\d+)*)/gi;
  private readonly STANDARD_PATTERN = /(?:AS\/NZS|AS|NZS)\s*(\d{4}(?:\.\d+)?)/gi;

  private constructor() {}

  public static getInstance(): ReferenceExtractor {
    if (!ReferenceExtractor.instance) {
      ReferenceExtractor.instance = new ReferenceExtractor();
    }
    return ReferenceExtractor.instance;
  }

  /**
   * Extracts all references from the given text
   */
  public extractReferences(text: string, contextStandard?: string): ExtractionResult {
    const references: BaseReference[] = [];
    const errors: string[] = [];

    // Extract standards first
    const standards = this.extractStandards(text);
    const defaultStandard = contextStandard || (standards.length === 1 ? standards[0] : null);

    // Extract clauses
    this.extractClauses(text, defaultStandard, references, errors);

    // Extract figures
    this.extractFigures(text, defaultStandard, references, errors);

    // Extract tables
    this.extractTables(text, defaultStandard, references, errors);

    return { references, errors };
  }

  /**
   * Extracts standard IDs from text
   */
  private extractStandards(text: string): string[] {
    const standards = new Set<string>();
    let match;

    while ((match = this.STANDARD_PATTERN.exec(text)) !== null) {
      const standardId = match[1].replace(/\./g, '');
      if (standardDetector.isValidStandard(standardId)) {
        standards.add(standardId);
      }
    }

    return Array.from(standards);
  }

  /**
   * Extracts clause references
   */
  private extractClauses(
    text: string,
    defaultStandard: string | null,
    references: BaseReference[],
    errors: string[]
  ): void {
    let match;
    while ((match = this.CLAUSE_PATTERN.exec(text)) !== null) {
      const referenceNumber = match[1];
      const contextStart = Math.max(0, match.index - 50);
      const contextEnd = Math.min(text.length, match.index + 50);
      const context = text.slice(contextStart, contextEnd);

      // Try to find standard ID in nearby context
      const standardMatch = context.match(this.STANDARD_PATTERN);
      const standardId = standardMatch ? standardMatch[1].replace(/\./g, '') : defaultStandard;

      if (!standardId) {
        errors.push(`Could not determine standard for clause ${referenceNumber}`);
        continue;
      }

      if (!standardDetector.isValidStandard(standardId)) {
        errors.push(`Invalid standard ${standardId} for clause ${referenceNumber}`);
        continue;
      }

      references.push({
        id: referenceNumber,
        type: 'clause',
        standard: {
          id: standardId,
          name: '', // Will be filled by the loader
          version: standardDetector.getLatestVersion(standardId) || '2018' // Default to 2018 if undefined
        },
        referenceNumber,
        title: '',
        fullText: '',
        relatedReferences: [],
        lastUpdated: Date.now(),
        formatVersion: '1.0',
        source: 'extracted',
        validated: false,
        referenceChain: []
      } as ClauseReference);
    }
  }

  /**
   * Extracts figure references
   */
  private extractFigures(
    text: string,
    defaultStandard: string | null,
    references: BaseReference[],
    errors: string[]
  ): void {
    let match;
    while ((match = this.FIGURE_PATTERN.exec(text)) !== null) {
      const referenceNumber = match[1];
      const contextStart = Math.max(0, match.index - 50);
      const contextEnd = Math.min(text.length, match.index + 50);
      const context = text.slice(contextStart, contextEnd);

      const standardMatch = context.match(this.STANDARD_PATTERN);
      const standardId = standardMatch ? standardMatch[1].replace(/\./g, '') : defaultStandard;

      if (!standardId) {
        errors.push(`Could not determine standard for figure ${referenceNumber}`);
        continue;
      }

      if (!standardDetector.isValidStandard(standardId)) {
        errors.push(`Invalid standard ${standardId} for figure ${referenceNumber}`);
        continue;
      }

      references.push({
        id: referenceNumber,
        type: 'figure',
        standard: {
          id: standardId,
          name: '', // Will be filled by the loader
          version: standardDetector.getLatestVersion(standardId) || '2018' // Default to 2018 if undefined
        },
        referenceNumber,
        caption: '',
        imagePath: '',
        lastUpdated: Date.now(),
        formatVersion: '1.0',
        source: 'extracted',
        validated: false,
        referenceChain: []
      } as FigureReference);
    }
  }

  /**
   * Extracts table references
   */
  private extractTables(
    text: string,
    defaultStandard: string | null,
    references: BaseReference[],
    errors: string[]
  ): void {
    let match;
    while ((match = this.TABLE_PATTERN.exec(text)) !== null) {
      const referenceNumber = match[1];
      const contextStart = Math.max(0, match.index - 50);
      const contextEnd = Math.min(text.length, match.index + 50);
      const context = text.slice(contextStart, contextEnd);

      const standardMatch = context.match(this.STANDARD_PATTERN);
      const standardId = standardMatch ? standardMatch[1].replace(/\./g, '') : defaultStandard;

      if (!standardId) {
        errors.push(`Could not determine standard for table ${referenceNumber}`);
        continue;
      }

      if (!standardDetector.isValidStandard(standardId)) {
        errors.push(`Invalid standard ${standardId} for table ${referenceNumber}`);
        continue;
      }

      references.push({
        id: referenceNumber,
        type: 'table',
        standard: {
          id: standardId,
          name: '', // Will be filled by the loader
          version: standardDetector.getLatestVersion(standardId) || '2018' // Default to 2018 if undefined
        },
        referenceNumber,
        title: '',
        content: {
          id: referenceNumber,
          title: '',
          text: '',
          type: 'table'
        },
        lastUpdated: Date.now(),
        formatVersion: '1.0',
        source: 'extracted',
        validated: false,
        referenceChain: []
      } as TableReference);
    }
  }
}

// Export singleton instance
export const referenceExtractor = ReferenceExtractor.getInstance(); 