import { StandardReference, ReferenceContent } from './references';
import { TreeViewElement } from '@/components/ui/file-tree';

export interface ClauseTreeViewElement extends TreeViewElement {
  standardDoc?: string;
  standard?: StandardReference;
  isSelectable: boolean;
}

export interface ClauseReference {
  id: string;
  standard: string;
  title: string;
  fullText?: string;
  references?: Record<string, string | string[]>;
  requirements?: string[];
}

export interface ClauseSection {
  id: string;
  title: string;
  fullText?: string;
  subsections?: Record<string, ClauseSection>;
  references?: {
    documents: string[];
    sections: string[];
    crossStandards: StandardReference[];
  };
  requirements?: string[];
  standard?: StandardReference;
}

export interface ClauseIndexEntry {
  index: number;
  value: string;
}

export interface WaClausesData {
  sections: Record<string, ClauseSection>;
  index: Record<string, ClauseIndexEntry>;
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