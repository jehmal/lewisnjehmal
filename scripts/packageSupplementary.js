const fs = require('fs');
const path = require('path');

// Additional files to package
const supplementaryFiles = [
    { id: 'file-ECvXQJxcYDq5v6Hw4xjssa', title: 'Supplementary Standard 1' },
    { id: 'file-KqYo5atM4dYNApHxFZhq8n', title: 'Supplementary Standard 2' },
    { id: 'file-2RSVDTd3sf6qNh8MaE7nUj', title: 'Supplementary Standard 3' },
    { id: 'file-BByBUGPh5LtvUHn7s9BmS3', title: 'Supplementary Standard 4' },
    { id: 'file-Y2JRsc7HhcSn1iSkFuUTvR', title: 'Supplementary Standard 5' },
    { id: 'file-KRk6GkEnLPRvfCHdmhwPwV', title: 'Supplementary Standard 6' },
    { id: 'file-DDFG4tLUPRUyGA7NYHH5Vd', title: 'Supplementary Standard 7' },
    { id: 'file-V4oRcaDvsa8Q6AQ7n6NqSL', title: 'Supplementary Standard 8' }
];

async function packageSupplementary() {
    try {
        console.log('Starting to package supplementary files...\n');
        
        // Create supplementary directory under standards
        const baseDir = path.join(__dirname, '..', 'downloads', 'standards');
        const supplementaryDir = path.join(baseDir, 'supplementary');
        if (!fs.existsSync(supplementaryDir)) {
            fs.mkdirSync(supplementaryDir, { recursive: true });
        }

        console.log('Packaging Supplementary Files:');
        console.log('-----------------------------');
        
        let successCount = 0;
        let failureCount = 0;
        
        // Process each file
        for (const file of supplementaryFiles) {
            console.log(`\nProcessing File ID: ${file.id}`);
            console.log(`Title: ${file.title}`);
            
            try {
                // Create a directory for each file
                const fileDir = path.join(supplementaryDir, file.id);
                if (!fs.existsSync(fileDir)) {
                    fs.mkdirSync(fileDir);
                }
                
                // Look for the file in components/clauses
                const clausesDir = path.join(__dirname, '..', 'components', 'clauses');
                let foundClauses = false;
                
                // Try to find a matching directory
                const dirs = fs.readdirSync(clausesDir);
                for (const dir of dirs) {
                    const sourceDir = path.join(clausesDir, dir);
                    if (fs.statSync(sourceDir).isDirectory()) {
                        const files = fs.readdirSync(sourceDir)
                            .filter(f => f.endsWith('.json'))
                            .map(f => ({
                                name: f,
                                path: path.join(sourceDir, f)
                            }));
                            
                        if (files.length > 0) {
                            console.log(`Found ${files.length} clauses in ${dir}`);
                            
                            // Combine all clauses into one object
                            const combinedContent = {
                                id: file.id,
                                title: file.title,
                                source_directory: dir,
                                clauses: {},
                                created_at: new Date().toISOString(),
                                total_clauses: files.length
                            };
                            
                            // Process each clause
                            for (const f of files) {
                                const content = JSON.parse(fs.readFileSync(f.path, 'utf8'));
                                combinedContent.clauses[content.id] = content;
                            }
                            
                            // Save the combined file
                            const outputPath = path.join(fileDir, `${file.id}_complete.json`);
                            fs.writeFileSync(outputPath, JSON.stringify(combinedContent, null, 2));
                            console.log(`✓ Saved to: ${outputPath}`);
                            
                            // Save metadata
                            const metadataPath = path.join(fileDir, 'metadata.json');
                            fs.writeFileSync(metadataPath, JSON.stringify({
                                file_id: file.id,
                                title: file.title,
                                source_directory: dir,
                                total_clauses: files.length,
                                created_at: new Date().toISOString()
                            }, null, 2));
                            console.log(`✓ Metadata saved to: ${metadataPath}`);
                            
                            foundClauses = true;
                            break;
                        }
                    }
                }
                
                if (!foundClauses) {
                    console.log(`❌ No clauses found for ${file.id}`);
                    failureCount++;
                    continue;
                }
                
                successCount++;
            } catch (error) {
                console.error(`❌ Error processing ${file.id}:`, error.message);
                failureCount++;
            }
            
            console.log('-----------------------------');
        }
        
        console.log(`\nPackaging Summary:`);
        console.log(`✓ Successfully packaged: ${successCount} files`);
        console.log(`❌ Failed to package: ${failureCount} files`);
        console.log(`\nSupplementary directory: ${supplementaryDir}`);
        
    } catch (error) {
        console.error('Error packaging supplementary files:', error);
        throw error;
    }
}

// Run the function
packageSupplementary()
    .then(() => {
        console.log('\nPackaging process completed');
    })
    .catch(error => {
        console.error('\nProcess failed:', error);
        process.exit(1);
    }); 