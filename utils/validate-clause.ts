/**
 * Utility for validating clause JSON files against required format
 * 
 * This utility ensures that clause JSON files follow the strict format required
 * for electrical standards documentation:
 * - Must have exactly three fields: id, title, and fullText
 * - All fields must be strings
 * - id should match expected clause numbering format
 */

import fs from 'fs';
import path from 'path';

interface ClauseData {
  id: string;
  title: string;
  fullText: string;
  [key: string]: any; // for detecting extra fields
}

/**
 * Validates a clause JSON file
 * @param filePath Path to the clause JSON file
 * @returns Object with validation results
 */
export const validateClauseFile = (filePath: string): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} => {
  const result = {
    isValid: true,
    errors: [] as string[],
    warnings: [] as string[]
  };

  try {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      result.isValid = false;
      result.errors.push(`File does not exist: ${filePath}`);
      return result;
    }

    // Read and parse file
    const fileContent = fs.readFileSync(filePath, 'utf8');
    let data: ClauseData;
    
    try {
      data = JSON.parse(fileContent);
    } catch (e) {
      result.isValid = false;
      result.errors.push(`Invalid JSON format: ${(e as Error).message}`);
      return result;
    }

    // Check for required fields
    const requiredFields = ['id', 'title', 'fullText'];
    for (const field of requiredFields) {
      if (!(field in data)) {
        result.isValid = false;
        result.errors.push(`Missing required field: ${field}`);
      } else if (typeof data[field] !== 'string') {
        result.isValid = false;
        result.errors.push(`Field '${field}' must be a string, found: ${typeof data[field]}`);
      } else if (data[field].trim() === '') {
        result.warnings.push(`Field '${field}' is empty`);
      }
    }

    // Check for extra fields
    const extraFields = Object.keys(data).filter(key => !requiredFields.includes(key));
    if (extraFields.length > 0) {
      result.warnings.push(`Extra fields found: ${extraFields.join(', ')}`);
    }

    // Validate ID format (optional, can be adjusted to match expected format)
    if (data.id && !(/^[0-9]+(\.[0-9]+)*$/.test(data.id))) {
      result.warnings.push(`ID format may not follow convention: ${data.id}. Expected format like 1.2.3`);
    }

    return result;
  } catch (error) {
    result.isValid = false;
    result.errors.push(`Unexpected error: ${(error as Error).message}`);
    return result;
  }
};

/**
 * Validates all clause files in a standard directory
 * @param standardDir Path to the standard directory containing clause JSON files
 * @returns Summary of validation results
 */
export const validateStandardDirectory = (standardDir: string): {
  standardId: string;
  totalFiles: number;
  validFiles: number;
  filesWithErrors: { file: string; errors: string[] }[];
  filesWithWarnings: { file: string; warnings: string[] }[];
} => {
  const standardId = path.basename(standardDir);
  const result = {
    standardId,
    totalFiles: 0,
    validFiles: 0,
    filesWithErrors: [] as { file: string; errors: string[] }[],
    filesWithWarnings: [] as { file: string; warnings: string[] }[]
  };

  try {
    if (!fs.existsSync(standardDir)) {
      result.filesWithErrors.push({
        file: standardDir,
        errors: [`Directory does not exist: ${standardDir}`]
      });
      return result;
    }

    const files = fs.readdirSync(standardDir)
      .filter(file => file.endsWith('.json') && file !== 'index.json');
    
    result.totalFiles = files.length;

    for (const file of files) {
      const filePath = path.join(standardDir, file);
      const validation = validateClauseFile(filePath);
      
      if (validation.isValid && validation.warnings.length === 0) {
        result.validFiles++;
      } else {
        if (!validation.isValid) {
          result.filesWithErrors.push({
            file,
            errors: validation.errors
          });
        }
        
        if (validation.warnings.length > 0) {
          result.filesWithWarnings.push({
            file,
            warnings: validation.warnings
          });
        }
      }
    }

    return result;
  } catch (error) {
    result.filesWithErrors.push({
      file: standardDir,
      errors: [`Unexpected error: ${(error as Error).message}`]
    });
    return result;
  }
};

// If run directly, validate a specific file or directory
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error('Please provide a file path or directory path to validate');
    process.exit(1);
  }

  const target = args[0];
  
  try {
    const stats = fs.statSync(target);
    
    if (stats.isDirectory()) {
      console.log(`Validating directory: ${target}`);
      const result = validateStandardDirectory(target);
      console.log(`\nValidation Summary for ${result.standardId}:`);
      console.log(`Total files: ${result.totalFiles}`);
      console.log(`Valid files: ${result.validFiles}`);
      console.log(`Files with errors: ${result.filesWithErrors.length}`);
      console.log(`Files with warnings: ${result.filesWithWarnings.length}`);
      
      if (result.filesWithErrors.length > 0) {
        console.log('\nFiles with errors:');
        result.filesWithErrors.forEach(({file, errors}) => {
          console.log(`\n  ${file}:`);
          errors.forEach(err => console.log(`    - ${err}`));
        });
      }
      
      if (result.filesWithWarnings.length > 0) {
        console.log('\nFiles with warnings:');
        result.filesWithWarnings.forEach(({file, warnings}) => {
          console.log(`\n  ${file}:`);
          warnings.forEach(warn => console.log(`    - ${warn}`));
        });
      }
    } else {
      console.log(`Validating file: ${target}`);
      const result = validateClauseFile(target);
      console.log('\nValidation Result:');
      console.log(`Valid: ${result.isValid}`);
      
      if (result.errors.length > 0) {
        console.log('\nErrors:');
        result.errors.forEach(err => console.log(`  - ${err}`));
      }
      
      if (result.warnings.length > 0) {
        console.log('\nWarnings:');
        result.warnings.forEach(warn => console.log(`  - ${warn}`));
      }
    }
  } catch (error) {
    console.error(`Error: ${(error as Error).message}`);
    process.exit(1);
  }
} 