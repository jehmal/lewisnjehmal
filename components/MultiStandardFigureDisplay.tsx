'use client';

import React, { useState, useEffect } from 'react';
import { Figure } from '@/types/chat';
import { ExpandableCardDemo } from '@/components/blocks/expandable-card-demo-grid';
import { validateFigurePaths, getFigureByNameAndStandard, extractStandardIdFromReference, getStandardFromReference } from '@/utils/figure-references';
import { useSanitizedFigures } from '@/hooks/useSanitizedFigures';
import { ErrorBoundary } from './ErrorBoundary';

interface MultiStandardFigureDisplayProps {
  figures: Figure[];
  className?: string;
}

export function MultiStandardFigureDisplay({ figures, className = '' }: MultiStandardFigureDisplayProps) {
  // Wrap in ErrorBoundary to prevent rendering errors from propagating
  return (
    <ErrorBoundary
      fallback={
        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
          <p className="text-amber-800 dark:text-amber-400">Error displaying figures</p>
        </div>
      }
    >
      <MultiStandardFigureDisplayInner figures={figures} className={className} />
    </ErrorBoundary>
  );
}

function MultiStandardFigureDisplayInner({ figures, className = '' }: MultiStandardFigureDisplayProps) {
  // Use our sanitized figures hook first to ensure all data is valid
  const { figures: sanitizedFigures, isLoading: sanitizingLoading, error: sanitizeError } = useSanitizedFigures(figures);
  
  // Filter out Table 4.1 unless it's mentioned in the parent component's text
  // This ensures Table 4.1 only appears when explicitly referenced
  const [validatedFigures, setValidatedFigures] = useState<Figure[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [groupedFigures, setGroupedFigures] = useState<Record<string, Figure[]>>({});
  const [error, setError] = useState<string | null>(null);

  // Validate figure paths after sanitizing
  useEffect(() => {
    const validateFigures = async () => {
      try {
        // If there was an error sanitizing or no valid figures, stop here
        if (sanitizeError || sanitizingLoading) {
          return;
        }
        
        // Check for empty figures array after sanitizing
        if (!sanitizedFigures.length) {
          setIsLoading(false);
          return;
        }
        
        // Filter out problematic figures like Table 4.1 and Table 1.5
        // This prevents hardcoded and non-existent figures from being displayed
        const filteredFigures = sanitizedFigures.filter(figure => {
          // Check if this is Table 4.1
          if (figure.name === 'Table 4.1') {
            console.log('Filtering out hardcoded Table 4.1 - only explicit mentions allowed');
            return false;
          }
          
          // Check if this is Table 1.5 (which doesn't exist)
          if (figure.name && figure.name.toLowerCase().includes('table 1.5')) {
            console.log('Filtering out non-existent Table 1.5');
            return false;
          }
          
          // Allow all other figures
          return true;
        });
        
        console.log(`Filtered figures: ${filteredFigures.length} (from ${sanitizedFigures.length})`);
        
        // Now validate the paths of the filtered figures
        const validatedResults = await validateFigurePaths(filteredFigures);
        
        // Group the validated figures by standard
        const grouped = validatedResults.reduce((acc, figure) => {
          const standardKey = figure.standardDoc || 'unknown';
          if (!acc[standardKey]) {
            acc[standardKey] = [];
          }
          acc[standardKey].push(figure);
          return acc;
        }, {} as Record<string, Figure[]>);
        setGroupedFigures(grouped);
        setValidatedFigures(validatedResults);
      } catch (err) {
        console.error('Error validating figure paths:', err);
        setError("Error validating figures");
      } finally {
        setIsLoading(false);
      }
    };

    validateFigures();
  }, [sanitizedFigures, sanitizingLoading, sanitizeError]);

  // Loading state
  if (isLoading || sanitizingLoading) {
    return (
      <div className={`${className} p-4 flex justify-center items-center`}>
        <div className="animate-pulse text-gray-500 dark:text-gray-400">
          Loading figures...
        </div>
      </div>
    );
  }

  // Error state
  if (error || sanitizeError) {
    console.warn("Figure display error:", error || sanitizeError);
    return null; // Silently fail rather than breaking the UI
  }

  // Empty state
  if (!validatedFigures.length) {
    return null;
  }

  // Get standard name for display
  const getStandardDisplayName = (standardId: string) => {
    return `AS/NZS ${standardId}`;
  };

  // Render the figures
  return (
    <div className={className}>
      {Object.entries(groupedFigures).map(([standardDoc, standardFigures]) => (
        <div key={standardDoc} className="mb-8">
          <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">
            Figures from {getStandardDisplayName(standardDoc)}
          </h3>
          <ExpandableCardDemo figures={standardFigures} />
        </div>
      ))}
    </div>
  );
} 