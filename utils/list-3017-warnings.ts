/**
 * Script to list all files with warnings in the 3017-2022 standard
 * 
 * This identifies specific clause files in the 3017-2022 standard
 * that have validation warnings and shows the warning details.
 */

import fs from 'fs';
import path from 'path';
import { validateClauseFile } from './validate-clause';

async function list3017Warnings(): Promise<void> {
  try {
    // Path to the 3017-2022 standard
    const standardDir = path.join(process.cwd(), 'components', 'clauses', '3017-2022');
    
    console.log(`Analyzing 3017-2022 standard at: ${standardDir}`);
    
    // Check if the directory exists
    if (!fs.existsSync(standardDir)) {
      console.error(`Directory not found: ${standardDir}`);
      return;
    }
    
    // Get all JSON files in the directory
    const files = fs.readdirSync(standardDir)
      .filter(file => file.endsWith('.json') && file !== 'index.json' && file !== 'index.ts');
    
    console.log(`Found ${files.length} clause files to check\n`);
    
    // Track warnings
    const filesWithWarnings: { 
      file: string; 
      warnings: string[];
      content?: any;
    }[] = [];
    
    // Check each file
    for (const file of files) {
      const filePath = path.join(standardDir, file);
      const result = validateClauseFile(filePath);
      
      if (result.warnings.length > 0) {
        const fileContent = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        filesWithWarnings.push({
          file,
          warnings: result.warnings,
          content: fileContent
        });
      }
    }
    
    // Sort files by warning type
    filesWithWarnings.sort((a, b) => {
      const aWarning = a.warnings[0] || '';
      const bWarning = b.warnings[0] || '';
      return aWarning.localeCompare(bWarning);
    });
    
    // Display results
    console.log(`Found ${filesWithWarnings.length} files with warnings:\n`);
    
    filesWithWarnings.forEach(({ file, warnings, content }) => {
      console.log(`${file}:`);
      warnings.forEach(warning => console.log(`  - ${warning}`));
      console.log(`  Content: ${JSON.stringify(content, null, 2)}`);
      console.log();
    });
    
    // Summarize warning types
    const warningTypes = new Map<string, number>();
    
    filesWithWarnings.forEach(({ warnings }) => {
      warnings.forEach(warning => {
        const count = warningTypes.get(warning) || 0;
        warningTypes.set(warning, count + 1);
      });
    });
    
    console.log('Warning type summary:');
    
    [...warningTypes.entries()]
      .sort((a, b) => b[1] - a[1]) // Sort by frequency
      .forEach(([warning, count]) => {
        console.log(`  ${count} occurrences: ${warning}`);
      });
      
  } catch (error) {
    console.error('Error listing warnings:', (error as Error).message);
  }
}

// Run the function if executed directly
if (require.main === module) {
  list3017Warnings();
}

export { list3017Warnings }; 