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

// All standards to process
const standards = [
    { id: 'AS/NZS 2293.2-2019', fileId: 'file-ECvXQJxcYDq5v6Hw4xjssa', title: 'Emergency lighting and exit signs - Inspection and maintenance' },
    { id: 'AS/NZS 3001.1-2022', fileId: 'file-KqYo5atM4dYNApHxFZhq8n', title: 'Electrical installations - Transportable structures and vehicles' },
    { id: 'AS/NZS 3001.2-2022', fileId: 'file-2RSVDTd3sf6qNh8MaE7nUj', title: 'Electrical installations - Transportable structures and vehicles Part 2' },
    { id: 'AS/NZS 3003-2018', fileId: 'file-BByBUGPh5LtvUHn7s9BmS3', title: 'Electrical installations - Patient areas' },
    { id: 'AS/NZS 3004.2-2014', fileId: 'file-Y2JRsc7HhcSn1iSkFuUTvR', title: 'Electrical installations - Marinas and boats' },
    { id: 'AS/NZS 3010-2017', fileId: 'file-KRk6GkEnLPRvfCHdmhwPwV', title: 'Electrical installations - Generating sets' },
    { id: 'AS/NZS 3012-2019', fileId: 'file-DDFG4tLUPRUyGA7NYHH5Vd', title: 'Electrical installations - Construction and demolition sites' },
    { id: 'AS/NZS 3017-2022', fileId: 'file-WC4T4xzAieRebfCc9yZR9m', title: 'Electrical installations - Verification guidelines' },
    { id: 'AS/NZS 3019-2022', fileId: 'file-CNLXstGhfCHsXQVkzSVfa3', title: 'Electrical installations - Periodic verification' },
    { id: 'AS/NZS 3760-2022', fileId: 'file-V4oRcaDvsa8Q6AQ7n6NqSL', title: 'In-service safety inspection and testing of electrical equipment' },
    { id: 'AS/NZS 3820-2009', fileId: 'file-Rg2kMXsPe7JG91HJwnTpAh', title: 'Essential safety requirements for electrical equipment' },
    { id: 'AS/NZS 4509.1-2009', fileId: 'file-L17AmDg6BTYqh3Aij5gf8k', title: 'Stand-alone power systems - Safety and installation' },
    { id: 'AS/NZS 4509.2-2010', fileId: 'file-U4DTAYw73pKV7Kdq9Eqp2T', title: 'Stand-alone power systems - System design' },
    { id: 'AS/NZS 4777.1-2016', fileId: 'file-XVTxqeoadUiCHp4kcme61S', title: 'Grid connection of energy systems via inverters - Installation requirements' },
    { id: 'AS/NZS 4836-2023', fileId: 'file-G3BXD7HFHvZRGj3ABiQ8QM', title: 'Safe working on or near low-voltage electrical installations and equipment' }
];

async function downloadEmbeddings() {
    try {
        console.log('Starting to download embedded files...\n');
        
        // Create downloads directory if it doesn't exist
        const downloadsDir = path.join(__dirname, '..', 'downloads', 'standards', 'openai_files');
        if (!fs.existsSync(downloadsDir)) {
            fs.mkdirSync(downloadsDir, { recursive: true });
        }

        console.log('Downloading Files:');
        console.log('------------------');
        
        let successCount = 0;
        let failureCount = 0;
        
        // Get list of all files from OpenAI
        const files = await openai.files.list();
        const fileMap = new Map(files.data.map(f => [f.id, f]));
        
        // Process each standard
        for (const standard of standards) {
            console.log(`\nProcessing Standard: ${standard.id}`);
            console.log(`Title: ${standard.title}`);
            console.log(`File ID: ${standard.fileId}`);
            
            const file = fileMap.get(standard.fileId);
            if (!file) {
                console.log(`❌ File not found in OpenAI`);
                failureCount++;
                continue;
            }
            
            try {
                // Create a directory for the standard
                const standardDir = path.join(downloadsDir, standard.id.replace('/', '_'));
                if (!fs.existsSync(standardDir)) {
                    fs.mkdirSync(standardDir);
                }
                
                // Save metadata about the OpenAI file
                const metadataPath = path.join(standardDir, `${standard.id.replace('/', '_')}_openai_metadata.json`);
                fs.writeFileSync(metadataPath, JSON.stringify({
                    standard_id: standard.id,
                    title: standard.title,
                    file_id: standard.fileId,
                    file_details: {
                        filename: file.filename,
                        purpose: file.purpose,
                        size_bytes: file.bytes,
                        size_mb: (file.bytes / 1024 / 1024).toFixed(2),
                        created_at: new Date(file.created_at * 1000).toISOString(),
                        status: file.status
                    },
                    downloaded_at: new Date().toISOString()
                }, null, 2));
                console.log(`✓ OpenAI metadata saved to: ${metadataPath}`);
                
                successCount++;
            } catch (error) {
                console.error(`❌ Error processing ${standard.id}:`, error.message);
                failureCount++;
            }
            
            console.log('------------------');
        }
        
        console.log(`\nDownload Summary:`);
        console.log(`✓ Successfully processed: ${successCount} standards`);
        console.log(`❌ Failed to process: ${failureCount} standards`);
        console.log(`\nDownloads directory: ${downloadsDir}`);
        
    } catch (error) {
        console.error('Error downloading files:', error);
        throw error;
    }
}

// Run the function
downloadEmbeddings()
    .then(() => {
        console.log('\nDownload process completed');
    })
    .catch(error => {
        console.error('\nProcess failed:', error);
        process.exit(1);
    }); 