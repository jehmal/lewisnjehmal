import React from 'react';
import * as katex from 'katex';
import 'katex/dist/katex.min.css';

interface MathEquationProps {
  latex: string;
  displayMode?: boolean;
}

export const MathEquation: React.FC<MathEquationProps> = ({ latex, displayMode = false }) => {
  // Clean the latex string - remove the LaTeX delimiters if present
  const cleanLatex = latex
    .replace(/^\\\(|\\\)$/g, '') // Remove \( and \) delimiters
    .replace(/^\\\[|\\\]$/g, ''); // Remove \[ and \] delimiters

  try {
    const html = katex.renderToString(cleanLatex, {
      throwOnError: false,
      displayMode: displayMode,
    });

    return <span className="math-equation" dangerouslySetInnerHTML={{ __html: html }} />;
  } catch (error) {
    console.error('Error rendering LaTeX:', error);
    return <span className="math-equation-error">{latex}</span>;
  }
}; 