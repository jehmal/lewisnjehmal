import { useState, useEffect } from 'react';
import { BaseReference, ReferenceError } from '@/types/references';
import { ReferenceDetector } from '@/services/reference-detector';
import { ReferenceRecovery } from '@/services/reference-recovery';

interface UseReferenceResult {
  reference: BaseReference | null;
  relatedReferences: BaseReference[];
  isLoading: boolean;
  error: Error | null;
}

export function useReference(text: string): UseReferenceResult {
  const [reference, setReference] = useState<BaseReference | null>(null);
  const [relatedReferences, setRelatedReferences] = useState<BaseReference[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const loadReference = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Detect references in the text
        const detector = ReferenceDetector.getInstance();
        const references = detector.detectReferences(text);

        if (references.length === 0) {
          throw new ReferenceError('No references found in text', 'NO_REFERENCES');
        }

        // Use recovery service to load the reference
        const recovery = ReferenceRecovery.getInstance();
        const loadedReference = await recovery.loadWithRetry(references[0]);

        // Set the main reference
        setReference(loadedReference);

        // If it's a clause, load related references
        if (loadedReference.type === 'clause' && 'relatedReferences' in loadedReference) {
          const relatedRefs = (loadedReference as any).relatedReferences || [];
          setRelatedReferences(relatedRefs);
        } else {
          setRelatedReferences([]);
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error occurred'));
      } finally {
        setIsLoading(false);
      }
    };

    loadReference();
  }, [text]);

  return {
    reference,
    relatedReferences,
    isLoading,
    error
  };
} 