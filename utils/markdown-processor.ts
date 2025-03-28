/**
 * Utilities for processing markdown text before sending to ReactMarkdown component
 */

/**
 * Makes clause references bold in the text
 * This ensures that the entire clause reference, including all decimal points, is formatted consistently
 */
export function boldClauseReferences(text: string): string {
  if (!text) return '';
  
  // Debug log
  console.log('boldClauseReferences - Original text length:', text.length);
  
  // First create a map to track what we've already bolded to avoid double processing
  const boldedSegments = new Map<string, string>();
  
  // Use a pre-processing step to replace all line breaks with a special marker
  // This helps the regex work across line breaks
  const processedText = text.replace(/\n/g, '|LINEBREAK|');
  
  // Apply markdown bold formatting to clause references with standards in a single step
  // Use a simpler approach that captures the entire reference
  const patternWithStandard = /((?:ASNZS|AS\/NZS)\s*\d+(?:[-\.]\d+)?)\s+([Cc]lause)\s+(\d+(?:\.\d+)*)/g;
  
  let result = processedText.replace(patternWithStandard, (match) => {
    const boldedVersion = `**${match}**`;
    return boldedVersion;
  });
  
  // Handle standalone clause references
  const standalonePattern = /(?<!\*\*)(?<!\w)([Cc]lause)\s+(\d+(?:\.\d+)*)(?!\*\*)(?!\w)/g;
  
  result = result.replace(standalonePattern, (match) => {
    return `**${match}**`;
  });
  
  // Restore line breaks
  result = result.replace(/\|LINEBREAK\|/g, '\n');
  
  // Debug log for changes
  if (result !== text) {
    console.log('boldClauseReferences - Text was modified with bold formatting');
  } else {
    console.log('boldClauseReferences - No changes were made');
  }
  
  return result;
}

/**
 * Processes the assistant's message for proper markdown formatting
 * This function adds useful formatting to the message:
 * 1. Makes clause references bold
 * 2. Preserves LaTeX math equations by wrapping them in code blocks to prevent markdown processing
 * 3. Can be extended with more formatting functions as needed
 */
export function processMessageForMarkdown(text: string): string {
  if (!text) return '';
  
  // First, preserve LaTeX equations by converting them to a special format that won't be affected by markdown formatting
  let processedText = preserveMathEquations(text);
  
  // Apply clause reference bolding
  processedText = boldClauseReferences(processedText);
  
  // Restore the equations to their original form
  processedText = restoreMathEquations(processedText);
  
  return processedText;
}

/**
 * Preserves LaTeX math equations by wrapping them in special markers
 * that won't be processed by markdown or other formatting functions
 */
function preserveMathEquations(text: string): string {
  if (!text) return '';
  
  // Regular expression to match LaTeX equations
  const equationPattern = /\\[\(\[](.+?)\\[\)\]]/g;
  
  // Replace the equations with markers
  return text.replace(equationPattern, (match) => {
    // Generate a unique ID for this equation
    const id = Math.random().toString(36).substring(2, 10);
    // Return a placeholder with the unique ID
    return `__MATH_EQ_${id}__${match}__MATH_EQ_END__`;
  });
}

/**
 * Restores LaTeX math equations from their preserved form back to normal
 */
function restoreMathEquations(text: string): string {
  if (!text) return '';
  
  // Regular expression to match the preserved equations
  const preservedPattern = /__MATH_EQ_([a-z0-9]+)__(.*?)__MATH_EQ_END__/g;
  
  // Replace the markers with the original equations
  return text.replace(preservedPattern, (match, id, equation) => {
    return equation;
  });
} 