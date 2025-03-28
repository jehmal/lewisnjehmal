import React, { useEffect, useState } from 'react';
import { AlertTriangle, Book } from 'lucide-react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';

// Import direct access to specific clauses for fallback
import clause3012_1_4_18 from '../components/clauses/3012-2019/1.4.18.json';
import clause5139_1_3_8 from '../components/clauses/5139-2019/1.3.8.json';

// Map of direct clause access
const DIRECT_CLAUSES: Record<string, Record<string, any>> = {
  '3012': {
    '1.4.18': clause3012_1_4_18
  },
  '5139': {
    '1.3.8': clause5139_1_3_8
  }
};

interface MissingClauseDisplayProps {
  clauseId: string;
  standardId: string;
  className?: string;
  isFabricated?: boolean;
}

/**
 * A component to display a message for non-existent clauses
 * This provides a better user experience than seeing an error
 */
export function MissingClauseDisplay({
  clauseId,
  standardId,
  className = '',
  isFabricated = false
}: MissingClauseDisplayProps) {
  const [directClause, setDirectClause] = useState<any>(null);
  
  // Try to get the clause directly if we have it in our map
  useEffect(() => {
    const baseStandardId = standardId.split('-')[0]; // Extract base ID without version
    
    // Try to get the clause direct access data
    if (DIRECT_CLAUSES[baseStandardId] && DIRECT_CLAUSES[baseStandardId][clauseId]) {
      setDirectClause(DIRECT_CLAUSES[baseStandardId][clauseId]);
    }
  }, [standardId, clauseId]);
  
  // If we have direct access to this clause, display it
  if (directClause) {
    return (
      <Card className={`overflow-hidden relative ${className}`}>
        <CardHeader>
          <CardTitle>{directClause.title}</CardTitle>
          <CardDescription>AS/NZS {standardId || '3000'} Clause {clauseId}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="whitespace-pre-wrap">
            {directClause.fullText}
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Default fallback for missing clauses
  return (
    <Card className={`overflow-hidden relative ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center">
          <AlertTriangle className="h-5 w-5 text-orange-500 mr-2" />
          {isFabricated ? 'AI-Generated Reference' : 'Clause Loading Issue'}
        </CardTitle>
        <CardDescription>AS/NZS {standardId || '3000'} Clause {clauseId}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className={`p-4 rounded-md border ${
          isFabricated 
            ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800' 
            : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
        }`}>
          <p className={`${
            isFabricated 
              ? 'text-orange-800 dark:text-orange-200' 
              : 'text-yellow-800 dark:text-yellow-200'
          }`}>
            {isFabricated ? (
              <>
                The AI assistant mentioned this clause, but it doesn&apos;t appear to be a standard clause 
                from AS/NZS {standardId}. This may be an error in the reference or a paraphrased 
                summary.
              </>
            ) : (
              <>
                We&apos;re having trouble retrieving this clause. Please refer to your physical copy of 
                the standard for this clause.
              </>
            )}
          </p>
        </div>
      </CardContent>
      <CardFooter className="flex justify-end">
        <Button 
          variant="outline" 
          size="sm" 
          className={`${
            isFabricated 
              ? 'text-orange-600 hover:text-orange-700 border-orange-300 hover:border-orange-400 hover:bg-orange-50' 
              : 'text-yellow-600 hover:text-yellow-700 border-yellow-300 hover:border-yellow-400 hover:bg-yellow-50'
          }`}
        >
          <Book className="h-4 w-4 mr-2" />
          Report Issue
        </Button>
      </CardFooter>
    </Card>
  );
} 