const { OpenAI } = require('openai');
const path = require('path');
const dotenv = require('dotenv');

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

async function updateAssistant(assistantId, fileId) {
    try {
        console.log(`\nUpdating assistant ${assistantId} with file ${fileId}...`);
        
        // First, update the assistant to ensure it has the file_ids field
        const updatedAssistant = await openai.beta.assistants.update(assistantId, {
            file_ids: [fileId]
        });
        
        console.log('\nAssistant updated:');
        console.log('Name:', updatedAssistant.name);
        console.log('Model:', updatedAssistant.model);
        
        // Now try to access the files directly
        try {
            const files = await openai.beta.assistants.files.list(assistantId);
            console.log('\nAttached files:', files.data);
        } catch (fileError) {
            console.log('Note: Could not list files directly, but update may have succeeded');
        }
        
        return updatedAssistant;
    } catch (error) {
        console.error(`Error updating assistant ${assistantId}:`, error);
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
    console.log('\nSuccessfully updated assistants');
})
.catch(error => {
    console.error('Failed to update assistants:', error);
}); 