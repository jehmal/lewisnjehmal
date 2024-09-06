import { NextResponse } from 'next/server';
import { generateChatResponse } from '@/app/actions/openai';

export async function POST(request: Request) {
  console.log("Received POST request to /api/chat");
  const { message } = await request.json();

  if (!message) {
    console.log("Error: Message is required");
    return NextResponse.json({ error: 'Message is required' }, { status: 400 });
  }

  try {
    console.log("Generating chat response for message:", message);
    const { response, context } = await generateChatResponse(message);
    console.log("Chat response generated successfully.");
    console.log("Response:", response);
    console.log("Context:", context);
    return NextResponse.json({ response, context });
  } catch (error) {
    console.error('Error generating chat response:', error);
    return NextResponse.json({ error: 'An error occurred while processing your request' }, { status: 500 });
  }
}