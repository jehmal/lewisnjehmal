import React, { useState } from 'react';
import { cn } from "@/lib/utils";

interface TooltipProps {
  children: React.ReactNode;
  content: string;
}

export const Tooltip: React.FC<TooltipProps> = ({ children, content }) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
      >
        {children}
      </div>
      {isVisible && (
        <div className={cn(
          "absolute z-10 px-3 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg shadow-sm",
          "dark:bg-gray-700",
          "tooltip"
        )}>
          {content}
        </div>
      )}
    </div>
  );
};

export const TooltipProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => children;
export const TooltipTrigger: React.FC<{ asChild?: boolean; children: React.ReactNode }> = ({ children }) => <>{children}</>;
export const TooltipContent: React.FC<{ children: React.ReactNode }> = ({ children }) => <>{children}</>;