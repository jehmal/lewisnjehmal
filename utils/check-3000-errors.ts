/**
 * Utility script to specifically check for errors in the 3000-2018 standard
 */

import fs from 'fs';
import path from 'path';
import { validateClauseFile } from './validate-clause';

async function check3000Errors(): Promise<void> {
  try {
    // Path to the 3000-2018 standard directory
    const standardDir = path.join(process.cwd(), 'lewisnjehmal', 'components', 'clauses', '3000-2018');
    
    if (!fs.existsSync(standardDir)) {
      // Try alternative path without 'lewisnjehmal' prefix
      const altStandardDir = path.join(process.cwd(), 'components', 'clauses', '3000-2018');
      
      if (fs.existsSync(altStandardDir)) {
        console.log(`Found 3000-2018 at alternate path: ${altStandardDir}`);
        // Continue with the alternate path
        runCheck(altStandardDir);
      } else {
        console.error(`3000-2018 directory not found at either:`);
        console.error(`- ${standardDir}`);
        console.error(`- ${altStandardDir}`);
      }
    } else {
      console.log(`Found 3000-2018 at: ${standardDir}`);
      // Continue with the standard path
      runCheck(standardDir);
    }
  } catch (error) {
    console.error('Error checking 3000-2018 standard:', (error as Error).message);
  }
}

function runCheck(standardDir: string): void {
  console.log(`Scanning ${standardDir} for files with issues...`);
  
  // Get all JSON files in the directory
  const files = fs.readdirSync(standardDir)
    .filter(file => file.endsWith('.json') && file !== 'index.json');
  
  // Count of files with errors and warnings
  let filesWithErrors = 0;
  let filesWithWarnings = 0;
  
  // Lists for specific issues
  const missingFullTextFiles: string[] = [];
  const emptyFullTextFiles: string[] = [];
  const emptyTitleFiles: string[] = [];
  const extraFieldsFiles: { file: string, fields: string[] }[] = [];
  
  // Check each file
  for (const file of files) {
    const filePath = path.join(standardDir, file);
    const result = validateClauseFile(filePath);
    
    if (!result.isValid) {
      filesWithErrors++;
      
      // Check for specific errors
      if (result.errors.some(e => e.includes("Missing required field: fullText"))) {
        missingFullTextFiles.push(file);
      }
    }
    
    if (result.warnings.length > 0) {
      filesWithWarnings++;
      
      // Check for specific warnings
      if (result.warnings.some(w => w.includes("Field 'fullText' is empty"))) {
        emptyFullTextFiles.push(file);
      }
      
      if (result.warnings.some(w => w.includes("Field 'title' is empty"))) {
        emptyTitleFiles.push(file);
      }
      
      const extraFieldsWarning = result.warnings.find(w => w.includes('Extra fields found:'));
      if (extraFieldsWarning) {
        const fieldsMatch = extraFieldsWarning.match(/Extra fields found: (.*)/);
        if (fieldsMatch && fieldsMatch[1]) {
          extraFieldsFiles.push({
            file,
            fields: fieldsMatch[1].split(', ')
          });
        }
      }
    }
  }
  
  // Display the summary
  console.log(`\nTotal files checked: ${files.length}`);
  console.log(`Files with errors: ${filesWithErrors}`);
  console.log(`Files with warnings: ${filesWithWarnings}`);
  
  // Display files missing fullText field
  if (missingFullTextFiles.length > 0) {
    console.log(`\nFiles missing 'fullText' field (${missingFullTextFiles.length}):`);
    missingFullTextFiles.forEach(file => console.log(`  - ${file}`));
  }
  
  // Display empty fullText warnings
  if (emptyFullTextFiles.length > 0) {
    console.log(`\nFiles with empty 'fullText' field (${emptyFullTextFiles.length}):`);
    emptyFullTextFiles.slice(0, 5).forEach(file => console.log(`  - ${file}`));
    
    if (emptyFullTextFiles.length > 5) {
      console.log(`  ... and ${emptyFullTextFiles.length - 5} more files`);
    }
  }
  
  // Display empty title warnings
  if (emptyTitleFiles.length > 0) {
    console.log(`\nFiles with empty 'title' field (${emptyTitleFiles.length}):`);
    emptyTitleFiles.slice(0, 5).forEach(file => console.log(`  - ${file}`));
    
    if (emptyTitleFiles.length > 5) {
      console.log(`  ... and ${emptyTitleFiles.length - 5} more files`);
    }
  }
  
  // Display files with extra fields
  if (extraFieldsFiles.length > 0) {
    console.log(`\nFiles with extra fields (${extraFieldsFiles.length}):`);
    
    // Group by fields
    const fieldGroups = new Map<string, string[]>();
    extraFieldsFiles.forEach(({ file, fields }) => {
      const key = fields.join(', ');
      if (!fieldGroups.has(key)) {
        fieldGroups.set(key, []);
      }
      fieldGroups.get(key)?.push(file);
    });
    
    // Show each group
    for (const [fields, files] of fieldGroups.entries()) {
      console.log(`  Extra fields: ${fields} (${files.length} files)`);
      
      // Show a few examples from each group
      files.slice(0, 3).forEach(file => console.log(`    - ${file}`));
      
      if (files.length > 3) {
        console.log(`    ... and ${files.length - 3} more files`);
      }
    }
  }
}

// Run the check if executed directly
if (require.main === module) {
  check3000Errors();
}

export { check3000Errors }; 