import clausesData from '@/components/waClauses.json';
import { ClauseSection } from '@/types/clauses';

interface BaseSection {
  id: string;
  title: string;
  fullText: string;
  references: Record<string, string[]>;
  requirements: string[];
  subsections?: Record<string, BaseSection>;
}

interface ClausesData {
  sections: Record<string, BaseSection>;
}

export const waClauses = (clausesData as unknown) as ClausesData;

function formatClauseSection(section: BaseSection, id: string): ClauseSection {
  const formattedSection: ClauseSection = {
    id,
    title: section.title,
    fullText: section.fullText || '',
    references: section.references || {},
    requirements: section.requirements || [],
    subsections: section.subsections || {}
  };

  if (section.subsections && !section.fullText) {
    formattedSection.fullText = Object.entries(section.subsections)
      .map(([subId, sub]) => 
        `${subId} - ${sub.title}\n${sub.fullText}`
      )
      .join('\n\n');
  }

  return formattedSection;
}

export const findClauseById = (id: string): ClauseSection | null => {
  const sections = waClauses.sections;
  
  if (sections[id]) {
    console.log(`Found direct WA section ${id}`);
    return formatClauseSection(sections[id], id);
  }
  
  const parts = id.split('.');
  const mainSection = sections[parts[0]];
  
  if (!mainSection) return null;
  
  if (parts.length === 2) {
    const fullId = `${parts[0]}.${parts[1]}`;
    
    if (sections[fullId]) {
      return formatClauseSection(sections[fullId], fullId);
    }
    
    if (mainSection.subsections?.[fullId]) {
      return formatClauseSection(mainSection.subsections[fullId], fullId);
    }
  }
  
  return null;
};
  