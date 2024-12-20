import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { ContinuationRequest, ChatResponse } from '@/types/chat';
import { checkResponseComplete } from '@/utils/chat';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const DEFAULT_ASSISTANT_ID = 'asst_0syunOVHoPe644xaWVGjgMdb';
const WA_STANDARDS_ASSISTANT_ID = 'asst_T1DnF1FCVP7dqOem77Zizi8L';

export async function POST(req: Request) {
  try {
    const { threadId, runId, previousContent, followUpQuestion, assistantId }: ContinuationRequest = await req.json();

    if (!threadId || !runId) {
      return NextResponse.json({ error: 'Missing thread or run ID' }, { status: 400 });
    }

    // Use the provided assistantId or determine which to use based on content
    const selectedAssistantId = assistantId || 
      (isWAStandardsQuery(followUpQuestion || previousContent) ? 
        WA_STANDARDS_ASSISTANT_ID : 
        DEFAULT_ASSISTANT_ID);

    // Create a continuation message with the follow-up question if provided
    await openai.beta.threads.messages.create(threadId, {
      role: "user",
      content: followUpQuestion ? 
        `Follow-up question: ${followUpQuestion}` : 
        "Please continue your previous response."
    });

    // Create new run with the selected assistant ID
    const run = await openai.beta.threads.runs.create(threadId, {
      assistant_id: selectedAssistantId,
    });

    // Poll for completion
    let runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
    while (runStatus.status !== 'completed') {
      if (runStatus.status === 'failed') {
        throw new Error('Assistant run failed: ' + runStatus.last_error?.message);
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
      runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
    }

    const messages = await openai.beta.threads.messages.list(threadId);
    const lastMessage = messages.data[0];

    let continuedContent = '';
    if (lastMessage.content[0].type === 'text') {
      continuedContent = lastMessage.content[0].text.value;
    }

    const isComplete = checkResponseComplete(continuedContent);

    const response: ChatResponse = {
      response: continuedContent,
      isComplete,
      threadId,
      runId: run.id,
      context: 'Continuation context',
      assistantId: selectedAssistantId
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in continuation:', error);
    return NextResponse.json({ 
      error: 'Failed to continue response',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Add the isWAStandardsQuery function here as well
const isWAStandardsQuery = (message: string): boolean => {
  const keywords = [
    'wa',
    'w.a',
    'w.a.',
    'w/a',
    'western australia',
    'western australian',
    'wa electrical',
    'wa standard',
    'western power',
    'waes'
  ];
  
  const lowercaseMessage = message.toLowerCase().trim();
  
  // Check for exact matches
  for (const keyword of keywords) {
    if (lowercaseMessage.includes(keyword)) {
      return true;
    }
  }
  
  // Check for word boundaries
  const messageWords = lowercaseMessage.split(/\s+/);
  return messageWords.some(word => 
    word === 'wa' || 
    word === 'w.a' || 
    word === 'w.a.' || 
    word === 'w/a'
  );
}; 