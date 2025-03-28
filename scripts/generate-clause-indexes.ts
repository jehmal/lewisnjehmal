const fs = require('fs');
const path = require('path');

interface ClauseFile {
  standard: string;
  clause: string;
  fullPath: string;
}

function getClauseFiles(clausesDir: string): ClauseFile[] {
  const standards = fs.readdirSync(clausesDir);
  const clauseFiles: ClauseFile[] = [];

  standards.forEach((standard: string) => {
    const standardPath = path.join(clausesDir, standard);
    if (!fs.statSync(standardPath).isDirectory()) return;

    const files = fs.readdirSync(standardPath);
    files.forEach((file: string) => {
      if (file.endsWith('.json')) {
        const clause = file.replace('.json', '');
        clauseFiles.push({
          standard,
          clause,
          fullPath: path.join(standard, file)
        });
      }
    });
  });

  return clauseFiles;
}

function generateIndexFile(clauseFiles: ClauseFile[], standard: string): string {
  const standardFiles = clauseFiles.filter(f => f.standard === standard);
  
  // Sort files by clause number
  standardFiles.sort((a, b) => {
    const aParts = a.clause.split('.').map(Number);
    const bParts = b.clause.split('.').map(Number);
    
    for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
      const aVal = aParts[i] || 0;
      const bVal = bParts[i] || 0;
      if (aVal !== bVal) return aVal - bVal;
    }
    return 0;
  });

  // Generate imports
  const imports = standardFiles.map(file => {
    const importName = `clause${file.clause.replace(/\./g, '_')}`;
    return `import ${importName} from './${file.clause}.json';`;
  }).join('\n');

  // Group exports by section
  const sections = new Map<string, string[]>();
  standardFiles.forEach(file => {
    const section = file.clause.split('.')[0];
    if (!sections.has(section)) {
      sections.set(section, []);
    }
    const importName = `clause${file.clause.replace(/\./g, '_')}`;
    sections.get(section)?.push(`  '${file.clause}': ${importName},`);
  });

  const groupedExports = Array.from(sections.entries())
    .map(([section, clauses]) => `  // Section ${section}\n${clauses.join('\n')}`)
    .join('\n\n');

  return `// Import all clause files
${imports}

// Export all clauses
export default {
${groupedExports}
};
`;
}

function main() {
  try {
    const clausesDir = path.join(process.cwd(), 'components', 'clauses');
    console.log('Scanning directory:', clausesDir);
    
    if (!fs.existsSync(clausesDir)) {
      console.error('Clauses directory not found:', clausesDir);
      return;
    }

    const clauseFiles = getClauseFiles(clausesDir);
    console.log(`Found ${clauseFiles.length} clause files`);
    
    // Group files by standard
    const standards = new Set(clauseFiles.map(f => f.standard));
    console.log('Found standards:', Array.from(standards));
    
    // Generate index file for each standard
    standards.forEach(standard => {
      const indexContent = generateIndexFile(clauseFiles, standard);
      const indexPath = path.join(clausesDir, standard, 'index.ts');
      
      // Ensure the directory exists
      const dir = path.dirname(indexPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      fs.writeFileSync(indexPath, indexContent);
      console.log(`Generated index file for ${standard} at ${indexPath}`);
    });
  } catch (error) {
    console.error('Error generating index files:', error);
    process.exit(1);
  }
}

main(); 