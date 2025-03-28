import { ClauseContent, ReferenceContext, StandardReference } from '@/types/references';
import { getClause } from './ausnzClauses';

interface LoaderReference {
  standardId: string;
  clauseId: string;
}

export class ClauseReferenceLoader {
  private static instance: ClauseReferenceLoader;
  private loadedClauses: Map<string, ClauseContent> = new Map();
  private standardDocuments: Map<string, string> = new Map([
    ['2293.2', '2293.2-2019'],
    ['3000', '3000-2018'],
    ['3001.1', '3001.1-2022'],
    ['3001.2', '3001.2-2022']
  ]);

  private constructor() {}

  public static getInstance(): ClauseReferenceLoader {
    if (!ClauseReferenceLoader.instance) {
      ClauseReferenceLoader.instance = new ClauseReferenceLoader();
    }
    return ClauseReferenceLoader.instance;
  }

  private getCacheKey(reference: LoaderReference): string {
    return `${reference.standardId}:${reference.clauseId}`;
  }

  private getStandardDirectory(standardId: string): string {
    // Remove any prefix like AUSNZ:
    const cleanStandardId = standardId.replace(/^[A-Z]+:/, '');
    
    // Get the base standard number (e.g., "2293.2" from "2293.2-2019")
    const baseStandard = cleanStandardId.split('-')[0];
    
    // Get the full standard directory from the map
    const standardDir = this.standardDocuments.get(baseStandard);
    
    if (standardDir) {
      console.log(`Found standard directory: ${standardDir} for ${standardId}`);
      return standardDir;
    }

    // Default to 3000-2018 if not found
    console.log(`No standard directory found for ${standardId}, using default: 3000-2018`);
    return '3000-2018';
  }

  public async loadClause(reference: StandardReference): Promise<ReferenceResult> {
    const loaderRef: LoaderReference = {
      standardId: reference.id,
      clauseId: reference.name
    };
    return this.loadClauseContent(loaderRef);
  }

  public async loadClausesBatch(references: StandardReference[]): Promise<ReferenceResult[]> {
    const loaderRefs = references.map(ref => ({
      standardId: ref.id,
      clauseId: ref.name
    }));
    return Promise.all(loaderRefs.map(ref => this.loadClauseContent(ref)));
  }

  private async loadClauseContent(reference: LoaderReference): Promise<ReferenceResult> {
    try {
      // Check if the clause exists in the index
      const exists = await this.clauseExists(reference);
      if (!exists) {
        throw new Error(`Clause ${reference.clauseId} not found in standard ${reference.standardId}`);
      }

      // Try to load from cache first
      const cacheKey = this.getCacheKey(reference);
      if (this.loadedClauses.has(cacheKey)) {
        return {
          content: this.loadedClauses.get(cacheKey)!,
          context: {
            currentStandard: reference.standardId,
            currentVersion: this.standardDocuments.get(reference.standardId)?.split('-')[1] || '2018',
            depth: 0,
            processingChain: [],
            metadata: {}
          }
        };
      }

      // Get the correct standard directory
      const standardDir = this.getStandardDirectory(reference.standardId);
      
      // Load the clause using the appropriate loader
      const content = await getClause(standardDir, reference.clauseId);
      
      if (!content) {
        throw new Error(`Clause ${reference.clauseId} not found in standard ${reference.standardId}`);
      }

      // Cache the result
      this.loadedClauses.set(cacheKey, content);
      
      return {
        content,
        context: {
          currentStandard: reference.standardId,
          currentVersion: this.standardDocuments.get(reference.standardId)?.split('-')[1] || '2018',
          depth: 0,
          processingChain: [],
          metadata: {}
        }
      };
    } catch (error) {
      console.error(`Error loading clause ${reference.clauseId}:`, error);
      return {
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        content: {
          id: reference.clauseId,
          title: '',
          text: '',
          type: 'clause',
          fullText: '',
          standard: {
            id: reference.standardId,
            name: `AS/NZS ${reference.standardId}`,
            version: this.standardDocuments.get(reference.standardId)?.split('-')[1] || '2018'
          },
          references: { documents: [], sections: [] },
          subsections: {},
          requirements: []
        },
        context: {
          currentStandard: reference.standardId,
          currentVersion: this.standardDocuments.get(reference.standardId)?.split('-')[1] || '2018',
          depth: 0,
          processingChain: [],
          metadata: {}
        }
      };
    }
  }

  public async clauseExists(reference: LoaderReference): Promise<boolean> {
    try {
      // Get the correct standard directory
      const standardDir = this.getStandardDirectory(reference.standardId);
      
      // Normalize the clause ID
      const normalizedClauseId = reference.clauseId.replace(/^[A-Z]+:/, ''); // Remove any prefix like AUSNZ:

      console.log(`Checking if clause ${normalizedClauseId} exists in standard ${standardDir}`);

      // Try to import the index file for the standard
      try {
        const index = await import(`@/components/clauses/${standardDir}/index`);
        console.log(`Loaded index for ${standardDir}, available clauses:`, Object.keys(index.default));
        
        const exists = normalizedClauseId in index.default;
        console.log(`Clause ${normalizedClauseId} exists in ${standardDir}: ${exists}`);
        return exists;
      } catch (e) {
        console.log(`Could not load index for ${standardDir}, trying 3000-2018...`);
        
        // Try loading from 3000-2018 as fallback
        try {
          const index = await import(`@/components/clauses/3000-2018/index`);
          console.log(`Loaded index for 3000-2018, available clauses:`, Object.keys(index.default));
          
          const exists = normalizedClauseId in index.default;
          console.log(`Clause ${normalizedClauseId} exists in 3000-2018: ${exists}`);
          return exists;
        } catch (e) {
          console.log(`Could not load index for 3000-2018`);
          return false;
        }
      }
    } catch (error) {
      console.error(`Error checking if clause exists:`, error);
      return false;
    }
  }
}

export interface ReferenceResult {
  content: ClauseContent;
  error?: string;
  context: ReferenceContext;
} 