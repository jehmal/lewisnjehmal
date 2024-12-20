"use client";
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { Figure } from '@/types/chat';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { MovingBorder } from '@/components/ui/moving-border';
import Meteors from '@/components/magicui/meteors';
import Particles from '@/components/magicui/particles';

interface ExpandableCardDemoProps {
  figures: Figure[];
}

export function ExpandableCardDemo({ figures }: ExpandableCardDemoProps) {
  const [selectedFigure, setSelectedFigure] = useState<Figure | null>(null);

  if (!figures || figures.length === 0) return null;

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {figures.map((figure, idx) => (
          <motion.div
            key={idx}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={cn(
              "group relative overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800",
              "hover:border-orange-500/50 dark:hover:border-amber-500/50 transition-all duration-300",
              "cursor-pointer bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm",
              "shadow-lg hover:shadow-orange-500/20"
            )}
            onClick={() => setSelectedFigure(figure)}
          >
            <div className="aspect-[4/3] relative">
              <Image
                src={figure.image}
                alt={figure.title}
                fill
                className="object-contain p-2"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
            </div>
            <div className="p-4">
              <h3 className="text-sm font-medium bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">
                {figure.name}
              </h3>
            </div>
          </motion.div>
        ))}
      </div>

      <Dialog 
        open={!!selectedFigure} 
        onOpenChange={() => setSelectedFigure(null)}
      >
        <DialogContent className="max-w-[95vw] w-[95vw] h-[90vh] p-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-gray-200/50 dark:border-gray-800/50 shadow-2xl">
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
                <Image
                  src={selectedFigure.image}
                  alt={selectedFigure.title}
                  fill
                  className="object-contain p-4"
                  sizes="95vw"
                  priority
                />
              )}
            </motion.div>

            <motion.div 
              className="mt-4 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-4 rounded-xl border border-gray-200/50 dark:border-gray-700/50"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <h3 className="text-lg font-semibold bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">
                {selectedFigure?.name}
              </h3>
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
