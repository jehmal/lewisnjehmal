/**
 * Utility script to remove extra fields from 3000-2018 clause files
 * 
 * This script identifies and fixes clause files in the 3000-2018 standard
 * that have extra fields beyond the required three fields (id, title, fullText).
 * It preserves the content of the required fields and removes all other fields.
 */

import fs from 'fs';
import path from 'path';
import { validateClauseFile } from './validate-clause';

interface ClauseData {
  id: string;
  title: string;
  fullText: string;
  [key: string]: any; // for detecting extra fields
}

interface FixSummary {
  totalFilesChecked: number;
  filesWithExtraFields: number;
  filesFixed: number;
  fieldsRemoved: Map<string, number>;
}

/**
 * Fix extra fields in 3000-2018 clause files
 * @param dryRun If true, don't actually modify files, just report what would be changed
 */
async function fix3000ExtraFields(dryRun: boolean = true): Promise<void> {
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
    console.log(`Mode: ${dryRun ? 'DRY RUN (no changes will be made)' : 'LIVE RUN (changes will be applied)'}`);
    
    // Get all JSON files in the directory
    const files = fs.readdirSync(workingDir)
      .filter(file => file.endsWith('.json') && file !== 'index.json' && file !== 'index.ts');
    
    // Create a summary object to track results
    const summary: FixSummary = {
      totalFilesChecked: files.length,
      filesWithExtraFields: 0,
      filesFixed: 0,
      fieldsRemoved: new Map<string, number>()
    };
    
    console.log(`Checking ${files.length} files for extra fields...`);
    
    // Check each file
    for (const file of files) {
      const filePath = path.join(workingDir, file);
      const result = validateClauseFile(filePath);
      
      // Check if file has extra fields warning
      const extraFieldsWarning = result.warnings.find(w => w.includes('Extra fields found:'));
      
      if (extraFieldsWarning) {
        summary.filesWithExtraFields++;
        
        try {
          // Read the current file content
          const content = fs.readFileSync(filePath, 'utf8');
          let data: ClauseData;
          
          try {
            data = JSON.parse(content);
          } catch (e) {
            console.error(`Error parsing JSON in ${file}: ${(e as Error).message}`);
            continue;
          }
          
          // Extract the names of extra fields
          const extraFieldsMatch = extraFieldsWarning.match(/Extra fields found: (.*)/);
          let extraFields: string[] = [];
          
          if (extraFieldsMatch && extraFieldsMatch[1]) {
            extraFields = extraFieldsMatch[1].split(', ');
            
            console.log(`${file}: Found extra fields: ${extraFields.join(', ')}`);
            
            // Create a new object with only the required fields
            const cleanedData: ClauseData = {
              id: data.id,
              title: data.title,
              fullText: data.fullText
            };
            
            // Update the tracking of removed fields
            extraFields.forEach(field => {
              const count = summary.fieldsRemoved.get(field) || 0;
              summary.fieldsRemoved.set(field, count + 1);
            });
            
            // Write the cleaned data back to the file
            if (!dryRun) {
              fs.writeFileSync(filePath, JSON.stringify(cleanedData, null, 2), 'utf8');
              summary.filesFixed++;
              console.log(`  - Fixed: Extra fields removed`);
            } else {
              // Just count for dry run
              summary.filesFixed++;
              console.log(`  - Would fix: Extra fields would be removed`);
            }
          }
        } catch (error) {
          console.error(`Error processing ${file}: ${(error as Error).message}`);
        }
      }
    }
    
    // Display the summary
    console.log('\n----------------------------------------');
    console.log(`FIX SUMMARY (${dryRun ? 'DRY RUN' : 'APPLIED CHANGES'})`);
    console.log('----------------------------------------');
    console.log(`Total files checked: ${summary.totalFilesChecked}`);
    console.log(`Files with extra fields: ${summary.filesWithExtraFields}`);
    console.log(`Files fixed: ${summary.filesFixed}`);
    
    if (summary.fieldsRemoved.size > 0) {
      console.log('\nExtra fields removed:');
      
      // Sort by frequency (most common first)
      const sortedFields = [...summary.fieldsRemoved.entries()]
        .sort((a, b) => b[1] - a[1]);
      
      sortedFields.forEach(([field, count]) => {
        console.log(`  - "${field}" removed from ${count} files`);
      });
    }
    
    if (dryRun) {
      console.log('\nTo apply these changes, run the script with the --apply flag:');
      console.log('npx ts-node utils/fix-3000-extra-fields.ts --apply');
    } else {
      console.log('\nAll changes have been applied.');
      console.log('Run validation to verify results:');
      console.log('npx ts-node utils/check-3000-errors.ts');
    }
    
  } catch (error) {
    console.error('Error fixing 3000-2018 extra fields:', (error as Error).message);
  }
}

// Run the fix if executed directly
if (require.main === module) {
  const args = process.argv.slice(2);
  const shouldApply = args.includes('--apply');
  fix3000ExtraFields(!shouldApply);
}

export { fix3000ExtraFields }; 