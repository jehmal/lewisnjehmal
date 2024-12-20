export interface ClauseReference {
  id: string;
  title: string;
  fullText?: string;
  references?: Record<string, string[] | string>;
  requirements?: string[];
  subsections?: Record<string, ClauseSection>;
  standard?: string;
}

export interface ClauseSection extends ClauseReference {
  subsections?: Record<string, ClauseSection>;
}

export interface TreeViewElement {
  id: string;
  name: string;
  isSelectable?: boolean;
  children?: TreeViewElement[];
}

export interface WaClausesData {
  sections: Record<string, ClauseSection>;
}

// Type for request parameters
export interface ClauseRequest {
  id: string;
  content: string;
}

// Type for index parameters
export interface IndexedItem {
  index: number;
  value: string;
} 