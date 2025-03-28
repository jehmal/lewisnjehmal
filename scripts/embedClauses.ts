import { OpenAI } from 'openai';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

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

// Types
interface Clause {
    id: string;
    title: string;
    fullText: string;
    figures?: any[];
    references?: string[];
}

interface ProcessedClause extends Clause {
    standard_id: string;
    version_year: string;
    parent_clause?: string;
}

// Utility functions
const getParentClause = (clauseId: string): string | undefined => {
    const parts = clauseId.split('.');
    if (parts.length <= 1) return undefined;
    return parts.slice(0, -1).join('.');
};

const extractYear = (standardId: string): string => {
    const match = standardId.match(/\d{4}/);
    return match ? match[0] : '';
};

// Main processing functions
async function generateEmbedding(text: string) {
    try {
        const response = await openai.embeddings.create({
            model: "text-embedding-ada-002",
            input: text,
        });
        return response.data[0].embedding;
    } catch (error) {
        console.error('Error generating embedding:', error);
        throw error;
    }
}

async function processClause(clause: Clause, standardId: string): Promise<any> {
    // Standard title information
    const standardTitle = "Electrical installations - Safety of battery systems for use with power conversion equipment";

    // Create contextual text for embedding with standard title
    const contextualText = `
        Standard: AS/NZS ${standardId}
        Standard Title: ${standardTitle}
        Clause: ${clause.id}
        Title: ${clause.title}
        Content: ${clause.fullText}
    `.trim();

    // Generate embedding
    const embedding = await generateEmbedding(contextualText);

    // Process metadata with additional standard information
    const metadata = {
        standard_id: standardId,
        standard_title: standardTitle,
        clause_id: clause.id,
        title: clause.title,
        parent_clause: getParentClause(clause.id),
        version_year: extractYear(standardId),
        figures: clause.figures || [],
        references: clause.references || []
    };

    return {
        id: `${standardId}_${clause.id}`,
        values: embedding,
        metadata
    };
}

async function processClauses(standardId: string) {
    // Use absolute path to avoid any path resolution issues
    const projectRoot = path.resolve(__dirname, '..');
    const clausesDirectory = path.join(projectRoot, 'components', 'clauses', standardId);
    
    try {
        // Verify directory exists
        if (!fs.existsSync(clausesDirectory)) {
            throw new Error(`Directory not found: ${clausesDirectory}`);
        }

        // Read all JSON files in the directory
        const files = fs.readdirSync(clausesDirectory)
            .filter(file => file.endsWith('.json'));

        if (files.length === 0) {
            throw new Error(`No JSON files found in ${clausesDirectory}`);
        }

        console.log(`Found ${files.length} clause files in ${standardId}`);

        // Create a temporary file to store all clauses
        const tempFilePath = path.join(projectRoot, 'temp_clauses.json');
        const processedClauses: any[] = [];

        // Process files in batches
        const BATCH_SIZE = 100;
        for (let i = 0; i < files.length; i += BATCH_SIZE) {
            const batch = files.slice(i, i + BATCH_SIZE);
            
            for (const file of batch) {
                const filePath = path.join(clausesDirectory, file);
                try {
                    const fileContent = fs.readFileSync(filePath, 'utf-8');
                    try {
                        const clauseData = JSON.parse(fileContent);
                        const processed = await processClause(clauseData, standardId);
                        processedClauses.push(processed);
                        console.log(`Processed clause ${clauseData.id}`);
                    } catch (parseError: any) {
                        console.error(`Error parsing JSON in file ${file}:`);
                        console.error('File content:', fileContent);
                        console.error('Parse error:', parseError);
                        throw new Error(`JSON parse error in file ${file}: ${parseError.message}`);
                    }
                } catch (readError: any) {
                    console.error(`Error reading file ${file}:`, readError);
                    throw new Error(`Failed to read file ${file}: ${readError.message}`);
                }
            }

            console.log(`Processed batch ${Math.floor(i / BATCH_SIZE) + 1} of ${Math.ceil(files.length / BATCH_SIZE)}`);
            
            // Add delay between batches to respect rate limits
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // Write all processed clauses as a single JSON array
        fs.writeFileSync(tempFilePath, JSON.stringify(processedClauses, null, 2));

        // Upload the file to OpenAI
        console.log('Uploading processed clauses to OpenAI...');
        const file = await openai.files.create({
            file: fs.createReadStream(tempFilePath),
            purpose: 'assistants'
        });

        console.log(`File uploaded successfully with ID: ${file.id}`);

        // Clean up temporary file
        fs.unlinkSync(tempFilePath);

        console.log(`Completed processing ${standardId}`);
        return file.id;
    } catch (error) {
        console.error(`Error processing ${standardId}:`, error);
        throw error;
    }
}

// Execute for new standard
const STANDARD_ID = '5139-2019';

console.log(`Starting embedding process for ${STANDARD_ID}`);
processClauses(STANDARD_ID)
    .then((fileId) => {
        console.log('Process completed successfully');
        console.log('File ID:', fileId);
        console.log('You can now use this file ID to add to the vector store');
    })
    .catch(error => console.error('Process failed:', error)); 