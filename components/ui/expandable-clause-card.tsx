"use client";
import React, { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "../../lib/utils";
import { ClauseTreeViewElement } from "../../types/clauses";
import { Book, FileText, X } from "lucide-react";
import { ClauseDisplay } from "../ClauseDisplay";
import { extractStandardInfo } from "../../utils/card-utils/clause-helpers";

interface ExpandableClauseCardProps {
  clauses: ClauseTreeViewElement[];
  groupedByStandard?: boolean;
}

export function ExpandableClauseCard({ clauses, groupedByStandard = true }: ExpandableClauseCardProps) {
  const [active, setActive] = useState<ClauseTreeViewElement | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setActive(null);
      }
    }

    if (active) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [active]);

  const outsideClickHandler = (event: MouseEvent) => {
    if (ref.current && !ref.current.contains(event.target as Node)) {
      setActive(null);
    }
  };

  useEffect(() => {
    document.addEventListener("mousedown", outsideClickHandler);
    return () => {
      document.removeEventListener("mousedown", outsideClickHandler);
    };
  }, []);

  // Group clauses by standard if requested
  const groupedClauses: Record<string, ClauseTreeViewElement[]> = {};
  
  if (groupedByStandard && clauses.length > 0) {
    clauses.forEach(clause => {
      const standardId = clause.standardDoc || extractStandardInfo(clause.id).standardId;
      if (!groupedClauses[standardId]) {
        groupedClauses[standardId] = [];
      }
      groupedClauses[standardId].push(clause);
    });
  }

  const standards = Object.keys(groupedClauses);

  return (
    <>
      <AnimatePresence>
        {active && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm h-full w-full z-50"
            onClick={() => setActive(null)}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {active ? (
          <div className="fixed inset-0 grid place-items-center z-[100]">
            <motion.button
              key={`button-${active.id}-${id}`}
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.05 } }}
              className="flex absolute top-4 right-4 items-center justify-center bg-white dark:bg-gray-800 rounded-full h-8 w-8 shadow-lg"
              onClick={() => setActive(null)}
            >
              <X className="h-5 w-5 text-gray-800 dark:text-gray-200" />
            </motion.button>
            <motion.div
              layoutId={`card-${active.id}-${id}`}
              ref={ref}
              className="w-full max-w-[600px] max-h-[90vh] flex flex-col bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-xl"
            >
              <div className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <motion.div 
                      layoutId={`icon-${active.id}-${id}`}
                      className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900/30"
                    >
                      <FileText className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                    </motion.div>
                    <motion.h3
                      layoutId={`title-${active.id}-${id}`}
                      className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-1"
                    >
                      {active.name || `Clause ${active.id.replace('AUSNZ:', '')}`}
                    </motion.h3>
                    <motion.p
                      layoutId={`standard-${active.id}-${id}`}
                      className="text-sm text-gray-500 dark:text-gray-400"
                    >
                      {active.standardDoc || extractStandardInfo(active.id).standardId}
                    </motion.p>
                  </div>
                </div>
                <div className="mt-4 relative">
                  <motion.div
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="overflow-auto max-h-[60vh]"
                  >
                    <ClauseDisplay
                      standardId={active.standardDoc || extractStandardInfo(active.id).standardId}
                      clauseId={active.id.replace('AUSNZ:', '')}
                      onError={(error) => console.error(`Error loading clause ${active.id}:`, error)}
                      className="mb-4"
                    />
                  </motion.div>
                </div>
              </div>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>

      {groupedByStandard ? (
        <div className="space-y-6 sticky top-4 max-h-[600px] overflow-y-auto rounded-lg bg-gray-50 dark:bg-gray-900 p-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Referenced Clauses</h2>
          
          {standards.map(standardId => (
            <div key={standardId} className="space-y-2">
              <h3 className="text-md font-medium text-orange-600 dark:text-orange-400">
                {standardId}
              </h3>
              <div className="space-y-2">
                {groupedClauses[standardId].map(clause => (
                  <motion.div
                    layoutId={`card-${clause.id}-${id}`}
                    key={`card-${clause.id}-${id}`}
                    onClick={() => setActive(clause)}
                    className="p-3 flex justify-between items-center bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg cursor-pointer border border-gray-200 dark:border-gray-700 transition-all duration-200"
                  >
                    <div className="flex gap-3 items-center">
                      <motion.div 
                        layoutId={`icon-${clause.id}-${id}`}
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900/30"
                      >
                        <FileText className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                      </motion.div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-orange-600 dark:text-orange-400">
                            {clause.id.replace('AUSNZ:', '')}
                          </span>
                        </div>
                        <motion.h3
                          layoutId={`title-${clause.id}-${id}`}
                          className="text-sm font-medium text-gray-800 dark:text-gray-200 line-clamp-1"
                        >
                          {clause.name || `Clause ${clause.id.replace('AUSNZ:', '')}`}
                        </motion.h3>
                        <motion.p
                          layoutId={`standard-${clause.id}-${id}`}
                          className="text-xs text-gray-500 dark:text-gray-400"
                        >
                          {clause.standardDoc || extractStandardInfo(clause.id).standardId}
                        </motion.p>
                      </div>
                    </div>
                    <motion.div
                      className="px-2 py-1 text-xs rounded-full font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-orange-100 dark:hover:bg-orange-900/40 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
                    >
                      View
                    </motion.div>
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2 sticky top-4 max-h-[600px] overflow-y-auto p-4">
          {clauses.map(clause => (
            <motion.div
              layoutId={`card-${clause.id}-${id}`}
              key={`card-${clause.id}-${id}`}
              onClick={() => setActive(clause)}
              className="p-3 flex justify-between items-center bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg cursor-pointer border border-gray-200 dark:border-gray-700 transition-all duration-200"
            >
              <div className="flex gap-3 items-center">
                <motion.div 
                  layoutId={`icon-${clause.id}-${id}`}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900/30"
                >
                  <FileText className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                </motion.div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-orange-600 dark:text-orange-400">
                      {clause.id.replace('AUSNZ:', '')}
                    </span>
                  </div>
                  <motion.h3
                    layoutId={`title-${clause.id}-${id}`}
                    className="text-sm font-medium text-gray-800 dark:text-gray-200 line-clamp-1"
                  >
                    {clause.name || `Clause ${clause.id.replace('AUSNZ:', '')}`}
                  </motion.h3>
                  <motion.p
                    layoutId={`standard-${clause.id}-${id}`}
                    className="text-xs text-gray-500 dark:text-gray-400"
                  >
                    {clause.standardDoc || extractStandardInfo(clause.id).standardId}
                  </motion.p>
                </div>
              </div>
              <motion.div
                className="px-2 py-1 text-xs rounded-full font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-orange-100 dark:hover:bg-orange-900/40 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
              >
                View
              </motion.div>
            </motion.div>
          ))}
        </div>
      )}
    </>
  );
} 