export interface ClauseSection {
  id: string;
  title: string;
  fullText: string;
  references?: {
    documents?: string[];
    sections?: string[];
  };
  subsections?: Record<string, ClauseSection>;
  requirements?: string[];
} 