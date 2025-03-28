import { useEffect, useState } from 'react';
import { Figure } from '@/types/chat';

/**
 * A hook that sanitizes figures data to ensure it's safe to use in components
 * This prevents errors when figures contain undefined or null values
 */
export function useSanitizedFigures(inputFigures: Figure[] | undefined): {
  figures: Figure[];
  isLoading: boolean;
  error: Error | null;
} {
  const [figures, setFigures] = useState<Figure[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  useEffect(() => {
    try {
      // First ensure inputFigures is valid
      if (!inputFigures) {
        console.warn('Undefined figures data provided to useSanitizedFigures');
        setFigures([]);
        setIsLoading(false);
        return;
      }
      
      if (!Array.isArray(inputFigures)) {
        console.warn('Non-array figures data provided to useSanitizedFigures:', inputFigures);
        setFigures([]);
        setIsLoading(false);
        return;
      }
      
      if (inputFigures.length === 0) {
        console.log('Empty figures array provided to useSanitizedFigures');
        setFigures([]);
        setIsLoading(false);
        return;
      }
      
      console.log(`Sanitizing ${inputFigures.length} figures`);
      
      // Then sanitize each figure
      const sanitized = inputFigures
        .filter(fig => {
          if (!fig) {
            console.warn('Null or undefined figure found and filtered out');
            return false;
          }
          if (typeof fig !== 'object') {
            console.warn('Non-object figure found and filtered out:', fig);
            return false;
          }
          return true;
        })
        .map(figure => {
          // Create a default figure in case properties are missing
          const defaultFigure: Figure = {
            name: 'Unknown Figure',
            title: 'Untitled Figure',
            image: '/images/figure-placeholder.svg',
            quote: 'No description available',
            standardDoc: '3000'
          };
          
          // Start with default values and override with valid properties
          return {
            ...defaultFigure,
            ...Object.fromEntries(
              Object.entries(figure).filter(([_, value]) => 
                value !== undefined && value !== null
              )
            ),
            // Double-check critical properties are present and valid
            name: typeof figure.name === 'string' && figure.name 
              ? figure.name 
              : defaultFigure.name,
            title: typeof figure.title === 'string' && figure.title 
              ? figure.title 
              : defaultFigure.title,
            image: typeof figure.image === 'string' && figure.image 
              ? figure.image 
              : defaultFigure.image,
            quote: typeof figure.quote === 'string' && figure.quote 
              ? figure.quote 
              : defaultFigure.quote,
            standardDoc: typeof figure.standardDoc === 'string' && figure.standardDoc 
              ? figure.standardDoc 
              : defaultFigure.standardDoc,
            // Make sure possiblePaths is an array if it exists
            possiblePaths: Array.isArray(figure.possiblePaths) 
              ? figure.possiblePaths 
              : figure.image ? [figure.image] : [defaultFigure.image]
          };
        });
      
      console.log(`Sanitized ${sanitized.length} figures (${inputFigures.length - sanitized.length} were invalid)`);
      setFigures(sanitized);
    } catch (err) {
      console.error('Error sanitizing figures:', err);
      setError(err instanceof Error ? err : new Error('Unknown error sanitizing figures'));
      // Return an empty array instead of crashing
      setFigures([]);
    } finally {
      setIsLoading(false);
    }
  }, [inputFigures]);
  
  return { figures, isLoading, error };
} 