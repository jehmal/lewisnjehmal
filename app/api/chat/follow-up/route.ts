import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { DEFAULT_ASSISTANT_ID } from '@/lib/constants';
import { Message } from '@/types/chat';
import { extractClauseReferences } from '@/utils/figure-references';
import { findAusnzClauseByIdSync } from '@/lib/ausnzClauses';
import { findClauseById } from '@/lib/waClauses';
import { ClauseSection } from '@/types/clauses';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { message, originalMessageId, conversation, threadId, assistantId: requestedAssistantId } = await req.json();
    console.log('Incoming follow-up:', message);
    console.log('Original message ID:', originalMessageId);
    console.log('Conversation context:', conversation);
    console.log('Requested assistant ID:', requestedAssistantId);

    // Always use the default assistant or the requested one if provided
    const assistantId = requestedAssistantId || DEFAULT_ASSISTANT_ID;
    console.log('Using assistant ID:', assistantId);

    // Create a new thread if one is not provided
    const thread = threadId ? 
      await openai.beta.threads.retrieve(threadId) :
      await openai.beta.threads.create();

    // Add all previous messages to the thread for context
    if (conversation && conversation.length > 0) {
      await openai.beta.threads.messages.create(thread.id, {
        role: 'user',
        content: (conversation as Message[]).map(msg => msg.content).join('\n\n')
      });
    }

    // Add the follow-up question
    await openai.beta.threads.messages.create(thread.id, {
      role: 'user',
      content: message
    });

    // Run the assistant
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: assistantId
    });

    // Wait for the run to complete
    let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    while (runStatus.status !== 'completed') {
      if (runStatus.status === 'failed') {
        throw new Error('Assistant run failed');
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
      runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    }

    // Get the last message (the response)
    const messages = await openai.beta.threads.messages.list(thread.id);
    const lastMessage = messages.data[0];

    if (!lastMessage || !lastMessage.content[0] || lastMessage.content[0].type !== 'text') {
      throw new Error('No response received from assistant');
    }

    const responseContent = lastMessage.content[0].text.value;

    // Extract clause references from the response
    const clauseReferences = extractClauseReferences(responseContent);
    
    // Load the actual clause data
    const referencedClauses: ClauseSection[] = [];
    
    for (const reference of clauseReferences) {
      // Make sure the reference has a valid ID before processing
      if (!reference || !reference.id) {
        console.warn('Skipping invalid reference with undefined ID');
        continue;
      }
      
      const [standard, clauseId] = reference.id.split(':');
      
      // Skip if clauseId is undefined
      if (!clauseId) {
        console.warn(`Skipping clause with empty ID from: ${reference.id}`);
        continue;
      }
      
      let clause: ClauseSection | null = null;
      
      if (standard === 'WA') {
        clause = findClauseById(clauseId);
      } else {
        clause = findAusnzClauseByIdSync(clauseId);
      }
      
      if (clause) {
        referencedClauses.push(clause);
      }
    }

    return NextResponse.json({
      response: responseContent,
      threadId: thread.id,
      runId: run.id,
      assistantId: assistantId,
      isComplete: true,
      originalMessageId,
      referencedClauses: referencedClauses
    });

  } catch (error) {
    console.error('Error in follow-up chat:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An error occurred' },
      { status: 500 }
    );
  }
} 