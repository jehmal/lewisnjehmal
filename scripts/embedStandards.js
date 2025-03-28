const { OpenAI } = require('openai');
const fs = require('fs');
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

// Map of directory names to standard IDs and titles
const STANDARDS_MAP = {
    '2293.2-2019': {
        id: 'AS/NZS 2293.2-2019',
        title: 'Emergency lighting and exit signs - Inspection and maintenance'
    },
    '3001.1-2022': {
        id: 'AS/NZS 3001.1-2022',
        title: 'Electrical installations - Transportable structures and vehicles'
    },
    '3001.2-2022': {
        id: 'AS/NZS 3001.2-2022',
        title: 'Electrical installations - Transportable structures and vehicles Part 2'
    },
    '3003-2018': {
        id: 'AS/NZS 3003-2018',
        title: 'Electrical installations - Patient areas'
    },
    '3004.2-2014': {
        id: 'AS/NZS 3004.2-2014',
        title: 'Electrical installations - Marinas and boats'
    },
    '3010-2017': {
        id: 'AS/NZS 3010-2017',
        title: 'Electrical installations - Generating sets'
    },
    '3012-2019': {
        id: 'AS/NZS 3012-2019',
        title: 'Electrical installations - Construction and demolition sites'
    },
    '3017-2022': {
        id: 'AS/NZS 3017-2022',
        title: 'Electrical installations - Verification guidelines'
    },
    '3019-2022': {
        id: 'AS/NZS 3019-2022',
        title: 'Electrical installations - Periodic verification'
    },
    '3760-2022': {
        id: 'AS/NZS 3760-2022',
        title: 'In-service safety inspection and testing of electrical equipment'
    },
    '3820-2009': {
        id: 'AS/NZS 3820-2009',
        title: 'Essential safety requirements for electrical equipment'
    },
    '4509.1-2009': {
        id: 'AS/NZS 4509.1-2009',
        title: 'Stand-alone power systems - Safety and installation'
    },
    '4509.2-2010': {
        id: 'AS/NZS 4509.2-2010',
        title: 'Stand-alone power systems - System design'
    },
    '4777.1-2016': {
        id: 'AS/NZS 4777.1-2016',
        title: 'Grid connection of energy systems via inverters - Installation requirements'
    },
    '4836-2023': {
        id: 'AS/NZS 4836-2023',
        title: 'Safe working on or near low-voltage electrical installations and equipment'
    },
    '5033-2021': {
        id: 'AS/NZS 5033-2021',
        title: 'Installation and safety requirements for photovoltaic (PV) arrays'
    },
    '5139-2019': {
        id: 'AS/NZS 5139-2019',
        title: 'Electrical installations - Safety of battery systems for use with power conversion equipment'
    },
    '3000': {
        id: 'AS/NZS 3000-2018',
        title: 'Electrical installations (known as the Australian/New Zealand Wiring Rules)'
    }
};

async function generateEmbedding(text) {
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

async function processClause(standardInfo, clauseFile, embeddingsDir) {
    try {
        // Read and parse clause
        const content = JSON.parse(fs.readFileSync(clauseFile.path, 'utf8'));
        
        // Create unique identifier for this clause
        const uniqueId = `${standardInfo.id.replace('/', '_').replace(' ', '_')}_${content.id}`;
        
        // Create standardId for filename (without spaces or special characters)
        const standardFileId = standardInfo.id.toLowerCase()
            .replace('/', '')
            .replace(' ', '')
            .replace(/[-\.]/g, '');
        
        // Create contextual text for embedding
        const contextualText = `
            Standard: ${standardInfo.id}
            Standard Title: ${standardInfo.title}
            Clause: ${content.id}
            Title: ${content.title}
            Content: ${content.fullText}
        `.trim();
        
        // Generate embedding
        const embedding = await generateEmbedding(contextualText);
        
        // Create embedded clause object
        const embeddedClause = {
            id: uniqueId,
            standard_id: standardInfo.id,
            standard_title: standardInfo.title,
            clause_id: content.id,
            clause_title: content.title,
            clause_content: content.fullText,
            embedding: embedding,
            created_at: new Date().toISOString()
        };
        
        // Create standard directory in embeddings if it doesn't exist
        const standardDir = path.join(embeddingsDir, standardInfo.id.replace('/', '_').replace(' ', '_'));
        if (!fs.existsSync(standardDir)) {
            fs.mkdirSync(standardDir, { recursive: true });
        }
        
        // Save embedded clause with standard ID in filename
        const outputPath = path.join(standardDir, `${standardFileId}_clause_${content.id.replace(/\./g, '_')}.json`);
        fs.writeFileSync(outputPath, JSON.stringify(embeddedClause, null, 2));
        
        // Save metadata with standard ID in filename
        const metadataPath = path.join(standardDir, `${standardFileId}_clause_${content.id.replace(/\./g, '_')}_metadata.json`);
        fs.writeFileSync(metadataPath, JSON.stringify({
            unique_id: uniqueId,
            standard_id: standardInfo.id,
            standard_title: standardInfo.title,
            clause_id: content.id,
            clause_title: content.title,
            source_file: clauseFile.path,
            created_at: new Date().toISOString(),
            embedding_model: "text-embedding-ada-002",
            embedding_version: "v1"
        }, null, 2));
        
        return true;
    } catch (error) {
        console.error(`Error processing clause ${clauseFile.name}:`, error.message);
        return false;
    }
}

async function processStandard(standardDir) {
    const standardInfo = STANDARDS_MAP[standardDir];
    console.log(`\nProcessing ${standardInfo.id}...`);
    
    try {
        // Read all JSON files in the standard directory
        const clausesDir = path.join(__dirname, '..', 'components', 'clauses', standardDir);
        const files = fs.readdirSync(clausesDir)
            .filter(file => file.endsWith('.json'))
            .map(file => ({
                name: file,
                path: path.join(clausesDir, file)
            }));
            
        console.log(`Found ${files.length} clauses`);
        
        // Create embeddings directory if it doesn't exist
        const outputDir = path.join(__dirname, '..', 'downloads', 'standards');
        const embeddingsDir = path.join(outputDir, 'embeddings');
        if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
        if (!fs.existsSync(embeddingsDir)) fs.mkdirSync(embeddingsDir);
        
        // Process each clause
        let successCount = 0;
        let failureCount = 0;
        
        for (const file of files) {
            const success = await processClause(standardInfo, file, embeddingsDir);
            if (success) {
                successCount++;
                if (successCount % 10 === 0) {
                    console.log(`  Progress: ${successCount}/${files.length} clauses`);
                }
            } else {
                failureCount++;
            }
            
            // Add a small delay between embeddings
            await new Promise(resolve => setTimeout(resolve, 200));
        }
        
        console.log(`\nStandard Processing Summary:`);
        console.log(`✓ Successfully processed: ${successCount} clauses`);
        console.log(`❌ Failed to process: ${failureCount} clauses`);
        
        return { successCount, failureCount };
    } catch (error) {
        console.error(`Error processing ${standardInfo.id}:`, error);
        return { successCount: 0, failureCount: 0 };
    }
}

async function embedAllStandards() {
    try {
        console.log('Starting to process all standards...\n');
        
        // Get all directories in the clauses folder
        const clausesDir = path.join(__dirname, '..', 'components', 'clauses');
        const directories = fs.readdirSync(clausesDir, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name);
        
        console.log(`Found ${directories.length} standard directories`);
        
        let totalSuccess = 0;
        let totalFailure = 0;
        
        // Process each standard
        for (const dir of directories) {
            if (STANDARDS_MAP[dir]) {
                const { successCount, failureCount } = await processStandard(dir);
                totalSuccess += successCount;
                totalFailure += failureCount;
                
                // Add a delay between standards
                await new Promise(resolve => setTimeout(resolve, 1000));
            } else {
                console.log(`⚠️ Unknown standard directory: ${dir}, skipping...`);
            }
        }
        
        console.log('\nFinal Embedding Summary:');
        console.log(`✓ Total successfully processed clauses: ${totalSuccess}`);
        console.log(`❌ Total failed clauses: ${totalFailure}`);
        console.log(`Total clauses processed: ${totalSuccess + totalFailure}`);
        
    } catch (error) {
        console.error('Error embedding standards:', error);
        throw error;
    }
}

// Run the function
embedAllStandards()
    .then(() => {
        console.log('\nAll standards embedding completed');
    })
    .catch(error => {
        console.error('\nProcess failed:', error);
        process.exit(1);
    }); 