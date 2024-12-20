'use client';

import React, { useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Button } from '@/components/ui/button';
import { MagicCard } from '@/components/magicui/magic-card';
import Particles from '@/components/magicui/particles';
import { useTheme } from 'next-themes';
import Meteors from '@/components/magicui/meteors';
import { ClauseSection } from '@/types/clauses';
import { ExpandableCardDemo } from '@/components/blocks/expandable-card-demo-grid';
import { extractFigureReferences } from '../utils/figure-references';

interface ExpandableMessageProps {
  message: string;
  referencedClauses?: ClauseSection[];
  onClose: () => void;
}

export const ExpandableMessage: React.FC<ExpandableMessageProps> = ({ 
  message, 
  referencedClauses, 
  onClose 
}) => {
  const { theme } = useTheme();
  const [color, setColor] = React.useState("#ffffff");
  const figures = extractFigureReferences(message);

  useEffect(() => {
    setColor(theme === "dark" ? "#ffffff" : "#000000");
  }, [theme]);

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 z-[99999]"
         style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
         onClick={onClose}>
      <MagicCard 
        className="max-w-3xl w-full h-[80vh] overflow-hidden relative"
        gradientColor="#ee5622"
        gradientOpacity={0.2}
      >
        <div className="absolute inset-0 overflow-hidden">
          <Meteors number={40} color="#ee5622" />
        </div>
        <Particles
          className="absolute inset-0"
          quantity={100}
          ease={80}
          color={color}
          refresh
        />
        <div className="bg-white/90 dark:bg-gray-800/90 p-8 rounded-xl relative h-full flex flex-col"
             onClick={(e) => e.stopPropagation()}>
          <div className="relative z-10">
            <h2 className="text-2xl font-bold mb-4 text-[#ee5622] dark:text-[#ee5622]">Referenced Documents</h2>
            <Button
              onClick={onClose}
              className="absolute top-2 right-2 bg-transparent hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full p-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </Button>
          </div>
          <div className="mt-4 bg-white/80 dark:bg-gray-700/80 rounded-xl p-6 shadow-inner relative z-10 flex-grow overflow-y-auto">
            <ReactMarkdown className="whitespace-pre-wrap prose max-w-none text-black dark:text-white">
              {message}
            </ReactMarkdown>

            {/* Display Figures and Tables */}
            {figures.length > 0 && (
              <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-4">
                <h3 className="text-lg font-semibold text-[#ee5622] mb-3">Referenced Figures & Tables</h3>
                <ExpandableCardDemo figures={figures} />
              </div>
            )}
            
            {/* Display Referenced Clauses */}
            {referencedClauses && referencedClauses.length > 0 && (
              <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-4">
                <h3 className="text-lg font-semibold text-[#ee5622] mb-3">Referenced Clauses</h3>
                {referencedClauses.map((clause, index) => (
                  <div key={index} className="mb-4">
                    <h4 className="font-medium">{clause.id} - {clause.title}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{clause.fullText}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </MagicCard>
    </div>
  );
};