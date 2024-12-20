import { ClauseSection } from './clauses';

export interface TimelineEntry {
  title: string;
  content: React.ReactNode;
}

export interface Figure {
  name: string;
  title: string;
  image: string;
  quote: string;
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
}

export interface Message extends BaseMessage {
  isComplete: boolean;
  threadId: string;
  runId: string;
  figures?: Figure[];
  assistantId: string | null;
  referencedClauses?: ClauseSection[];
}

export interface ChatResponse {
  response: string;
  isComplete: boolean;
  threadId: string;
  runId: string;
  context: string;
  assistantId: string;
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
 