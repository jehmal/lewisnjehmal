/**
 * Script to list all files with warnings across all electrical standards
 * 
 * This identifies all clause files in all standards that have validation warnings
 * and shows the warning details, organized by standard.
 */

import fs from 'fs';
import path from 'path';
import { validateClauseFile } from './validate-clause';

async function listAllWarnings(): Promise<void> {
  try {
    // Path to the clauses directory containing all standards
    const clausesDir = path.join(process.cwd(), 'components', 'clauses');
    const altClausesDir = path.join(process.cwd(), 'lewisnjehmal', 'components', 'clauses');
    
    let workingDir = '';
    
    // Check if the clauses directory exists
    if (fs.existsSync(clausesDir)) {
      workingDir = clausesDir;
    } else if (fs.existsSync(altClausesDir)) {
      workingDir = altClausesDir;
    } else {
      console.error(`Clauses directory not found at either:`);
      console.error(`- ${clausesDir}`);
      console.error(`- ${altClausesDir}`);
      return;
    }
    
    console.log(`Found clauses directory at: ${workingDir}`);
    
    // Get all standard directories
    const standardDirs = fs.readdirSync(workingDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory() && dirent.name.includes('-'))
      .map(dirent => dirent.name)
      .sort();
    
    console.log(`Found ${standardDirs.length} standard directories to check\n`);
    
    // Track warnings by standard
    interface WarningFile {
      file: string;
      warnings: string[];
      content: any;
    }
    
    const warningsByStandard = new Map<string, WarningFile[]>();
    let totalFilesWithWarnings = 0;
    
    // Check each standard
    for (const standard of standardDirs) {
      const standardDir = path.join(workingDir, standard);
      console.log(`Checking ${standard}...`);
      
      // Get all JSON files in the directory
      const files = fs.readdirSync(standardDir)
        .filter(file => file.endsWith('.json') && file !== 'index.json' && file !== 'index.ts');
      
      console.log(`  Found ${files.length} clause files`);
      
      const filesWithWarnings: WarningFile[] = [];
      
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
      
      if (filesWithWarnings.length > 0) {
        warningsByStandard.set(standard, filesWithWarnings);
        totalFilesWithWarnings += filesWithWarnings.length;
        console.log(`  Found ${filesWithWarnings.length} files with warnings`);
      } else {
        console.log(`  No warnings found`);
      }
    }
    
    // Display detailed results
    console.log('\n==============================================');
    console.log(`DETAILED WARNING REPORT`);
    console.log('==============================================');
    console.log(`Total files with warnings across all standards: ${totalFilesWithWarnings}\n`);
    
    // Track warning types
    const warningTypes = new Map<string, number>();
    
    // Display warnings for each standard
    for (const [standard, filesWithWarnings] of warningsByStandard.entries()) {
      console.log(`\n${standard} (${filesWithWarnings.length} files with warnings):`);
      console.log('----------------------------------------------');
      
      filesWithWarnings.forEach(({ file, warnings, content }) => {
        console.log(`${file}:`);
        warnings.forEach(warning => {
          console.log(`  - ${warning}`);
          
          // Update warning type count
          const count = warningTypes.get(warning) || 0;
          warningTypes.set(warning, count + 1);
        });
        console.log(`  Content: ${JSON.stringify(content, null, 2)}`);
        console.log();
      });
    }
    
    // Display warning type summary
    console.log('\n==============================================');
    console.log('WARNING TYPE SUMMARY');
    console.log('==============================================');
    
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
  listAllWarnings();
}

export { listAllWarnings }; 