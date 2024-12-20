import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { ChatResponse } from '@/types/chat';
import { checkResponseComplete } from '@/utils/chat';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const DEFAULT_ASSISTANT_ID = 'asst_0syunOVHoPe644xaWVGjgMdb';
const WA_STANDARDS_ASSISTANT_ID = 'asst_T1DnF1FCVP7dqOem77Zizi8L';

// Enhanced function to check if the message is related to WA electrical standards
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
  
  // Log the message being checked
  console.log('Checking message for WA keywords:', lowercaseMessage);
  
  // Check for exact matches first
  for (const keyword of keywords) {
    if (lowercaseMessage.includes(keyword)) {
      console.log('WA keyword matched:', keyword);
      return true;
    }
  }
  
  // Check for word boundaries to prevent partial matches
  const messageWords = lowercaseMessage.split(/\s+/);
  const waMatch = messageWords.some(word => 
    word === 'wa' || 
    word === 'w.a' || 
    word === 'w.a.' || 
    word === 'w/a'
  );
  
  if (waMatch) {
    console.log('WA abbreviation matched');
    return true;
  }
  
  console.log('No WA keywords matched, using AS/NZ assistant');
  return false;
};

export async function POST(req: Request) {
  try {
    const { message, assistantId, conversation, threadId } = await req.json();

    if (!Array.isArray(conversation)) {
      return NextResponse.json({ error: 'Conversation must be an array' }, { status: 400 });
    }

    // Log the incoming request
    console.log('Incoming message:', message);
    console.log('Current assistantId:', assistantId);

    // Determine which assistant to use based on the message content
    const shouldUseWAAssistant = isWAStandardsQuery(message);
    console.log('Should use WA Assistant:', shouldUseWAAssistant);

    const selectedAssistantId = shouldUseWAAssistant 
      ? WA_STANDARDS_ASSISTANT_ID 
      : DEFAULT_ASSISTANT_ID;

    console.log('Selected Assistant ID:', selectedAssistantId);

    const thread = threadId ? 
      { id: threadId } : 
      await openai.beta.threads.create();

    // Add all previous messages to the thread
    for (const msg of conversation) {
      if (typeof msg.role === 'string' && typeof msg.content === 'string') {
        await openai.beta.threads.messages.create(thread.id, {
          role: msg.role as 'user' | 'assistant',
          content: msg.content
        });
      }
    }

    // Add the new user message
    await openai.beta.threads.messages.create(thread.id, {
      role: "user",
      content: message
    });

    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: selectedAssistantId,
    });

    // Poll for the run to complete
    let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    while (runStatus.status !== 'completed') {
      if (runStatus.status === 'failed') {
        throw new Error('Assistant run failed: ' + runStatus.last_error?.message);
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
      runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    }

    const messages = await openai.beta.threads.messages.list(thread.id);
    const lastMessage = messages.data[0];

    // Handle different content types
    let responseContent = '';
    if (lastMessage.content[0].type === 'text') {
      responseContent = lastMessage.content[0].text.value;
    } else if (lastMessage.content[0].type === 'image_file') {
      responseContent = 'Image response received. [Image processing not implemented]';
    }

    // Check if response is complete
    const isComplete = checkResponseComplete(responseContent);

    const response: ChatResponse = {
      response: responseContent,
      isComplete,
      threadId: thread.id,
      runId: run.id,
      context: 'Context from assistant',
      assistantId: selectedAssistantId
    };

    // Log the response
    console.log('Sending response with Assistant ID:', selectedAssistantId);

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ 
      error: 'Failed to process the request',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}