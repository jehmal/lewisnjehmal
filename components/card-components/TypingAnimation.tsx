"use client";
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Custom blink animation style
const blinkAnimationStyle = `
  @keyframes blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0; }
  }
  .animate-blink {
    animation: blink 0.8s infinite;
  }
`;

interface TypingAnimationProps {
  phrases: string[];
  isLoading: boolean;
  className?: string;
  cursorColor?: string;
}

export const TypingAnimation: React.FC<TypingAnimationProps> = ({
  phrases,
  isLoading,
  className = "",
  cursorColor = "bg-amber-500"
}) => {
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
  const [displayText, setDisplayText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const typeIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startDelayRef = useRef<NodeJS.Timeout | null>(null);
  const phraseRotationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize with the first phrase
  useEffect(() => {
    if (!isLoading || phrases.length === 0) return;
    
    // Ensure we start with a valid phrase
    setCurrentPhraseIndex(0);
    setDisplayText('');
    setIsTyping(true);
    
    return () => {
      // Clean up on unmount
      if (phraseRotationIntervalRef.current) {
        clearInterval(phraseRotationIntervalRef.current);
      }
    };
  }, [isLoading, phrases]);

  // Handle phrase rotation
  useEffect(() => {
    if (!isLoading || phrases.length === 0) return;
    
    // Clear any existing interval
    if (phraseRotationIntervalRef.current) {
      clearInterval(phraseRotationIntervalRef.current);
    }
    
    // Change phrases at regular intervals
    phraseRotationIntervalRef.current = setInterval(() => {
      setCurrentPhraseIndex(prev => {
        const nextIndex = (prev + 1) % phrases.length;
        return nextIndex;
      });
    }, 4000); // Change phrase every 4 seconds
    
    return () => {
      if (phraseRotationIntervalRef.current) {
        clearInterval(phraseRotationIntervalRef.current);
      }
    };
  }, [isLoading, phrases.length]);

  // Handle typing animation
  useEffect(() => {
    if (!isLoading || phrases.length === 0) return;
    
    // Get the current phrase to type
    const currentPhrase = phrases[currentPhraseIndex];
    if (!currentPhrase) return;
    
    // Clear any existing text and start typing
    setDisplayText('');
    setIsTyping(true);
    
    // Clear any existing intervals
    if (typeIntervalRef.current) {
      clearInterval(typeIntervalRef.current);
      typeIntervalRef.current = null;
    }
    
    if (startDelayRef.current) {
      clearTimeout(startDelayRef.current);
      startDelayRef.current = null;
    }
    
    // Add a small delay before starting to type
    startDelayRef.current = setTimeout(() => {
      let i = 0;
      typeIntervalRef.current = setInterval(() => {
        if (i < currentPhrase.length) {
          setDisplayText(currentPhrase.substring(0, i + 1));
          i++;
        } else {
          // Finished typing this phrase
          setIsTyping(false);
          if (typeIntervalRef.current) {
            clearInterval(typeIntervalRef.current);
            typeIntervalRef.current = null;
          }
        }
      }, 40); // Type a character every 40ms
    }, 300); // Wait 300ms before starting to type
    
    // Clean up function
    return () => {
      if (startDelayRef.current) {
        clearTimeout(startDelayRef.current);
        startDelayRef.current = null;
      }
      if (typeIntervalRef.current) {
        clearInterval(typeIntervalRef.current);
        typeIntervalRef.current = null;
      }
    };
  }, [currentPhraseIndex, isLoading, phrases]);

  if (!isLoading || phrases.length === 0) return null;

  return (
    <>
      <style jsx global>{blinkAnimationStyle}</style>
      <AnimatePresence mode="wait">
        <motion.div
          key={currentPhraseIndex}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className={`flex items-center ${className}`}
        >
          <span className="min-h-[1.5rem] min-w-[80px] font-medium">{displayText}</span>
          {isTyping && (
            <span className={`ml-[1px] h-5 w-[2px] ${cursorColor} inline-block animate-blink`}></span>
          )}
        </motion.div>
      </AnimatePresence>
    </>
  );
}; 