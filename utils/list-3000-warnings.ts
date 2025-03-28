/**
 * Utility script to list all files with warnings in the 3000-2018 standard
 */

import fs from 'fs';
import path from 'path';
import { validateClauseFile } from './validate-clause';

async function list3000Warnings(): Promise<void> {
  try {
    // Path to the 3000-2018 standard
    const standardDir = path.join(process.cwd(), 'components', 'clauses', '3000-2018');
    const altStandardDir = path.join(process.cwd(), 'lewisnjehmal', 'components', 'clauses', '3000-2018');
    
    let workingDir = '';
    
    // Check if the standard directory exists
    if (fs.existsSync(standardDir)) {
      workingDir = standardDir;
    } else if (fs.existsSync(altStandardDir)) {
      workingDir = altStandardDir;
    } else {
      console.error(`3000-2018 directory not found at either:`);
      console.error(`- ${standardDir}`);
      console.error(`- ${altStandardDir}`);
      return;
    }
    
    console.log(`Found 3000-2018 at: ${workingDir}`);
    
    // Get all JSON files in the directory
    const files = fs.readdirSync(workingDir)
      .filter(file => file.endsWith('.json') && file !== 'index.json' && file !== 'index.ts');
    
    // Group files by their extra fields
    const extraFieldsMap = new Map<string, string[]>();
    let totalFilesWithWarnings = 0;
    
    console.log(`Checking ${files.length} files for warnings...`);
    
    // Check each file
    for (const file of files) {
      const filePath = path.join(workingDir, file);
      const result = validateClauseFile(filePath);
      
      // Check if file has extra fields warning
      const extraFieldsWarning = result.warnings.find(w => w.includes('Extra fields found:'));
      
      if (extraFieldsWarning) {
        totalFilesWithWarnings++;
        
        // Extract the names of extra fields
        const extraFieldsMatch = extraFieldsWarning.match(/Extra fields found: (.*)/);
        
        if (extraFieldsMatch && extraFieldsMatch[1]) {
          const extraFields = extraFieldsMatch[1];
          
          if (!extraFieldsMap.has(extraFields)) {
            extraFieldsMap.set(extraFields, []);
          }
          
          extraFieldsMap.get(extraFields)?.push(file);
        }
      }
    }
    
    // Display the results
    console.log(`\nTotal files with extra fields: ${totalFilesWithWarnings}`);
    console.log('\n========== FILES WITH EXTRA FIELDS ==========\n');
    
    // Sort by number of files (most common extra field combinations first)
    const sortedGroups = [...extraFieldsMap.entries()]
      .sort((a, b) => b[1].length - a[1].length);
    
    for (const [extraFields, fileList] of sortedGroups) {
      console.log(`Extra fields: ${extraFields} (${fileList.length} files):`);
      // Sort files alphanumerically
      fileList.sort().forEach(file => {
        console.log(`  - ${file}`);
      });
      console.log('');
    }
    
  } catch (error) {
    console.error('Error listing 3000-2018 warnings:', (error as Error).message);
  }
}

// Run the check if executed directly
if (require.main === module) {
  list3000Warnings();
}

export { list3000Warnings }; 