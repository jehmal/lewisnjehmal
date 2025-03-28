'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { BoxReveal } from '@/components/magicui/box-reveal';
import { ClauseSection } from '@/types/clauses';
import { 
  ClauseReference, 
  ReferenceError, 
  ValidationState,
  ValidationError,
  ValidationWarning,
  BaseReference,
  TreeViewElement,
  ClauseContent,
  StandardReference,
  STANDARD_VERSIONS,
  ReferenceType,
  StandardReferenceOrUndefined,
  EnhancedClauseReference
} from '@/types/references';
import { ClauseLoader } from '@/services/clause-loader';
import { referenceLoader } from '@/services/reference-loader';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { InfoIcon, AlertTriangleIcon, AlertCircleIcon, CheckCircleIcon, AlertCircle, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { standardDetector } from '@/services/standard-detector';
import { Figure } from '@/types/chat';
import { extractFigureReferences } from '@/utils/figure-references';
import { motion } from 'framer-motion';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import Image from 'next/image';
import { Button } from "@/components/ui/button";
import { ClauseReportModal } from './ClauseReportModal';
import { RelatedClause } from './RelatedClause';
import { MissingClauseDisplay } from './MissingClauseDisplay';
import { validateClauseExists } from '@/utils/clause-validator';
import { MathEquation } from './MathEquation';

export interface ClauseDisplayProps {
  standardId?: string;
  clauseId: string;
  onError?: (error: Error) => void;
  className?: string;
  onLoadStart?: () => void;
  onLoadEnd?: () => void;
  loadingText?: string;
}

interface ValidationDisplay {
  state: ValidationState;
  onDismiss: () => void;
}

const ValidationAlert: React.FC<ValidationDisplay> = ({ state, onDismiss }) => {
  if (!state.errors.length && !state.warnings.length) return null;

  const hasErrors = state.errors.length > 0;
  const Icon = hasErrors ? AlertCircleIcon : AlertTriangleIcon;
  const title = hasErrors ? 'Validation Errors' : 'Validation Warnings';

  return (
    <Alert variant={hasErrors ? 'destructive' : 'default'} className="mb-4">
      <Icon className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>
        <ul className="list-disc pl-4">
          {state.errors.map((error, index) => (
            <li key={`error-${index}`} className="text-sm">
              {error.message}
            </li>
          ))}
          {state.warnings.map((warning, index) => (
            <li key={`warning-${index}`} className="text-sm">
              {warning.message}
            </li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  );
};

// Basic RelatedReference component if it doesn't exist elsewhere
interface ReferenceProps {
  reference: any; // Using any for now, but should be properly typed later
}

const RelatedReference = ({ reference }: ReferenceProps) => {
  const refNumber = reference.referenceNumber || reference.id || 'Unknown';
  const refText = reference.title || reference.text || `Clause ${refNumber}`;
  const refStandard = reference.standardId || reference.standard?.id || '';
  
  return (
    <div className="text-sm p-2 border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-800">
      <div className="font-medium text-gray-900 dark:text-white">{refText}</div>
      <div className="text-xs text-gray-700 dark:text-gray-300">
        {refStandard ? `AS/NZS ${refStandard}`: ''} {refNumber}
      </div>
    </div>
  );
};

// Component to display an inline figure within a clause
interface InlineFigureProps {
  reference: string; // e.g., "Figure 1.1", "Table 4.1"
  standardId: string; // e.g., "3000", "3001.1"
}

const InlineFigure: React.FC<InlineFigureProps> = ({ reference, standardId }) => {
  const [figure, setFigure] = useState<Figure | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    const loadFigure = async () => {
      try {
        setLoading(true);
        console.log(`Loading figure: ${reference} for standard: ${standardId}`);
        
        // Extract the figure type and number
        const match = reference.match(/(Figure|Table)\s+(\d+(?:\.\d+)?(?:[a-z])?)/i);
        if (!match) {
          setError(`Invalid figure reference: ${reference}`);
          return;
        }

        const figureType = match[1]; // "Figure" or "Table"
        const figureNumber = match[2]; // e.g., "1.1", "4.1"
        
        console.log(`Extracted type: ${figureType}, number: ${figureNumber}`);
        
        // Skip Table 1.5 as it doesn't exist (explicit filter)
        if (figureType.toLowerCase() === 'table' && figureNumber === '1.5') {
          console.log('Skipping non-existent Table 1.5');
          setError(`Table 1.5 does not exist in standard ${standardId}`);
          setLoading(false);
          return;
        }
        
        // Try to find the figure in our files
        const figures = extractFigureReferences(`${figureType} ${figureNumber}`, standardId);
        console.log(`Found ${figures.length} figures for ${figureType} ${figureNumber}`);
        
        if (figures.length > 0) {
          const figure = figures[0];
          console.log('Initial figure paths:', figure.possiblePaths);
          
          // Ensure all paths are properly formatted for Next.js
          if (figure.image) {
            figure.image = figure.image.startsWith('/') ? figure.image : `/${figure.image}`;
          }
          
          if (figure.possiblePaths) {
            figure.possiblePaths = figure.possiblePaths.map(path => 
              path.startsWith('/') ? path : `/${path}`
            );
          }
          
          console.log('Updated figure paths:', figure.possiblePaths);
          console.log('Default image path:', figure.image);
          
          setFigure(figure);
        } else {
          setError(`Could not find ${figureType} ${figureNumber} in standard ${standardId}`);
        }
      } catch (err) {
        console.error(`Error loading figure ${reference}:`, err);
        setError(`Error loading ${reference}`);
      } finally {
        setLoading(false);
      }
    };

    loadFigure();
  }, [reference, standardId]);

  const handleImageError = (target: HTMLImageElement) => {
    if (!figure || !figure.possiblePaths) return;
    
    console.log('Image load error, current src:', target.src);
    
    // Get the current path and index
    const currentPath = target.src.replace(window.location.origin, '');
    const currentIndex = figure.possiblePaths.indexOf(currentPath);
    
    console.log('Current path index:', currentIndex);
    console.log('Available paths:', figure.possiblePaths);
    
    // Try the next path if available
    if (currentIndex < figure.possiblePaths.length - 1) {
      const nextPath = figure.possiblePaths[currentIndex + 1];
      console.log('Trying next path:', nextPath);
      target.src = nextPath;
    } else {
      console.log('No alternative paths available, using fallback');
      target.src = "/figure-placeholder.svg";
    }
  };

  const getFormattedTitle = () => {
    if (!figure) return reference;
    return `ASNZS${standardId} ${figure.name}`;
  };

  if (loading) {
    return (
      <div className="my-2 inline-block">
        <div className="animate-pulse h-8 w-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
      </div>
    );
  }

  if (error) {
    return null; // Don't show errors for figures, just skip them silently
  }

  if (!figure) {
    return null;
  }

  return (
    <>
      <div 
        className={cn(
          "my-3 border border-gray-100 dark:border-gray-700 rounded-xl overflow-hidden",
          "bg-white dark:bg-gray-800 transition-all duration-300",
          "hover:shadow-lg hover:shadow-orange-200 dark:hover:shadow-orange-900/10 cursor-pointer",
          "max-w-[45%] mx-auto", // Make it more compact
          "transform hover:scale-[1.02] active:scale-[0.98]"
        )}
        onClick={() => setIsDialogOpen(true)}
      >
        <div className="px-2 py-1.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-medium text-xs">
          {getFormattedTitle()}
        </div>
        <div className="relative w-full" style={{ aspectRatio: '16/10' }}>
          <Image
            src={figure.image}
            alt={figure.name}
            fill
            className="object-contain p-2"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              handleImageError(target);
            }}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        </div>
        <div className="px-2 py-1 text-xs text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
          {figure.name}
        </div>
      </div>
      
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto bg-white dark:bg-gray-900 border-none shadow-2xl rounded-2xl p-0 z-[9999]">
          <div className="p-6 space-y-4">
            <DialogTitle className="text-lg font-medium text-gray-800 dark:text-gray-100 border-b border-gray-100 dark:border-gray-800 pb-3">
              <span className="bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">
                {getFormattedTitle()}
              </span>
            </DialogTitle>
            <div className="relative aspect-video w-full bg-gray-50 dark:bg-gray-800 rounded-xl p-4 shadow-inner">
              <Image
                src={figure.image}
                alt={figure.name}
                fill
                className="object-contain"
                sizes="(max-width: 768px) 100vw, 800px"
                onError={(e) => handleImageError(e.currentTarget)}
              />
            </div>
            <div className="text-sm text-gray-700 dark:text-gray-300 mt-2 px-1">
              {figure.quote || `Reference to ${figure.name}`}
            </div>
            <div className="text-xs text-gray-500 mt-1 flex items-center border-t border-gray-100 dark:border-gray-800 pt-3">
              <span className="inline-block w-2 h-2 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 mr-2"></span>
              Source: AS/NZS {standardId}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

// Function to parse clause text and identify figure references
const parseFigureReferences = (text: string): string[] => {
  const references: string[] = [];
  
  // Match "Figure X.Y" or "Table X.Y" patterns
  const figurePattern = /(Figure|Table)\s+(\d+(?:\.\d+)?(?:[a-z])?)/gi;
  
  // Add pattern for figure ranges like "Figures 2.19 to 2.23"
  const figureRangePattern = /(Figures?)\s+(\d+(?:\.\d+)?(?:[a-z])?)\s+to\s+(\d+(?:\.\d+)?(?:[a-z])?)/gi;
  
  let match;
  
  // Process regular figure references
  while ((match = figurePattern.exec(text)) !== null) {
    const figureType = match[1]; // "Figure" or "Table"
    const figureNumber = match[2]; // e.g., "1.1", "4.1"
    
    // Skip Table 1.5 as it doesn't exist
    if (figureType.toLowerCase() === 'table' && figureNumber === '1.5') {
      console.log('Skipping non-existent Table 1.5 during parse');
      continue;
    }
    
    references.push(match[0]);
  }
  
  // Process figure range references (e.g., "Figures 2.19 to 2.23")
  while ((match = figureRangePattern.exec(text)) !== null) {
    const figureType = match[1]; // "Figure" or "Figures"
    const startFigure = match[2];
    const endFigure = match[3];
    
    // Add the original range text (e.g., "Figures 2.19 to 2.23")
    references.push(match[0]);
    
    // Parse the range to extract individual figures
    const startBaseMatch = startFigure.match(/(\d+)(?:\.(\d+))?/);
    const endBaseMatch = endFigure.match(/(\d+)(?:\.(\d+))?/);
    
    if (startBaseMatch && endBaseMatch) {
      const startMajor = parseInt(startBaseMatch[1]);
      const startMinor = startBaseMatch[2] ? parseInt(startBaseMatch[2]) : 0;
      const endMajor = parseInt(endBaseMatch[1]);
      const endMinor = endBaseMatch[2] ? parseInt(endBaseMatch[2]) : 0;
      
      // Only process if we have valid numbers and they belong to the same major section
      if (!isNaN(startMajor) && !isNaN(startMinor) && !isNaN(endMajor) && !isNaN(endMinor)) {
        if (startMajor === endMajor && startMinor <= endMinor) {
          // For each figure in the range, add it to references
          for (let minor = startMinor; minor <= endMinor; minor++) {
            const figureRef = `Figure ${startMajor}.${minor}`;
            // Add individual figures but avoid duplicates
            if (!references.includes(figureRef)) {
              references.push(figureRef);
            }
          }
        }
      }
    }
  }
  
  // Return unique references
  return [...new Set(references)];
};

// Function to parse clause text and identify clause references
export const parseClauseReferences = (text: string): string[] => {
  // Match patterns like "Clause X.Y.Z" or "Clause X.Y.Z.W"
  // Also match patterns with lowercase "clause"
  const regex = /[Cc]lause\s+(\d+(?:\.\d+)*)/g;
  const matches = text.match(regex);
  
  if (!matches) return [];
  
  // Extract just the clause numbers from the matches
  const references = matches.map(match => {
    return match.replace(/[Cc]lause\s+/, '').trim();
  });
  
  // Remove duplicates
  return [...new Set(references)];
};

export function ClauseDisplay({ 
  clauseId, 
  standardId, 
  onError, 
  className, 
  onLoadStart, 
  onLoadEnd, 
  loadingText = 'Loading clause...' 
}: ClauseDisplayProps) {
  const [clause, setClause] = useState<EnhancedClauseReference | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [relatedClauses, setRelatedClauses] = useState<string[]>([]);
  const [clauseExists, setClauseExists] = useState<boolean | null>(null);
  const [isFabricated, setIsFabricated] = useState<boolean>(false);

  // Add a function to check if a clause likely exists
  const checkClauseExists = useCallback(async (standardId: string, clauseId: string) => {
    if (!clauseId) return false;
    
    // First do a quick static check
    const exists = validateClauseExists(standardId, clauseId);
    
    // If the clause might be fabricated (it doesn't exist but looks like it should)
    const mightBeFabricated = !exists && 
      (clauseId.split('.').length > 3 || clauseId.includes('4.8.') || clauseId.includes('4.3.'));
    
    setIsFabricated(mightBeFabricated);
    setClauseExists(exists);
    
    return exists;
  }, []);

  useEffect(() => {
    const loadClauseData = async () => {
      if (!clauseId) {
        console.error('ClauseDisplay: No clause ID provided');
        return;
      }

      try {
        setLoading(true);
        if (onLoadStart) {
          onLoadStart();
        }

        console.log(`ClauseDisplay: Loading clause ${clauseId} from standard ${standardId}`);
        
        // Normalize the clause ID and standard ID
        const normalizedClauseId = clauseId.replace(/^[A-Z]+:/, '');
        let normalizedStandardId = standardId;

        // Handle 3019-2018 to 3019-2022 mapping
        if (standardId?.includes('3019-2018')) {
          console.log('ClauseDisplay: Mapping 3019-2018 to 3019-2022');
          normalizedStandardId = '3019-2022';
        }

        // First check if the clause exists
        const exists = await checkClauseExists(normalizedStandardId || '3000', normalizedClauseId);
        
        if (!exists) {
          console.log(`ClauseDisplay: Clause ${normalizedClauseId} likely does not exist in ${normalizedStandardId}`);
          setError(new Error(`Clause ${normalizedClauseId} not found in standard ${normalizedStandardId || 'unknown'}`));
          setLoading(false);
          if (onLoadEnd) onLoadEnd();
          return;
        }

        // Try to load the clause using the clause loader
        try {
          const loader = ClauseLoader.getInstance();
          const result = await loader.loadClause(`${normalizedStandardId || '3000'}/${normalizedClauseId}`);

          if (result) {
            // If this is a 3019-2018 clause loaded from 2022, create a new result with updated version
            if (standardId?.includes('3019-2018') && result.standard && typeof result.standard === 'object' && 'id' in result.standard) {
              const updatedStandard: StandardReference = {
                id: result.standard.id || '3019',
                name: result.standard.name || `AS/NZS ${result.standard.id || '3019'}`,
                version: '2018'
              };
              
              const finalResult: EnhancedClauseReference = {
                id: result.id || `${standardId || '3019'}-${normalizedClauseId}`,
                referenceNumber: result.referenceNumber || normalizedClauseId,
                type: 'clause',
                title: result.title || `Clause ${normalizedClauseId}`,
                fullText: result.fullText || '',
                standard: updatedStandard,
                lastUpdated: result.lastUpdated || Date.now(),
                formatVersion: result.formatVersion || '1.0',
                source: result.source || 'direct',
                validated: result.validated || true,
                referenceChain: result.referenceChain || [],
                note: `Note: This clause was loaded from AS/NZS 3019-2022 and mapped to 3019-2018.`
              };

              setClause(finalResult);
            } else {
              // If the result has a valid standard property, use it as is
              const validStandard: StandardReference = {
                id: result.standard?.id || normalizedStandardId || '3000',
                name: result.standard?.name || `AS/NZS ${normalizedStandardId || '3000'}`,
                version: result.standard?.version || '2018'
              };

              const finalResult: EnhancedClauseReference = {
                id: result.id || `${normalizedStandardId || '3000'}-${normalizedClauseId}`,
                referenceNumber: result.referenceNumber || normalizedClauseId,
                type: 'clause',
                title: result.title || `Clause ${normalizedClauseId}`,
                fullText: result.fullText || '',
                standard: validStandard,
                lastUpdated: result.lastUpdated || Date.now(),
                formatVersion: result.formatVersion || '1.0',
                source: result.source || 'direct',
                validated: result.validated || true,
                referenceChain: result.referenceChain || [],
                note: result.note
              };

              setClause(finalResult);
            }
          } else {
            throw new Error(`No content found for clause ${normalizedClauseId} in standard ${normalizedStandardId || 'unknown'}`);
          }
        } catch (error) {
          console.error(`ClauseDisplay: Error loading clause ${normalizedClauseId}:`, error);
          throw error;
        }

        setLoading(false);
        if (onLoadEnd) onLoadEnd();
      } catch (error) {
        console.error(`ClauseDisplay: Error in loadClauseData:`, error);
        setError(error instanceof Error ? error : new Error(String(error)));
        setLoading(false);
        if (onLoadEnd) onLoadEnd();
        if (onError) onError(error instanceof Error ? error : new Error(String(error)));
      }
    };
    
    // Call the loadClauseData function when the component mounts or clauseId changes
    loadClauseData();
    
    // This will run when the component unmounts or clauseId changes
    return () => {
      // Reset state when unmounting or when clauseId changes
      setClause(null);
      setError(null);
      setClauseExists(null);
      setIsFabricated(false);
    };
  }, [clauseId, standardId, onLoadStart, onLoadEnd, onError, checkClauseExists]);

  useEffect(() => {
    // Check for any clause references that need to be preloaded
    if (clause && clause.fullText) {
      const references = parseClauseReferences(clause.fullText);
      console.log(`Preloading referenced clauses for ${clause.id}:`, references);
      // We don't need to actually do anything here - just having the log helps with debugging
    }
    
    // Make sure to return void or a cleanup function
    return undefined;
  }, [clause]);

  if (loading) {
    return (
      <div className={cn("p-4 bg-gray-100 dark:bg-gray-800 rounded-lg", className)}>
        <div className="animate-pulse flex space-x-4">
          <div className="flex-1 space-y-4 py-1">
            <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded"></div>
              <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-5/6"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    // If it's a non-existent clause, use the special display component
    if (clauseExists === false) {
      return (
        <MissingClauseDisplay 
          clauseId={clauseId}
          standardId={standardId || '3000'}
          className={className}
          isFabricated={isFabricated}
        />
      );
    }
    
    // For other errors, use the existing error display
    return (
      <Card className={cn("overflow-hidden relative", className)}>
        <CardHeader>
          <CardTitle className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-yellow-500 mr-2" />
            Clause Loading Issue
          </CardTitle>
          <CardDescription>AS/NZS {standardId || '3000'} Clause {clauseId}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-md border border-yellow-200 dark:border-yellow-800">
            <p className="text-yellow-800 dark:text-yellow-200">
              We&apos;re having trouble retrieving this clause. Please refer to your physical copy of the standard for this clause.
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setIsReportModalOpen(true)}
            className="text-yellow-600 hover:text-yellow-700 border-yellow-300 hover:border-yellow-400 hover:bg-yellow-50"
          >
            Report Issue
          </Button>
        </CardFooter>
        
        <ClauseReportModal 
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          clauseId={clauseId}
          standardId={(standardId || '3000') as string}
        />
      </Card>
    );
  }

  if (!clause) {
    return (
      <div className={cn("p-4 bg-gray-100 dark:bg-gray-800 rounded-lg", className)}>
        <p>No clause data available.</p>
      </div>
    );
  }
  
  // Extract content - handle different possible structures
  const title = clause.title || (clause.content && clause.content.title) || `Clause ${clauseId}`;
  const text = clause.fullText || (clause.content && clause.content.text) || '';
  const standardName = clause.standard?.name || `AS/NZS ${standardId || '3000'}`;
  const standardVersion = clause.standard?.version || '2018';

  // Render function for clause text with inline figures
  const renderClauseText = (text: string, standardId: string) => {
    // Safety check
    if (!text) {
      console.warn('renderClauseText called with empty text');
      return <p>No content available</p>;
    }
    
    const figureReferences = parseFigureReferences(text);
    
    // Function to process text for math equations
    const processTextForMath = (content: string): React.ReactNode[] => {
      if (!content) return [<span key="empty"></span>];
      
      // Regular expression to match LaTeX equations - removed 's' flag
      const equationPattern = /\\[\(\[](.+?)\\[\)\]]/g;
      
      const parts: React.ReactNode[] = [];
      let lastIndex = 0;
      let match;
      
      // Find all math equations in the text
      while ((match = equationPattern.exec(content)) !== null) {
        // Add the text before the equation
        if (match.index > lastIndex) {
          parts.push(<span key={`text-${lastIndex}`}>{content.substring(lastIndex, match.index)}</span>);
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
        parts.push(<span key={`text-${lastIndex}`}>{content.substring(lastIndex)}</span>);
      }
      
      return parts;
    };
    
    if (figureReferences.length === 0) {
      // If no figures, just render the text as paragraphs with math equations
      return text.split("\n").map((line: string, index: number) => (
        <p key={index}>{processTextForMath(line)}</p>
      ));
    }
    
    // If there are figures, split the text and insert figures at the right spots
    const segments: React.ReactNode[] = [];
    let lastIndex = 0;
    
    // Identify figure ranges for grouping
    const figureRangePattern = /(Figures?)\s+(\d+(?:\.\d+)?(?:[a-z])?)\s+to\s+(\d+(?:\.\d+)?(?:[a-z])?)/gi;
    const figureRanges = Array.from(text.matchAll(figureRangePattern)).map(match => {
      const startFigure = match[2];
      const endFigure = match[3];
      
      // Generate all the figure numbers in this range
      const rangeFigures = generateFiguresInRange(startFigure, endFigure);
      
      return {
        fullText: match[0],
        position: match.index || 0,
        startFigure: startFigure,
        endFigure: endFigure,
        rangeFigures: rangeFigures
      };
    });
    
    // Sort figure references by their position in the text
    const referencesWithPositions = figureReferences.map(ref => {
      // Check if this is part of a range
      const rangeMatch = figureRanges.find(range => 
        ref === range.fullText || 
        (ref.startsWith('Figure') && isFigureInRange(ref, range.startFigure, range.endFigure))
      );
      
      return {
        reference: ref,
        position: text.indexOf(ref, lastIndex),
        isPartOfRange: !!rangeMatch,
        rangeText: rangeMatch ? rangeMatch.fullText : null,
        rangePosition: rangeMatch ? rangeMatch.position : -1
      };
    }).filter(item => item.position !== -1)
      .sort((a, b) => a.position - b.position);
    
    // Group figures by range
    const rangeGroups = new Map();
    figureRanges.forEach(range => {
      rangeGroups.set(range.fullText, range.rangeFigures);
    });
    
    // Process references and build segments
    for (let i = 0; i < referencesWithPositions.length; i++) {
      const { reference, position, isPartOfRange, rangeText } = referencesWithPositions[i];
      
      // If this is the range text itself or a non-range figure, process normally
      if (!isPartOfRange || reference === rangeText) {
        // Add text before the reference
        const textBeforeRef = text.substring(lastIndex, position);
        
        if (textBeforeRef) {
          // Split into paragraphs
          const paragraphs = textBeforeRef.split("\n");
          
          if (paragraphs.length > 0) {
            segments.push(
              <div key={`text-${position}`} className="mb-2">
                {paragraphs.map((para, idx) => (
                  <p key={`para-${position}-${idx}`} className={idx < paragraphs.length - 1 ? "mb-2" : ""}>
                    {processTextForMath(para)}
                  </p>
                ))}
              </div>
            );
          }
        }
        
        // If this is a range text, prepare to render a row of figures
        if (reference.match(figureRangePattern)) {
          const rangeMatch = figureRanges.find(range => range.fullText === reference);
          
          if (rangeMatch) {
            // Add the range label
            segments.push(
              <p key={`range-label-${position}`} className="text-md font-medium mt-4 mb-2">
                {reference}:
              </p>
            );
            
            // Get all the figures in this range
            const rangeFigures = rangeMatch.rangeFigures.map(num => `Figure ${num}`);
            
            // Add a row of figures
            if (rangeFigures.length > 0) {
              segments.push(
                <div key={`figure-row-${position}`} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 my-6">
                  {rangeFigures.map((figRef, idx) => (
                    <div key={`range-figure-${idx}`} className="flex flex-col items-center">
                      <InlineFigure 
                        reference={figRef} 
                        standardId={standardId} 
                      />
                      <p className="text-sm text-orange-500/80 dark:text-orange-400/80 italic mt-1 mb-3 text-center">
                        {figRef}
                      </p>
                    </div>
                  ))}
                </div>
              );
            }
          }
        } 
        // If not a range and not part of a range, render normally
        else if (!isPartOfRange) {
          segments.push(
            <div key={`figure-container-${position}`} className="my-6">
              <InlineFigure 
                key={`figure-${position}`} 
                reference={reference} 
                standardId={standardId} 
              />
            </div>
          );
          
          // Add reference text inline
          segments.push(
            <p key={`ref-text-${position}`} className="text-sm text-orange-500/80 dark:text-orange-400/80 italic mt-1 mb-3 text-center">
              {reference}
            </p>
          );
        }
        
        lastIndex = position + reference.length;
      } 
      // Skip individual figures that are part of a range, as they're rendered as a group
      else {
        // No need to do anything here, as we're using the generated range
      }
    }
    
    // Add any remaining text after the last figure
    if (lastIndex < text.length) {
      const textAfterRefs = text.substring(lastIndex);
      
      if (textAfterRefs) {
        const paragraphs = textAfterRefs.split("\n");
        
        segments.push(
          <div key="text-end" className="mt-2">
            {paragraphs.map((para, idx) => (
              <p key={`para-end-${idx}`} className={idx < paragraphs.length - 1 ? "mb-2" : ""}>
                {processTextForMath(para)}
              </p>
            ))}
          </div>
        );
      }
    }
    
    return segments;
  };
  
  // Helper function to generate all figure numbers in a range
  const generateFiguresInRange = (startFigure: string, endFigure: string): string[] => {
    const startParts = startFigure.split('.');
    const endParts = endFigure.split('.');
    
    if (startParts.length !== 2 || endParts.length !== 2) {
      console.warn('Invalid figure range format', startFigure, endFigure);
      return [];
    }
    
    const startMajor = parseInt(startParts[0]);
    const startMinor = parseInt(startParts[1]);
    const endMajor = parseInt(endParts[0]);
    const endMinor = parseInt(endParts[1]);
    
    if (isNaN(startMajor) || isNaN(startMinor) || isNaN(endMajor) || isNaN(endMinor)) {
      console.warn('Invalid figure range numbers', startFigure, endFigure);
      return [];
    }
    
    // Only handle ranges within the same major section
    if (startMajor !== endMajor) {
      console.warn('Figure ranges across different major sections not supported', startFigure, endFigure);
      return [];
    }
    
    const figures: string[] = [];
    
    // Generate all figure numbers in the range
    for (let minor = startMinor; minor <= endMinor; minor++) {
      figures.push(`${startMajor}.${minor}`);
    }
    
    return figures;
  };
  
  // Helper function to check if a figure is within a given range
  const isFigureInRange = (figureRef: string, startFigure: string, endFigure: string): boolean => {
    // Extract just the number from "Figure X.Y"
    const match = figureRef.match(/Figure\s+(\d+(?:\.\d+)?)/i);
    if (!match) return false;
    
    const figureNumber = match[1];
    
    // Parse the numbers
    const figureNumberParts = figureNumber.split('.');
    const startParts = startFigure.split('.');
    const endParts = endFigure.split('.');
    
    if (figureNumberParts.length !== 2 || startParts.length !== 2 || endParts.length !== 2) return false;
    
    const figureMajor = parseInt(figureNumberParts[0]);
    const figureMinor = parseInt(figureNumberParts[1]);
    const startMajor = parseInt(startParts[0]);
    const startMinor = parseInt(startParts[1]);
    const endMajor = parseInt(endParts[0]);
    const endMinor = parseInt(endParts[1]);
    
    // Check if figure is within range
    if (figureMajor !== startMajor || figureMajor !== endMajor) return false;
    
    return figureMinor >= startMinor && figureMinor <= endMinor;
  };

  return (
    <Card className={cn("overflow-hidden relative", className)}>
      <CardHeader>
        <CardTitle>{clause.title}</CardTitle>
        <CardDescription>
          {clause.standard?.name || 'AS/NZS 3000'} 
          {clause.standard?.version ? ` (${clause.standard.version})` : ''} 
          Clause {clause.id}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {clause.fullText && renderClauseText(clause.fullText, clause.standard?.id || '3000')}
        
        {/* Add related clauses section */}
        {clause.fullText && (() => {
          const references = parseClauseReferences(clause.fullText);
          if (references.length > 0) {
            console.log(`ClauseDisplay: Found referenced clauses in ${clause.id}:`, references);
            return (
              <div className="mt-8 pt-4 border-t border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Referenced Clauses</h3>
            <div className="space-y-2">
                  {references.map(ref => (
                    <RelatedClause 
                      key={ref} 
                      clauseId={ref} 
                      standardId={clause.standard?.id || standardId || '3000'} 
                      parentClauseId={clause.id} 
                    />
              ))}
            </div>
          </div>
            );
          }
          return null;
        })()}
        
        {clause?.note && (
          <div className="text-sm italic text-amber-600 mt-2 mb-4 p-2 bg-amber-50 rounded border border-amber-200">
            {clause.note}
          </div>
        )}
      </CardContent>
      <div className="absolute bottom-2 right-2">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => setIsReportModalOpen(true)}
          className="text-gray-400 hover:text-gray-600"
        >
          Report Issue
        </Button>
      </div>
      
      <ClauseReportModal 
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        clauseId={clauseId}
        standardId={(standardId || clause.standard?.id || '3000') as string}
      />
    </Card>
  );
} 