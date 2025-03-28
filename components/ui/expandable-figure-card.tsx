"use client";
import React, { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "../../lib/utils";
import { Figure } from "../../types/chat";
import { Image as LucideImage, X } from "lucide-react";
import { sanitizeFiguresArray, checkImageExists } from "../../utils/card-utils/figure-helpers";
import { PLACEHOLDER_IMAGE_PATH } from '@/lib/image-constants';
import Image from 'next/image';

interface ExpandableFigureCardProps {
  figures: Figure[];
  groupedByStandard?: boolean;
  onClose?: () => void;
}

export function ExpandableFigureCard({ figures, groupedByStandard = true, onClose }: ExpandableFigureCardProps) {
  const [active, setActive] = useState<Figure | null>(null);
  const [validatedFigures, setValidatedFigures] = useState<Figure[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();

  // Validate figure paths on component mount
  useEffect(() => {
    const validateFigures = async () => {
      try {
        const sanitized = sanitizeFiguresArray(figures);
        const validated = await Promise.all(
          sanitized.map(async (figure) => await checkImageExists(figure))
        );
        setValidatedFigures(validated);
        
        // Automatically set the first figure as active if there is one
        if (validated.length > 0 && !active) {
          setActive(validated[0]);
        }
      } catch (error) {
        console.error("Error validating figures:", error);
      } finally {
        setIsLoading(false);
      }
    };

    validateFigures();
  }, [figures, active]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setActive(null);
        if (onClose) onClose();
        document.body.style.overflow = "auto";
      }
    }

    if (active) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "auto";
    };
  }, [active, onClose]);

  const outsideClickHandler = (event: MouseEvent) => {
    if (ref.current && !ref.current.contains(event.target as Node)) {
      setActive(null);
      if (onClose) onClose();
      document.body.style.overflow = "auto";
    }
  };

  useEffect(() => {
    document.addEventListener("mousedown", outsideClickHandler);
    return () => {
      document.removeEventListener("mousedown", outsideClickHandler);
    };
  }, []);

  // Group figures by standard if requested
  const groupedFigures: Record<string, Figure[]> = {};
  
  if (groupedByStandard && validatedFigures.length > 0) {
    validatedFigures.forEach(figure => {
      const standardId = figure.standardDoc || '3000';
      if (!groupedFigures[standardId]) {
        groupedFigures[standardId] = [];
      }
      groupedFigures[standardId].push(figure);
    });
  }

  const standards = Object.keys(groupedFigures);

  // Loading state
  if (isLoading) {
    return (
      <div className="p-4 flex justify-center items-center">
        <div className="animate-pulse text-gray-500 dark:text-gray-400">
          Loading figures...
        </div>
      </div>
    );
  }

  // Empty state
  if (validatedFigures.length === 0) {
    return null;
  }

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
              key={`button-${active.name}-${id}`}
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.05 } }}
              className="flex absolute top-4 right-4 items-center justify-center bg-white dark:bg-gray-800 rounded-full h-8 w-8 shadow-lg z-[101]"
              onClick={() => {
                setActive(null);
                if (onClose) onClose();
                document.body.style.overflow = "auto";
              }}
            >
              <X className="h-5 w-5 text-gray-800 dark:text-gray-200" />
            </motion.button>
            <motion.div
              layoutId={`card-${active.name}-${id}`}
              ref={ref}
              className="w-full max-w-[90vw] max-h-[90vh] flex flex-col bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-xl"
            >
              <div className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <motion.div 
                      layoutId={`icon-${active.name}-${id}`}
                      className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900/30"
                    >
                      <LucideImage className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                    </motion.div>
                    <motion.h3
                      layoutId={`title-${active.name}-${id}`}
                      className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-1"
                    >
                      {active.name}
                    </motion.h3>
                    <motion.p
                      layoutId={`standard-${active.name}-${id}`}
                      className="text-sm text-gray-500 dark:text-gray-400"
                    >
                      AS/NZS {active.standardDoc || '3000'}
                    </motion.p>
                  </div>
                </div>
                <div className="mt-4 relative">
                  <motion.div
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="overflow-auto max-h-[70vh]"
                  >
                    <div className="flex flex-col items-center justify-center w-full">
                      <div className="relative w-full h-[70vh] max-h-[70vh]">
                        <Image 
                          src={active.image} 
                          alt={active.name || 'Figure'}
                          fill
                          className="rounded-lg shadow-md object-contain"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            console.log('Error loading image, using placeholder');
                            target.src = PLACEHOLDER_IMAGE_PATH;
                          }}
                        />
                      </div>
                      {active.quote && (
                        <p className="mt-4 text-gray-700 dark:text-gray-300 text-sm text-center w-full max-w-[800px]">
                          {active.quote}
                        </p>
                      )}
                    </div>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>

      {groupedByStandard ? (
        <div className="space-y-6 sticky top-4 max-h-[600px] overflow-y-auto rounded-lg bg-gray-50 dark:bg-gray-900 p-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Referenced Figures</h2>
          
          {standards.map(standardId => (
            <div key={standardId} className="space-y-2">
              <h3 className="text-md font-medium text-orange-600 dark:text-orange-400">
                AS/NZS {standardId}
              </h3>
              <div className="space-y-2">
                {groupedFigures[standardId].map(figure => (
                  <motion.div
                    layoutId={`card-${figure.name}-${id}`}
                    key={`card-${figure.name}-${id}`}
                    onClick={() => setActive(figure)}
                    className="p-3 flex justify-between items-center bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg cursor-pointer border border-gray-200 dark:border-gray-700 transition-all duration-200"
                  >
                    <div className="flex gap-3 items-center">
                      <motion.div 
                        layoutId={`icon-${figure.name}-${id}`}
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900/30"
                      >
                        <LucideImage className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                      </motion.div>
                      <div>
                        <motion.h3
                          layoutId={`title-${figure.name}-${id}`}
                          className="text-sm font-medium text-gray-800 dark:text-gray-200 line-clamp-1"
                        >
                          {figure.name}
                        </motion.h3>
                        <motion.p
                          layoutId={`standard-${figure.name}-${id}`}
                          className="text-xs text-gray-500 dark:text-gray-400"
                        >
                          AS/NZS {figure.standardDoc || '3000'}
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
          {validatedFigures.map(figure => (
            <motion.div
              layoutId={`card-${figure.name}-${id}`}
              key={`card-${figure.name}-${id}`}
              onClick={() => setActive(figure)}
              className="p-3 flex justify-between items-center bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg cursor-pointer border border-gray-200 dark:border-gray-700 transition-all duration-200"
            >
              <div className="flex gap-3 items-center">
                <motion.div 
                  layoutId={`icon-${figure.name}-${id}`}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900/30"
                >
                  <LucideImage className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                </motion.div>
                <div>
                  <motion.h3
                    layoutId={`title-${figure.name}-${id}`}
                    className="text-sm font-medium text-gray-800 dark:text-gray-200 line-clamp-1"
                  >
                    {figure.name}
                  </motion.h3>
                  <motion.p
                    layoutId={`standard-${figure.name}-${id}`}
                    className="text-xs text-gray-500 dark:text-gray-400"
                  >
                    AS/NZS {figure.standardDoc || '3000'}
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