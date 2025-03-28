"use client";
import React, { useEffect, useRef, useState } from "react";
import {
  motion,
  useTransform,
  useScroll,
  useVelocity,
  useSpring,
} from "framer-motion";
import { cn } from "../../lib/utils";

export const TracingBeam = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  // Get scroll velocity to create more responsive animations
  const scrollYVelocity = useVelocity(scrollYProgress);
  
  const contentRef = useRef<HTMLDivElement>(null);
  const [svgHeight, setSvgHeight] = useState(0);

  useEffect(() => {
    if (contentRef.current) {
      setSvgHeight(contentRef.current.offsetHeight);
    }
  }, []);

  // Add more spring to make the animation more fluid
  const y1 = useSpring(
    useTransform(scrollYProgress, [0, 0.8], [50, svgHeight]),
    {
      stiffness: 500,
      damping: 90,
    }
  );
  const y2 = useSpring(
    useTransform(scrollYProgress, [0, 1], [50, svgHeight - 200]),
    {
      stiffness: 500,
      damping: 90,
    }
  );

  // Add dot Y position with spring for smooth following
  const dotY = useSpring(
    useTransform(scrollYProgress, [0, 1], [50, svgHeight - 100]),
    {
      stiffness: 500,
      damping: 90,
    }
  );

  return (
    <motion.div
      ref={ref}
      className={cn("relative w-full max-w-4xl mx-auto h-full", className)}
    >
      <div className="absolute -left-4 md:-left-12 top-3">
        {/* Animated dot that follows scroll position */}
        <motion.div
          style={{ y: dotY }}
          className="absolute left-0 z-10"
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 30,
          }}
        >
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ 
              scale: [0.8, 1.2, 0.8],
              backgroundColor: scrollYProgress.get() > 0 ? "#ee5622" : "#eca72c"
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              repeatType: "reverse",
            }}
            className="ml-[27px] h-6 w-6 rounded-full border-2 border-orange-400 shadow-lg flex items-center justify-center"
          >
            <motion.div
              animate={{
                backgroundColor:
                  scrollYProgress.get() > 0 ? "#ee5622" : "#eca72c",
                borderColor:
                  scrollYProgress.get() > 0 ? "#ee5622" : "#eca72c",
                scale: [1, 0.6, 1]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                repeatType: "reverse",
              }}
              className="h-3 w-3 rounded-full border border-orange-300 bg-orange-500"
            />
          </motion.div>
        </motion.div>
        <svg
          viewBox={`0 0 20 ${svgHeight}`}
          width="20"
          height={svgHeight} // Set the SVG height
          className="ml-4 block"
          aria-hidden="true"
        >
          <motion.path
            d={`M 1 0V -36 l 18 24 V ${svgHeight * 0.8} l -18 24V ${svgHeight}`}
            fill="none"
            stroke="#9091A0"
            strokeOpacity="0.3"
            strokeWidth="2"
            transition={{
              duration: 10,
            }}
          ></motion.path>
          <motion.path
            d={`M 1 0V -36 l 18 24 V ${svgHeight * 0.8} l -18 24V ${svgHeight}`}
            fill="none"
            stroke="url(#gradient)"
            strokeWidth="2.5"
            className="motion-reduce:hidden"
            transition={{
              duration: 10,
            }}
          ></motion.path>
          <defs>
            <motion.linearGradient
              id="gradient"
              gradientUnits="userSpaceOnUse"
              x1="0"
              x2="0"
              y1={y1} // set y1 for gradient
              y2={y2} // set y2 for gradient
            >
              <stop stopColor="#ee5622" stopOpacity="0"></stop>
              <stop stopColor="#ee5622"></stop>
              <stop offset="0.325" stopColor="#ee8c22"></stop>
              <stop offset="1" stopColor="#eca72c" stopOpacity="0"></stop>
            </motion.linearGradient>
          </defs>
        </svg>
      </div>
      <div ref={contentRef}>{children}</div>
    </motion.div>
  );
};
