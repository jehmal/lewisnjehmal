/**
 * This utility script tests that clauses can be loaded from all standard directories
 * Run it to verify that clause loading works for all standards
 */

import { clauseLoader } from '../services/clause-loader';
import { standardVersions } from '../services/standards-registry';
import fs from 'fs';
import path from 'path';

/**
 * Verify directories exist for all standards
 */
async function verifyDirectories() {
  const basePath = path.join(process.cwd(), 'components', 'clauses');
  console.log(`Checking for standard directories in: ${basePath}`);
  
  const results: Record<string, { exists: boolean, files: number }> = {};
  
  for (const [standardId, version] of Object.entries(standardVersions)) {
    const directoryName = `${standardId}-${version}`;
    const fullPath = path.join(basePath, directoryName);
    
    try {
      if (fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()) {
        // Count the number of JSON files in the directory
        const jsonFiles = fs.readdirSync(fullPath)
          .filter(file => file.endsWith('.json') && file !== 'index.json')
          .length;
        
        results[standardId] = { exists: true, files: jsonFiles };
        console.log(`Directory exists for standard ${standardId}: ${directoryName} (${jsonFiles} clause files)`);
      } else {
        results[standardId] = { exists: false, files: 0 };
        console.warn(`Directory does not exist for standard ${standardId}: ${directoryName}`);
      }
    } catch (error) {
      console.error(`Error checking directory for standard ${standardId}:`, error);
      results[standardId] = { exists: false, files: 0 };
    }
  }
  
  return results;
}

/**
 * Test loading clauses from all standards
 */
async function testAllStandards() {
  console.log('Starting clause loading test for all standards...');
  
  // First verify that all directories exist
  const directoryResults = await verifyDirectories();
  
  // Now test loading clauses from each standard
  const loadingResults = await clauseLoader.testAllStandards();
  
  // Combine results
  const combinedResults: Record<string, { 
    directoryExists: boolean, 
    fileCount: number, 
    loadingSucceeded: boolean 
  }> = {};
  
  for (const standardId of Object.keys(standardVersions)) {
    combinedResults[standardId] = {
      directoryExists: directoryResults[standardId]?.exists || false,
      fileCount: directoryResults[standardId]?.files || 0,
      loadingSucceeded: loadingResults[standardId] || false
    };
  }
  
  // Generate a report
  console.log('\n===== Standard Directory and Clause Loading Report =====');
  console.log('Standard ID | Directory Exists | File Count | Loading Test');
  console.log('--------------------------------------------------------');
  
  for (const [standardId, result] of Object.entries(combinedResults)) {
    console.log(
      `${standardId.padEnd(11)} | ` +
      `${result.directoryExists ? 'YES' : 'NO '} | ` +
      `${result.fileCount.toString().padStart(10)} | ` +
      `${result.loadingSucceeded ? 'PASSED' : 'FAILED'}`
    );
  }
  
  // Summary
  const totalStandards = Object.keys(combinedResults).length;
  const existingDirs = Object.values(combinedResults).filter(r => r.directoryExists).length;
  const loadingSucceeded = Object.values(combinedResults).filter(r => r.loadingSucceeded).length;
  
  console.log('\n===== Summary =====');
  console.log(`Total Standards: ${totalStandards}`);
  console.log(`Directories Found: ${existingDirs}/${totalStandards} (${Math.round(existingDirs/totalStandards*100)}%)`);
  console.log(`Loading Succeeded: ${loadingSucceeded}/${totalStandards} (${Math.round(loadingSucceeded/totalStandards*100)}%)`);
  
  return combinedResults;
}

// Only run the test if this file is executed directly
if (require.main === module) {
  testAllStandards().then(() => {
    console.log('Clause loading test completed');
    process.exit(0);
  }).catch(error => {
    console.error('Error running clause loading test:', error);
    process.exit(1);
  });
}

export { testAllStandards, verifyDirectories }; 