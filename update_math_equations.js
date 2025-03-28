require('dotenv').config({ path: './.env.local' });

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const VECTOR_STORE_ID = 'vs_67b976d809148191bdaa017681ee5897';

if (!OPENAI_API_KEY) {
    console.error('Missing OpenAI API key. Please make sure .env.local is properly configured.');
    process.exit(1);
}

// Files to update with properly formatted math equations
const filesToUpdate = [
    'components/clauses/3000-2018/2.5.3.1.json',
    'components/clauses/3000-2018/2.5.4.2.json',
    'components/clauses/3000-2018/2.5.5.3.json',
    'components/clauses/3000-2018/2.5.7.2.3.json',
    'components/clauses/3000-2018/3.4.4.json'
];

// Get a list of existing files in the vector store
async function listVectorStoreFiles() {
    try {
        console.log('Listing existing files in vector store...');
        
        const response = await axios.get(
            `https://api.openai.com/v1/vector_stores/${VECTOR_STORE_ID}/files`,
            {
                headers: {
                    'Authorization': `Bearer ${OPENAI_API_KEY}`,
                    'Content-Type': 'application/json',
                    'OpenAI-Beta': 'assistants=v2'
                }
            }
        );
        
        return response.data.data;
    } catch (error) {
        console.error('Error listing vector store files:', error.response?.data || error.message);
        return [];
    }
}

// Delete a file from the vector store
async function deleteVectorStoreFile(fileId) {
    try {
        console.log(`Deleting file ${fileId} from vector store...`);
        
        const response = await axios.delete(
            `https://api.openai.com/v1/vector_stores/${VECTOR_STORE_ID}/files/${fileId}`,
            {
                headers: {
                    'Authorization': `Bearer ${OPENAI_API_KEY}`,
                    'Content-Type': 'application/json',
                    'OpenAI-Beta': 'assistants=v2'
                }
            }
        );
        
        console.log(`File ${fileId} deleted successfully!`);
        return response.data;
    } catch (error) {
        console.error(`Error deleting file ${fileId}:`, error.response?.data || error.message);
        throw error;
    }
}

// Process files into a combined document for better embedding
async function processFilesIntoDocument() {
    const tempDir = path.join(__dirname, 'temp');
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir);
    }

    // Combined document approach - process all files into a single document
    let combinedContent = {
        "standard": "AS/NZS 3000:2018",
        "clauses": []
    };

    for (const filePath of filesToUpdate) {
        if (!fs.existsSync(filePath)) {
            console.error(`File not found: ${filePath}`);
            continue;
        }

        try {
            const fileContent = fs.readFileSync(filePath, 'utf8');
            const parsedContent = JSON.parse(fileContent);
            
            console.log(`Processing ${filePath}...`);
            
            combinedContent.clauses.push({
                id: parsedContent.id,
                title: parsedContent.title,
                fullText: parsedContent.fullText
            });
        } catch (error) {
            console.error(`Error processing ${filePath}:`, error);
        }
    }

    // Create a single combined file for better embedding
    const combinedFilePath = path.join(tempDir, 'asnzs30002018_math_equations.json');
    fs.writeFileSync(combinedFilePath, JSON.stringify(combinedContent, null, 2), 'utf8');
    
    console.log(`Created combined file: ${combinedFilePath}`);
    return combinedFilePath;
}

// Also create individual files with standardized naming for the vector store
async function prepareIndividualFiles() {
    const tempDir = path.join(__dirname, 'temp');
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir);
    }

    const preparedFiles = [];

    for (const filePath of filesToUpdate) {
        if (!fs.existsSync(filePath)) {
            console.error(`File not found: ${filePath}`);
            continue;
        }

        try {
            const fileContent = fs.readFileSync(filePath, 'utf8');
            const parsedContent = JSON.parse(fileContent);
            
            // Format file name for vector store
            // Convert format from "2.5.3.1.json" to "asnzs30002018_clause_2_5_3_1.json"
            const fileName = path.basename(filePath);
            const clauseId = fileName.replace('.json', '');
            const formattedFileName = `asnzs30002018_clause_${clauseId.replace(/\./g, '_')}.json`;
            
            const tempFilePath = path.join(tempDir, formattedFileName);
            fs.writeFileSync(tempFilePath, JSON.stringify(parsedContent, null, 2), 'utf8');
            
            console.log(`Prepared file: ${formattedFileName}`);
            preparedFiles.push({
                path: tempFilePath,
                name: formattedFileName,
                clauseId: clauseId
            });
        } catch (error) {
            console.error(`Error preparing ${filePath}:`, error);
        }
    }

    return preparedFiles;
}

// Upload file to OpenAI
async function uploadFileToOpenAI(filePath, fileName) {
    console.log(`Uploading ${fileName}...`);
    
    const formData = new FormData();
    formData.append('file', fs.createReadStream(filePath));
    formData.append('purpose', 'assistants');

    try {
        const response = await axios.post('https://api.openai.com/v1/files', formData, {
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                'Content-Type': `multipart/form-data; boundary=${formData.getBoundary()}`,
                'OpenAI-Beta': 'assistants=v2'
            }
        });
        
        return {
            fileId: response.data.id,
            fileName: fileName
        };
    } catch (error) {
        console.error(`Error uploading ${fileName}:`, error.response?.data || error.message);
        throw error;
    }
}

// Add file to vector store
async function addFileToVectorStore(fileInfo) {
    try {
        console.log(`Adding ${fileInfo.fileName} to vector store...`);
        
        const response = await axios.post(
            `https://api.openai.com/v1/vector_stores/${VECTOR_STORE_ID}/files`,
            {
                file_id: fileInfo.fileId,
                chunking_strategy: {
                    type: "static",
                    static: {
                        max_chunk_size_tokens: 512,
                        chunk_overlap_tokens: 64
                    }
                }
            },
            {
                headers: {
                    'Authorization': `Bearer ${OPENAI_API_KEY}`,
                    'Content-Type': 'application/json',
                    'OpenAI-Beta': 'assistants=v2'
                }
            }
        );
        
        console.log(`Successfully added ${fileInfo.fileName} to vector store!`);
        return response.data;
    } catch (error) {
        console.error(`Error adding ${fileInfo.fileName} to vector store:`, error.response?.data || error.message);
        throw error;
    }
}

// Remove files from the vector store that match our clause patterns
async function removeOldFiles() {
    try {
        // Get list of existing files in the vector store
        const existingFiles = await listVectorStoreFiles();
        console.log(`Found ${existingFiles.length} files in vector store`);
        
        // File name pattern to match against
        const fileNamePatterns = filesToUpdate.map(file => {
            const fileName = path.basename(file).replace('.json', '');
            return `asnzs30002018_clause_${fileName.replace(/\./g, '_')}`;
        });
        
        // Add combined file pattern
        fileNamePatterns.push('asnzs30002018_math_equations');
        
        // Find files to delete
        const filesToDelete = existingFiles.filter(file => {
            // Check if this is one of our math equation files by pattern matching
            return fileNamePatterns.some(pattern => 
                file.id.includes(pattern) || 
                (file.filename && file.filename.includes(pattern))
            );
        });
        
        console.log(`Found ${filesToDelete.length} files to delete from vector store`);
        
        // Delete old files
        for (const file of filesToDelete) {
            await deleteVectorStoreFile(file.id);
        }
        
        console.log('Old files removed successfully');
    } catch (error) {
        console.error('Error removing old files:', error);
    }
}

// Main process function
async function processFiles() {
    try {
        // First, remove old files from the vector store
        await removeOldFiles();
        
        // Process files into a single document for better context
        const combinedFilePath = await processFilesIntoDocument();
        
        // Also prepare individual files with standard naming
        const preparedFiles = await prepareIndividualFiles();
        
        // Upload combined file first
        const combinedFileInfo = await uploadFileToOpenAI(
            combinedFilePath, 
            path.basename(combinedFilePath)
        );
        console.log(`Combined file uploaded to OpenAI with ID: ${combinedFileInfo.fileId}`);
        
        // Add combined file to vector store
        const combinedResult = await addFileToVectorStore(combinedFileInfo);
        console.log(`Combined file added to vector store:`, combinedResult);
        
        // Upload individual files
        for (const file of preparedFiles) {
            // Upload file to OpenAI
            const fileInfo = await uploadFileToOpenAI(file.path, file.name);
            console.log(`File uploaded to OpenAI with ID: ${fileInfo.fileId}`);
            
            // Add file to vector store
            const result = await addFileToVectorStore(fileInfo);
            console.log(`File added to vector store:`, result);
        }
        
        console.log('Update completed successfully');
        
        // Clean up temp directory
        const tempDir = path.join(__dirname, 'temp');
        fs.rm(tempDir, { recursive: true, force: true }, (err) => {
            if (err) {
                console.error(`Error cleaning up temp directory: ${err}`);
            } else {
                console.log('Temp directory cleaned up');
            }
        });
    } catch (error) {
        console.error('Error during update process:', error);
    }
}

// Start the update process
processFiles()
    .then(() => console.log('All files processed successfully'))
    .catch(console.error); 