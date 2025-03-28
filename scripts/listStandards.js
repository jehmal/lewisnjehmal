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

// Standards we've worked with
const standards = [
    { id: 'AS/NZS 3820-2009', fileId: 'file-WC4T4xzAieRebfCc9yZR9m', title: 'Essential safety requirements for electrical equipment' },
    { id: 'AS/NZS 4777.1-2016', fileId: 'file-Rg2kMXsPe7JG91HJwnTpAh', title: 'Grid connection of energy systems via inverters - Part 1: Installation requirements' },
    { id: 'AS/NZS 4509.1-2009', fileId: 'file-CNLXstGhfCHsXQVkzSVfa3', title: 'Stand-alone power systems - Part 1: Safety and installation' },
    { id: 'AS/NZS 4509.2-2010', fileId: 'file-G3BXD7HFHvZRGj3ABiQ8QM', title: 'Stand-alone power systems - Part 2: System design' },
    { id: 'AS/NZS 4836-2023', fileId: 'file-L17AmDg6BTYqh3Aij5gf8k', title: 'Safe working on or near low-voltage electrical installations and equipment' },
    { id: 'AS/NZS 5033-2021', fileId: 'file-U4DTAYw73pKV7Kdq9Eqp2T', title: 'Installation and safety requirements for photovoltaic (PV) arrays' },
    { id: 'AS/NZS 5139-2019', fileId: 'file-XVTxqeoadUiCHp4kcme61S', title: 'Electrical installations - Safety of battery systems for use with power conversion equipment' }
];

async function listStandards() {
    try {
        console.log('Standards Added to Vector Store:\n');
        console.log('--------------------------------');
        
        // Get list of all files
        const files = await openai.files.list();
        
        // Create a map of file IDs to file objects
        const fileMap = new Map(files.data.map(f => [f.id, f]));
        
        // List each standard and its details
        standards.forEach((standard, index) => {
            const file = fileMap.get(standard.fileId);
            console.log(`\n${index + 1}. ${standard.id}`);
            console.log(`   Title: ${standard.title}`);
            console.log(`   File ID: ${standard.fileId}`);
            if (file) {
                console.log(`   Created: ${new Date(file.created_at * 1000).toLocaleString()}`);
                console.log(`   Size: ${(file.bytes / 1024 / 1024).toFixed(2)} MB`);
                console.log(`   Status: ${file.status}`);
            } else {
                console.log('   Status: File not found in OpenAI');
            }
            console.log('--------------------------------');
        });
        
        // Save the list to a file
        const outputDir = path.join(__dirname, '..', 'standards_list');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir);
        }
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const outputPath = path.join(outputDir, `standards_list_${timestamp}.json`);
        
        fs.writeFileSync(outputPath, JSON.stringify({
            generated_at: new Date().toISOString(),
            standards: standards.map(std => ({
                ...std,
                file_details: fileMap.get(std.fileId) || null
            }))
        }, null, 2));
        
        console.log(`\nList saved to: ${outputPath}`);
        
    } catch (error) {
        console.error('Error listing standards:', error);
        throw error;
    }
}

// Run the function
listStandards()
    .then(() => {
        console.log('\nListing completed');
    })
    .catch(error => {
        console.error('\nProcess failed:', error);
        process.exit(1);
    }); 