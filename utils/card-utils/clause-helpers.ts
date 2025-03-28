import { ClauseSection, TreeViewElement } from '@/types/card-types';
import { ClauseTreeViewElement } from '@/types/clauses';
import { ClauseReference, StandardReference } from '@/types/references';
import { findClauseById } from '@/lib/waClauses';
import { findAusnzClauseByIdSync } from '@/lib/ausnzClauses';

/**
 * Finds a clause by its ID
 */
export const findClause = (id: string): ClauseReference | null => {
  console.log('Finding clause with id:', id);
  const clause = findClauseById(id);
  if (!clause) return null;

  // Convert ClauseSection to ClauseReference
  return {
    id: clause.id,
    type: 'clause',
    standard: {
      id: typeof clause.standard === 'object' ? clause.standard.id : (clause.standard || '3000'),
      name: 'AS/NZS 3000',
      version: '2018'
    },
    referenceNumber: clause.id,
    lastUpdated: Date.now(),
    formatVersion: '1.0',
    source: 'direct',
    validated: false,
    referenceChain: [],
    title: clause.title || '',
    fullText: clause.fullText || '',
    content: {
      id: clause.id,
      type: 'clause',
      title: clause.title || '',
      text: clause.fullText || '',
      standard: {
        id: typeof clause.standard === 'object' ? clause.standard.id : (clause.standard || '3000'),
        name: 'AS/NZS 3000',
        version: '2018'
      }
    }
  };
};

/**
 * Converts a list of clauses to a tree view structure
 */
export const convertClausesToTreeView = (clauses: any): ClauseTreeViewElement[] => {
  if (!clauses || !Array.isArray(clauses)) return [];
  
  return clauses.map(clause => {
    let standardDoc = '3000'; // Default to 3000
    
    // Try to determine the standard from the clause reference
    if (clause.standard?.id) {
      standardDoc = clause.standard.id;
    } else if (clause.id && clause.id.includes('/')) {
      // Handle formats like "3000/5.7.4"
      const parts = clause.id.split('/');
      standardDoc = parts[0];
    }
    
    const treeElement: ClauseTreeViewElement = {
      id: clause.id,
      name: clause.title || `Clause ${clause.id}`,
      isSelectable: true,
      standardDoc
    };
    
    // If the clause has subsections, add them as children
    if (clause.subsections && Object.keys(clause.subsections).length > 0) {
      treeElement.children = convertClausesToTreeView(Object.values(clause.subsections));
    }
    
    return treeElement;
  });
};

/**
 * Compares clause IDs for sorting
 */
export const compareClauseIds = (a: TreeViewElement, b: TreeViewElement): number => {
  // Split the IDs into sections by dots
  const aParts = a.id.split('.').map(part => {
    const num = parseInt(part);
    return isNaN(num) ? part : num;
  });
  const bParts = b.id.split('.').map(part => {
    const num = parseInt(part);
    return isNaN(num) ? part : num;
  });
  
  // Compare each section numerically
  const minLength = Math.min(aParts.length, bParts.length);
  
  for (let i = 0; i < minLength; i++) {
    // If both parts are numbers, compare numerically
    if (typeof aParts[i] === 'number' && typeof bParts[i] === 'number') {
      if (aParts[i] !== bParts[i]) {
        return (aParts[i] as number) - (bParts[i] as number);
      }
    } 
    // If different types or strings, use standard comparison
    else if (aParts[i] !== bParts[i]) {
      return String(aParts[i]).localeCompare(String(bParts[i]));
    }
  }
  
  // If all compared sections are equal, shorter comes first
  return aParts.length - bParts.length;
};

/**
 * Converts a standard to a reference object
 */
export const convertStandardToReference = (
  standard: string | StandardReference | undefined
): StandardReference | undefined => {
  if (!standard) return undefined;
  if (typeof standard === 'string') {
    return {
      id: standard,
      name: 'AS/NZS 3000',
      version: '2018'
    };
  }
  return standard;
};

/**
 * Extracts standard information from a clause ID
 */
export const extractStandardInfo = (
  clauseId: string
): { standardId: string; version: string } => {
  // Add detailed logging to help troubleshoot
  console.log(`Extracting standard info for clause ID: ${clauseId}`);
  
  // Normalize the clause ID first (remove any prefixes like AUSNZ:)
  const normalizedClauseId = clauseId.replace(/^[A-Z]+:/, '');
  console.log(`Normalized clause ID: ${normalizedClauseId}`);
  
  // Handle AUSNZ format
  if (clauseId.startsWith('AUSNZ:')) {
    // Extract the clause number part
    const clauseNumber = clauseId.replace('AUSNZ:', '');
    console.log(`Extracted clause number: ${clauseNumber}`);
    
    // Special case handling for specific clauses that need to be in specific standards
    
    // Hazardous area clauses (7.7.x) should always be from 3000-2018
    if (clauseNumber.startsWith('7.7')) {
      console.log(`Special case: Clause ${clauseNumber} identified as hazardous area clause from 3000-2018 standard`);
      return { standardId: '3000-2018', version: '2018' };
    }
    
    // Most clauses starting with 7.x are from 3000-2018
    if (clauseNumber.startsWith('7.')) {
      console.log(`Special case: Clause ${clauseNumber} identified as section 7 from 3000-2018 standard`);
      return { standardId: '3000-2018', version: '2018' };
    }
    
    // Clauses starting with 1. (except 1.1) should be from 3000-2018
    if (clauseNumber.startsWith('1.') && clauseNumber !== '1.1') {
      console.log(`Special case: Clause ${clauseNumber} starting with 1. (not 1.1) from 3000-2018 standard`);
      return { standardId: '3000-2018', version: '2018' };
    }
    
    // Special case for clauses from 2293.2 standard
    if (clauseNumber === '2.3' || clauseNumber === '2.5' || clauseNumber === '2.5.2' || 
        (clauseNumber.startsWith('2.') && clauseNumber.length <= 6)) {
      console.log(`Special case: Clause ${clauseNumber} identified as part of 2293.2 standard`);
      return { standardId: '2293.2', version: '2019' };
    }
    
    // Try to extract standard ID directly from the clause ID if it contains a standard number
    const standardMatch = clauseId.match(/^AUSNZ:(\d{4}(?:\.\d)?)/);
    if (standardMatch) {
      const standardId = standardMatch[1];
      console.log(`Found standard ID in clause ID: ${standardId}`);
      
      // Return appropriate standard and version
      switch (standardId) {
        case '2293.2':
          return { standardId, version: '2019' };
        case '3000':
          return { standardId: '3000-2018', version: '2018' }; // Use versioned format for 3000
        // Add more cases as needed
        default:
          return { standardId, version: '2018' };
      }
    }
  }
  
  // Handle standard number in the format standardId/clause like 3000/5.7.4
  if (clauseId.includes('/')) {
    const parts = clauseId.split('/');
    const standardId = parts[0];
    const clauseNumber = parts[1];
    console.log(`Extracted standard ${standardId} and clause ${clauseNumber} from reference format`);
    
    // Special handling for hazardous area clauses
    if (clauseNumber.startsWith('7.7')) {
      console.log(`Special case: Clause ${clauseNumber} identified as hazardous area clause from 3000-2018 standard`);
      return { standardId: '3000-2018', version: '2018' };
    }
    
    // Special handling for clauses starting with 1. (except 1.1)
    if (clauseNumber.startsWith('1.') && clauseNumber !== '1.1') {
      console.log(`Special case: Clause ${clauseNumber} starting with 1. (not 1.1) from 3000-2018 standard`);
      return { standardId: '3000-2018', version: '2018' };
    }
    
    switch (standardId) {
      case '2293.2':
        return { standardId, version: '2019' };
      case '3000':
        return { standardId: '3000-2018', version: '2018' }; // Use versioned format for 3000
      // Add more cases as needed
      default:
        return { standardId, version: '2018' };
    }
  }
  
  // Check if this is just a standard ID
  if (clauseId.match(/^\d{4}(?:\.\d)?$/)) {
    console.log(`Clause ID is a standard ID: ${clauseId}`);
    switch (clauseId) {
      case '2293.2':
        return { standardId: '2293.2', version: '2019' };
      case '2293.1':
        return { standardId: '2293.1', version: '2018' };
      case '2293.3':
        return { standardId: '2293.3', version: '2018' };
      case '3000':
        return { standardId: '3000-2018', version: '2018' }; // Use versioned format
      case '3001.1':
        return { standardId: '3001.1', version: '2022' };
      case '3001.2':
        return { standardId: '3001.2', version: '2022' };
      case '3003':
        return { standardId: '3003', version: '2018' };
      case '3004.2':
        return { standardId: '3004.2', version: '2014' };
      case '3010':
        return { standardId: '3010', version: '2017' };
      case '3012':
        return { standardId: '3012', version: '2019' };
      case '3017':
        return { standardId: '3017', version: '2022' };
      case '3019':
        return { standardId: '3019', version: '2022' };
      case '3760':
        return { standardId: '3760', version: '2022' };
      case '3820':
        return { standardId: '3820', version: '2009' };
      case '4509.1':
        return { standardId: '4509.1', version: '2009' };
      case '4509.2':
        return { standardId: '4509.2', version: '2010' };
      case '4777.1':
        return { standardId: '4777.1', version: '2016' };
      case '4836':
        return { standardId: '4836', version: '2023' };
      case '5033':
        return { standardId: '5033', version: '2021' };
      case '5139':
        return { standardId: '5139', version: '2019' };
      default:
        return { standardId: '3000-2018', version: '2018' };
    }
  }
  
  // If we have a raw clause number like 7.7.2.2
  if (normalizedClauseId.match(/^(\d+\.\d+)+$/)) {
    console.log(`Analyzing raw clause number format: ${normalizedClauseId}`);
    
    // Special case: Hazardous area clauses (section 7.7)
    if (normalizedClauseId.startsWith('7.7')) {
      console.log(`Raw clause ${normalizedClauseId} identified as hazardous area clause from 3000-2018`);
      return { standardId: '3000-2018', version: '2018' };
    }
    
    // Special case: Section 7 clauses
    if (normalizedClauseId.startsWith('7.')) {
      console.log(`Raw clause ${normalizedClauseId} identified as section 7 clause from 3000-2018`);
      return { standardId: '3000-2018', version: '2018' };
    }
    
    // Special case for clauses starting with 1. (except 1.1)
    if (normalizedClauseId.startsWith('1.') && normalizedClauseId !== '1.1') {
      console.log(`Raw clause ${normalizedClauseId} starting with 1. (not 1.1) from 3000-2018`);
      return { standardId: '3000-2018', version: '2018' };
    }
    
    // Special case for emergency lighting clauses
    if (normalizedClauseId.startsWith('2.')) {
      return { standardId: '2293.2', version: '2019' };
    }
    
    // Default for other clause numbers
    return { standardId: '3000-2018', version: '2018' };
  }
  
  // Default to 3000-2018 standard (with version)
  console.log(`No special handling for ${clauseId}, defaulting to 3000-2018`);
  return { standardId: '3000-2018', version: '2018' };
};

/**
 * Converts a clause to a reference
 */
export const convertClauseToReference = (clause: ClauseSection): ClauseReference => {
  // Determine which standard this clause belongs to based on its ID pattern
  let standard: StandardReference;
  
  // Maps of standard IDs to their details - grouped by clause pattern
  const standardMappings: Record<string, StandardReference> = {
    // Clauses starting with 2. are from 2293.2
    '2293.2': {
      id: '2293.2',
      name: 'AS/NZS 2293.2',
      version: '2019'
    },
    // Default to 3000 for most clauses
    '3000': {
      id: '3000',
      name: 'AS/NZS 3000',
      version: '2018'
    },
    // Other standards
    '3001.1': {
      id: '3001.1',
      name: 'AS/NZS 3001.1',
      version: '2022'
    },
    '3001.2': {
      id: '3001.2',
      name: 'AS/NZS 3001.2',
      version: '2022'
    },
    '3003': {
      id: '3003',
      name: 'AS/NZS 3003',
      version: '2018'
    }
  };
  
  // First check if the clause already has a standard defined
  if (clause.standard && typeof clause.standard === 'object' && 'id' in clause.standard) {
    // If the standard property exists and is a valid object with an id
    standard = {
      id: clause.standard.id,
      name: clause.standard.name || `AS/NZS ${clause.standard.id}`,
      version: clause.standard.version || standardMappings[clause.standard.id]?.version || '2018'
    };
  } 
  // Special cases for known clause patterns
  else if (clause.id.startsWith('2.')) {
    standard = standardMappings['2293.2'];
  }
  // Special case for known clauses
  else if (['2.3', '2.5', '2.5.2'].includes(clause.id)) {
    standard = standardMappings['2293.2'];
  }
  // Default to 3000 standard
  else {
    standard = standardMappings['3000'];
  }

  return {
    id: clause.id,
    type: 'clause',
    standard: standard,
    referenceNumber: clause.id,
    lastUpdated: Date.now(),
    formatVersion: '1.0',
    source: 'direct',
    validated: true,
    referenceChain: []
  };
};

