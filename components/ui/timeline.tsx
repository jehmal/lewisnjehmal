"use client";
import {
  useScroll,
  useTransform,
  motion,
  useInView
} from "framer-motion";
import React, { useEffect, useRef, useState } from "react";

interface TimelineEntry {
  title: string;
  content: React.ReactNode;
  onDotClick?: () => void;
  isTimelineView?: boolean; // New prop to determine if we're in timeline/history view
}

// Create TimelineItem component
const TimelineItem = ({ 
  item, 
  index, 
  isDetailView, 
  activeIndex, 
  setActiveIndex,
  dotPosition,
  glowingOrange,
  getSpacing
}: {
  item: TimelineEntry;
  index: number;
  isDetailView: boolean;
  activeIndex: number;
  setActiveIndex: (index: number) => void;
  dotPosition: number;
  glowingOrange: { primary: string; secondary: string; glow: string };
  getSpacing: (index: number) => string;
}) => {
  const itemRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(itemRef, { 
    margin: "-30% 0px -30% 0px",
    once: false 
  });
  
  useEffect(() => {
    if (isInView) {
      setActiveIndex(index);
    }
  }, [isInView, index, setActiveIndex]);

  return (
    <div
      ref={itemRef}
      className={`timeline-item flex justify-start md:gap-6 ${getSpacing(index)} relative`}
    >
      {/* Dot and Title Container */}
      <div className={`${isDetailView ? 'w-10 md:w-16' : 'w-14 md:w-40'} flex-shrink-0 relative h-full`}>
        {/* Sticky Dot with Tooltip */}
        <div className="group relative">
          <div 
            className={`sticky h-${isDetailView ? '6' : '8'} w-${isDetailView ? '6' : '8'} rounded-full bg-white dark:bg-gray-800 flex items-center justify-center shadow-md border border-gray-200 dark:border-gray-700 cursor-pointer hover:scale-110 transition-transform duration-300 z-10`}
            style={{ top: `${dotPosition}px` }}
            onClick={item.onDotClick}
          >
            <div 
              className={`h-${isDetailView ? '2' : '3'} w-${isDetailView ? '2' : '3'} rounded-full ${activeIndex === index ? 'animate-pulse scale-150 transition-all duration-500' : 'transition-all duration-500'}`}
              style={{ 
                backgroundColor: glowingOrange.primary,
                boxShadow: activeIndex === index 
                  ? `0 0 12px ${glowingOrange.glow}` 
                  : `0 0 5px ${glowingOrange.glow}`
              }}
            />
            
            {/* Tooltip */}
            <div className="opacity-0 bg-black text-white text-xs rounded py-1 px-2 absolute -left-24 md:left-10 top-0 transition-opacity duration-300 pointer-events-none group-hover:opacity-100 whitespace-nowrap">
              Return to history
            </div>
          </div>
        </div>
        
        {/* Title - Desktop */}
        {!isDetailView && (
          <h3 
            className={`hidden md:block sticky text-sm ml-12 font-medium z-10 transition-colors duration-300 ${
              activeIndex === index 
                ? 'text-orange-600 dark:text-orange-400' 
                : 'text-gray-600 dark:text-gray-300'
            }`}
            style={{ top: `${dotPosition + 6}px` }}
          >
            {/* Only show timestamps in history view */}
            {item.isTimelineView ? item.title : ''}
          </h3>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 relative">
        {/* Title - Mobile */}
        {!isDetailView && (
          <h3 className={`md:hidden block text-sm mb-2 text-left font-medium transition-colors duration-300 ${
            activeIndex === index 
              ? 'text-orange-600 dark:text-orange-400' 
              : 'text-gray-600 dark:text-gray-300'
          }`}>
            {/* Only show timestamps in history view */}
            {item.isTimelineView ? item.title : ''}
          </h3>
        )}
        <div className="mb-8">{item.content}</div>
      </div>
    </div>
  );
};

export const Timeline = ({ 
  data, 
  lineColor = "#ee5622",
  isDetailView = false
}: { 
  data: TimelineEntry[], 
  lineColor?: string,
  isDetailView?: boolean 
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);
  const [windowHeight, setWindowHeight] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);

  // Update height when component mounts and when data changes
  useEffect(() => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setHeight(rect.height);
    }

    // Also save window height for positioning calculations
    setWindowHeight(window.innerHeight);

    // Add resize listener
    const handleResize = () => {
      setWindowHeight(window.innerHeight);
      if (ref.current) {
        setHeight(ref.current.getBoundingClientRect().height);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [ref, data]);

  // Update active index on scroll
  useEffect(() => {
    const handleScroll = () => {
      if (!ref.current) return;
      
      // Find the element that's currently in view
      const items = Array.from(ref.current.querySelectorAll('.timeline-item'));
      const viewportHeight = window.innerHeight;
      
      // Find the element closest to being centered in the viewport
      let minDistance = Infinity;
      let closestIndex = activeIndex;
      
      items.forEach((item, index) => {
        const rect = item.getBoundingClientRect();
        const itemCenter = rect.top + rect.height / 2;
        const viewportCenter = viewportHeight / 2;
        const distance = Math.abs(itemCenter - viewportCenter);
        
        if (distance < minDistance) {
          minDistance = distance;
          closestIndex = index;
        }
      });
      
      setActiveIndex(closestIndex);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [activeIndex]);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start 10%", "end 50%"],
  });

  const heightTransform = useTransform(scrollYProgress, [0, 1], [0, height]);
  const opacityTransform = useTransform(scrollYProgress, [0, 0.1], [0, 1]);

  // Enhanced glowing orange gradient
  const glowingOrange = {
    primary: "#ee5622",    // The app's primary orange
    secondary: "#eca72c",  // The app's secondary orange/yellow
    glow: "rgba(238, 86, 34, 0.8)" // Glow effect color
  };

  // Function to determine spacing based on index
  const getSpacing = (index: number) => {
    if (isDetailView) {
      // Smaller spacing in detail view
      return "pt-8 md:pt-10";
    } else if (index < 3) {
      // First 3 items get more space
      return "pt-16 md:pt-24";
    } else if (index < 8) {
      // Next 5 items get medium space
      return "pt-12 md:pt-16";
    } else {
      // Rest get regular space
      return "pt-8 md:pt-12";
    }
  };

  // Calculate optimal dot position based on window height
  const dotPosition = Math.max(120, Math.min(windowHeight * 0.3, 200));
  
  // Calculate timeline width based on view mode
  const timelineWidth = isDetailView ? "w-full md:w-1/6" : "w-full";

  return (
    <div
      className={`${timelineWidth} bg-white dark:bg-gray-950 font-sans rounded-lg shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden`}
      ref={containerRef}
    >
      <div ref={ref} className="relative max-w-7xl mx-auto py-4 pb-12">
        {/* Fixed Timeline Line - outside the map for better performance */}
        <div
          style={{
            height: height + "px",
            left: "7px",
          }}
          className="absolute top-0 overflow-hidden w-[1px] bg-[linear-gradient(to_bottom,var(--tw-gradient-stops))] from-transparent from-[0%] via-gray-200 dark:via-gray-700 to-transparent to-[99%] [mask-image:linear-gradient(to_bottom,transparent_0%,black_10%,black_90%,transparent_100%)] z-0"
        >
          <motion.div
            style={{
              height: heightTransform,
              opacity: opacityTransform,
            }}
            className="absolute inset-x-0 top-0 w-[3px] rounded-full bg-gradient-to-t from-orange-500 via-amber-400 to-transparent from-[0%] via-[40%] shadow-[0_0_15px_rgba(238,_86,_34,_0.9),_0_0_5px_rgba(236,_167,_44,_0.5)]"
          />
        </div>

        {/* Timeline Items */}
        {data.map((item, index) => (
          <TimelineItem
            key={index}
            item={item}
            index={index}
            isDetailView={isDetailView}
            activeIndex={activeIndex}
            setActiveIndex={setActiveIndex}
            dotPosition={dotPosition}
            glowingOrange={glowingOrange}
            getSpacing={getSpacing}
          />
        ))}
      </div>
    </div>
  );
};
