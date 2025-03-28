import React from 'react';
import ReactMarkdown from 'react-markdown';
import { TreeViewElement } from '@/types/clause';
import { Figure } from '@/types/figure';

interface FeatureBlockAnimatedCardProps {
  assistantResponse?: {
    content: string;
    referencedClauses?: any[];
  };
  renderClauseDisplay: (clause: TreeViewElement) => React.ReactNode;
}

const createFallbackFigure = (figureRef: string, figureType: string, figureNumber: string, standardDoc: string): Figure => {
  // Create a fallback figure that displays a placeholder with the figure reference
  return {
    name: `${figureType} ${figureNumber}`,
    title: `Reference to ${figureType} ${figureNumber}`,
    image: '/figure-placeholder.svg', // Use relative path to our SVG placeholder
    quote: `${figureType} ${figureNumber} from AS/NZS ${standardDoc} (Image not available)`,
    standardDoc: standardDoc,
    isFallback: true // Mark this as a fallback figure
  };
};

const FeatureBlockAnimatedCard: React.FC<FeatureBlockAnimatedCardProps> = ({
  assistantResponse,
  renderClauseDisplay
}) => {
  const handleImageError = (target: HTMLImageElement, alternativePaths?: string[]) => {
    if (alternativePaths && alternativePaths.length > 0) {
      const currentIndex = alternativePaths.indexOf(target.src);
      if (currentIndex < alternativePaths.length - 1) {
        target.src = alternativePaths[currentIndex + 1];
      } else {
        target.src = "/figure-placeholder.svg";
        console.log('All image paths failed, using placeholder');
      }
    } else {
      target.src = "/figure-placeholder.svg";
      console.log('Error loading image, using placeholder');
    }
  };

  if (!assistantResponse) {
    return null;
  }

  return (
    <div className="mt-4 bg-white/70 dark:bg-gray-600 p-4 rounded-lg">
      <p className="font-bold mb-2">TradeGuru:</p>
      <ReactMarkdown className="whitespace-pre-wrap prose dark:prose-invert max-w-none">
        {assistantResponse.content}
      </ReactMarkdown>
      
      {/* Clauses */}
      {assistantResponse.referencedClauses && assistantResponse.referencedClauses.length > 0 && (
        <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-4">
          <h4 className="text-lg font-semibold mb-3">Referenced Clauses</h4>
          <div className="space-y-2">
            {assistantResponse.referencedClauses.map((clause, index) => (
              // Cast the clause to the expected type to avoid TS errors
              renderClauseDisplay(clause as unknown as TreeViewElement)
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FeatureBlockAnimatedCard; 