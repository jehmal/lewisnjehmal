import { extractFigureReferences, checkFigureExistsForStandard } from './figure-references';

// Test function to check if a figure exists for a standard
export async function testFigureExtraction(standardId: string, textWithFigureReference: string): Promise<{
  extractedFigures: ReturnType<typeof extractFigureReferences>;
  figureExistence: Record<string, boolean>;
}> {
  console.log(`Testing figure extraction for standard ${standardId} with text: ${textWithFigureReference}`);
  
  try {
    // Extract figures from the text
    const extractedFigures = extractFigureReferences(textWithFigureReference, standardId);
    console.log(`Extracted ${extractedFigures.length} figures:`, extractedFigures);
    
    // Check if each figure exists
    const figureExistence: Record<string, boolean> = {};
    
    for (const figure of extractedFigures) {
      const exists = await checkFigureExistsForStandard(figure.name, standardId);
      figureExistence[figure.name] = exists;
    }
    
    console.log('Figure existence checks:', figureExistence);
    
    return {
      extractedFigures,
      figureExistence
    };
  } catch (error) {
    console.error('Error in test:', error);
    return {
      extractedFigures: [],
      figureExistence: {}
    };
  }
}

// Helper function to list figures mentioned in text
export function listFiguresInText(text: string): string[] {
  const figureReferences: string[] = [];
  
  // Match "Figure X.Y" or "Table X.Y" patterns
  const figurePattern = /(Figure|Table)\s+(\d+(?:\.\d+)?(?:[a-z])?)/gi;
  let match;
  
  while ((match = figurePattern.exec(text)) !== null) {
    figureReferences.push(match[0]);
  }
  
  // Return unique references
  return [...new Set(figureReferences)];
}

// Test specific clause examples
export async function testSpecificClauses(): Promise<void> {
  const testCases = [
    { standardId: '3000', clauseId: '1.5.4.6', expectedFigures: ['Figure 1.1'] },
    { standardId: '3000', clauseId: '4.2.3', expectedFigures: ['Table 4.1'] },
    { standardId: '3001.1', clauseId: '2.6', expectedFigures: ['Figure 2.6'] }
  ];
  
  console.log('Running tests for specific clauses...');
  
  for (const testCase of testCases) {
    console.log(`Testing standard ${testCase.standardId}, clause ${testCase.clauseId}...`);
    
    const testText = `This is a test reference to ${testCase.expectedFigures.join(' and ')} in standard ${testCase.standardId}.`;
    const result = await testFigureExtraction(testCase.standardId, testText);
    
    console.log(`Test result for ${testCase.standardId} ${testCase.clauseId}:`, {
      extractedCount: result.extractedFigures.length,
      expectedCount: testCase.expectedFigures.length,
      success: result.extractedFigures.length === testCase.expectedFigures.length
    });
  }
} 