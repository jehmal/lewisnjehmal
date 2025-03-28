import React from 'react';
import { cn } from "../../lib/utils";

interface RatingDotsProps {
  value: number;
  onChange: (value: number) => void;
  maxValue: number;
  name: string;
}

export const RatingDots = ({ 
  value = 0, 
  onChange, 
  maxValue = 2,
  name 
}: RatingDotsProps) => {
  const dots = Array.from({ length: maxValue }, (_, i) => i + 1);

  return (
    <div className="flex items-center space-x-2">
      {dots.map((dotValue) => (
        <button
          key={`${name}-dot-${dotValue}`}
          type="button"
          onClick={() => onChange(dotValue === value ? 0 : dotValue)}
          className={cn(
            "w-6 h-6 rounded-full transition-all",
            "border focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500",
            value >= dotValue 
              ? "bg-amber-500 border-amber-600 hover:bg-amber-600" 
              : "bg-transparent border-gray-300 dark:border-gray-600 hover:bg-amber-100 dark:hover:bg-amber-900/30"
          )}
          aria-label={`Rate ${dotValue} out of ${maxValue}`}
        />
      ))}
    </div>
  );
}; 