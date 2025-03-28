import { OpenAI } from 'openai';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';
import fs from 'fs';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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

// Constants
const VECTOR_STORE_ID = 'vs_67b976d809148191bdaa017681ee5897';
const STANDARD_ID = 'AS/NZS 5139-2019';
const BATCH_SIZE = 100;

async function uploadFileToVectorStore(filePath) {
    try {
        // First upload the file to OpenAI
        const fileUploadResponse = await openai.files.create({
            file: fs.createReadStream(filePath),
            purpose: 'assistants'
        });

        // Then add the file to the vector store
        const response = await axios.post(
            `https://api.openai.com/v1/vector_stores/${VECTOR_STORE_ID}/files`,
            {
                file_id: fileUploadResponse.id,
                chunking_strategy: {
                    type: "static",
                    static: {
                        max_chunk_size_tokens: 800,
                        chunk_overlap_tokens: 400
                    }
                }
            },
            {
                headers: {
                    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                    'Content-Type': 'application/json',
                    'OpenAI-Beta': 'assistants=v2'
                }
            }
        );
        
        return response.data;
    } catch (error) {
        console.error('Error uploading file:', error);
        throw error;
    }
}

async function addStandardToVectorStore() {
    try {
        console.log(`Adding ${STANDARD_ID} to vector store...\n`);
        
        // Get the embeddings directory
        const embeddingsDir = path.join(__dirname, '..', 'downloads', 'standards', 'embeddings', 'AS_NZS_5139-2019');
        
        if (!fs.existsSync(embeddingsDir)) {
            throw new Error(`Embeddings directory not found: ${embeddingsDir}`);
        }

        // Get all JSON files
        const files = fs.readdirSync(embeddingsDir)
            .filter(file => file.endsWith('.json'))
            .map(file => ({
                name: file,
                path: path.join(embeddingsDir, file)
            }));

        console.log(`Found ${files.length} files to process`);
        
        let successCount = 0;
        let failureCount = 0;
        
        for (const file of files) {
            try {
                console.log(`Processing ${file.name}`);
                const result = await uploadFileToVectorStore(file.path);
                console.log(`Successfully uploaded ${file.name}`);
                successCount++;
            } catch (error) {
                console.error(`Error processing ${file.name}:`, error.message);
                failureCount++;
            }
            
            // Add delay between files to respect rate limits
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        console.log('\nVector store update summary:');
        console.log(`✓ Successfully added: ${successCount} files`);
        console.log(`❌ Failed to add: ${failureCount} files`);
        console.log(`Vector Store ID: ${VECTOR_STORE_ID}`);
        
    } catch (error) {
        console.error('Error adding to vector store:', error);
        throw error;
    }
}

// Run the function
addStandardToVectorStore()
    .then(() => {
        console.log('\nVector store update completed');
    })
    .catch(error => {
        console.error('\nProcess failed:', error);
        process.exit(1);
    }); 