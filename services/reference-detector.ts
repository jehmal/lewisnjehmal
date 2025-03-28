import { BaseReference, ClauseReference, FigureReference, TableReference } from '@/types/references';
import { standardDetector } from './standard-detector';
import { clauseLoader } from './clause-loader';

/**
 * Service to detect and extract references from text
 */
export class ReferenceDetector {
  private static instance: ReferenceDetector;
  
  private constructor() {
    console.log('ReferenceDetector initialized');
  }
  
  public static getInstance(): ReferenceDetector {
    if (!ReferenceDetector.instance) {
      ReferenceDetector.instance = new ReferenceDetector();
    }
    return ReferenceDetector.instance;
  }
  
  /**
   * Detect standard clauses in text
   */
  public detectStandardClauses(text: string): BaseReference[] {
    const references: BaseReference[] = [];
    
    // Pattern 1: ASNZS3000 clause 2.1.3
    const fullReferencePattern = /ASNZS(\d{4}(?:\.\d+)?)\s+(?:clause|section)\s+(\d+(?:\.\d+)*)/gi;
    let match: RegExpExecArray | null;
    
    while ((match = fullReferencePattern.exec(text)) !== null) {
      const standardId = match[1];
      const clauseNumber = match[2];
      
      const standardDefinition = clauseLoader.getStandardDefinition(standardId);
      if (!standardDefinition) continue;
      
      references.push({
        id: clauseNumber,
        referenceNumber: clauseNumber,
        type: 'clause',
        standard: {
          id: standardId,
          name: standardDefinition.name,
          version: standardDefinition.version
        },
        lastUpdated: Date.now(),
        formatVersion: '1.0',
        source: 'direct',
        validated: false,
        referenceChain: []
      });
    }
    
    // Pattern 2: Clause 2.1.3 (with context-specific standard)
    // This requires context from the calling code
    
    return references;
  }
  
  /**
   * Detect references in text with context awareness
   */
  public detectReferencesWithContext(text: string, contextStandardId: string): BaseReference[] {
    const references = this.detectStandardClauses(text);
    
    // Now detect contextual references (clauses without explicit standard)
    const clausePattern = /(?:clause|section)\s+(\d+(?:\.\d+)*)/gi;
    let match: RegExpExecArray | null;
    
    // Skip if no context standard
    if (!contextStandardId) return references;
    
    const standardDefinition = clauseLoader.getStandardDefinition(contextStandardId);
    if (!standardDefinition) return references;
    
    while ((match = clausePattern.exec(text)) !== null) {
      const clauseNumber = match[1];
      
      // Check if this is already in our references list (from full references)
      const exists = references.some(ref => 
        ref.referenceNumber === clauseNumber && 
        ref.standard?.id === contextStandardId
      );
      
      if (!exists) {
        references.push({
          id: clauseNumber,
          referenceNumber: clauseNumber,
          type: 'clause',
          standard: {
            id: contextStandardId,
            name: standardDefinition.name,
            version: standardDefinition.version
          },
          lastUpdated: Date.now(),
          formatVersion: '1.0',
          source: 'direct',
          validated: false,
          referenceChain: []
        });
      }
    }
    
    return references;
  }
  
  /**
   * Parse a reference string into a structured object
   */
  public parseReferenceString(referenceString: string): BaseReference | null {
    // Try standard-clause format: ASNZS3000 clause 2.1.3
    const standardMatch = referenceString.match(/ASNZS(\d{4}(?:\.\d+)?)\s+(?:clause|section)\s+(\d+(?:\.\d+)*)/i);
    
    if (standardMatch) {
      const standardId = standardMatch[1];
      const clauseNumber = standardMatch[2];
      
      const standardDefinition = clauseLoader.getStandardDefinition(standardId);
      if (!standardDefinition) return null;
      
      return {
        id: clauseNumber,
        referenceNumber: clauseNumber,
        type: 'clause',
        standard: {
          id: standardId,
          name: standardDefinition.name,
          version: standardDefinition.version
        },
        lastUpdated: Date.now(),
        formatVersion: '1.0',
        source: 'direct',
        validated: false,
        referenceChain: []
      };
    }
    
    // Try standalone clause format: Clause 2.1.3
    const clauseMatch = referenceString.match(/(?:clause|section)\s+(\d+(?:\.\d+)*)/i);
    
    if (clauseMatch) {
      const clauseNumber = clauseMatch[1];
      
      // Try to detect standard from clause pattern
      const standardId = clauseLoader.detectStandardFromClausePattern(clauseNumber);
      const standardDefinition = clauseLoader.getStandardDefinition(standardId);
      
      if (!standardDefinition) return null;
      
      return {
        id: clauseNumber,
        referenceNumber: clauseNumber,
        type: 'clause',
        standard: {
          id: standardId,
          name: standardDefinition.name,
          version: standardDefinition.version
        },
        lastUpdated: Date.now(),
        formatVersion: '1.0',
        source: 'direct',
        validated: false,
        referenceChain: []
      };
    }
    
    // Try just a clause number: 2.1.3
    const numberMatch = referenceString.match(/^(\d+(?:\.\d+)*)$/);
    
    if (numberMatch) {
      const clauseNumber = numberMatch[1];
      
      // Try to detect standard from clause pattern
      const standardId = clauseLoader.detectStandardFromClausePattern(clauseNumber);
      const standardDefinition = clauseLoader.getStandardDefinition(standardId);
      
      if (!standardDefinition) return null;
      
      return {
        id: clauseNumber,
        referenceNumber: clauseNumber,
        type: 'clause',
        standard: {
          id: standardId,
          name: standardDefinition.name,
          version: standardDefinition.version
        },
        lastUpdated: Date.now(),
        formatVersion: '1.0',
        source: 'direct',
        validated: false,
        referenceChain: []
      };
    }
    
    return null;
  }

  /**
   * Detects all references in the given text
   * @param text - The text to analyze
   * @param contextStandard - Optional standard ID to provide context
   */
  public detectReferences(text: string, contextStandard?: string): BaseReference[] {
    const references: BaseReference[] = [];
    
    // First detect standards in the text
    const detectedStandards = standardDetector.detectStandards(text);
    const contextKeywords = this.extractContextKeywords(text);
    
    // If we have a context standard but it wasn't detected, add it
    if (contextStandard && !detectedStandards.some(s => s.standardId === contextStandard)) {
      const version = standardDetector.getLatestVersion(contextStandard);
      if (version) {
        detectedStandards.push({
          standardId: contextStandard,
          version,
          confidence: 0.7,
          metadata: {
            isExplicitReference: false
          }
        });
      }
    }

    // Process each detected standard
    for (const standard of detectedStandards) {
      // Detect clauses
      const clauses = this.detectClauseReferences(text, standard.standardId, standard.version);
      references.push(...clauses);

      // Detect figures
      const figures = this.detectFigureReferences(text, standard.standardId, standard.version);
      references.push(...figures);

      // Detect tables
      const tables = this.detectTableReferences(text, standard.standardId, standard.version);
      references.push(...tables);
    }

    return this.deduplicateReferences(references);
  }

  /**
   * Detects clause references for a specific standard
   */
  private detectClauseReferences(text: string, standardId: string, version: string): ClauseReference[] {
    const references: ClauseReference[] = [];
    const patterns = [
      // Clause X.X.X
      /Clause\s+(\d+(?:\.\d+)*)/gi,
      // Section X.X.X
      /Section\s+(\d+(?:\.\d+)*)/gi,
      // Just X.X.X when in clear clause context
      /(?<=\bclause\s+(?:\d+(?:\.\d+)*,\s*)*)\d+(?:\.\d+)*/gi
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const clauseId = match[1];
        
        // Skip if it's just a standard version number
        if (clauseId === version) continue;

        references.push({
          id: clauseId,
          type: 'clause',
          standard: {
            id: standardId,
            name: '', // Will be filled by the loader
            version: version
          },
          lastUpdated: Date.now(),
          formatVersion: '1.0',
          source: 'extracted',
          validated: false,
          referenceChain: [],
          referenceNumber: clauseId,
          title: '', // Will be filled by the loader
          fullText: '', // Will be filled by the loader
          relatedReferences: []
        });
      }
    }

    return references;
  }

  /**
   * Detects figure references for a specific standard
   */
  private detectFigureReferences(text: string, standardId: string, version: string): FigureReference[] {
    const references: FigureReference[] = [];
    const patterns = [
      // Figure X.X
      /Figure\s+(\d+(?:\.\d+)*)/gi,
      // Fig. X.X
      /Fig\.\s+(\d+(?:\.\d+)*)/gi
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        references.push({
          id: match[1],
          type: 'figure',
          standard: {
            id: standardId,
            name: '', // Will be filled by the loader
            version: version
          },
          lastUpdated: Date.now(),
          formatVersion: '1.0',
          source: 'extracted',
          validated: false,
          referenceChain: [],
          referenceNumber: match[1],
          caption: '', // Will be filled by the loader
          imagePath: '' // Will be filled by the loader
        });
      }
    }

    return references;
  }

  /**
   * Detects table references for a specific standard
   */
  private detectTableReferences(text: string, standardId: string, version: string): TableReference[] {
    const references: TableReference[] = [];
    const patterns = [
      // Table X.X
      /Table\s+([A-Za-z0-9][._][0-9](?:[._][0-9])?)/gi,
      // Table X.X in clear table context
      /(?<=\btable\s+(?:[A-Za-z0-9][._][0-9](?:[._][0-9])?,\s*)*)[A-Za-z0-9][._][0-9](?:[._][0-9])?/gi
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        references.push({
          id: match[1],
          type: 'table',
          standard: {
            id: standardId,
            name: '', // Will be filled by the loader
            version: version
          },
          lastUpdated: Date.now(),
          formatVersion: '1.0',
          source: 'extracted',
          validated: false,
          referenceChain: [],
          referenceNumber: match[1],
          title: '', // Will be filled by the loader
          content: {
            id: match[1],
            title: '',
            text: '',
            type: 'table'
          }
        });
      }
    }

    return references;
  }

  /**
   * Extracts context keywords from text
   */
  private extractContextKeywords(text: string): string[] {
    const keywords = new Set<string>();
    
    // Add common electrical context keywords
    const contextPatterns = [
      /\b(?:medical|patient|healthcare)\b/gi,
      /\b(?:emergency|lighting|exit)\b/gi,
      /\b(?:construction|building|site)\b/gi,
      /\b(?:solar|pv|photovoltaic)\b/gi,
      /\b(?:battery|storage|energy)\b/gi,
      /\b(?:verification|testing|inspection)\b/gi,
      /\b(?:equipment|appliance|device)\b/gi,
      /\b(?:transportable|portable|mobile)\b/gi,
      /\b(?:grid|network|supply)\b/gi,
      /\b(?:standalone|off-grid|isolated)\b/gi,
      /\b(?:periodic|maintenance|service)\b/gi
    ];

    for (const pattern of contextPatterns) {
      const matches = text.match(pattern) || [];
      matches.forEach(match => keywords.add(match.toLowerCase()));
    }

    return Array.from(keywords);
  }

  /**
   * Removes duplicate references
   */
  private deduplicateReferences(refs: BaseReference[]): BaseReference[] {
    const seen = new Set<string>();
    return refs.filter(ref => {
      const key = `${ref.standard.id}-${ref.type}-${ref.referenceNumber}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
}

// Export singleton instance
export const referenceDetector = ReferenceDetector.getInstance(); 