"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Search, Code, FileText, CheckCircle, Database } from 'lucide-react';

interface LoadingPhraseAnimationProps {
  phrases: string[];
  isLoading: boolean;
  className?: string;
  iconColor?: string;
}

// Icons for different types of phrases
const getIconForPhrase = (phrase: string) => {
  if (phrase.includes("Processing")) return Zap;
  if (phrase.includes("Consulting") || phrase.includes("Finding")) return Search;
  if (phrase.includes("Analyzing") || phrase.includes("Checking")) return Code;
  if (phrase.includes("Reviewing") || phrase.includes("Documentation")) return FileText;
  if (phrase.includes("Verifying") || phrase.includes("Compliance")) return CheckCircle;
  return Database; // Default icon
};

export const LoadingPhraseAnimation: React.FC<LoadingPhraseAnimationProps> = ({
  phrases,
  isLoading,
  className = "",
  iconColor = "#ee5622"
}) => {
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);

  // Handle phrase rotation
  useEffect(() => {
    if (!isLoading || phrases.length === 0) return;
    
    // Start with the first phrase
    setCurrentPhraseIndex(0);
    
    // Change phrases at regular intervals
    const interval = setInterval(() => {
      setCurrentPhraseIndex(prev => (prev + 1) % phrases.length);
    }, 3000); // Change phrase every 3 seconds
    
    return () => clearInterval(interval);
  }, [isLoading, phrases.length]);

  if (!isLoading || phrases.length === 0) return null;

  const currentPhrase = phrases[currentPhraseIndex];
  const Icon = getIconForPhrase(currentPhrase);

  return (
    <div className={className}>
      <AnimatePresence mode="wait">
        <motion.div
          key={currentPhraseIndex}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
          className="flex items-center gap-2"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            <Icon size={16} color={iconColor} className="flex-shrink-0" />
          </motion.div>
          <span className="font-medium">{currentPhrase}</span>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}; 