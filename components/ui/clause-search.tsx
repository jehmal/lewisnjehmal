"use client";

import { useState, useEffect } from "react";
import { AnimatedTestimonials } from "./animated-testimonials";
import { getAllClauseIds, getClausesBatch } from "@/lib/ausnzClauses";
import type { ClauseSection } from "@/types";

interface ClauseDisplay {
  quote: string;
  name: string;
  designation: string;
  src: string;
  key: string;
}

const PLACEHOLDER_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23f0f0f0'/%3E%3Ctext x='50' y='50' font-family='Arial' font-size='14' fill='%23666' text-anchor='middle' dy='.3em'%3EClause%3C/text%3E%3C/svg%3E";

const clauseToTestimonial = (clause: ClauseSection, index: number): ClauseDisplay => ({
  quote: clause.fullText,
  name: clause.title,
  designation: `Clause ${clause.id}`,
  src: PLACEHOLDER_IMAGE,
  key: `${clause.id}-${index}`
});

export const ClauseSearch = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [clauses, setClauses] = useState<ClauseDisplay[]>([]);
  const [filteredClauses, setFilteredClauses] = useState<ClauseDisplay[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 5;
  const [isLoading, setIsLoading] = useState(true);
  const [loadedClauseIds, setLoadedClauseIds] = useState<string[]>([]);
  const batchSize = 10;
  const [allClauseIds, setAllClauseIds] = useState<string[]>([]);

  // Load all clause IDs on mount
  useEffect(() => {
    const loadClauseIds = async () => {
      setIsLoading(true);
      try {
        const ids = await getAllClauseIds();
        setAllClauseIds(ids);
        
        // Immediately load first batch after getting IDs
        if (ids.length > 0) {
          const initialClauses = await getClausesBatch(0, batchSize, ids);
          const initialDisplays = initialClauses.map((clause, index) => 
            clauseToTestimonial(clause, index)
          );
          
          setClauses(initialDisplays);
          setFilteredClauses(initialDisplays);
          setLoadedClauseIds(initialClauses.map(c => c.id));
        }
      } catch (error) {
        console.error('Error loading initial clauses:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadClauseIds();
  }, []);

  // Load clauses in batches as needed
  const loadMoreClauses = async () => {
    if (isLoading || !allClauseIds.length) return;
    
    setIsLoading(true);
    try {
      const startIndex = loadedClauseIds.length;
      const newClauses = await getClausesBatch(startIndex, batchSize, allClauseIds);
      
      if (!newClauses.length) {
        console.log('No more clauses to load');
        return;
      }
      
      const newClauseDisplays = newClauses.map((clause, index) => 
        clauseToTestimonial(clause, startIndex + index)
      );
      
      console.log('Loaded new clauses:', newClauseDisplays);
      
      setClauses(prev => [...prev, ...newClauseDisplays]);
      setLoadedClauseIds(prev => [...prev, ...newClauses.map(c => c.id)]);
      
      if (!searchTerm) {
        setFilteredClauses(prev => [...prev, ...newClauseDisplays]);
      }
    } catch (error) {
      console.error('Error loading clauses:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadMoreClauses();
  }, []);

  // Load more when scrolling near bottom
  useEffect(() => {
    const handleScroll = () => {
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 1000) {
        if (loadedClauseIds.length < allClauseIds.length) {
          loadMoreClauses();
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [loadedClauseIds, allClauseIds]);

  // Filter clauses based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredClauses(clauses);
      setCurrentPage(0);
      return;
    }

    const searchTerms = searchTerm.toLowerCase().split(' ').filter(term => term.length > 0);
    
    const filtered = clauses.filter((clause) => {
      return searchTerms.every(term => 
        clause.name.toLowerCase().includes(term) ||
        clause.quote.toLowerCase().includes(term) ||
        clause.designation.toLowerCase().includes(term)
      );
    });

    setFilteredClauses(filtered);
    setCurrentPage(0);
  }, [searchTerm, clauses]);

  // Get current page items
  const getCurrentPageItems = () => {
    if (filteredClauses.length === 0) return [];
    const start = currentPage * itemsPerPage;
    const end = start + itemsPerPage;
    return filteredClauses.slice(start, end);
  };

  return (
    <div className="flex flex-col w-full space-y-4">
      <div className="w-full px-4">
        <input
          type="text"
          placeholder="Search clauses by title, content, or clause number..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 
                     bg-white dark:bg-neutral-800 text-black dark:text-white
                     focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="text-sm text-gray-500 mt-2">
          {isLoading ? (
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-500"></div>
              <span>Loading clauses...</span>
            </div>
          ) : (
            `Found ${filteredClauses.length} clauses`
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0">
        {isLoading ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-500"></div>
          </div>
        ) : filteredClauses.length > 0 ? (
          <>
            <AnimatedTestimonials 
              testimonials={getCurrentPageItems()} 
              autoplay={false} 
            />
            <div className="flex justify-center gap-4 mt-4">
              <button
                onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                disabled={currentPage === 0}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg 
                         disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="px-4 py-2">
                Page {currentPage + 1} of {Math.ceil(filteredClauses.length / itemsPerPage)}
              </span>
              <button
                onClick={() => setCurrentPage(prev => 
                  Math.min(Math.ceil(filteredClauses.length / itemsPerPage) - 1, prev + 1)
                )}
                disabled={currentPage >= Math.ceil(filteredClauses.length / itemsPerPage) - 1}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg 
                         disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </>
        ) : (
          <div className="text-center py-20 text-gray-500 dark:text-gray-400">
            No clauses found matching your search.
          </div>
        )}
      </div>
    </div>
  );
}; 