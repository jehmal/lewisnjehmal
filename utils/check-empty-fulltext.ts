/**
 * Utility script to check for empty fullText fields across all standards
 */

import fs from 'fs';
import path from 'path';
import { validateClauseFile } from './validate-clause';

async function checkEmptyFullText(): Promise<void> {
  try {
    // Path to all standards
    const clausesDir = path.join(process.cwd(), 'lewisnjehmal', 'components', 'clauses');
    
    if (!fs.existsSync(clausesDir)) {
      console.error(`Clauses directory not found: ${clausesDir}`);
      return;
    }
    
    // Get all standard directories
    const standardDirs = fs.readdirSync(clausesDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory() && dirent.name.includes('-'))
      .map(dirent => dirent.name);
    
    console.log(`Found ${standardDirs.length} standard directories to check`);
    
    // Track files with empty fullText fields
    const emptyFullTextFiles: { standard: string; file: string }[] = [];
    const emptyTitleFiles: { standard: string; file: string }[] = [];
    
    // Process each standard directory
    for (const standard of standardDirs) {
      const standardDir = path.join(clausesDir, standard);
      console.log(`\nChecking ${standard}...`);
      
      // Get all JSON files in the directory
      const files = fs.readdirSync(standardDir)
        .filter(file => file.endsWith('.json') && file !== 'index.json' && file !== 'index.ts');
      
      // Check each file
      for (const file of files) {
        const filePath = path.join(standardDir, file);
        const result = validateClauseFile(filePath);
        
        if (result.warnings.length > 0) {
          // Check for empty fullText
          if (result.warnings.some(w => w.includes("Field 'fullText' is empty"))) {
            emptyFullTextFiles.push({ standard, file });
          }
          
          // Check for empty title
          if (result.warnings.some(w => w.includes("Field 'title' is empty"))) {
            emptyTitleFiles.push({ standard, file });
          }
        }
      }
    }
    
    // Display summary
    console.log('\n----------------------------------------');
    console.log('EMPTY FIELD SUMMARY');
    console.log('----------------------------------------');
    console.log(`Total files with empty fullText: ${emptyFullTextFiles.length}`);
    console.log(`Total files with empty title: ${emptyTitleFiles.length}`);
    
    // Group empty fullText files by standard
    if (emptyFullTextFiles.length > 0) {
      console.log('\nFiles with empty fullText field:');
      
      const groupedByStandard = new Map<string, string[]>();
      emptyFullTextFiles.forEach(({ standard, file }) => {
        if (!groupedByStandard.has(standard)) {
          groupedByStandard.set(standard, []);
        }
        groupedByStandard.get(standard)?.push(file);
      });
      
      // Display grouped results
      for (const [standard, files] of groupedByStandard.entries()) {
        console.log(`\n${standard} (${files.length} files):`);
        files.slice(0, 10).forEach(file => console.log(`  - ${file}`));
        
        if (files.length > 10) {
          console.log(`  ... and ${files.length - 10} more files`);
        }
      }
    }
    
    // Group empty title files by standard
    if (emptyTitleFiles.length > 0) {
      console.log('\nFiles with empty title field:');
      
      const groupedByStandard = new Map<string, string[]>();
      emptyTitleFiles.forEach(({ standard, file }) => {
        if (!groupedByStandard.has(standard)) {
          groupedByStandard.set(standard, []);
        }
        groupedByStandard.get(standard)?.push(file);
      });
      
      // Display grouped results
      for (const [standard, files] of groupedByStandard.entries()) {
        console.log(`\n${standard} (${files.length} files):`);
        files.slice(0, 10).forEach(file => console.log(`  - ${file}`));
        
        if (files.length > 10) {
          console.log(`  ... and ${files.length - 10} more files`);
        }
      }
    }
    
  } catch (error) {
    console.error('Error checking empty fields:', (error as Error).message);
  }
}

// Run the check if executed directly
if (require.main === module) {
  checkEmptyFullText();
}

export { checkEmptyFullText }; 