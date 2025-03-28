'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { Button } from './ui/button';
import { ClauseDisplay } from './ClauseDisplay';
import { extractFiguresFromAllStandards } from '../utils/figure-references';
import { TreeViewElement } from './ui/file-tree';
import ShimmerButton from './magicui/shimmer-button';
import { Input } from './ui/input';
import { Figure } from '../types/chat';
import Image from 'next/image';
import { Card } from '@/components/ui/card';
import { ClauseTreeViewElement } from '../types/tree';
import dynamic from 'next/dynamic';
import { processMessageForMarkdown } from '../utils/markdown-processor';
import { MathEquation } from './MathEquation';
import { motion } from 'framer-motion';
import { MovingBorder } from './ui/moving-border';
import { PLACEHOLDER_IMAGE_PATH } from '../lib/image-constants';

// Create a utility function to extract standard info
const extractStandardInfo = (clauseId: string): { standardId: string; version: string } => {
  // Handle AUSNZ format
  if (clauseId.startsWith('AUSNZ:')) {
    // Extract the clause number part
    const clauseNumber = clauseId.replace('AUSNZ:', '');
    
    // Special case for clauses from 2293.2 standard
    if (clauseNumber.startsWith('2.')) {
      return { standardId: '2293.2', version: '2019' };
    }
    
    // Check if it's a standard ID within the clause ID
    const standardMatch = clauseId.match(/^AUSNZ:(\d{4}(?:\.\d+)?)/);
    if (standardMatch) {
      const standardId = standardMatch[1];
      
      // Map standard IDs to their versions
      const standardVersions: Record<string, string> = {
        '2293.2': '2019',
        '3000': '2018',
        '3001.1': '2022',
        '3001.2': '2022',
        '3003': '2018',
        '3004.2': '2014',
        '3010': '2017',
        '3012': '2019',
        '3017': '2022',
        '3019': '2022',
        '3760': '2022',
        '3820': '2009',
        '4509.1': '2009',
        '4509.2': '2010',
        '4777.1': '2016',
        '4836': '2023',
        '5033': '2021',
        '5139': '2019'
      };
      
      return { 
        standardId, 
        version: standardVersions[standardId] || '2018' 
      };
    }
  }
  
  // For other clause numbers, default to AS/NZS 3000
  return { standardId: '3000', version: '2018' };
};

// Helper function to compare clause IDs for sorting
function compareClauseIds(a: TreeViewElement, b: TreeViewElement): number {
  // Extract the numeric parts of the clause IDs
  const getNumericParts = (id: string): number[] => {
    // Remove any standard prefix (WA: or AUSNZ:)
    const numericPart = id.includes(':') ? id.split(':')[1] : id;
    // Split by dots and convert to numbers
    return numericPart.split('.').map(Number);
  };
  
  const aParts = getNumericParts(a.id);
  const bParts = getNumericParts(b.id);
  
  // Compare each part in sequence
  for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
    // If a part doesn't exist, treat it as 0
    const aVal = i < aParts.length ? aParts[i] : 0;
    const bVal = i < bParts.length ? bParts[i] : 0;
    
    if (aVal !== bVal) {
      return aVal - bVal;
    }
  }
  
  return 0;
}

interface ExpandedFollowUp {
  question: string;
  answer: string;
  figures?: Figure[];
  referencedClauses?: ClauseTreeViewElement[];
}

interface ExpandableMessageProps {
  initialQuestion: string;
  initialAnswer: string;
  followUps?: Array<ExpandedFollowUp>;
  referencedClauses?: ClauseTreeViewElement[];
  figures?: Figure[];
  onClose: () => void;
  onFollowUp?: (question: string) => Promise<void>;
  message: string;
  onExpandReference: (ref: string, context?: string) => void;
  expandableType: string;
  isExpandAllActive?: boolean;
  fullViewToggle?: boolean;
  customReferenceClick?: (ref: string) => void;
  contextKeywords?: string;
}

interface FollowUpInputProps {
  onSubmit: (input: string) => Promise<void>;
  onCancel: () => void;
}

const FollowUpInput: React.FC<FollowUpInputProps> = ({ onSubmit, onCancel }) => {
  const [input, setInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedInput = input.trim();
    if (trimmedInput) {
      setIsSubmitting(true);
      try {
        await onSubmit(trimmedInput);
        setInput('');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div className="mt-4 bg-gray-50 dark:bg-gray-700 p-4 rounded-lg shadow-sm">
      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <div className="flex-grow">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Follow-up Question
          </label>
          <Input
            type="text"
            value={input}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInput(e.target.value)}
            placeholder="Type your follow-up question..."
            className="w-full bg-white dark:bg-gray-600"
            disabled={isSubmitting}
          />
        </div>
        <div className="flex justify-end gap-2">
          <ShimmerButton
            type="submit"
            disabled={!input.trim() || isSubmitting}
            shimmerColor="#eca72c"
            background="#ee5622"
            className="px-4 py-2"
          >
            {isSubmitting ? 'Sending...' : 'Send'}
          </ShimmerButton>
          <Button
            type="button"
            onClick={onCancel}
            variant="outline"
            className="px-4 py-2"
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
};

export const ExpandableMessage: React.FC<ExpandableMessageProps> = ({
  initialQuestion,
  initialAnswer,
  followUps,
  referencedClauses,
  figures,
  onClose,
  onFollowUp,
  message,
  onExpandReference,
  expandableType,
  isExpandAllActive = false,
  fullViewToggle = false,
  customReferenceClick,
  contextKeywords = '',
}) => {
  const [showFollowUpInput, setShowFollowUpInput] = useState(false);
  // Define currentFigures state to track the currently visible figures
  const [currentFigures, setCurrentFigures] = useState<Figure[]>([]);

  // Extract figures from the initial answer on component mount
  useEffect(() => {
    // First check if figures were passed as a prop
    if (figures && figures.length > 0) {
      setCurrentFigures(figures);
    } else {
      // Otherwise extract figures from the initialAnswer
      const extractedFigures = extractFiguresFromAllStandards(initialAnswer);
      setCurrentFigures(extractedFigures);
    }
  }, [initialAnswer, figures]);

  // Safe URL context extraction that doesn't depend on Next.js router
  const [derivedContext, setDerivedContext] = useState('');
  
  // Browser-only URL detection
  useEffect(() => {
    if (!contextKeywords && typeof window !== 'undefined') {
      try {
        let context = '';
        const url = window.location.href.toLowerCase();
        
        if (url.includes('caravan') || url.includes('vehicle') || url.includes('transportable')) {
          context += ' caravan vehicle transportable 3001';
        }
        if (url.includes('emergency') || url.includes('lighting') || url.includes('exit')) {
          context += ' emergency lighting 2293';
        }
        if (url.includes('patient') || url.includes('hospital') || url.includes('medical')) {
          context += ' patient hospital medical 3003';
        }
        
        // Set the derived context
        setDerivedContext(context);
      } catch (error) {
        console.error('Error extracting context from URL:', error);
      }
    } else if (contextKeywords) {
      // If contextKeywords is provided, use it directly
      setDerivedContext(contextKeywords);
    }
  }, [contextKeywords]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

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

  const handleReferenceClick = useCallback(
    async (ref: string) => {
      if (customReferenceClick) {
        return customReferenceClick(ref);
      }
      
      if (typeof onExpandReference === "function") {
        try {
          // First try to parse the reference ID
          let effectiveContext = derivedContext;
          
          // Import the reference loader dynamically
          const { referenceLoader } = await import('../services/reference-loader');
          
          try {
            // Check if the reference is for a clause in the 2.x range
            if (ref.includes('clause:2.') && effectiveContext.includes('caravan')) {
              console.log(`Adding 3001.1 context for caravan reference ${ref}`);
              effectiveContext += ' caravan 3001';
            }
          } catch (parseError) {
            console.error('Error parsing reference:', parseError);
          }
        
          // Call onExpandReference with context
          onExpandReference(ref, effectiveContext);
        } catch (error) {
          console.error('Error handling reference click:', error);
          // Call onExpandReference without attempting additional parsing
          onExpandReference(ref);
        }
      }
    },
    [onExpandReference, customReferenceClick, derivedContext]
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 backdrop-blur-sm"
      onClick={handleBackdropClick}
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
          <div className="space-y-6">
            {/* User Question - only show if initialQuestion is not empty */}
            {initialQuestion && (
              <div className="p-3 rounded-lg bg-gray-100 dark:bg-gray-700">
                <div className="flex justify-between items-start mb-2">
                  <p className="text-xl font-bold">User Question</p>
                </div>
                <ReactMarkdown className="whitespace-pre-wrap prose dark:prose-invert max-w-none">
                  {initialQuestion}
                </ReactMarkdown>
              </div>
            )}

            {/* Assistant Response - only show if initialAnswer is not empty */}
            {initialAnswer && (
              <div className="p-3 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <p className="text-xl font-bold">Answer</p>
                </div>
                <div className="prose dark:prose-invert max-w-none">
                  {renderMessageWithMath(processMessageForMarkdown(initialAnswer))}
                </div>
              </div>
            )}

            {/* Figures Section - Fixed implementation */}
            {currentFigures && currentFigures.length > 0 && (
              <div className="mt-4">
                <h5 className="text-md font-semibold mb-2">Additional Figures:</h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {currentFigures.map((figure, idx) => (
                    <div key={idx} className="border rounded-lg overflow-hidden shadow-sm">
                      <div className="p-2 bg-gray-100 dark:bg-gray-700 font-medium">{figure.name}</div>
                      <div className="relative w-full h-48">
                        <Image 
                          src={figure.image}
                          alt={figure.name}
                          fill
                          className="object-contain"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            console.log('Error loading image, using placeholder');
                            target.src = PLACEHOLDER_IMAGE_PATH;
                          }}
                        />
                      </div>
                      <div className="p-2 text-sm">{figure.quote}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Follow-up Questions */}
            {followUps && followUps.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-3">Follow-up Questions</h3>
                <div className="space-y-4">
                  {followUps.map((followUp, index) => (
                    <div key={index} className="space-y-3">
                      <div className="p-3 rounded-lg bg-gray-100 dark:bg-gray-700">
                        <div className="flex justify-between items-start mb-2">
                          <p className="font-medium">Follow-up Question</p>
                        </div>
                        <ReactMarkdown className="whitespace-pre-wrap prose dark:prose-invert max-w-none">
                          {followUp.question}
                        </ReactMarkdown>
                      </div>
                      <div className="p-3 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm">
                        <div className="prose dark:prose-invert max-w-none">
                          {renderMessageWithMath(processMessageForMarkdown(followUp.answer))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Referenced Clauses Section */}
            {referencedClauses && referencedClauses.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-3">Referenced Clauses</h3>
                <div className="space-y-4">
                  {referencedClauses.map((clause) => (
                    <div key={clause.id}>
                      <ClauseDisplay
                        standardId={clause.standardDoc || '3000'}
                        clauseId={clause.id.replace('AUSNZ:', '')}
                        onError={(error: Error) => console.error(`Error loading clause ${clause.id}:`, error)}
                        className="mb-4"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Show follow-up input if requested */}
            {showFollowUpInput && onFollowUp && (
              <FollowUpInput
                onSubmit={async (input) => {
                  await onFollowUp(input);
                  setShowFollowUpInput(false);
                }}
                onCancel={() => setShowFollowUpInput(false)}
              />
            )}

            {/* Action Buttons */}
            <div className="mt-4 flex flex-wrap gap-2 justify-end">
              {onFollowUp && !showFollowUpInput && (
                <ShimmerButton
                  onClick={() => setShowFollowUpInput(true)}
                  shimmerColor="#eca72c"
                  background="#ee5622"
                  className="px-4 py-2"
                >
                  Ask Follow-up
                </ShimmerButton>
              )}
              <ShimmerButton
                onClick={onClose}
                shimmerColor="#eca72c"
                background="#ee5622"
                className="px-4 py-2"
              >
                Close
              </ShimmerButton>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};