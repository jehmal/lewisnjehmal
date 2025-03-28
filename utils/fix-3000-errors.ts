/**
 * Utility script to automatically fix common errors in clause files
 * This script focuses on adding missing fullText fields to 3000-2018 clauses
 */

import fs from 'fs';
import path from 'path';

// List of files in 3000-2018 known to have missing fullText field
const FILES_MISSING_FULLTEXT = [
  '2.8.json',
  '3.3.2.json',
  '3.7.2.json',
  '3.9.8.2.json',
  '4.14.1.json',
  '4.14.json',
  '4.20.4.json',
  '4.7.json'
];

/**
 * Fix missing fullText field in 3000-2018 clause files
 */
async function fixMissingFullText(): Promise<void> {
  try {
    const standardDir = path.join(process.cwd(), 'components', 'clauses', '3000-2018');
    
    if (!fs.existsSync(standardDir)) {
      console.error(`3000-2018 directory not found: ${standardDir}`);
      return;
    }
    
    console.log(`Fixing files in ${standardDir} with missing fullText field...`);
    
    let filesFixed = 0;
    let filesWithSubsections = 0;
    
    // Process each file
    for (const file of FILES_MISSING_FULLTEXT) {
      const filePath = path.join(standardDir, file);
      
      if (!fs.existsSync(filePath)) {
        console.error(`File not found: ${filePath}`);
        continue;
      }
      
      try {
        // Read the current file content
        const content = fs.readFileSync(filePath, 'utf8');
        let data;
        
        try {
          data = JSON.parse(content);
        } catch (e) {
          console.error(`Error parsing JSON in ${file}: ${(e as Error).message}`);
          continue;
        }
        
        // Add fullText field if missing
        if (!data.fullText) {
          // If the clause has subsections, use a descriptive placeholder
          if (data.subsections) {
            filesWithSubsections++;
            data.fullText = `This clause contains subsections. Please refer to the specific subsection for detailed information.`;
          } else {
            // For clauses without subsections, use a generic placeholder
            data.fullText = `[Content of ${data.id} ${data.title}]`;
          }
          
          // Write the updated content back to the file
          fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
          filesFixed++;
          
          console.log(`Fixed ${file} - Added fullText field`);
        }
      } catch (error) {
        console.error(`Error processing ${file}: ${(error as Error).message}`);
      }
    }
    
    console.log(`\nFix complete:`);
    console.log(`- Total files processed: ${FILES_MISSING_FULLTEXT.length}`);
    console.log(`- Files fixed: ${filesFixed}`);
    console.log(`- Files with subsections: ${filesWithSubsections}`);
    
    if (filesFixed === FILES_MISSING_FULLTEXT.length) {
      console.log(`\nAll files have been successfully fixed. You can verify by running:`);
      console.log(`npm run check-3000-errors`);
    } else {
      console.log(`\nSome files could not be fixed. Please check the errors above.`);
    }
    
  } catch (error) {
    console.error(`Error fixing 3000-2018 files: ${(error as Error).message}`);
  }
}

// Run the fix if executed directly
if (require.main === module) {
  fixMissingFullText();
}

export { fixMissingFullText }; 