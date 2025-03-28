import React from 'react';
import { cn } from '../lib/utils';

interface RatingDotsProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

export function RatingDots({ value, onChange, disabled = false }: RatingDotsProps) {
  return (
    <div className="flex space-x-2">
      {[1, 2].map((dotValue) => (
        <button
          key={dotValue}
          disabled={disabled}
          onClick={() => onChange(value === dotValue ? 0 : dotValue)}
          className={cn(
            "w-6 h-6 rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500",
            {
              "bg-amber-500 hover:bg-amber-600": value >= dotValue,
              "bg-gray-200 dark:bg-gray-600": value < dotValue,
              "hover:bg-amber-100 dark:hover:bg-amber-900/30": !disabled && value < dotValue,
              "cursor-not-allowed opacity-50": disabled,
            }
          )}
          aria-label={`Rate ${dotValue} point${dotValue !== 1 ? 's' : ''}`}
        />
      ))}
    </div>
  );
} 