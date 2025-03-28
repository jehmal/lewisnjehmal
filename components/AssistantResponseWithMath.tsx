import React from 'react';
import ReactMarkdown from 'react-markdown';
import { MathEquation } from './MathEquation';

interface AssistantResponseWithMathProps {
  content: string;
}

export const AssistantResponseWithMath: React.FC<AssistantResponseWithMathProps> = ({ content }) => {
  // Process the content to identify and handle LaTeX equations
  const processContentWithMath = (text: string): React.ReactNode[] => {
    if (!text) return [<span key="empty"></span>];
    
    // Regular expression to match LaTeX equations
    const equationPattern = /\\[\(\[](.+?)\\[\)\]]/g;
    
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;
    
    // Find all math equations in the text
    while ((match = equationPattern.exec(text)) !== null) {
      // Add the text before the equation
      if (match.index > lastIndex) {
        parts.push(
          <ReactMarkdown key={`text-${lastIndex}`} className="whitespace-pre-wrap prose dark:prose-invert max-w-none inline">
            {text.substring(lastIndex, match.index)}
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
    if (lastIndex < text.length) {
      parts.push(
        <ReactMarkdown key={`text-${lastIndex}`} className="whitespace-pre-wrap prose dark:prose-invert max-w-none inline">
          {text.substring(lastIndex)}
        </ReactMarkdown>
      );
    }
    
    return parts;
  };

  // Split the content by paragraphs and process each paragraph
  const paragraphs = content.split('\n\n');
  
  return (
    <div className="assistant-response-with-math">
      {paragraphs.map((paragraph, index) => (
        <div key={index} className={index < paragraphs.length - 1 ? 'mb-4' : ''}>
          {processContentWithMath(paragraph)}
        </div>
      ))}
    </div>
  );
}; 