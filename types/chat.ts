import { TreeViewElement } from '@/components/ui/file-tree';
import { ClauseSection, ClauseTreeViewElement } from '@/types/clauses';

export interface TimelineEntry {
  title: string;
  content: React.ReactNode;
}

export interface Figure {
  name: string;
  title: string;
  image: string;
  quote: string;
  possiblePaths?: string[]; // Array of possible image paths to try
  standardDoc?: string; // The standard document this figure belongs to
  isFallback?: boolean; // Whether this is a fallback figure with a placeholder image
  validated?: boolean;
}

export interface BaseMessage {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  context?: string | null;
  timestamp?: string;
  created_at: string;
  good_response?: boolean;
  neutral_response?: boolean;
  bad_response?: boolean;
  user_id?: string;
  related_question_id?: string;
}

export interface DatabaseMessage extends BaseMessage {
  is_complete: boolean;
  thread_id: string;
  run_id: string;
  assistant_id: string | null;
  referenced_clauses?: ClauseSection[];
  figures?: Figure[];
  is_follow_up?: boolean;
}

export interface Message extends BaseMessage {
  isComplete: boolean;
  threadId: string;
  runId: string;
  figures?: Figure[];
  assistantId: string | null;
  referencedClauses?: ClauseTreeViewElement[];
  isFollowUp?: boolean;
  contextText?: string; // For storing non-JSON context data
}

export interface ChatResponse {
  response: string;
  isComplete: boolean;
  threadId: string;
  runId: string;
  context: string;
  assistantId: string;
  referencedClauses?: ClauseSection[];
  figures?: Figure[];
}

// New interface for structured assistant responses
export interface StructuredAssistantResponse {
  // Natural language response (unchanged)
  response: string;
  
  // Structured metadata
  metadata: {
    // Referenced clauses with their IDs and titles
    referencedClauses: Array<{
      id: string;
      title: string;
      standard: string; // "AUSNZ" or "WA"
      standardDoc?: string; // The standard document folder (e.g., "3000", "3001.1-2022")
    }>;
    
    // Referenced figures and tables
    figures?: Figure[];
  };
}

export interface ContinuationRequest {
  threadId: string;
  runId: string;
  previousContent: string;
  followUpQuestion?: string;
  assistantId?: string;
}

export interface MessageWithContinuation extends BaseMessage {
  isComplete: boolean;
  threadId?: string;
  runId?: string;
}
 