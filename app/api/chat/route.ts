import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  const { message, assistantId, conversation } = await req.json();

  try {
    const thread = await openai.beta.threads.create();

    // Add all previous messages to the thread
    for (const msg of conversation) {
      await openai.beta.threads.messages.create(thread.id, {
        role: msg.role,
        content: msg.content
      });
    }

    // Add the new user message
    await openai.beta.threads.messages.create(thread.id, {
      role: "user",
      content: message
    });

    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: assistantId,
    });

    // Poll for the run to complete
    let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    while (runStatus.status !== 'completed') {
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

    return NextResponse.json({ response: responseContent });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Failed to process the request' }, { status: 500 });
  }
}