import { NextResponse } from 'next/server';
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const ASSISTANT_ID = 'asst_sljG2pcKWrSaQY3aWIsDFObe'; // Your actual assistant ID

async function createThread() {
  const thread = await openai.beta.threads.create();
  return thread.id;
}

async function addMessageToThread(threadId: string, message: string, assistantResponse: string) {
  await openai.beta.threads.messages.create(threadId, {
    role: "user",
    content: `Please fact-check the following response to the user's question:\n\nUser Question: ${message}\n\nAI Response: ${assistantResponse}\n\nVerify the accuracy of the AI's response and respond with 'CORRECT:' if the information is accurate, or 'INCORRECT:' followed by a brief explanation if there are any errors or inaccuracies. Then, provide a detailed explanation of your fact-check, including relevant sources if available.`
  });
}

async function runAssistant(threadId: string) {
  const run = await openai.beta.threads.runs.create(threadId, {
    assistant_id: ASSISTANT_ID
  });

  let runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);

  while (runStatus.status !== 'completed') {
    await new Promise(resolve => setTimeout(resolve, 1000));
    runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
  }
}

async function getAssistantResponse(threadId: string) {
  const messages = await openai.beta.threads.messages.list(threadId);
  const lastMessage = messages.data[0];
  const textContent = lastMessage.content.find(c => c.type === 'text');
  return textContent ? textContent.text.value : 'No text response available';
}

async function generateFactCheckResponse(message: string, assistantResponse: string): Promise<{ result: string; isCorrect: boolean }> {
  console.log("Starting fact-check response generation");

  try {
    const threadId = await createThread();
    await addMessageToThread(threadId, message, assistantResponse);
    await runAssistant(threadId);
    const response = await getAssistantResponse(threadId);

    console.log("Fact-check response generated successfully.");
    console.log("Response:", response);

    // Check if the response contains "CORRECT" or "INCORRECT" (case-insensitive)
    const isCorrect = /\bCORRECT\b/i.test(response);
    const isIncorrect = /\bINCORRECT\b/i.test(response);

    // If neither "CORRECT" nor "INCORRECT" is found, default to incorrect
    const result = isCorrect ? "CORRECT" : (isIncorrect ? "INCORRECT" : "UNCLEAR");

    return { 
      result: response, 
      isCorrect: result === "CORRECT"
    };
  } catch (error) {
    console.error('Error generating fact-check response:', error);
    return { 
      result: "An error occurred during fact-checking. Please try again later.",
      isCorrect: false
    };
  }
}

export async function POST(req: Request) {
  try {
    const { message, assistantResponse } = await req.json();
    const factCheckResult = await generateFactCheckResponse(message, assistantResponse);

    return NextResponse.json(factCheckResult);
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'An error occurred during fact-checking' }, { status: 500 });
  }
}