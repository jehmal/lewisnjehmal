import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { ContinuationRequest, ChatResponse } from '@/types/chat';
import { checkResponseComplete } from '@/utils/chat';
import { parseAssistantResponse } from '@/utils/response-parser';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const DEFAULT_ASSISTANT_ID = 'asst_RgmjOwHZ3YTFWsBfIKu9XVIT';

export async function POST(req: Request) {
  try {
    const { threadId, runId, previousContent, followUpQuestion, assistantId }: ContinuationRequest = await req.json();

    if (!threadId || !runId) {
      return NextResponse.json({ error: 'Missing thread or run ID' }, { status: 400 });
    }

    // Use the provided assistantId or the default
    const selectedAssistantId = assistantId || DEFAULT_ASSISTANT_ID;
    console.log('Using assistant ID:', selectedAssistantId);

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

    // Parse the assistant's response to extract structured data
    console.log('Parsing continued assistant response...');
    const { structuredResponse, referencedClauses } = parseAssistantResponse(continuedContent);
    console.log('Structured response metadata:', structuredResponse.metadata);

    const response: ChatResponse = {
      response: continuedContent,
      isComplete,
      threadId,
      runId: run.id,
      context: 'Continuation context',
      assistantId: selectedAssistantId,
      referencedClauses: referencedClauses
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