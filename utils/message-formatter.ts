import { DatabaseMessage, Message } from '@/types/chat';
import { formatDateForDisplay } from '@/utils/date-formatter';

export function formatDatabaseMessage(dbMessage: DatabaseMessage): Message {
  console.log('Formatting message:', dbMessage);
  const formatted = {
    id: dbMessage.id,
    role: dbMessage.role,
    content: dbMessage.content,
    timestamp: formatDateForDisplay(dbMessage.created_at),
    created_at: dbMessage.created_at,
    user_id: dbMessage.user_id,
    related_question_id: dbMessage.related_question_id,
    isComplete: dbMessage.is_complete,
    threadId: dbMessage.thread_id,
    runId: dbMessage.run_id,
    assistantId: dbMessage.assistant_id,
    referencedClauses: dbMessage.referenced_clauses,
    figures: dbMessage.figures
  };
  console.log('Formatted result:', formatted);
  return formatted;
}

export function formatMessageForDatabase(message: Message): DatabaseMessage {
  return {
    id: message.id,
    role: message.role,
    content: message.content,
    created_at: message.created_at,
    user_id: message.user_id,
    related_question_id: message.related_question_id,
    is_complete: message.isComplete,
    thread_id: message.threadId,
    run_id: message.runId,
    assistant_id: message.assistantId,
    referenced_clauses: message.referencedClauses,
    figures: message.figures
  };
} 