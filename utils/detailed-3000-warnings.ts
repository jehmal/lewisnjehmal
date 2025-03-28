/**
 * Utility script to show detailed information about warnings in the 3000-2018 standard
 */

import fs from 'fs';
import path from 'path';
import { validateClauseFile } from './validate-clause';

async function detailed3000Warnings(): Promise<void> {
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
    
    // Create maps to track files by warning type
    const emptyFullTextFiles: string[] = [];
    const emptyTitleFiles: string[] = [];
    const idFormatWarningFiles: { file: string; id: string }[] = [];
    const otherWarningFiles: { file: string; warnings: string[] }[] = [];
    
    let totalFilesWithWarnings = 0;
    
    console.log(`Checking ${files.length} files for warnings...`);
    
    // Check each file
    for (const file of files) {
      const filePath = path.join(workingDir, file);
      const result = validateClauseFile(filePath);
      
      // Check if file has any warnings
      if (result.warnings.length > 0) {
        totalFilesWithWarnings++;
        
        // Categorize warnings by type
        const hasEmptyFullText = result.warnings.some(w => w.includes("Field 'fullText' is empty"));
        const hasEmptyTitle = result.warnings.some(w => w.includes("Field 'title' is empty"));
        const idFormatWarning = result.warnings.find(w => w.includes("ID format may not follow convention"));
        
        if (hasEmptyFullText) {
          emptyFullTextFiles.push(file);
        }
        
        if (hasEmptyTitle) {
          emptyTitleFiles.push(file);
        }
        
        if (idFormatWarning) {
          const idMatch = idFormatWarning.match(/ID format may not follow convention: ([^.]+)/);
          if (idMatch && idMatch[1]) {
            idFormatWarningFiles.push({ file, id: idMatch[1] });
          }
        }
        
        // Catch any other warnings
        const otherWarnings = result.warnings.filter(w => 
          !w.includes("Field 'fullText' is empty") && 
          !w.includes("Field 'title' is empty") && 
          !w.includes("ID format may not follow convention")
        );
        
        if (otherWarnings.length > 0) {
          otherWarningFiles.push({ file, warnings: otherWarnings });
        }
        
        // Let's also print the contents of files with warnings to inspect
        try {
          const content = fs.readFileSync(filePath, 'utf8');
          const data = JSON.parse(content);
          console.log(`\nFile: ${file}`);
          console.log(`Warnings: ${result.warnings.join(', ')}`);
          console.log('Content:');
          console.log(JSON.stringify(data, null, 2));
        } catch (e) {
          console.error(`Error reading file ${file}: ${(e as Error).message}`);
        }
      }
    }
    
    // Display the results
    console.log(`\n=== WARNINGS SUMMARY FOR 3000-2018 ===`);
    console.log(`Total files with warnings: ${totalFilesWithWarnings}`);
    
    if (emptyFullTextFiles.length > 0) {
      console.log(`\nFiles with empty fullText field (${emptyFullTextFiles.length}):`);
      emptyFullTextFiles.forEach(file => console.log(`  - ${file}`));
    }
    
    if (emptyTitleFiles.length > 0) {
      console.log(`\nFiles with empty title field (${emptyTitleFiles.length}):`);
      emptyTitleFiles.forEach(file => console.log(`  - ${file}`));
    }
    
    if (idFormatWarningFiles.length > 0) {
      console.log(`\nFiles with ID format warnings (${idFormatWarningFiles.length}):`);
      idFormatWarningFiles.forEach(({ file, id }) => console.log(`  - ${file}: ${id}`));
    }
    
    if (otherWarningFiles.length > 0) {
      console.log(`\nFiles with other warnings (${otherWarningFiles.length}):`);
      otherWarningFiles.forEach(({ file, warnings }) => {
        console.log(`  - ${file}:`);
        warnings.forEach(warning => console.log(`      ${warning}`));
      });
    }
    
  } catch (error) {
    console.error('Error checking 3000-2018 warnings:', (error as Error).message);
  }
}

// Run the check if executed directly
if (require.main === module) {
  detailed3000Warnings();
}

export { detailed3000Warnings }; 