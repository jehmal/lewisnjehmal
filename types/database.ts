export interface DatabaseMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  user_id: string;
  context?: any;
  related_question_id?: string;
  good_response?: boolean;
  neutral_response?: boolean;
  bad_response?: boolean;
  thread_id: string;
  run_id: string;
  assistant_id: string | null;
  is_complete: boolean;
} 