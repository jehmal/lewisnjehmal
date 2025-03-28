import { OpenAI } from 'openai';
import * as path from 'path';
import dotenv from 'dotenv';

// Define types for file operations
interface AssistantFile {
    id: string;
    object: string;
    created_at: number;
    assistant_id: string;
}

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });

// Verify API key exists
if (!process.env.OPENAI_API_KEY) {
    console.error('Error: OPENAI_API_KEY not found in .env.local');
    process.exit(1);
}

// Initialize OpenAI client
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// Assistant IDs
const DEFAULT_ASSISTANT_ID = 'asst_RgmjOwHZ3YTFWsBfIKu9XVIT';
const WA_STANDARDS_ASSISTANT_ID = 'asst_T1DnF1FCVP7dqOem77Zizi8L';
const NEW_ASSISTANT_ID = 'asst_RgmjOwHZ3YTFWsBfIKu9XVIT';

async function updateAssistant(assistantId: string, fileId: string) {
    try {
        // Get current assistant
        const assistant = await openai.beta.assistants.retrieve(assistantId);
        
        // Get current files attached to the assistant
        const files = await (openai.beta.assistants as any).files.list(assistantId);
        const currentFileIds = files.data.map((file: AssistantFile) => file.id);
        
        // Check if file is already attached
        if (!currentFileIds.includes(fileId)) {
            // Create a new file attachment
            await (openai.beta.assistants as any).files.create(
                assistantId,
                { file_id: fileId }
            );
            console.log(`Successfully attached file ${fileId} to assistant ${assistantId}`);
        } else {
            console.log(`File ${fileId} is already attached to assistant ${assistantId}`);
        }
        
        // Update assistant with existing configuration
        const updatedAssistant = await openai.beta.assistants.update(
            assistantId,
            {
                tools: assistant.tools,
                model: assistant.model,
                name: assistant.name,
                description: assistant.description,
                instructions: assistant.instructions,
                metadata: assistant.metadata
            }
        );
        
        console.log('Updated assistant:', updatedAssistant.id);
        return updatedAssistant;
    } catch (error) {
        console.error('Error updating assistant:', error);
        throw error;
    }
}

// File ID from your previous script
const FILE_ID = 'file-G3BXD7HFHvZRGj3ABiQ8QM';

// Update all assistants
Promise.all([
    updateAssistant(DEFAULT_ASSISTANT_ID, FILE_ID),
    updateAssistant(WA_STANDARDS_ASSISTANT_ID, FILE_ID)
])
.then(() => {
    console.log('Successfully updated assistants');
})
.catch(error => {
    console.error('Failed to update assistants:', error);
}); 