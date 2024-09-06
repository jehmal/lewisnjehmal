import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const ASSISTANT_ID = 'asst_sljG2pcKWrSaQY3aWIsDFObe'; // Your actual assistant ID

async function createThread() {
  const thread = await openai.beta.threads.create();
  return thread.id;
}

async function addMessageToThread(threadId: string, message: string) {
  await openai.beta.threads.messages.create(threadId, {
    role: "user",
    content: message
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
  return lastMessage.content[0].text.value;
}

export async function generateChatResponse(message: string): Promise<{ response: string; context: string }> {
  console.log("Starting chat response generation for message:", message);

  try {
    const threadId = await createThread();
    await addMessageToThread(threadId, message);
    await runAssistant(threadId);
    const response = await getAssistantResponse(threadId);

    console.log("Chat response generated successfully.");
    console.log("Response:", response);

    return { response, context: "Context from assistant" };
  } catch (error) {
    console.error('Error generating chat response:', error);
    return { 
      response: "I encountered an error while processing your request. Please try again later.",
      context: ""
    };
  }
}