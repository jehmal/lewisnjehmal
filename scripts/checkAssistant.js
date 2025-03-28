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

async function checkAssistant(assistantId) {
    try {
        // Get assistant details
        const assistant = await openai.beta.assistants.retrieve(assistantId);
        
        console.log(`\nAssistant: ${assistant.name || assistantId}`);
        console.log('Model:', assistant.model);
        console.log('Files:', assistant.file_ids);
        
        // List all files attached to the assistant
        const files = await openai.beta.assistants.files.list(assistantId);
        console.log('Attached files:', files.data);
        
        return assistant;
    } catch (error) {
        console.error('Error checking assistant:', error);
        throw error;
    }
}

// Check all assistants
Promise.all([
    checkAssistant(DEFAULT_ASSISTANT_ID),
    checkAssistant(WA_STANDARDS_ASSISTANT_ID)
])
.then(() => {
    console.log('\nCheck completed');
})
.catch(error => {
    console.error('Failed to check assistants:', error);
}); 