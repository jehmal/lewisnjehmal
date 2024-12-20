import { findClauseById } from '@/lib/waClauses';
import { findAusnzClauseById } from '@/lib/ausnzClauses';
import { ClauseSection } from '@/types/clauses';

export async function findReferencedClause(reference: string): Promise<ClauseSection | null> {
  const isAusnzReference = /^\d/.test(reference);
  
  if (isAusnzReference) {
    return await findAusnzClauseById(reference);
  }
  
  return findClauseById(reference);
}

export async function getReferencedClauses(clause: ClauseSection): Promise<ClauseSection[]> {
  const referencedClauses: ClauseSection[] = [];
  
  if (clause.references) {
    // Check sections references
    const sections = clause.references['sections'] || [];
    if (Array.isArray(sections)) {
      for (const section of sections) {
        const referenced = await findReferencedClause(section);
        if (referenced) referencedClauses.push(referenced);
      }
    }
    
    // Check clauses references
    const clauses = clause.references['clauses'] || [];
    if (Array.isArray(clauses)) {
      for (const clauseRef of clauses) {
        const referenced = await findReferencedClause(clauseRef);
        if (referenced) referencedClauses.push(referenced);
      }
    }
  }
  
  return referencedClauses;
} 