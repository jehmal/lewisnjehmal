import { ClauseReference, StandardReference } from '@/types/references';
import { ReferenceError } from '@/types/references';

interface ClauseData {
  id: string;
  title: string | undefined;
  fullText: string | undefined;
  subsections?: Record<string, string> | string[];
}

// Static imports for all standards
import asnzs3003Clauses from '@/components/clauses/3003-2018/index';
import asnzs2293Clauses from '@/components/clauses/2293.2-2019/index';
import asnzs3000Clauses from '@/components/clauses/3000-2018/index';
import asnzs3001_1Clauses from '@/components/clauses/3001.1-2022/index';
import asnzs3001_2Clauses from '@/components/clauses/3001.2-2022/index';
import asnzs4777_1Clauses from '@/components/clauses/4777.1-2016/index';

// Standard ID mapping - maps normalized IDs to directory name IDs
const STANDARD_ID_MAPPING: Record<string, string> = {
  '3003': '3003-2018',
  '2293.2': '2293.2-2019',
  '3000': '3000-2018',
  '3001.1': '3001.1-2022',
  '3001.2': '3001.2-2022',
  '4777.1': '4777.1-2016',
  '4777': '4777.1-2016', // Alternative mapping for 4777
  '4777.1-2016': '4777.1-2016', // Full version specification
};

const standardModules: Record<string, Record<string, ClauseData>> = {
  '3003': asnzs3003Clauses,
  '2293.2': asnzs2293Clauses,
  '3000': asnzs3000Clauses,
  '3001.1': asnzs3001_1Clauses,
  '3001.2': asnzs3001_2Clauses,
  '4777.1': asnzs4777_1Clauses,
  // Add aliases for different ways the standard might be referenced
  '4777.1-2016': asnzs4777_1Clauses,
  '4777': asnzs4777_1Clauses,
};

/**
 * Normalizes a standard ID to the format used in the codebase
 * @param standardId The raw standard ID from a reference
 * @returns The normalized standard ID
 */
function normalizeStandardId(standardId: string): string {
  // Remove any year suffix or prefix like AS/NZS
  let normalizedId = standardId
    .replace(/-(19|20)\d\d$/, '') // Remove year suffix
    .replace(/^(AS|NZS|ASNZS|AS\/NZS)\s*/, ''); // Remove standard prefix
  
  // Check for direct mapping
  if (STANDARD_ID_MAPPING[normalizedId]) {
    return STANDARD_ID_MAPPING[normalizedId];
  }
  
  // If no direct mapping, try to extract the base standard ID
  const baseMatch = normalizedId.match(/^(\d+(?:\.\d+)?)/);
  if (baseMatch && STANDARD_ID_MAPPING[baseMatch[1]]) {
    return STANDARD_ID_MAPPING[baseMatch[1]];
  }
  
  return normalizedId;
}

export async function loadClause(ref: ClauseReference) {
  // Normalize the standard ID to handle different formats
  const rawStandardId = ref.standard.id;
  const standardId = normalizeStandardId(rawStandardId);
  
  console.log(`Loading clause ${ref.referenceNumber} from standard ${rawStandardId} (normalized: ${standardId})`);
  
  const standardModule = standardModules[standardId];
  if (!standardModule) {
    console.error(`Standard module not found for ${standardId} (original: ${rawStandardId})`);
    throw new ReferenceError(
      `Invalid standard ${rawStandardId}. Normalized to ${standardId} but no matching module found.`,
      'INVALID_STANDARD'
    );
  }

  // Try to get the clause with the original reference number first
  let clauseData = standardModule[ref.referenceNumber];
  
  // If not found, try with underscore format
  if (!clauseData) {
    const clauseKey = ref.referenceNumber.replace(/\./g, '_');
    clauseData = standardModule[clauseKey];
    
    if (clauseData) {
      console.log(`Found clause using underscore format: ${clauseKey}`);
    }
  }

  if (!clauseData) {
    console.error(`Clause ${ref.referenceNumber} not found in ${standardId}. Available keys:`, 
      Object.keys(standardModule).slice(0, 10).join(', ') + '...');
    
    throw new ReferenceError(
      `Clause ${ref.referenceNumber} not found in ${standardId} (original: ${rawStandardId})`,
      'CLAUSE_NOT_FOUND'
    );
  }

  // Ensure we have string values for title and fullText
  const title = typeof clauseData.title === 'string' ? clauseData.title : '';
  const fullText = typeof clauseData.fullText === 'string' ? clauseData.fullText : 
                  typeof clauseData.title === 'string' ? clauseData.title : '';

  return {
    ...ref,
    title,
    fullText,
    metadata: {
      ...ref.metadata,
      source: 'clause',
      lastUpdated: Date.now()
    }
  };
} 