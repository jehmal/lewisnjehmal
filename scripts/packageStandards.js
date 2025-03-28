const fs = require('fs');
const path = require('path');

// Only process AS/NZS 3000
const standard = {
    id: 'AS/NZS 3000-2018',
    dir: '3000',
    title: 'Electrical installations (known as the Australian/New Zealand Wiring Rules)'
};

async function packageStandards() {
    try {
        console.log('Starting to package AS/NZS 3000...\n');
        
        // Create downloads directory if it doesn't exist
        const downloadsDir = path.join(__dirname, '..', 'downloads', 'standards');
        if (!fs.existsSync(downloadsDir)) {
            fs.mkdirSync(downloadsDir, { recursive: true });
        }

        console.log('Packaging Standard:');
        console.log('------------------');
        
        try {
            // Source directory with the clauses
            const sourceDir = path.join(__dirname, '..', 'components', 'clauses', standard.dir);
            
            if (!fs.existsSync(sourceDir)) {
                throw new Error(`Source directory not found: ${sourceDir}`);
            }
            
            // Create a directory for the standard
            const standardDir = path.join(downloadsDir, standard.id.replace('/', '_').replace(' ', '_'));
            if (!fs.existsSync(standardDir)) {
                fs.mkdirSync(standardDir);
            }
            
            // Read all JSON files in the source directory
            const files = fs.readdirSync(sourceDir)
                .filter(file => file.endsWith('.json'))
                .map(file => ({
                    name: file,
                    path: path.join(sourceDir, file)
                }));
            
            console.log(`Found ${files.length} clauses`);
            
            // Combine all clauses into one object
            const combinedStandard = {
                id: standard.id,
                title: standard.title,
                clauses: {},
                created_at: new Date().toISOString(),
                total_clauses: files.length
            };
            
            // Process each clause
            for (const file of files) {
                const content = JSON.parse(fs.readFileSync(file.path, 'utf8'));
                combinedStandard.clauses[content.id] = content;
            }
            
            // Save the combined file
            const outputPath = path.join(standardDir, `${standard.id.replace('/', '_').replace(' ', '_')}_complete.json`);
            fs.writeFileSync(outputPath, JSON.stringify(combinedStandard, null, 2));
            console.log(`✓ Saved to: ${outputPath}`);
            
            // Save metadata
            const metadataPath = path.join(standardDir, `${standard.id.replace('/', '_').replace(' ', '_')}_metadata.json`);
            fs.writeFileSync(metadataPath, JSON.stringify({
                standard_id: standard.id,
                title: standard.title,
                total_clauses: files.length,
                created_at: new Date().toISOString(),
                source_directory: standard.dir
            }, null, 2));
            console.log(`✓ Metadata saved to: ${metadataPath}`);
            
            console.log('\nPackaging Summary:');
            console.log(`✓ Successfully packaged AS/NZS 3000 with ${files.length} clauses`);
            console.log(`\nDownloads directory: ${downloadsDir}`);
            
        } catch (error) {
            console.error(`❌ Error processing AS/NZS 3000:`, error.message);
            throw error;
        }
        
    } catch (error) {
        console.error('Error packaging standard:', error);
        throw error;
    }
}

// Run the function
packageStandards()
    .then(() => {
        console.log('\nPackaging process completed');
    })
    .catch(error => {
        console.error('\nProcess failed:', error);
        process.exit(1);
    }); 