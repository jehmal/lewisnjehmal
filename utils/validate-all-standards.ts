/**
 * Utility script to validate all standard directories and their clause files
 * This script ensures all standards follow the required JSON format
 */

import fs from 'fs';
import path from 'path';
import { validateStandardDirectory } from './validate-clause';

// Main function to validate all standards
async function validateAllStandards(showDetailedErrors: boolean = false): Promise<void> {
  try {
    const standardsDir = path.join(process.cwd(), 'components', 'clauses');
    
    // Check if the directory exists
    if (!fs.existsSync(standardsDir)) {
      console.error(`Standards directory not found: ${standardsDir}`);
      return;
    }
    
    // Get all directories (standards) in the clauses folder
    const standards = fs.readdirSync(standardsDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);
    
    console.log(`Found ${standards.length} standard directories to validate`);
    
    // Summary statistics
    let totalFiles = 0;
    let totalValidFiles = 0;
    let totalFilesWithErrors = 0;
    let totalFilesWithWarnings = 0;
    let standardsWithErrors = 0;
    
    // Store detailed results for reporting
    const standardResults: {
      standard: string;
      totalFiles: number;
      validFiles: number;
      filesWithErrors: { file: string; errors: string[] }[];
      filesWithWarnings: { file: string; warnings: string[] }[];
    }[] = [];
    
    // Validate each standard directory
    for (const standard of standards) {
      // Skip non-standard directories like the clause-template.json file
      if (!standard.includes('-')) {
        continue;
      }
      
      console.log(`\n${'-'.repeat(40)}`);
      console.log(`Validating ${standard}`);
      console.log(`${'-'.repeat(40)}`);
      
      const standardDir = path.join(standardsDir, standard);
      const result = validateStandardDirectory(standardDir);
      
      // Store detailed results
      standardResults.push({
        standard,
        totalFiles: result.totalFiles,
        validFiles: result.validFiles,
        filesWithErrors: result.filesWithErrors,
        filesWithWarnings: result.filesWithWarnings
      });
      
      // Update statistics
      totalFiles += result.totalFiles;
      totalValidFiles += result.validFiles;
      totalFilesWithErrors += result.filesWithErrors.length;
      totalFilesWithWarnings += result.filesWithWarnings.length;
      
      if (result.filesWithErrors.length > 0) {
        standardsWithErrors++;
        
        // Show error details
        if (showDetailedErrors) {
          console.log(`\nErrors in ${standard}:`);
          result.filesWithErrors.forEach(({ file, errors }) => {
            console.log(`  - ${file}:`);
            errors.forEach(err => console.log(`    * ${err}`));
          });
        }
      }
    }
    
    // Print final summary
    console.log(`\n${'-'.repeat(40)}`);
    console.log('VALIDATION SUMMARY');
    console.log(`${'-'.repeat(40)}`);
    console.log(`Total standards: ${standards.length}`);
    console.log(`Standards with errors: ${standardsWithErrors}`);
    console.log(`Total clause files: ${totalFiles}`);
    console.log(`Valid files: ${totalValidFiles} (${Math.round(totalValidFiles/totalFiles*100)}%)`);
    console.log(`Files with errors: ${totalFilesWithErrors}`);
    console.log(`Files with warnings: ${totalFilesWithWarnings}`);
    
    // Print table of standards with issues
    console.log(`\n${'-'.repeat(60)}`);
    console.log('STANDARDS WITH ISSUES');
    console.log(`${'-'.repeat(60)}`);
    console.log('Standard       | Total Files | Valid Files | Errors | Warnings');
    console.log(`${'-'.repeat(60)}`);
    
    standardResults
      .filter(result => result.filesWithErrors.length > 0 || result.filesWithWarnings.length > 0)
      .sort((a, b) => b.filesWithErrors.length - a.filesWithErrors.length)
      .forEach(result => {
        console.log(
          `${result.standard.padEnd(15)} | ` +
          `${result.totalFiles.toString().padStart(11)} | ` +
          `${result.validFiles.toString().padStart(11)} | ` +
          `${result.filesWithErrors.length.toString().padStart(6)} | ` +
          `${result.filesWithWarnings.length.toString().padStart(8)}`
        );
      });
    
    // Show most common error types
    if (totalFilesWithErrors > 0 || totalFilesWithWarnings > 0) {
      const errorTypes = new Map<string, number>();
      const warningTypes = new Map<string, number>();
      
      standardResults.forEach(result => {
        // Count error types
        result.filesWithErrors.forEach(({ errors }) => {
          errors.forEach(error => {
            const count = errorTypes.get(error) || 0;
            errorTypes.set(error, count + 1);
          });
        });
        
        // Count warning types
        result.filesWithWarnings.forEach(({ warnings }) => {
          warnings.forEach(warning => {
            const count = warningTypes.get(warning) || 0;
            warningTypes.set(warning, count + 1);
          });
        });
      });
      
      // Display most common errors
      if (errorTypes.size > 0) {
        console.log(`\n${'-'.repeat(60)}`);
        console.log('MOST COMMON ERRORS');
        console.log(`${'-'.repeat(60)}`);
        
        Array.from(errorTypes.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .forEach(([error, count]) => {
            console.log(`${count} occurrences: ${error}`);
          });
      }
      
      // Display most common warnings
      if (warningTypes.size > 0) {
        console.log(`\n${'-'.repeat(60)}`);
        console.log('MOST COMMON WARNINGS');
        console.log(`${'-'.repeat(60)}`);
        
        Array.from(warningTypes.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .forEach(([warning, count]) => {
            console.log(`${count} occurrences: ${warning}`);
          });
      }
    }
    
  } catch (error) {
    console.error('Error validating standards:', error);
  }
}

// Run the validation if the script is executed directly
if (require.main === module) {
  // Check for command line arguments
  const showDetailedErrors = process.argv.includes('--details');
  validateAllStandards(showDetailedErrors);
}

export { validateAllStandards }; 