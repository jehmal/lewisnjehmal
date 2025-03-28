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

// File ID from embedding script
const FILE_ID = 'file-G3BXD7HFHvZRGj3ABiQ8QM';

async function checkFile() {
    try {
        console.log(`Checking file ${FILE_ID}...`);
        
        // List all files
        const files = await openai.files.list();
        console.log('\nAll available files:');
        files.data.forEach(file => {
            console.log(`- ${file.id} (${file.filename}, ${file.purpose})`);
        });
        
        // Try to retrieve our specific file
        const file = await openai.files.retrieve(FILE_ID);
        console.log('\nOur file details:', file);
        
    } catch (error) {
        console.error('Error checking file:', error);
        if (error.status === 404) {
            console.error('File not found. You may need to run the embedding script again.');
        }
    }
}

checkFile(); 