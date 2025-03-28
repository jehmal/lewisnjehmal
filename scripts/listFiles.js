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

async function listAllFiles() {
    try {
        console.log('Retrieving all uploaded files...\n');
        
        // List all files
        const files = await openai.files.list();
        
        console.log('Files uploaded to OpenAI:');
        console.log('------------------------');
        
        files.data.forEach(file => {
            console.log(`\nFile ID: ${file.id}`);
            console.log(`Filename: ${file.filename}`);
            console.log(`Purpose: ${file.purpose}`);
            console.log(`Created at: ${new Date(file.created_at * 1000).toLocaleString()}`);
            console.log(`Status: ${file.status}`);
            console.log('------------------------');
        });
        
        console.log(`\nTotal files: ${files.data.length}`);
        
    } catch (error) {
        console.error('Error retrieving files:', error);
        throw error;
    }
}

// Run the function
listAllFiles()
    .then(() => {
        console.log('\nFile listing completed');
    })
    .catch(error => {
        console.error('\nProcess failed:', error);
        process.exit(1);
    }); 