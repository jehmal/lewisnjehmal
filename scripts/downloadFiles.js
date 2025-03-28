const { OpenAI } = require('openai');
const path = require('path');
const dotenv = require('dotenv');
const fs = require('fs');

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

// All file IDs to download
const fileIds = [
    'file-G3BXD7HFHvZRGj3ABiQ8QM',
    'file-ECvXQJxcYDq5v6Hw4xjssa',
    'file-KqYo5atM4dYNApHxFZhq8n',
    'file-2RSVDTd3sf6qNh8MaE7nUj',
    'file-BByBUGPh5LtvUHn7s9BmS3',
    'file-Y2JRsc7HhcSn1iSkFuUTvR',
    'file-KRk6GkEnLPRvfCHdmhwPwV',
    'file-DDFG4tLUPRUyGA7NYHH5Vd',
    'file-WC4T4xzAieRebfCc9yZR9m',
    'file-CNLXstGhfCHsXQVkzSVfa3',
    'file-V4oRcaDvsa8Q6AQ7n6NqSL',
    'file-Rg2kMXsPe7JG91HJwnTpAh',
    'file-L17AmDg6BTYqh3Aij5gf8k',
    'file-U4DTAYw73pKV7Kdq9Eqp2T',
    'file-XVTxqeoadUiCHp4kcme61S'
];

async function downloadFiles() {
    try {
        console.log('Starting download of files...\n');
        
        // Create downloads directory if it doesn't exist
        const downloadsDir = path.join(__dirname, '..', 'downloads', 'files');
        if (!fs.existsSync(downloadsDir)) {
            fs.mkdirSync(downloadsDir, { recursive: true });
        }

        // Get list of all files from OpenAI
        const files = await openai.files.list();
        const fileMap = new Map(files.data.map(f => [f.id, f]));
        
        console.log('Downloading Files:');
        console.log('------------------');
        
        let successCount = 0;
        let failureCount = 0;
        
        // Download each file
        for (const fileId of fileIds) {
            console.log(`\nProcessing File ID: ${fileId}`);
            
            const file = fileMap.get(fileId);
            if (!file) {
                console.log(`❌ File not found in OpenAI`);
                failureCount++;
                continue;
            }
            
            console.log(`Filename: ${file.filename}`);
            console.log(`Purpose: ${file.purpose}`);
            console.log(`Size: ${(file.bytes / 1024 / 1024).toFixed(2)} MB`);
            console.log(`Created: ${new Date(file.created_at * 1000).toLocaleString()}`);
            
            try {
                // Download the file content
                const content = await openai.files.retrieveContent(fileId);
                
                // Create a directory for the file
                const fileDir = path.join(downloadsDir, fileId);
                if (!fs.existsSync(fileDir)) {
                    fs.mkdirSync(fileDir);
                }
                
                // Save the file content
                const timestamp = new Date(file.created_at * 1000).toISOString().replace(/[:.]/g, '-');
                const downloadPath = path.join(fileDir, `${file.filename}_${timestamp}.json`);
                fs.writeFileSync(downloadPath, content);
                console.log(`✓ Downloaded to: ${downloadPath}`);
                
                // Save metadata
                const metadataPath = path.join(fileDir, 'metadata.json');
                fs.writeFileSync(metadataPath, JSON.stringify({
                    file_id: fileId,
                    file_details: file,
                    downloaded_at: new Date().toISOString()
                }, null, 2));
                console.log(`✓ Metadata saved to: ${metadataPath}`);
                
                successCount++;
            } catch (downloadError) {
                console.error(`❌ Error downloading file:`, downloadError.message);
                failureCount++;
            }
            
            console.log('------------------');
        }
        
        console.log(`\nDownload Summary:`);
        console.log(`✓ Successfully downloaded: ${successCount} files`);
        console.log(`❌ Failed to download: ${failureCount} files`);
        console.log(`\nDownloads directory: ${downloadsDir}`);
        
    } catch (error) {
        console.error('Error downloading files:', error);
        throw error;
    }
}

// Run the function
downloadFiles()
    .then(() => {
        console.log('\nDownload process completed');
    })
    .catch(error => {
        console.error('\nProcess failed:', error);
        process.exit(1);
    }); 