import { StandardReference } from './types/references';

export class ReferenceParser {
  private static readonly STANDARD_PATTERN = /AS\/NZS\s*(\d{4}(?:\.\d+)?(?:-\d{4})?)/i;
  private static readonly CLAUSE_PATTERN = /Clause\s+(\d+(?:\.\d+)*)/i;
  private static readonly CROSS_REFERENCE_PATTERN = /AS\/NZS\s*(\d{4}(?:\.\d+)?(?:-\d{4})?)\s+Clause\s+(\d+(?:\.\d+)*)/gi;
  private static readonly LIST_ITEM_PATTERN = /^[a-z]\)|^\([a-z]\)|^\([i|v]+\)|^\d+\)/i;
  private static readonly STANDARD_NUMBER_PATTERN = /AS\/NZS\s*(3000|3001|3003|3004|3010|3012|3017|3019|3760|3820|4509|4777|4836|5033|5139)/i;
  private static readonly FIGURE_PATTERN = /Figure\s+(\d+(?:\.\d+)*)/i;

  static parseReferences(text: string, currentStandard?: string): StandardReference[] {
    if (!text) {
      console.log('No text provided for reference parsing');
      return [];
    }

    console.log('Parsing references with current standard:', currentStandard);
    const references: StandardReference[] = [];

    // First try to find explicit cross-references
    const crossRefs = this.parseCrossReferences(text);
    references.push(...crossRefs);

    // If we have a current standard, look for internal references
    if (currentStandard) {
      console.log('Looking for internal references in standard:', currentStandard);
      const internalRefs = this.parseInternalReferences(text);
      console.log('Found internal references:', internalRefs);
      
      references.push(...internalRefs.map(ref => ({
        standardId: currentStandard,
        clauseId: ref
      })));

      // Look for figure references
      const figureRefs = this.parseFigureReferences(text);
      console.log('Found figure references:', figureRefs);
      
      references.push(...figureRefs.map(ref => ({
        standardId: currentStandard,
        clauseId: ref
      })));
    }

    console.log('Final references:', references);
    return references;
  }

  private static parseCrossReferences(text: string): StandardReference[] {
    const references: StandardReference[] = [];
    let match;

    // Reset lastIndex to ensure we start from the beginning
    this.CROSS_REFERENCE_PATTERN.lastIndex = 0;

    while ((match = this.CROSS_REFERENCE_PATTERN.exec(text)) !== null) {
      const standardId = match[1];
      const clauseId = match[2];
      
      if (this.isValidReference(standardId, clauseId)) {
        console.log('Found cross-reference:', { standardId, clauseId });
        references.push({
          standardId,
          clauseId
        });
      }
    }

    return references;
  }

  static parseInternalReferences(text: string): string[] {
    if (!text) {
      console.log('No text provided for internal reference parsing');
      return [];
    }

    const clauseIds: string[] = [];
    let match;

    // Split text into lines to better handle context
    const lines = text.split('\n');

    for (const line of lines) {
      // Skip empty lines and list items
      if (!line.trim() || this.LIST_ITEM_PATTERN.test(line.trim())) {
        continue;
      }

      // Skip lines that contain standard references
      if (this.STANDARD_NUMBER_PATTERN.test(line)) {
        continue;
      }

      // Reset lastIndex to ensure we start from the beginning of each line
      this.CLAUSE_PATTERN.lastIndex = 0;

      // Look for clause references in the current line
      while ((match = this.CLAUSE_PATTERN.exec(line)) !== null) {
        const clauseId = match[1];
        if (clauseId && this.isValidClauseId(clauseId)) {
          console.log('Found internal clause reference:', clauseId);
          clauseIds.push(clauseId);
        }
      }
    }

    return [...new Set(clauseIds)]; // Remove duplicates
  }

  private static parseFigureReferences(text: string): string[] {
    if (!text) return [];

    const figureIds: string[] = [];
    let match;

    // Reset lastIndex to ensure we start from the beginning
    this.FIGURE_PATTERN.lastIndex = 0;

    while ((match = this.FIGURE_PATTERN.exec(text)) !== null) {
      const figureId = match[1];
      if (figureId && this.isValidFigureId(figureId)) {
        console.log('Found figure reference:', figureId);
        figureIds.push(figureId);
      }
    }

    return [...new Set(figureIds)]; // Remove duplicates
  }

  private static isValidReference(standardId: string, clauseId: string): boolean {
    if (!standardId || !clauseId) return false;
    
    // Validate standard ID format
    if (!/^\d{4}(?:\.\d+)?(?:-\d{4})?$/.test(standardId)) {
      console.log('Invalid standard ID format:', standardId);
      return false;
    }

    // Validate clause ID format
    if (!this.isValidClauseId(clauseId)) {
      console.log('Invalid clause ID format:', clauseId);
      return false;
    }

    return true;
  }

  private static isValidClauseId(clauseId: string): boolean {
    if (!clauseId) return false;

    // Must be a valid clause number format (e.g., "1.2.3")
    if (!/^\d+(?:\.\d+)*$/.test(clauseId)) {
      return false;
    }

    // Must not be a single digit (like "1" in "NOTE 1")
    if (/^\d+$/.test(clauseId)) {
      return false;
    }

    // Must not be a year (like "2018" or "2022")
    if (/^20\d{2}$/.test(clauseId)) {
      return false;
    }

    // Must not be a standard number (like "3000" or "3003")
    if (/^3000|3001|3003|3004|3010|3012|3017|3019|3760|3820|4509|4777|4836|5033|5139/.test(clauseId)) {
      return false;
    }

    return true;
  }

  private static isValidFigureId(figureId: string): boolean {
    if (!figureId) return false;

    // Must be a valid figure number format (e.g., "1.2.3")
    if (!/^\d+(?:\.\d+)*$/.test(figureId)) {
      return false;
    }

    return true;
  }

  static extractStandardId(text: string): string | null {
    if (!text) return null;
    const match = text.match(this.STANDARD_PATTERN);
    return match ? match[1] : null;
  }

  static isStandardReference(text: string): boolean {
    if (!text) return false;
    return this.STANDARD_PATTERN.test(text) || 
           /AS\/NZS\s*\d{4}(?:\.\d+)?(?:-\d{4})?/.test(text);
  }

  static formatReference(reference: StandardReference): string {
    return `AS/NZS ${reference.standardId} Clause ${reference.clauseId}`;
  }
} 