import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { MovingBorder } from '../ui/moving-border';
import ShinyButton from '../magicui/shiny-button';
import { ClauseDisplay } from '../ClauseDisplay';
import { extractClauseReferences, extractFiguresFromAllStandards } from '../../utils/figure-references';
import { processMessageForMarkdown } from '../../utils/markdown-processor';
import type { ExpandableAnswerProps } from '../../types/card-types';
import type { Figure } from '../../types/chat';
import { MathEquation } from '../MathEquation';

// Use a simpler interface for our clauses display, rather than the ClauseTreeViewElement
interface DisplayClause {
  id: string;
  name?: string;
  standardDoc?: string;
}

export const ExpandableAnswer: React.FC<ExpandableAnswerProps> = ({ 
  answerIndex, 
  onClose,
  conversation 
}) => {
  const answer = conversation[answerIndex];
  // Rename these variables to avoid conflicts
  const storedClauses: DisplayClause[] = answer?.referencedClauses || [];
  const storedFigures: Figure[] = answer?.figures || [];
  
  // Process the content to ensure clause references are properly formatted
  const processedContent = answer?.content ? processMessageForMarkdown(answer.content) : '';
  
  // Helper function to render message content with math equation support
  const renderMessageWithMath = (content: string): React.ReactNode => {
    if (!content) return null;
    
    // Regular expression to match LaTeX equations
    const equationPattern = /\\[\(\[](.+?)\\[\)\]]/g;
    
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;
    
    // Find all math equations in the text
    while ((match = equationPattern.exec(content)) !== null) {
      // Add the text before the equation as markdown
      if (match.index > lastIndex) {
        parts.push(
          <ReactMarkdown key={`text-${lastIndex}`} className="inline">
            {content.substring(lastIndex, match.index)}
          </ReactMarkdown>
        );
      }
      
      // Add the equation
      const equationText = match[0];
      const displayMode = equationText.startsWith('\\[') && equationText.endsWith('\\]');
      
      parts.push(
        <MathEquation 
          key={`eq-${match.index}`}
          latex={equationText}
          displayMode={displayMode}
        />
      );
      
      lastIndex = match.index + match[0].length;
    }
    
    // Add any remaining text
    if (lastIndex < content.length) {
      parts.push(
        <ReactMarkdown key={`text-${lastIndex}`}>
          {content.substring(lastIndex)}
        </ReactMarkdown>
      );
    }
    
    // If no equations were found, just return the content as markdown
    if (parts.length === 0) {
      return <ReactMarkdown>{content}</ReactMarkdown>;
    }
    
    return <>{parts}</>;
  };

  console.log('ExpandableAnswer - storedFigures:', storedFigures);

  useEffect(() => {
    console.log('ExpandableAnswer - Figures:', storedFigures);
    if (storedFigures.length > 0) {
      console.log('Figure paths:');
      storedFigures.forEach((fig: Figure) => {
        console.log(`- ${fig.name}: ${fig.image}`);
        if (fig.possiblePaths) {
          console.log('  Alternative paths:');
          fig.possiblePaths.forEach((path: string) => console.log(`  - ${path}`));
        }
      });
    } else {
      console.log('No figures detected in the answer.');
    }
  }, [storedFigures]);

  if (!answer || answer.role !== 'assistant') {
    return null;
  }

  // Extract both clauses and figures - these variables have different names now
  const extractedClauses = extractClauseReferences(answer.content);
  const extractedFigures = extractFiguresFromAllStandards(answer.content);

  // Use the processed content for the UI display
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div 
        className="bg-white dark:bg-gray-800 p-6 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto relative"
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
      >
        <MovingBorder duration={3000} rx="25" ry="25">
          <div className="absolute inset-0 bg-white dark:bg-gray-800 rounded-lg" />
        </MovingBorder>
        
        <div className="relative z-10 p-6">
          <h2 className="text-xl font-bold mb-2">Answer</h2>
          <div className="prose dark:prose-invert max-w-none">
            {renderMessageWithMath(processedContent)}
          </div>
            
          {/* Referenced Clauses Section */}
          {storedClauses.length > 0 && (
            <div className="mt-8">
              <h3 className="text-xl font-semibold mb-4">Referenced Clauses</h3>
              <div className="space-y-4">
                {storedClauses.map((clause: DisplayClause) => (
                  <div key={clause.id}>
                    <ClauseDisplay
                      standardId={clause.standardDoc || '3000'}
                      clauseId={clause.id.replace('AUSNZ:', '')}
                      onError={(error) => console.error(`Error loading clause ${clause.id}:`, error)}
                      className="mb-4"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4 flex justify-end">
            <ShinyButton
              text="Close"
              className="bg-gray-500 hover:bg-gray-600"
              onClick={onClose}
              shimmerColor="#eca72c"
              background="#ee5622"
            />
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
