import { STANDARD_VERSIONS, STANDARD_CONTEXTS, StandardReference } from '@/types/references';

interface StandardDetectionResult {
  standardId: string;
  version: string;
  confidence: number;
  context?: string[];
  metadata: {
    isExplicitReference: boolean;
    matchedPattern?: string;
    contextKeywords?: string[];
  };
}

interface StandardPattern {
  pattern: RegExp;
  weight: number;
  extractStandardId: (match: RegExpMatchArray) => string;
  extractVersion?: (match: RegExpMatchArray) => string | undefined;
}

export class StandardDetector {
  private static instance: StandardDetector;
  private standardPatterns: StandardPattern[];
  
  private constructor() {
    this.standardPatterns = [
      // AUSNZ prefix format
      {
        pattern: /AUSNZ:(\d{4}(?:\.\d)?)/gi,
        weight: 1.0,
        extractStandardId: (match) => match[1]
      },
      // Explicit standard references with version
      {
        pattern: /(?:AS\/NZS|AS|NZS)\s+(\d{4}(?:\.\d)?)-(\d{4})/gi,
        weight: 0.9,
        extractStandardId: (match) => match[1],
        extractVersion: (match) => match[2]
      },
      // Add specific pattern for AS/NZS 3019-2022
      {
        pattern: /(?:AS\/NZS|AS|NZS)\s*3019(?:\s*[:-]\s*2022)?/gi,
        weight: 1.0,
        extractStandardId: () => '3019',
        extractVersion: () => '2022'
      },
      // Standard references without version
      {
        pattern: /(?:AS\/NZS|AS|NZS)\s+(\d{4}(?:\.\d)?)/gi,
        weight: 0.8,
        extractStandardId: (match) => match[1]
      },
      // ASNZS format
      {
        pattern: /ASNZS(\d{4}(?:\.\d)?)/gi,
        weight: 0.7,
        extractStandardId: (match) => match[1]
      }
    ];
  }

  public static getInstance(): StandardDetector {
    if (!StandardDetector.instance) {
      StandardDetector.instance = new StandardDetector();
    }
    return StandardDetector.instance;
  }

  /**
   * Detects standards referenced in the given text with confidence levels
   * @param text - The text to analyze
   * @param contextKeywords - Optional array of context keywords to help with detection
   */
  public detectStandards(text: string, contextKeywords?: string[]): StandardDetectionResult[] {
    const results = new Map<string, StandardDetectionResult>();

    // Check explicit references first
    for (const pattern of this.standardPatterns) {
      let match;
      while ((match = pattern.pattern.exec(text)) !== null) {
        const standardId = pattern.extractStandardId(match);
        const version = pattern.extractVersion?.(match) || STANDARD_VERSIONS[standardId] || 'latest';
        
        const result: StandardDetectionResult = {
          standardId,
          version,
          confidence: pattern.weight,
          metadata: {
            isExplicitReference: true,
            matchedPattern: match[0]
          }
        };

        // Update result if we already have one with lower confidence
        const existing = results.get(standardId);
        if (!existing || existing.confidence < result.confidence) {
          results.set(standardId, result);
        }
      }
    }

    // Check context keywords if provided
    if (contextKeywords?.length) {
      this.enhanceWithContextKeywords(results, contextKeywords);
    }

    return Array.from(results.values())
      .sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Enhances detection results with context keywords
   */
  private enhanceWithContextKeywords(
    results: Map<string, StandardDetectionResult>,
    keywords: string[]
  ): void {
    for (const [context, standards] of Object.entries(STANDARD_CONTEXTS)) {
      const matchingKeywords = keywords.filter(keyword => 
        keyword.toLowerCase().includes(context.toLowerCase())
      );

      if (matchingKeywords.length > 0) {
        for (const standardId of standards) {
          const existing = results.get(standardId);
          if (existing) {
            existing.confidence = Math.min(1.0, existing.confidence + 0.2);
            existing.context = existing.context || [];
            existing.context.push(context);
            existing.metadata = {
              isExplicitReference: existing.metadata.isExplicitReference,
              matchedPattern: existing.metadata.matchedPattern,
              contextKeywords: matchingKeywords
            };
          } else {
            results.set(standardId, {
              standardId,
              version: STANDARD_VERSIONS[standardId] || 'latest',
              confidence: 0.5,
              context: [context],
              metadata: {
                isExplicitReference: false,
                contextKeywords: matchingKeywords
              }
            });
          }
        }
      }
    }
  }

  /**
   * Validates if a standard reference is valid
   */
  public isValidStandard(standardId: string, version?: string): boolean {
    if (!standardId) return false;

    // Check if standard exists in our version mapping
    if (standardId in STANDARD_VERSIONS) {
      // If version is provided, check if it matches
      if (version && version !== STANDARD_VERSIONS[standardId]) {
        return false;
      }
      return true;
    }

    return false;
  }

  /**
   * Gets the latest version for a standard
   */
  public getLatestVersion(standardId: string): string | undefined {
    return STANDARD_VERSIONS[standardId];
  }

  /**
   * Gets all standards related to a specific context
   */
  public getStandardsByContext(context: string): string[] {
    return STANDARD_CONTEXTS[context.toLowerCase()] || [];
  }

  /**
   * Detects which standard a clause belongs to based on its format
   * @param clauseId - The clause identifier
   * @param context - Optional context text that may help identify the standard
   * @returns The detected standard ID or undefined if unknown
   */
  public detectStandardFromClause(clauseId: string, context?: string): string | null {
    if (!clauseId) return null;
    
    // Add debug logging for 3019 detection
    if (context?.toLowerCase().includes('periodic verification') || 
        context?.toLowerCase().includes('inspection') ||
        context?.toLowerCase().includes('3019')) {
      console.log('Context suggests AS/NZS 3019');
    }
    
    // Special cases based on clause IDs
    if (clauseId.startsWith('2.10.')) {
      return '3000';
    }
    
    // Special case for AS/NZS 3019-2022
    if (clauseId.startsWith('6.3.') || 
        (context && (
          context.toLowerCase().includes('periodic verification') ||
          context.toLowerCase().includes('inspection') ||
          context.toLowerCase().includes('3019')
        ))) {
      console.log(`Detected clause ${clauseId} as related to periodic verification, assigning to 3019`);
      return '3019';
    }
    
    // Special case for hazardous areas related to LP Gas in 3001.2
    if (clauseId === '1.4.12' ||
        (context && (
          (context.includes('LP Gas') || context.includes('LPG') || context.includes('gas cylinder')) &&
          (context.includes('hazardous area') || context.includes('hazardous zone'))
        ))) {
      return '3001.2';
    }
    
    // If we have context, use it for detection
    if (context) {
      const normalizedContext = context.toLowerCase();
      
      // Check context first - this should take precedence
      if (normalizedContext.includes('3001') || 
          normalizedContext.includes('caravan') || 
          normalizedContext.includes('vehicle') || 
          normalizedContext.includes('transportable')) {
        return normalizedContext.includes('3001.2') ? '3001.2' : '3001.1';
      }
      if (normalizedContext.includes('3000') || normalizedContext.includes('wiring rules')) {
        return '3000';
      }
      if (normalizedContext.includes('2293') || normalizedContext.includes('emergency lighting')) {
        return '2293.2';
      }
      if (normalizedContext.includes('3003') || normalizedContext.includes('patient') || 
          normalizedContext.includes('hospital') || normalizedContext.includes('medical')) {
        return '3003';
      }
      if (normalizedContext.includes('5033') || 
          normalizedContext.includes('solar') || 
          normalizedContext.includes('pv') || 
          normalizedContext.includes('photovoltaic')) {
        return '5033';
      }
    }
    
    // Handle specific clause IDs that exist in multiple standards
    if (clauseId === '2.1' || clauseId === '2.1.1' || clauseId === '2.1.2') {
      if (context && (context.toLowerCase().includes('caravan') || 
          context.toLowerCase().includes('3001') ||
          context.toLowerCase().includes('vehicle') ||
          context.toLowerCase().includes('transportable'))) {
        return '3001.1';
      }
      return '2293.2';
    }
    
    // Clauses for AS/NZS 3001.1 or 3001.2 (caravan & transportable structures)
    if (clauseId.match(/^[A-Z]\d+/) || 
        (clauseId.toLowerCase().includes('caravan') || 
        clauseId.toLowerCase().includes('vehicle'))) {
      return '3001.1';
    }
    
    // Clauses for AS/NZS A4.4.5.X (solar PV systems)
    if (clauseId.startsWith('4.4.5.')) {
      return '5033';
    }
    
    // Clauses for AS/NZS 2293.2 (emergency lighting)
    if (clauseId.startsWith('2.') && 
        clauseId.length <= 6 && 
        !(context && (context.toLowerCase().includes('caravan') || 
                     context.toLowerCase().includes('3001')))) {
      return '2293.2';
    }
    
    // Clauses for AS/NZS 3000 (general wiring rules)
    if (clauseId.match(/^[1-9]\.\d+(\.\d+)*$/) && 
        !clauseId.startsWith('2.')) {
      return '3000';
    }
    
    // Clauses for AS/NZS 3003 (patient areas)
    if (clauseId.toLowerCase().includes('patient') || 
        clauseId.toLowerCase().includes('hospital')) {
      return '3003';
    }
    
    return '3000';
  }
}

// Export a singleton instance
export const standardDetector = StandardDetector.getInstance(); 