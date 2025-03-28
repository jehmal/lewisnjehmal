export interface StandardReference {
  standardId: string;
  clauseId: string;
}

export interface ReferenceContext {
  currentStandard: string;
  depth: number;
}

export interface ClauseContent {
  id: string;
  title: string;
  fullText: string;
  references: {
    documents: string[];
    sections: string[];
  };
  subsections: Record<string, ClauseContent>;
  requirements: string[];
}

export interface ReferenceResult {
  content: ClauseContent;
  error?: string;
  context: ReferenceContext;
} 