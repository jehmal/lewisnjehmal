import React, { useEffect, useState } from 'react';
import { ClauseDisplay } from './ClauseDisplay';
import { ClauseTreeViewElement } from '../types/clauses';
import { parseClauseReferences } from '../utils/parseClauseReferences';
import { extractStandardAndClauseReferences } from '../utils/figure-references';

// Import commonly referenced 3012-2019 and 5139-2019 clauses
import clause3012_1_4_18 from '../components/clauses/3012-2019/1.4.18.json';
import clause5139_1_3_8 from '../components/clauses/5139-2019/1.3.8.json';

// Import the standardVersions from clause-loader.ts
import { standardVersions } from '../services/standards-registry';

// Direct mapping for 3012-2019 clauses
const COMMON_3012_CLAUSES: Record<string, any> = {
  '1.4.18': clause3012_1_4_18
};

// Direct mapping for 5139-2019 clauses
const COMMON_5139_CLAUSES: Record<string, any> = {
  '1.3.8': clause5139_1_3_8
};

// Improve the FallbackClauseDisplay component to handle any standard
const FallbackClauseDisplay: React.FC<{clauseId: string, standardId?: string}> = ({clauseId, standardId}) => {
  const [clauseData, setClauseData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    async function loadClauseData() {
      try {
        setLoading(true);
        setError(null);
        
        // Add debug logging for 3019 clause 6.3.2
        if (standardId?.includes('3019') || (standardId === undefined && clauseId.includes('3019'))) {
          console.log('Attempting to load 3019 clause:', clauseId);
        }
        
        // First try to get from the predefined common clauses maps
        if (standardId?.includes('3019') || (standardId === undefined && clauseId.includes('3019'))) {
          try {
            // Try to directly import the clause file
            const data = await import(`../components/clauses/3019-2022/${clauseId}.json`);
            setClauseData(data);
            setLoading(false);
            return;
          } catch (directError) {
            console.error(`Error loading 3019 clause ${clauseId} directly:`, directError);
          }
        } else if (standardId?.includes('3012') || (standardId === undefined && clauseId.includes('3012'))) {
          if (COMMON_3012_CLAUSES[clauseId]) {
            setClauseData(COMMON_3012_CLAUSES[clauseId]);
            setLoading(false);
            return;
          }
        } else if (standardId?.includes('5139') || (standardId === undefined && clauseId.includes('5139'))) {
          if (COMMON_5139_CLAUSES[clauseId]) {
            setClauseData(COMMON_5139_CLAUSES[clauseId]);
            setLoading(false);
            return;
          }
        } else if (standardId?.includes('4777') || (standardId === undefined && clauseId.includes('4777'))) {
          // Remove special handling for 4777 clauses - use dynamic loading instead
          const version = '2016'; // Default version for 4777.1
          const directoryName = `4777.1-${version}`;
          
          try {
            // Try to directly import the clause file
            const data = await import(`../components/clauses/${directoryName}/${clauseId}.json`);
            setClauseData(data);
            setLoading(false);
            return;
          } catch (directError) {
            console.error(`Error loading 4777.1 clause ${clauseId} directly:`, directError);
            // Continue to general dynamic loading
          }
        }
        
        // If not found in predefined maps, try dynamic loading
        if (standardId) {
          // Extract base standard ID and version
          const parts = standardId.split('-');
          const baseStandardId = parts[0];
          const version = parts.length > 1 ? parts[1] : standardVersions[baseStandardId] || '2018';
          const directoryName = `${baseStandardId}-${version}`;
          
          try {
            // Try to directly import the clause file
            const data = await import(`../components/clauses/${directoryName}/${clauseId}.json`);
            setClauseData(data);
            setLoading(false);
          } catch (directError) {
            // Try to load from index
            try {
              const clauseModule = await import(`../components/clauses/${directoryName}/index`);
              if (clauseModule.default && clauseModule.default[clauseId]) {
                setClauseData(clauseModule.default[clauseId]);
                setLoading(false);
              } else {
                throw new Error(`Clause ${clauseId} not found in ${directoryName} index`);
              }
            } catch (indexError) {
              console.error(`Error loading clause ${clauseId} from ${directoryName}:`, indexError);
              setError(`Unable to load clause ${clauseId} from ${standardId}`);
              setLoading(false);
            }
          }
        } else {
          setError(`No standard ID provided for clause ${clauseId}`);
          setLoading(false);
        }
      } catch (error) {
        console.error(`Error in FallbackClauseDisplay for ${clauseId}:`, error);
        setError(`Error loading clause ${clauseId}`);
        setLoading(false);
      }
    }
    
    loadClauseData();
  }, [clauseId, standardId]);
  
  if (loading) {
    return <div className="p-4 bg-gray-50 text-gray-600 rounded border border-gray-300">
      Loading clause {clauseId}...
    </div>;
  }
  
  if (error || !clauseData) {
    return <div className="p-4 bg-red-50 text-red-800 rounded border border-red-300">
      {error || `Unable to load clause ${clauseId}`}
    </div>;
  }

  return (
    <div className="p-4 bg-white border rounded shadow-sm">
      <h3 className="text-lg font-bold mb-2">{clauseData.id} {clauseData.title}</h3>
      <div className="whitespace-pre-wrap text-sm">{clauseData.fullText}</div>
    </div>
  );
};

// Define an enhanced clause element with optional standardDoc
interface EnhancedClauseElement extends ClauseTreeViewElement {
  id: string;
  priority?: boolean;
  standardDoc?: string;
}

// Helper function to deduplicate clauses
function deduplicateClauses(clauses: EnhancedClauseElement[]): EnhancedClauseElement[] {
  const uniqueClauses = new Map<string, EnhancedClauseElement>();
  
  for (const clause of clauses) {
    const key = `${clause.standardDoc || ''}-${clause.id}`;
    if (!uniqueClauses.has(key)) {
      uniqueClauses.set(key, clause);
    }
  }
  
  return Array.from(uniqueClauses.values());
}

interface ReferencedClausesSectionProps {
  content: string;
  apiReferencedClauses: ClauseTreeViewElement[];
  standardId: string;
}

const ReferencedClausesSection: React.FC<ReferencedClausesSectionProps> = ({
  content,
  apiReferencedClauses,
  standardId
}) => {
  const [combinedClauses, setCombinedClauses] = useState<EnhancedClauseElement[]>([]);

  useEffect(() => {
    try {
      // Check if content is about Inverter Energy Systems (IES)
      const isAboutIES = content.toLowerCase().includes('inverter energy system') || 
                        content.toLowerCase().includes(' ies ') ||
                        content.toLowerCase().includes('grid connection') ||
                        content.toLowerCase().includes('grid-connected inverter') ||
                        content.toLowerCase().includes('as/nzs 4777') ||
                        content.toLowerCase().includes('asnzs4777');
      
      // Set default standard based on content
      const defaultStandard = isAboutIES ? '4777.1-2016' : standardId;
      
      // Extract clause references from content
      const contentReferences = parseClauseReferences(content);
      
      // Also extract standard-specific clause references using the utility function
      const standardClausePairs = extractStandardAndClauseReferences(content);
      
      // Check if we have specific clauses that we want to prioritize
      const priorityReferences = contentReferences.filter(
        ref => ref === '3.9.7.2' || ref === '5.7.4' || ref === '1.1.1'
      );
      
      // Create a map of standard-specific clauses for quick lookup
      const standardSpecificMap = new Map<string, string>();
      standardClausePairs.forEach(pair => {
        standardSpecificMap.set(pair.clauseId, pair.standardId);
      });
      
      // Format standard-agnostic clauses as EnhancedClauseElement objects
      const contentClauses: EnhancedClauseElement[] = contentReferences
        .map(ref => {
          // Check if this reference has a specific standard
          const specificStandard = standardSpecificMap.get(ref);
          const useStandard = specificStandard || defaultStandard;
          
          return {
            id: ref,
            name: `Clause ${ref}`,
            standardDoc: useStandard || defaultStandard,
            isSelectable: true,
            priority: priorityReferences.includes(ref as any)
          };
        });
      
      // Get existing clause IDs from API-provided clauses
      const enhancedApiClauses = apiReferencedClauses as EnhancedClauseElement[];
      const existingIds = new Set(enhancedApiClauses.map(c => `${c.standardDoc || standardId}-${c.id}`));
      
      // Only add clauses from content that don't already exist
      const newContentClauses = contentClauses
        .filter(c => !existingIds.has(`${c.standardDoc || standardId}-${c.id}`));
      
      // Combine clauses, but put priority clauses first
      const allClauses = [...enhancedApiClauses];
      
      if (newContentClauses.length > 0) {
        // Sort new content clauses to put priority ones first
        const sortedNewClauses = [...newContentClauses].sort((a, b) => {
          if (a.priority && !b.priority) return -1;
          if (!a.priority && b.priority) return 1;
          return 0;
        });
        
        allClauses.push(...sortedNewClauses);
      }
      
      // Apply deduplication to ensure no duplicate clauses
      const dedupedClauses = deduplicateClauses(allClauses);
      
      // Set the combined clauses
      setCombinedClauses(dedupedClauses);
    } catch (error) {
      console.error('Error processing clauses:', error);
    }
  }, [content, apiReferencedClauses, standardId]);

  // Skip rendering if no clauses
  if (combinedClauses.length === 0) {
    return null;
  }

  return (
    <div className="my-4 space-y-4">
      <h3 className="text-xl font-bold mb-2">Referenced Clauses</h3>
      {combinedClauses.length === 0 ? (
        <div className="text-gray-600 dark:text-gray-400">No clauses referenced in this response.</div>
      ) : (
        <>
          {/* Add special debugging for 4777.1 clauses */}
          {combinedClauses.some(clause => clause.standardDoc?.includes('4777')) && (
            <div className="p-2 mb-4 text-xs bg-blue-50 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
              This content references AS/NZS 4777.1-2016 clauses related to Inverter Energy Systems (IES).
            </div>
          )}
          
          {combinedClauses.map((clause) => {
            console.log(`ReferencedClausesSection: Rendering clause ${clause.id} with standard ${clause.standardDoc}`);
            
            // Special handling for 4777.1 clauses
            if (clause.standardDoc?.includes('4777')) {
              console.log(`ReferencedClausesSection: Special handling for 4777.1 clause ${clause.id}`);
              
              const is4777CommonClause = ['2.3', '3.1', '3.2.2', '3.4.5', '5.3.1', '7.3.1', '7.4'].includes(clause.id);
              if (is4777CommonClause) {
                return (
                  <div key={`clause-${clause.id}-${clause.standardDoc}`} className="mb-4">
                    <h4 className="font-bold text-sm mb-1">
                      AS/NZS 4777.1-2016 Clause {clause.id}
                    </h4>
                    <FallbackClauseDisplay clauseId={clause.id} standardId="4777.1" />
                  </div>
                );
              }
            } else if (clause.standardDoc?.includes('3012') || clause.id?.includes('1.4.18')) {
              const is3012CommonClause = ['1.4.18'].includes(clause.id);
              if (is3012CommonClause) {
                return (
                  <div key={`clause-${clause.id}-${clause.standardDoc}`} className="mb-4">
                    <h4 className="font-bold text-sm mb-1">
                      AS/NZS 3012-2019 Clause {clause.id}
                    </h4>
                    <FallbackClauseDisplay clauseId={clause.id} standardId="3012" />
                  </div>
                );
              }
            } else if (clause.standardDoc?.includes('5139') || clause.id?.includes('1.3.8')) {
              const is5139CommonClause = ['1.3.8'].includes(clause.id);
              if (is5139CommonClause) {
                return (
                  <div key={`clause-${clause.id}-${clause.standardDoc}`} className="mb-4">
                    <h4 className="font-bold text-sm mb-1">
                      AS/NZS 5139-2019 Clause {clause.id}
                    </h4>
                    <FallbackClauseDisplay clauseId={clause.id} standardId="5139" />
                  </div>
                );
              }
            }
            
            return (
              <div key={`clause-${clause.id}-${clause.standardDoc}`} className="mb-4">
                <h4 className="font-bold text-sm mb-1">
                  {clause.standardDoc ? `${clause.standardDoc} Clause ${clause.id}` : `Clause ${clause.id}`}
                </h4>
                <ClauseDisplay 
                  standardId={clause.standardDoc}
                  clauseId={clause.id}
                  className="border rounded p-4"
                />
              </div>
            );
          })}
        </>
      )}
    </div>
  );
};

export default ReferencedClausesSection; 