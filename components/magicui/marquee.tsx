import React, { ReactNode } from 'react';
import { cn } from "@/lib/utils";

interface MarqueeProps {
  children: ReactNode;
  className?: string;
  pauseOnHover?: boolean;
}

const Marquee: React.FC<MarqueeProps> = ({ children, className, pauseOnHover = false }) => {
  return (
    <div className={cn("overflow-hidden", className)}>
      <div className={cn(
        "flex animate-marquee whitespace-nowrap",
        pauseOnHover && "hover:[animation-play-state:paused]"
      )}>
        {children}
        {children} {/* Duplicate children to create a seamless loop */}
      </div>
    </div>
  );
};

export default Marquee;