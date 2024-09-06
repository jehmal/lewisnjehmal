"use client";

import React, { useState, useEffect } from 'react';
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from 'framer-motion';

interface Question {
  name: string;
  description: string;
  icon: string;
  color: string;
}

const questions: Question[] = [
  {
    name: "Load Calculations",
    description: "What are the specific load calculations required for this installation?",
    icon: "🔢",
    color: "#00C9A7",
  },
  {
    name: "Earthing System Design",
    description: "What are the requirements for earthing system design and supporting calculations for this project?",
    icon: "⚡",
    color: "#FFB800",
  },
  {
    name: "Network Connection",
    description: "Are there any specific network operator requirements for the connection of this installation?",
    icon: "🔌",
    color: "#FF3D71",
  },
  {
    name: "Safe Operating Procedures",
    description: "What are the safe operating procedures and maintenance schedules for the equipment being installed?",
    icon: "🛡️",
    color: "#1E86FF",
  },
  {
    name: "SPD Requirements",
    description: "What are the requirements for the Service Protection Device (SPD) and its location in this installation?",
    icon: "🔒",
    color: "#8A2BE2",
  },
];

const QuestionItem = ({ name, description, icon, color }: Question) => {
  return (
    <figure
      className={cn(
        "relative mx-auto min-h-fit w-full max-w-[400px] overflow-hidden rounded-2xl p-4",
        "transition-all duration-200 ease-in-out",
        "bg-white dark:bg-gray-800",
      )}
    >
      <div className="flex flex-row items-center gap-3">
        <div
          className="flex size-10 items-center justify-center rounded-2xl"
          style={{
            backgroundColor: color,
          }}
        >
          <span className="text-lg">{icon}</span>
        </div>
        <div className="flex flex-col overflow-hidden">
          <figcaption className="flex flex-row items-center whitespace-pre text-lg font-medium dark:text-white">
            <span className="text-sm sm:text-lg">{name}</span>
          </figcaption>
          <p className="text-sm font-normal dark:text-white/60">
            {description}
          </p>
        </div>
      </div>
    </figure>
  );
};

const AnimatedListDemo = ({ className }: { className?: string }) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentQuestionIndex((prevIndex) => (prevIndex + 1) % questions.length);
    }, 5000); // Rotate questions every 5 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div className={cn("w-full", className)}>
      <AnimatePresence mode="wait">
        <motion.div
          key={currentQuestionIndex}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.5 }}
        >
          <QuestionItem {...questions[currentQuestionIndex]} />
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default AnimatedListDemo;