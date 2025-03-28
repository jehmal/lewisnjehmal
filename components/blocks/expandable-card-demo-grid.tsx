"use client";
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { Figure } from '@/types/chat';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { MovingBorder } from '@/components/ui/moving-border';
import Meteors from '@/components/magicui/meteors';
import Particles from '@/components/magicui/particles';
import { ErrorBoundary } from '../ErrorBoundary';
import { PLACEHOLDER_IMAGE_PATH } from '@/lib/image-constants';

interface ExpandableCardDemoProps {
  figures: Figure[];
}

export function ExpandableCardDemo({ figures }: ExpandableCardDemoProps) {
  // Wrap the entire component in an error boundary to prevent rendering failures
  return (
    <ErrorBoundary
      fallback={
        <div className="p-4 rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/20">
          <h3 className="text-red-600 dark:text-red-400 font-medium">Error displaying figures</h3>
          <p className="text-sm text-red-500 dark:text-red-300">
            There was a problem displaying the figures. Please try refreshing the page.
          </p>
        </div>
      }
    >
      <ExpandableCardDemoInner figures={figures} />
    </ErrorBoundary>
  );
}

function ExpandableCardDemoInner({ figures }: ExpandableCardDemoProps) {
  const [selectedFigure, setSelectedFigure] = useState<Figure | null>(null);
  // Keep track of current image paths for each figure
  const [figurePaths, setFigurePaths] = useState<Record<string, string>>({});

  // Filter out invalid figures
  const validFigures = figures.filter(figure => {
    return figure && typeof figure === 'object' && (
      (figure.image && typeof figure.image === 'string') ||
      (figure.possiblePaths && Array.isArray(figure.possiblePaths) && figure.possiblePaths.length > 0)
    );
  });

  // Handle empty figures case after hooks
  if (validFigures.length === 0) {
    return (
      <div className="p-4 rounded-lg border border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20">
        <p className="text-amber-700 dark:text-amber-300 text-sm">No valid figures found</p>
      </div>
    );
  }

  // Handle image loading error by trying alternative paths
  const handleImageError = (figure: Figure) => {
    try {
      if (!figure || !figure.name) {
        console.warn('Invalid figure data in handleImageError');
        return;
      }

      console.log(`Image error for ${figure.name}, current path: ${figurePaths[figure.name] || figure.image}`);
      
      if (!figure.possiblePaths || !Array.isArray(figure.possiblePaths) || figure.possiblePaths.length <= 1) {
        console.log(`No alternative paths for ${figure.name}, using placeholder`);
        // Mark as fallback and update to use placeholder
        setFigurePaths(prev => ({
          ...prev,
          [figure.name]: PLACEHOLDER_IMAGE_PATH
        }));
        return;
      }
      
      const currentPath = figurePaths[figure.name] || figure.image;
      const currentIndex = figure.possiblePaths.indexOf(currentPath);
      
      console.log(`Current path index: ${currentIndex}, total paths: ${figure.possiblePaths.length}`);
      console.log(`All possible paths for ${figure.name}:`, figure.possiblePaths);
      
      // Try the next path if available
      if (currentIndex < figure.possiblePaths.length - 1) {
        const nextPath = figure.possiblePaths[currentIndex + 1];
        console.log(`Trying next path for ${figure.name}: ${nextPath}`);
        setFigurePaths(prev => ({
          ...prev,
          [figure.name]: nextPath
        }));
      } else {
        console.log(`All paths failed for ${figure.name}, using placeholder`);
        // All paths failed, use placeholder
        setFigurePaths(prev => ({
          ...prev,
          [figure.name]: PLACEHOLDER_IMAGE_PATH
        }));
      }
    } catch (error) {
      console.error('Error in handleImageError:', error);
      // Use placeholder as last resort
      if (figure && figure.name) {
        setFigurePaths(prev => ({
          ...prev,
          [figure.name]: PLACEHOLDER_IMAGE_PATH
        }));
      }
    }
  };

  // Get the current image path to use for a figure
  const getImagePath = (figure: Figure) => {
    try {
      // Check if figure is valid
      if (!figure) {
        console.warn('getImagePath received undefined figure');
        return PLACEHOLDER_IMAGE_PATH;
      }
      
      // Check if figure.name is valid
      if (typeof figure.name !== 'string' || !figure.name) {
        console.warn('getImagePath: figure has invalid name', figure);
        return PLACEHOLDER_IMAGE_PATH;
      }
      
      // Get stored path or use default
      const path = figurePaths[figure.name] || figure.image;
      
      // Final safety check on path
      if (!path) {
        console.warn(`getImagePath: No valid path for figure ${figure.name}`);
        return PLACEHOLDER_IMAGE_PATH;
      }
      
      console.log(`Getting path for ${figure.name}: ${path}`);
      return path;
    } catch (error) {
      console.error('Error in getImagePath:', error);
      return PLACEHOLDER_IMAGE_PATH;
    }
  };
  
  // Format the standard reference according to system message format
  const getFormattedStandardReference = (figure: Figure) => {
    try {
      // Basic validation
      if (!figure) return null;
      
      // Make sure standardDoc is valid
      const standardDoc = figure.standardDoc;
      if (typeof standardDoc !== 'string' || !standardDoc) {
        console.warn('getFormattedStandardReference: Invalid standardDoc', { figure });
        return null;
      }
      
      return `ASNZS${standardDoc}`;
    } catch (error) {
      console.error('Error in getFormattedStandardReference:', error);
      return null;
    }
  };
  
  // Display the figure title with proper formatting
  const getFormattedTitle = (figure: Figure) => {
    try {
      // Handle cases where figure is undefined
      if (!figure) {
        console.warn('getFormattedTitle received undefined figure');
        return 'Unknown Figure';
      }
      
      // Handle cases where figure.name might be undefined
      if (typeof figure.name !== 'string' || !figure.name) {
        console.warn('getFormattedTitle: figure has invalid name', { figure });
        return 'Unknown Figure';
      }
      
      // If we already have properly formatted title (e.g., "ASNZS3000 Table 4.1")
      try {
        // Use safe string operations
        const isAlreadyFormatted = figure.name.indexOf('ASNZS') === 0;
        if (isAlreadyFormatted) {
          return figure.name;
        }
      } catch (error) {
        console.error('Error checking if figure name is formatted:', error);
      }
      
      // Otherwise format it according to system message
      try {
        const standardRef = getFormattedStandardReference(figure);
        if (standardRef) {
          return `${standardRef} ${figure.name}`;
        }
      } catch (error) {
        console.error('Error formatting with standard reference:', error);
      }
      
      return figure.name || 'Unknown Figure';
    } catch (error) {
      console.error('Error in getFormattedTitle:', error);
      return 'Unknown Figure';
    }
  };

  // Replace figures with validFigures in the JSX at the end
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {validFigures.map((figure, idx) => (
          <motion.div
            key={idx}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={cn(
              "group relative overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800",
              "hover:border-orange-500/50 dark:hover:border-amber-500/50 transition-all duration-300",
              "cursor-pointer bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm",
              "shadow-lg hover:shadow-orange-500/20",
              figure.isFallback ? "border-orange-300 dark:border-orange-700" : ""
            )}
            onClick={() => setSelectedFigure(figure)}
          >
            <div className="aspect-[4/3] relative">
              {figure.isFallback ? (
                // Display a placeholder with figure reference for fallback figures
                <div className="absolute inset-0 flex items-center justify-center p-4 bg-gradient-to-br from-gray-100 via-white to-gray-50 dark:from-gray-800 dark:via-gray-900 dark:to-gray-800">
                  <div className="text-center max-w-full px-4">
                    <p className="text-lg font-semibold text-orange-600 dark:text-orange-400 mb-1">
                      {getFormattedTitle(figure)}
                    </p>
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-snug">
                      {figure.quote}
                    </p>
                  </div>
                </div>
              ) : (
                // Normal image display
                <Image
                  src={getImagePath(figure)}
                  alt={figure.title || getFormattedTitle(figure)}
                  fill
                  className="object-contain p-2"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  onError={() => handleImageError(figure)}
                />
              )}
            </div>
            <div className="p-4">
              <h3 className="text-sm font-medium bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">
                {getFormattedTitle(figure)}
              </h3>
              {figure.standardDoc && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  AS/NZS {figure.standardDoc}
                </p>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      <Dialog 
        open={!!selectedFigure} 
        onOpenChange={() => setSelectedFigure(null)}
      >
        <DialogContent className="max-w-[95vw] w-[95vw] h-[90vh] p-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-gray-200/50 dark:border-gray-800/50 shadow-2xl">
          <DialogTitle className="sr-only">
            {selectedFigure ? getFormattedTitle(selectedFigure) : 'Figure Details'}
          </DialogTitle>
          
          <DialogDescription className="sr-only">
            {selectedFigure ? selectedFigure.quote : 'Detailed view of figure'} 
          </DialogDescription>
          
          <MovingBorder duration={3000} rx="20" ry="20">
            <div className="absolute inset-0 rounded-2xl" />
          </MovingBorder>
          
          <div className="relative w-full h-full flex flex-col p-6">
            <div className="absolute inset-0 overflow-hidden">
              <Meteors number={20} color="#ee5622" />
              <Particles
                className="absolute inset-0"
                quantity={100}
                ease={80}
                color={selectedFigure?.name.toLowerCase().includes('table') ? '#eca72c' : '#ee5622'}
                refresh
              />
            </div>

            <motion.div 
              className="flex-1 relative min-h-0 rounded-xl overflow-hidden bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {selectedFigure && (
                selectedFigure.isFallback ? (
                  // Display a placeholder with figure reference for fallback figures
                  <div className="absolute inset-0 flex items-center justify-center p-4">
                    <div className="text-center max-w-lg bg-white/90 dark:bg-gray-800/90 p-8 rounded-xl shadow-lg border border-orange-300/50 dark:border-orange-700/50">
                      <h3 className="text-2xl font-bold text-orange-600 dark:text-orange-400 mb-3">
                        {getFormattedTitle(selectedFigure)}
                      </h3>
                      <p className="text-gray-700 dark:text-gray-300 text-lg mb-4">
                        This figure is referenced in the standard but is not available in our image library.
                      </p>
                      <div className="py-3 px-4 bg-orange-50 dark:bg-gray-900/50 rounded-lg border border-orange-200 dark:border-orange-900 mb-4">
                        <p className="text-gray-700 dark:text-gray-300 italic">
                          &ldquo;{selectedFigure.quote}&rdquo;
                        </p>
                      </div>
                      {selectedFigure.standardDoc && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
                          Referenced in AS/NZS {selectedFigure.standardDoc}
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  // Normal image display
                  <Image
                    src={getImagePath(selectedFigure)}
                    alt={selectedFigure.title || getFormattedTitle(selectedFigure)}
                    fill
                    className="object-contain p-4"
                    sizes="95vw"
                    priority
                    onError={() => selectedFigure && handleImageError(selectedFigure)}
                  />
                )
              )}
            </motion.div>

            <motion.div 
              className="mt-4 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-4 rounded-xl border border-gray-200/50 dark:border-gray-700/50"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <h3 className="text-lg font-semibold bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">
                {selectedFigure && getFormattedTitle(selectedFigure)}
              </h3>
              {selectedFigure?.standardDoc && (
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  From AS/NZS {selectedFigure.standardDoc}
                </p>
              )}
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {selectedFigure?.quote}
              </p>
            </motion.div>

            <motion.button
              className="absolute -top-2 -right-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-full p-2 shadow-lg border border-gray-200/50 dark:border-gray-700/50 hover:scale-110 transition-transform z-50"
              onClick={() => setSelectedFigure(null)}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </motion.button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
