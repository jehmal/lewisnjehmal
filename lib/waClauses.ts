import clausesData from '@/components/waClauses.json';
import ausnzClausesData from '@/components/ausnzClauses.json';
import { WaClausesData, ClauseSection } from '@/types/clauses';

export const waClauses = (clausesData as unknown) as WaClausesData;
export const ausnzClauses = (ausnzClausesData as unknown) as WaClausesData;

// Helper to format section data consistently
function formatClauseSection(section: any, id: string): ClauseSection {
  // If section has subsections but no fullText, combine subsection content
  if (section.subsections && !section.fullText) {
    const combinedContent = Object.entries(section.subsections)
      .map(([subId, sub]: [string, any]) => 
        `${subId} - ${sub.title}\n${sub.fullText}`
      )
      .join('\n\n');
      
    return {
      id,
      title: section.title,
      fullText: combinedContent,
      references: section.references || {},
      requirements: section.requirements || [],
      subsections: section.subsections
    };
  }
  
  // Return regular section
  return {
    id,
    title: section.title,
    fullText: section.fullText || '',
    references: section.references || {},
    requirements: section.requirements || [],
    subsections: section.subsections || {}
  };
}

export const findClauseById = (id: string): ClauseSection | null => {
  // Direct access to sections object
  const sections = waClauses.sections;
  
  // Try direct lookup first
  if (sections[id]) {
    console.log(`Found direct WA section ${id}`);
    return formatClauseSection(sections[id], id);
  }
  
  // Split into parts for nested lookup
  const parts = id.split('.');
  const mainSection = sections[parts[0]];
  
  if (!mainSection) return null;
  
  // Handle different section types
  if (parts.length === 2) {
    // Look for section like "9.4"
    const fullId = `${parts[0]}.${parts[1]}`;
    
    // Check main sections first
    if (sections[fullId]) {
      return formatClauseSection(sections[fullId], fullId);
    }
    
    // Check subsections
    if (mainSection.subsections?.[fullId]) {
      return formatClauseSection(mainSection.subsections[fullId], fullId);
    }
  }
  
  return null;
};

export const findAusnzClauseById = (id: string): ClauseSection | null => {
  const sections = ausnzClauses.sections;
  
  // Try direct lookup first
  if (sections[id]) {
    console.log(`Found direct AUSNZ section ${id}`);
    return formatClauseSection(sections[id], id);
  }
  
  // Split into parts for nested lookup
  const parts = id.split('.');
  const mainSection = sections[parts[0]];
  
  if (!mainSection) return null;
  
  // Handle different section types
  const fullId = parts.join('.');
  
  // Check main sections first
  if (sections[fullId]) {
    return formatClauseSection(sections[fullId], fullId);
  }
  
  // Recursively check subsections
  let currentSection = mainSection;
  for (let i = 1; i < parts.length; i++) {
    const partialId = parts.slice(0, i + 1).join('.');
    if (currentSection.subsections?.[partialId]) {
      currentSection = currentSection.subsections[partialId];
      if (i === parts.length - 1) {
        return formatClauseSection(currentSection, fullId);
      }
    } else {
      return null;
    }
  }
  
  return null;
};
  