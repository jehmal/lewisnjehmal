/**
 * Utility script to fix empty fullText and title fields across all standards
 */

import fs from 'fs';
import path from 'path';
import { validateClauseFile } from './validate-clause';

interface FixSummary {
  standard: string;
  filesFixed: number;
  emptyFullTextFixed: number;
  emptyTitleFixed: number;
}

async function fixEmptyFields(dryRun: boolean = true): Promise<void> {
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
    console.log(`Mode: ${dryRun ? 'DRY RUN (no changes will be made)' : 'LIVE RUN (changes will be applied)'}`);
    
    // Track fix summaries
    const fixSummaries: FixSummary[] = [];
    
    // Process each standard directory
    for (const standard of standardDirs) {
      const standardDir = path.join(clausesDir, standard);
      console.log(`\nProcessing ${standard}...`);
      
      // Create summary for this standard
      const summary: FixSummary = {
        standard,
        filesFixed: 0,
        emptyFullTextFixed: 0,
        emptyTitleFixed: 0
      };
      
      // Get all JSON files in the directory
      const files = fs.readdirSync(standardDir)
        .filter(file => file.endsWith('.json') && file !== 'index.json' && file !== 'index.ts');
      
      // Check each file
      for (const file of files) {
        const filePath = path.join(standardDir, file);
        const result = validateClauseFile(filePath);
        let needsFixing = false;
        
        if (result.warnings.length > 0) {
          // Check if file needs fixing
          const hasEmptyFullText = result.warnings.some(w => w.includes("Field 'fullText' is empty"));
          const hasEmptyTitle = result.warnings.some(w => w.includes("Field 'title' is empty"));
          
          if (hasEmptyFullText || hasEmptyTitle) {
            try {
              // Read the current file content
              const content = fs.readFileSync(filePath, 'utf8');
              let data = JSON.parse(content);
              
              // Fix empty fullText field
              if (hasEmptyFullText && data.fullText === '') {
                data.fullText = `[Content of ${standard} Clause ${data.id}${data.title ? ' ' + data.title : ''}]`;
                needsFixing = true;
                summary.emptyFullTextFixed++;
                console.log(`  - ${file}: Fixed empty fullText field`);
              }
              
              // Fix empty title field
              if (hasEmptyTitle && data.title === '') {
                // Extract a title from the ID if possible
                const lastPart = data.id.split('.').pop();
                data.title = `Clause ${lastPart}`;
                needsFixing = true;
                summary.emptyTitleFixed++;
                console.log(`  - ${file}: Fixed empty title field`);
              }
              
              // Write the fixed data back to the file
              if (needsFixing && !dryRun) {
                fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
                summary.filesFixed++;
              } else if (needsFixing) {
                // Just count for dry run
                summary.filesFixed++;
              }
            } catch (error) {
              console.error(`  Error processing ${file}: ${(error as Error).message}`);
            }
          }
        }
      }
      
      // Add standard summary if any fixes were made
      if (summary.filesFixed > 0) {
        fixSummaries.push(summary);
      }
    }
    
    // Display overall summary
    console.log('\n----------------------------------------');
    console.log(`FIX SUMMARY (${dryRun ? 'DRY RUN' : 'APPLIED CHANGES'})`);
    console.log('----------------------------------------');
    
    if (fixSummaries.length === 0) {
      console.log('No files needed fixing across all standards.');
    } else {
      console.log('Standards fixed:');
      
      let totalFiles = 0;
      let totalFullText = 0;
      let totalTitle = 0;
      
      // Show breakdown by standard
      fixSummaries.forEach(summary => {
        console.log(`  - ${summary.standard}: ${summary.filesFixed} file(s) fixed`);
        console.log(`    * ${summary.emptyFullTextFixed} empty fullText fixed`);
        console.log(`    * ${summary.emptyTitleFixed} empty title fixed`);
        
        totalFiles += summary.filesFixed;
        totalFullText += summary.emptyFullTextFixed;
        totalTitle += summary.emptyTitleFixed;
      });
      
      // Show overall totals
      console.log('\nTotals:');
      console.log(`  - ${totalFiles} total files fixed`);
      console.log(`  - ${totalFullText} empty fullText fields fixed`);
      console.log(`  - ${totalTitle} empty title fields fixed`);
      
      if (dryRun) {
        console.log('\nTo apply these changes, run the script with the --apply flag:');
        console.log('npx ts-node utils/fix-empty-fields.ts --apply');
      }
    }
    
  } catch (error) {
    console.error('Error fixing empty fields:', (error as Error).message);
  }
}

// Run the fix if executed directly
if (require.main === module) {
  const args = process.argv.slice(2);
  const shouldApply = args.includes('--apply');
  fixEmptyFields(!shouldApply);
}

export { fixEmptyFields }; 