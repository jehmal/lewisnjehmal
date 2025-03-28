import { 
  ClauseContent, 
  StandardReference, 
  BaseReference, 
  ClauseReference 
} from '@/types/references';
import { Message, Figure } from '@/types/chat';
import { TreeViewElement as FileTreeElement } from '@/components/ui/file-tree';
import { ClauseTreeViewElement } from '@/types/clauses';

// Extract interfaces from feature-block-animated-card.tsx
export interface ExtendedClauseContent extends Omit<ClauseContent, 'standard'> {
  id: string;
  standard?: StandardReference;
  fullText?: string;
}

export interface TreeViewElement extends FileTreeElement {
  id: string;
  standardDoc?: string;
  isSelectable: boolean;
  children?: TreeViewElement[];
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

export interface FollowUpInputProps {
  messageId: string;
  onSubmit: (input: string) => Promise<void>;
  onCancel: () => void;
}

export interface ExpandableAnswerProps {
  answerIndex: number;
  onClose: () => void;
  conversation: Message[];
}

export interface SearchResult {
  id: string;
  content: string;
  relevance: number;
  title?: string;
  source?: string;
}

export interface SearchResultProps {
  searchResults: SearchResult[];
  onClauseSelect: (clauseId: string, standardDoc?: string) => void;
}

export interface CardDemoProps {
  initialMessages?: Message[];
}
