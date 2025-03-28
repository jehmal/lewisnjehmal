import { ClauseSection } from "@/types/clause";
import { ClauseContent } from "@/types/references";
import { CLAUSE_IDS } from "./clauseList";

export async function getClause(standardId: string, clauseId: string): Promise<ClauseContent | null> {
  try {
    // Normalize the standard ID and clause ID
    // First, strip version suffix if present
    const baseStandardId = standardId.split('-')[0];
    // Then normalize by replacing dots with hyphens
    const normalizedStandardId = standardId.replace(/\./g, '-');
    
    // Remove any prefix like AUSNZ: from clauseId
    const normalizedClauseId = clauseId.replace(/^[A-Z]+:/, '');
    
    console.log(`Loading clause ${normalizedClauseId} from standard ${standardId} (normalized: ${normalizedStandardId})`);
    
    // Special handling for hazardous area clauses (7.7.x)
    if (normalizedClauseId.startsWith('7.7')) {
      console.log(`Special handling for hazardous area clause ${normalizedClauseId}`);
      
      // Force 3000-2018 standard for these clauses
      const hazardousStandardId = '3000-2018';
      
      try {
        console.log(`Force loading hazardous area clause from ${hazardousStandardId}/${normalizedClauseId}.json`);
        const clause = await import(`@/components/clauses/${hazardousStandardId}/${normalizedClauseId}.json`);
        console.log(`Successfully loaded hazardous area clause from ${hazardousStandardId}/${normalizedClauseId}.json`);
        
        return {
          ...clause.default,
          id: normalizedClauseId,
          title: clause.default.title || '',
          fullText: clause.default.fullText || '',
          type: 'clause',
          standard: {
            id: hazardousStandardId.split('-')[0],
            name: `AS/NZS ${hazardousStandardId.split('-')[0]}`,
            version: '2018'
          },
          text: clause.default.fullText || '',
          references: {
            documents: clause.default.references?.documents || [],
            sections: clause.default.references?.sections || []
          },
          subsections: clause.default.subsections || {},
          requirements: clause.default.requirements || []
        };
      } catch (e) {
        console.log(`Failed to load hazardous area clause from dedicated path: ${e}`);
        // Continue to standard fallback mechanism
      }
    }
    
    // Special handling for clauses starting with "1." (except 1.1)
    if (normalizedClauseId.startsWith('1.') && normalizedClauseId !== '1.1') {
      console.log(`Special handling for clause starting with 1. (not 1.1): ${normalizedClauseId}`);
      
      // Force 3000-2018 standard for these clauses
      const section1StandardId = '3000-2018';
      
      try {
        console.log(`Force loading 1.x clause from ${section1StandardId}/${normalizedClauseId}.json`);
        const clause = await import(`@/components/clauses/${section1StandardId}/${normalizedClauseId}.json`);
        console.log(`Successfully loaded 1.x clause from ${section1StandardId}/${normalizedClauseId}.json`);
        
        return {
          ...clause.default,
          id: normalizedClauseId,
          title: clause.default.title || '',
          fullText: clause.default.fullText || '',
          type: 'clause',
          standard: {
            id: section1StandardId.split('-')[0],
            name: `AS/NZS ${section1StandardId.split('-')[0]}`,
            version: '2018'
          },
          text: clause.default.fullText || '',
          references: {
            documents: clause.default.references?.documents || [],
            sections: clause.default.references?.sections || []
          },
          subsections: clause.default.subsections || {},
          requirements: clause.default.requirements || []
        };
      } catch (e) {
        console.log(`Failed to load 1.x clause from dedicated path: ${e}`);
        // Continue to standard fallback mechanism
      }
    }
    
    // Create additional versions for fallback
    const fallbackStandardIds = [
      normalizedStandardId,
      `${baseStandardId}-2018`, // Try with -2018 suffix (common version)
      baseStandardId,           // Try without any version
      '3000-2018'               // Default fallback
    ];
    
    console.log(`Fallback order: ${fallbackStandardIds.join(', ')}`);
    
    // Try each standard ID in order until we find the clause
    for (const tryStandardId of fallbackStandardIds) {
      try {
        console.log(`Attempting to load from ${tryStandardId}/${normalizedClauseId}.json`);
        const clause = await import(`@/components/clauses/${tryStandardId}/${normalizedClauseId}.json`);
        console.log(`Successfully loaded clause from ${tryStandardId}/${normalizedClauseId}.json`);
        
        return {
          ...clause.default,
          id: normalizedClauseId,
          title: clause.default.title || '',
          fullText: clause.default.fullText || '',
          type: 'clause',
          standard: {
            id: tryStandardId.split('-')[0], // Remove version suffix for standard ID
            name: `AS/NZS ${tryStandardId.split('-')[0]}`,
            version: tryStandardId.includes('-') ? tryStandardId.split('-')[1] : '2018'
          },
          text: clause.default.fullText || '', // Add text property as a copy of fullText
          references: {
            documents: clause.default.references?.documents || [],
            sections: clause.default.references?.sections || []
          },
          subsections: clause.default.subsections || {},
          requirements: clause.default.requirements || []
        };
      } catch (e) {
        console.log(`Could not load from ${tryStandardId}/${normalizedClauseId}.json, trying next fallback...`);
        // Continue to next fallback
      }
    }
    
    // Last resort: Try loading from general path
    try {
      console.log(`Attempting to load from general path: ${normalizedClauseId}.json`);
      const clause = await import(`@/components/clauses/${normalizedClauseId}.json`);
      console.log(`Successfully loaded clause from general path: ${normalizedClauseId}.json`);
      
      return {
        ...clause.default,
        id: normalizedClauseId,
        title: clause.default.title || '',
        fullText: clause.default.fullText || '',
        type: 'clause',
        standard: {
          id: '3000', // Default to 3000 for general path
          name: 'AS/NZS 3000',
          version: '2018'
        },
        text: clause.default.fullText || '', // Add text property as a copy of fullText
        references: {
          documents: clause.default.references?.documents || [],
          sections: clause.default.references?.sections || []
        },
        subsections: clause.default.subsections || {},
        requirements: clause.default.requirements || []
      };
    } catch (e) {
      console.log(`Clause file not found: ${normalizedClauseId}`);
      // Don't return null yet, try one last approach with CLAUSE_IDS
      
      // If this is a section 1 clause, ensure it's not defaulting to 1.1
      if (normalizedClauseId.startsWith('1.') && normalizedClauseId !== '1.1') {
        console.warn(`Critical: Clause ${normalizedClauseId} file not found but should never default to 1.1`);
      }
      
      return null;
    }
  } catch (error) {
    console.error(`Error loading clause ${clauseId} from standard ${standardId}:`, error);
    return null;
  }
}

export async function getAllClauseIds(): Promise<string[]> {
  return CLAUSE_IDS;
}

export async function getClausesBatch(startIndex: number, batchSize: number, allClauseIds: string[]): Promise<ClauseContent[]> {
  const endIndex = Math.min(startIndex + batchSize, allClauseIds.length);
  const clausesToLoad = allClauseIds.slice(startIndex, endIndex);
  
  try {
    const clauses = await Promise.all(
      clausesToLoad.map(async id => {
        try {
          const clause = await import(`@/components/clauses/${id}.json`);
          return {
            ...clause.default,
            title: clause.default.title || '',
            id: id,
            references: {
              documents: clause.default.references?.documents || [],
              sections: clause.default.references?.sections || []
            },
            subsections: clause.default.subsections || {},
            requirements: clause.default.requirements || []
          };
        } catch (error) {
          console.warn(`Failed to load clause ${id}:`, error);
          return null;
        }
      })
    );
    
    return clauses.filter((clause): clause is ClauseContent => clause !== null);
  } catch (error) {
    console.error('Error loading clauses batch:', error);
    return [];
  }
}

export async function findAusnzClauseById(id: string): Promise<ClauseContent | null> {
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
    console.log(`Finding clause by ID: ${id} (normalized to: ${normalizedId})`);
    
    // Key issue: Special handling for hazardous area clauses
    if (normalizedId.startsWith('7.7')) {
      console.log(`Special hazardous area handling for clause ${normalizedId}`);
      
      try {
        // Directly force path to 3000-2018 directory for hazardous area clauses
        console.log(`Attempting to load hazardous area clause directly from 3000-2018/${normalizedId}.json`);
        const clause = await import(`@/components/clauses/3000-2018/${normalizedId}.json`);
        const clauseData = clause.default;
        
        console.log(`Successfully loaded hazardous area clause ${normalizedId} from 3000-2018 directory`);
        
        // Create a properly structured ClauseContent object
        return {
          id: normalizedId,
          title: clauseData.title || '',
          fullText: clauseData.fullText || clauseData.content?.fullText || '',
          type: 'clause',
          standard: {
            id: '3000-2018',
            name: 'AS/NZS 3000-2018',
            version: '2018'
          },
          text: clauseData.fullText || clauseData.content?.fullText || '',
          references: {
            documents: clauseData.references?.documents || [],
            sections: clauseData.references?.sections || []
          },
          subsections: clauseData.subsections || {},
          requirements: clauseData.requirements || []
        };
      } catch (e) {
        console.log(`Failed to load hazardous area clause directly, continuing with fallback: ${e}`);
      }
    }
    
    // Special handling for clauses starting with "1." to prevent defaulting to 1.1
    if (normalizedId.startsWith('1.') && normalizedId !== '1.1') {
      console.log(`Special handling for clause starting with "1.": ${normalizedId}`);
      
      try {
        // Try to load from 3000-2018 directory first
        try {
          console.log(`Attempting to load ${normalizedId} from 3000-2018 directory`);
          const clause = await import(`@/components/clauses/3000-2018/${normalizedId}.json`);
          const clauseData = clause.default;
          
          console.log(`Successfully loaded ${normalizedId} from 3000-2018 directory`);
          
          // Create a properly structured ClauseContent object
          return {
            id: normalizedId,
            title: clauseData.title || '',
            fullText: clauseData.fullText || clauseData.content?.fullText || '',
            type: 'clause',
            standard: {
              id: '3000-2018',
              name: 'AS/NZS 3000-2018',
              version: '2018'
            },
            text: clauseData.fullText || clauseData.content?.fullText || '',
            references: {
              documents: clauseData.references?.documents || [],
              sections: clauseData.references?.sections || []
            },
            subsections: clauseData.subsections || {},
            requirements: clauseData.requirements || []
          };
        } catch (e) {
          console.log(`Could not load ${normalizedId} from 3000-2018 directory, trying general path...`);
        }
      } catch (error) {
        console.error(`Error in special handling for clause ${normalizedId}:`, error);
      }
    }
    
    // Track if this is a section 1 clause (for special error handling)
    const isSection1Clause = normalizedId.startsWith('1.') && normalizedId !== '1.1';
    
    // Only proceed if the clause exists in our list
    if (CLAUSE_IDS.includes(normalizedId)) {
      try {
        console.log(`Loading clause ${normalizedId} from general path`);
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
          ? clauseData.subsections.reduce((acc: Record<string, ClauseContent>, id: string) => {
              // Only include subsections that exist in CLAUSE_IDS
              if (CLAUSE_IDS.includes(id)) {
                acc[id] = { 
                  id, 
                  title: '', 
                  fullText: '',
                  type: 'clause',
                  standard: {
                    id: '3000',
                    name: 'AS/NZS 3000',
                    version: '2018'
                  },
                  text: '',
                  references: { documents: [], sections: [] },
                  subsections: {},
                  requirements: []
                };
              }
              return acc;
            }, {})
          : (clauseData.subsections || {});

        // Create a properly structured ClauseContent object
        return {
          id: normalizedId,
          title: clauseData.title || '',
          fullText: clauseData.fullText || clauseData.content?.fullText || '',
          type: 'clause',
          standard: {
            id: '3000',
            name: 'AS/NZS 3000',
            version: '2018'
          },
          text: clauseData.fullText || clauseData.content?.fullText || '',
          references,
          subsections: processedSubsections,
          requirements: clauseData.requirements || []
        };
      } catch (e) {
        console.warn(`Clause file not found: ${normalizedId}`);
        
        // Special error for section 1 clauses that shouldn't default to 1.1
        if (isSection1Clause) {
          console.warn(`Critical: Section 1 clause ${normalizedId} file not found but should never default to 1.1`);
        }
        
        return null;
      }
    }

    // Return null for non-existent clauses instead of creating temporary ones
    if (isSection1Clause) {
      console.warn(`Critical: Section 1 clause ${normalizedId} is not in CLAUSE_IDS but should never default to 1.1`);
    }
    
    return null;
  } catch (error) {
    console.error(`Error processing clause ${id}:`, error);
    return null;
  }
}

export function findAusnzClauseByIdSync(id: string, standardDoc?: string): ClauseContent | null {
  // Check if id is undefined or null before proceeding
  if (!id) {
    console.warn('Sync: Invalid clause ID: undefined or null');
    return null;
  }

  console.log(`Sync: Normalized clause ID: ${id} (from ${id})`);
  
  // Normalize ID (remove any whitespace)
  const normalizedId = id.trim();
  
  // Expanded list of AS/NZS 4777.1-2016 clauses
  const ies4777ClauseIds = [
    '2.3', '2.4', '2.5', '3.1', '3.2', '3.2.1', '3.2.2', '3.3', '3.3.1', 
    '3.4', '3.4.1', '3.4.2', '3.4.3', '3.4.7', '5.3.1', '5.3.2', '5.3.3', '7.3.1', '7.3.2'
  ];
  
  // Special handling for AS/NZS 4777.1-2016 clauses - use expanded list
  const isIESClause = standardDoc === '4777.1-2016' || 
                     (normalizedId && ies4777ClauseIds.includes(normalizedId));
  
  if (isIESClause) {
    console.log(`Sync: Handling 4777.1-2016 clause ${normalizedId} - FORCED to 4777.1-2016 standard`);
    
    try {
      // Instead of using dynamic require, define a set of hardcoded content for key clauses
      // This avoids webpack Critical dependency errors
      const keyClauseData: Record<string, {
        title: string;
        fullText: string;
        requirements?: any[];
        subsections?: Record<string, any>;
      }> = {
        '2.3': {
          title: 'GENERAL REQUIREMENTS FOR INVERTER ENERGY SYSTEMS (IES)',
          fullText: 'An IES installation is made up of an inverter(s), an energy source(s), wiring, and control, monitoring and protection devices connected at a single point in an electrical installation.'
        },
        '3.1': {
          title: 'CONTROL, PROTECTION, AND WIRING SYSTEM REQUIREMENTS',
          fullText: 'The control, protection and wiring system equipment and installation shall be fit for purpose for the conditions to which they are likely to be exposed within the electrical installation.'
        },
        '5.3.1': {
          title: 'INVERTER INSTALLATION',
          fullText: 'The inverter shall be installed in a suitable, well-ventilated place, in accordance with the IP rating and manufacturer\'s requirements, and arranged to provide accessibility for operation, testing, inspection, maintenance and repair.'
        },
        '7.3.1': {
          title: 'VERIFICATION REQUIREMENTS',
          fullText: 'Before commissioning, the IES shall be verified in accordance with AS/NZS 3000. A report detailing the system information, circuits inspected, test results, and verification details shall be provided.'
        },
        '3.2.1': {
          title: 'CONTROL DEVICES',
          fullText: 'Control devices shall be suitable for their intended operation and conform to the requirements of clause 2.3.'
        },
        '3.2.2': {
          title: 'ISOLATION DEVICES',
          fullText: 'Isolation devices shall be provided to meet the isolation requirements of AS/NZS 3000 for all functional elements of the installation.'
        },
        '3.3.1': {
          title: 'WIRING SYSTEMS REQUIREMENTS',
          fullText: 'All wiring systems shall be suitable for the intended purpose and meet the requirements of AS/NZS 3000 and manufacturer requirements.'
        }
      };
      
      // Check if we have hardcoded data for this clause
      if (keyClauseData[normalizedId]) {
        console.log(`Sync: Using hardcoded data for 4777.1-2016 clause ${normalizedId}`);
        const clauseData = keyClauseData[normalizedId];
        
        // Return the clause with standardDoc info
        return {
          id: normalizedId,
          title: clauseData.title || '',
          fullText: clauseData.fullText || '',
          type: 'clause',
          text: clauseData.fullText || '',
          standard: {
            id: '4777.1',
            name: 'AS/NZS 4777.1',
            version: '2016'
          },
          standardDoc: '4777.1-2016',
          standardName: 'AS/NZS 4777.1',
          requirements: clauseData.requirements || [],
          subsections: clauseData.subsections || {},
          references: { documents: [], sections: [] }
        };
      }
      
      // Log that we're falling back to dynamic imports
      console.log(`Sync: No hardcoded data for clause ${normalizedId}, attempting to load from file`);
      
      // Try using import() instead of require() for supported environments
      // but only log that we would normally do this - webpack will handle it differently
      console.log(`Note: Would try dynamic import() for 4777.1-2016/${normalizedId}.json in a browser environment`);
      
      // Instead of falling back to try/catch/require, directly use hardcoded fallbacks
      // Returning hardcoded data for specific clauses
      console.log(`Sync: Using hardcoded fallback for clause ${normalizedId}`);
      
      if (normalizedId === '2.3') {
        return {
          id: '2.3',
          title: 'GENERAL REQUIREMENTS FOR INVERTER ENERGY SYSTEMS (IES)',
          fullText: 'An IES installation is made up of an inverter(s), an energy source(s), wiring, and control, monitoring and protection devices connected at a single point in an electrical installation.',
          type: 'clause',
          text: 'An IES installation is made up of an inverter(s), an energy source(s), wiring, and control, monitoring and protection devices connected at a single point in an electrical installation.',
          standard: {
            id: '4777.1',
            name: 'AS/NZS 4777.1',
            version: '2016'
          },
          standardDoc: '4777.1-2016',
          standardName: 'AS/NZS 4777.1',
          requirements: [],
          subsections: {},
          references: { documents: [], sections: [] }
        };
      } else if (normalizedId === '3.1') {
        return {
          id: '3.1',
          title: 'CONTROL, PROTECTION, AND WIRING SYSTEM REQUIREMENTS',
          fullText: 'The control, protection and wiring system equipment and installation shall be fit for purpose for the conditions to which they are likely to be exposed within the electrical installation.',
          type: 'clause',
          text: 'The control, protection and wiring system equipment and installation shall be fit for purpose for the conditions to which they are likely to be exposed within the electrical installation.',
          standard: {
            id: '4777.1',
            name: 'AS/NZS 4777.1',
            version: '2016'
          },
          standardDoc: '4777.1-2016',
          standardName: 'AS/NZS 4777.1',
          requirements: [],
          subsections: {},
          references: { documents: [], sections: [] }
        };
      } else if (normalizedId === '5.3.1') {
        return {
          id: '5.3.1',
          title: 'INVERTER INSTALLATION',
          fullText: 'The inverter shall be installed in a suitable, well-ventilated place, in accordance with the IP rating and manufacturer\'s requirements, and arranged to provide accessibility for operation, testing, inspection, maintenance and repair.',
          type: 'clause',
          text: 'The inverter shall be installed in a suitable, well-ventilated place, in accordance with the IP rating and manufacturer\'s requirements, and arranged to provide accessibility for operation, testing, inspection, maintenance and repair.',
          standard: {
            id: '4777.1',
            name: 'AS/NZS 4777.1',
            version: '2016'
          },
          standardDoc: '4777.1-2016',
          standardName: 'AS/NZS 4777.1',
          requirements: [],
          subsections: {},
          references: { documents: [], sections: [] }
        };
      } else if (normalizedId === '7.3.1') {
        return {
          id: '7.3.1',
          title: 'VERIFICATION REQUIREMENTS',
          fullText: 'Before commissioning, the IES shall be verified in accordance with AS/NZS 3000. A report detailing the system information, circuits inspected, test results, and verification details shall be provided.',
          type: 'clause',
          text: 'Before commissioning, the IES shall be verified in accordance with AS/NZS 3000. A report detailing the system information, circuits inspected, test results, and verification details shall be provided.',
          standard: {
            id: '4777.1',
            name: 'AS/NZS 4777.1',
            version: '2016'
          },
          standardDoc: '4777.1-2016',
          standardName: 'AS/NZS 4777.1',
          requirements: [],
          subsections: {},
          references: { documents: [], sections: [] }
        };
      }
      
      // If we haven't returned by now, we don't have data for this clause
      console.log(`Sync: No hardcoded data available for clause ${normalizedId}`);
      return null;
    } catch (error) {
      console.error(`Sync: Error processing 4777.1-2016 clause ${normalizedId}:`, error);
    }
  }
  
  // Continue with the regular fallbacks...
  // ... existing code ...
  
  // Return null if no clause was found
  return null;
} 