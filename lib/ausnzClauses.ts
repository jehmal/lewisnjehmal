import { ClauseSection } from "@/types/clause";
import { CLAUSE_IDS } from "./clauseList";

export async function getClause(clauseId: string): Promise<ClauseSection | null> {
  try {
    if (!CLAUSE_IDS.includes(clauseId)) {
      console.warn(`Invalid clause ID: ${clauseId}`);
      return null;
    }

    const clause = await import(`@/components/clauses/${clauseId}.json`);
    return {
      ...clause.default,
      title: clause.default.title || '',
      id: clauseId
    };
  } catch (error) {
    console.error(`Error loading clause ${clauseId}:`, error);
    return null;
  }
}

export async function getAllClauseIds(): Promise<string[]> {
  return CLAUSE_IDS;
}

export async function getClausesBatch(startIndex: number, batchSize: number, allClauseIds: string[]): Promise<ClauseSection[]> {
  const endIndex = Math.min(startIndex + batchSize, allClauseIds.length);
  const clausesToLoad = allClauseIds.slice(startIndex, endIndex);
  
  const clauses = await Promise.all(
    clausesToLoad.map(id => getClause(id))
  );
  
  return clauses.filter((clause): clause is ClauseSection => clause !== null);
}

export async function findAusnzClauseById(id: string): Promise<ClauseSection | null> {
  try {
    // Preprocess the ID to handle various formats
    const preprocessClauseId = (rawId: string): string => {
      // Remove common prefixes and clean the string
      let processedId = rawId
        .replace(/^(ASNZ|AS\/NZS|AS|NZS)\s*\d*\s*/i, '') // Remove standards prefix
        .replace(/^(clause|section|part|appendix)\s*/i, '') // Remove type prefix
        .replace(/^:\s*/, '') // Remove leading colons
        .trim();

      // Extract just the numeric part if it's a reference
      const numericMatch = processedId.match(/\d+(\.\d+)*/);
      if (numericMatch) {
        processedId = numericMatch[0];
      }

      return processedId;
    };

    // Normalize the id
    const normalizedId = preprocessClauseId(id);
    
    // Only proceed if the clause exists in our list
    if (CLAUSE_IDS.includes(normalizedId)) {
      try {
        const clause = await import(`@/components/clauses/${normalizedId}.json`);
        const clauseData = clause.default;

        // Process references to ensure proper structure
        let references = {
          documents: [] as string[],
          sections: [] as string[]
        };

        if (clauseData.references) {
          if (Array.isArray(clauseData.references)) {
            // If references is an array, treat them as section references
            references.sections = clauseData.references;
          } else {
            // If it's an object, use its structure
            references = {
              documents: clauseData.references.documents || [],
              sections: clauseData.references.sections || []
            };
          }
        }

        // Process subsections
        const processedSubsections = clauseData.subsections && Array.isArray(clauseData.subsections) 
          ? clauseData.subsections.reduce((acc: Record<string, ClauseSection>, id: string) => {
              // Only include subsections that exist in CLAUSE_IDS
              if (CLAUSE_IDS.includes(id)) {
                acc[id] = { 
                  id, 
                  title: '', 
                  fullText: '', 
                  references: { documents: [], sections: [] } 
                };
              }
              return acc;
            }, {})
          : (clauseData.subsections || {});

        // Create a properly structured ClauseSection object
        return {
          id: normalizedId,
          title: clauseData.title || '',
          fullText: clauseData.fullText || clauseData.content?.fullText || '',
          references,
          subsections: processedSubsections,
          requirements: clauseData.requirements || []
        };
      } catch (e) {
        console.warn(`Clause file not found: ${normalizedId}`);
        return null;
      }
    }

    // Return null for non-existent clauses instead of creating temporary ones
    return null;
  } catch (error) {
    console.error(`Error processing clause ${id}:`, error);
    return null;
  }
}

export function findAusnzClauseByIdSync(id: string): ClauseSection | null {
  try {
    const preprocessClauseId = (rawId: string): string => {
      let processedId = rawId
        .replace(/^(ASNZ|AS\/NZS|AS|NZS)\s*\d*\s*/i, '')
        .replace(/^(clause|section|part|appendix)\s*/i, '')
        .replace(/^:\s*/, '')
        .trim();

      const numericMatch = processedId.match(/\d+(\.\d+)*/);
      if (numericMatch) {
        processedId = numericMatch[0];
      }

      return processedId;
    };

    const normalizedId = preprocessClauseId(id);
    
    if (CLAUSE_IDS.includes(normalizedId)) {
      try {
        const clauseData = require(`@/components/clauses/${normalizedId}.json`);

        let references = {
          documents: [] as string[],
          sections: [] as string[]
        };

        if (clauseData.references) {
          if (Array.isArray(clauseData.references)) {
            references.sections = clauseData.references;
          } else {
            references = {
              documents: clauseData.references.documents || [],
              sections: clauseData.references.sections || []
            };
          }
        }

        const processedSubsections = clauseData.subsections && Array.isArray(clauseData.subsections) 
          ? clauseData.subsections.reduce((acc: Record<string, ClauseSection>, id: string) => {
              if (CLAUSE_IDS.includes(id)) {
                acc[id] = { 
                  id, 
                  title: '', 
                  fullText: '', 
                  references: { documents: [], sections: [] } 
                };
              }
              return acc;
            }, {})
          : (clauseData.subsections || {});

        return {
          id: normalizedId,
          title: clauseData.title || '',
          fullText: clauseData.fullText || clauseData.content?.fullText || '',
          references,
          subsections: processedSubsections,
          requirements: clauseData.requirements || []
        };
      } catch (e) {
        console.warn(`Clause file not found: ${normalizedId}`);
        return null;
      }
    }

    return null;
  } catch (error) {
    console.error(`Error processing clause ${id}:`, error);
    return null;
  }
} 