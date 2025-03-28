import React, { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '../lib/utils';

// Function to parse clause text and identify clause references
const parseClauseReferences = (text: string): string[] => {
  // Match patterns like "Clause X.Y.Z" or "Clause X.Y.Z.W"
  const regex = /Clause\s+(\d+(\.\d+)+)/g;
  const matches = text.match(regex);
  
  if (!matches) return [];
  
  // Extract just the clause numbers from the matches
  const references = matches.map(match => {
    return match.replace('Clause ', '').trim();
  });
  
  // Remove duplicates
  return [...new Set(references)];
};

interface RelatedClauseProps {
  clauseId: string;
  standardId: string;
  parentClauseId: string; // To prevent circular references
}

export function RelatedClause({ clauseId, standardId, parentClauseId }: RelatedClauseProps) {
  const [clause, setClause] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [expanded, setExpanded] = useState(false);
  
  const supabase = createClientComponentClient();
  
  // Handle circular reference after hooks declaration
  const isCircularReference = clauseId === parentClauseId;
  
  useEffect(() => {
    // Don't load if it's a circular reference
    if (isCircularReference) {
      setLoading(false);
      return;
    }

    async function loadClause() {
      try {
        // Try direct import first
        let clauses: Record<string, any> = {};
        
        try {
          if (standardId === '3000' || standardId === '3000-2018') {
            try {
              const importedClauses = await import('../components/clauses/3000-2018/index');
              clauses = importedClauses as Record<string, any>;
              console.log(`RelatedClause: Found clauses for 3000-2018, checking for ${clauseId}`);
              if (clauses && clauses[clauseId]) {
                console.log(`RelatedClause: Found clause ${clauseId} in 3000-2018 index`);
                setClause(clauses[clauseId]);
                setLoading(false);
                return;
              }
            } catch (err) {
              console.warn(`RelatedClause: Error importing from 3000-2018:`, err);
            }
          }
          // Try other standards as needed...
        } catch (error) {
          console.warn(`RelatedClause: Error with direct import:`, error);
        }
        
        // Then try the clause loader service
        try {
          const { ClauseLoader } = await import('../services/clause-loader');
          console.log(`RelatedClause: Using clause loader for ${standardId}/${clauseId}`);
          const loader = ClauseLoader.getInstance();
          const result = await loader.loadClause(`${standardId}/${clauseId}`);
          
          if (result) {
            console.log(`RelatedClause: Successfully loaded clause ${clauseId} from loader:`, result.title);
            setClause(result);
            setLoading(false);
            return;
          }
        } catch (error) {
          console.warn(`RelatedClause: Failed to load clause ${clauseId} from clause loader:`, error);
        }
        
        // Fallback: Try to load from Supabase directly if available
        console.log(`RelatedClause: Trying Supabase for clause ${clauseId}`);
        const { data, error } = await supabase
          .from('clauses')
          .select('*')
          .eq('id', clauseId)
          .eq('standard_id', standardId)
          .single();
          
        if (error) throw error;
        
        if (data) {
          console.log(`RelatedClause: Found clause ${clauseId} in Supabase:`, data.title);
          setClause(data);
        } else {
          console.error(`RelatedClause: Clause ${clauseId} not found in any source`);
          throw new Error(`Clause ${clauseId} not found`);
        }
      } catch (error) {
        console.error(`RelatedClause: Error loading related clause ${clauseId}:`, error);
        setError(error instanceof Error ? error : new Error(String(error)));
      } finally {
        setLoading(false);
      }
    }
    
    loadClause();
  }, [clauseId, standardId, parentClauseId]);
  
  const toggleExpand = () => {
    setExpanded(!expanded);
  };
  
  if (loading) {
    return (
      <Card className="mt-2 mb-4 border border-gray-200 dark:border-gray-700">
        <CardHeader className="py-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Loading clause {clauseId}...
            </CardTitle>
          </div>
        </CardHeader>
      </Card>
    );
  }
  
  if (isCircularReference) {
    return null;
  }
  
  if (error || !clause) {
    return (
      <Card className="mt-2 mb-4 border border-gray-200 dark:border-gray-700 bg-yellow-50 dark:bg-yellow-900/10">
        <CardHeader className="py-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-yellow-700 dark:text-yellow-500">
              Clause {clauseId} (Reference only)
            </CardTitle>
          </div>
          <CardDescription className="text-xs text-yellow-600 dark:text-yellow-400">
            Unable to load referenced clause content
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }
  
  return (
    <Card className="mt-2 mb-4 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
      <CardHeader className="py-3 cursor-pointer" onClick={toggleExpand}>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {clause.title ? `${clause.id} ${clause.title}` : `Clause ${clause.id}`}
          </CardTitle>
          <Button variant="ghost" size="sm" className="p-0 h-6 w-6">
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
        <CardDescription className="text-xs text-gray-500 dark:text-gray-400">
          {!expanded ? "Click to view referenced clause" : "Click to collapse"}
        </CardDescription>
      </CardHeader>
      
      {expanded && (
        <CardContent className={cn(
          "text-sm p-4 pt-0 border-t border-gray-100 dark:border-gray-800",
          "bg-gray-50 dark:bg-gray-800/50"
        )}>
          <div className="prose prose-sm dark:prose-invert max-w-none">
            {clause.fullText.split('\n').map((paragraph: string, index: number) => (
              <p key={index} className="mb-2 last:mb-0">
                {paragraph}
              </p>
            ))}
            
            {clause.fullText && parseClauseReferences(clause.fullText).length > 0 && (
              <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800 rounded text-xs text-blue-700 dark:text-blue-300">
                This clause contains references to other clauses. Please view the full clause for complete context.
              </div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
} 