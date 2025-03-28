"use client";
import React, { ButtonHTMLAttributes } from "react";
import {
  motion,
  useAnimationFrame,
  useMotionTemplate,
  useMotionValue,
  useTransform,
} from "framer-motion";
import { useRef } from "react";
import { cn } from "@/lib/utils";

export function Button({
  borderRadius = "1.75rem",
  children,
  as: Component = "button",
  containerClassName,
  borderClassName,
  duration,
  className,
  ...otherProps
}: {
  borderRadius?: string;
  children: React.ReactNode;
  as?: React.ElementType; // Specify a more specific type
  containerClassName?: string;
  borderClassName?: string;
  duration?: number;
  className?: string;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <Component
      className={cn(
        "bg-transparent relative text-xl  h-16 w-40 p-[1px] overflow-hidden ",
        containerClassName
      )}
      style={{
        borderRadius: borderRadius,
      } as React.CSSProperties} // Specify a more specific type
      {...otherProps}
    >
      <div
        className="absolute inset-0"
        style={{ borderRadius: `calc(${borderRadius} * 0.96)` }}
      >
        <MovingBorder duration={duration} rx="30%" ry="30%">
          <div
            className={cn(
              "h-20 w-20 opacity-[0.8] bg-[radial-gradient(var(--sky-500)_40%,transparent_60%)]",
              borderClassName
            )}
          />
        </MovingBorder>
      </div>

      <div
        className={cn(
          "relative bg-slate-900/[0.8] border border-slate-800 backdrop-blur-xl text-white flex items-center justify-center w-full h-full text-sm antialiased",
          className
        )}
        style={{
          borderRadius: `calc(${borderRadius} * 0.96)`,
        }}
      >
        {children}
      </div>
    </Component>
  );
}

export const MovingBorder = ({
  children,
  duration = 2000,
  rx,
  ry,
  ...otherProps
}: {
  children: React.ReactNode;
  duration?: number;
  rx?: string;
  ry?: string;
  [key: string]: string | number | React.ReactNode | undefined;
}) => {
  const pathRef = useRef<SVGPathElement>(null);
  const progress = useMotionValue<number>(0);

  useAnimationFrame((time) => {
    const length = pathRef.current?.getTotalLength();
    if (length) {
      const pxPerMillisecond = length / duration;
      progress.set((time * pxPerMillisecond) % length);
    }
  });

  const x = useTransform(progress, (val) => {
    if (pathRef.current) {
      const length = pathRef.current.getTotalLength();
      if (length > 0) {
        return pathRef.current.getPointAtLength(val % length).x;
      }
    }
    return 0;
  });

  const y = useTransform(progress, (val) => {
    if (pathRef.current) {
      const length = pathRef.current.getTotalLength();
      if (length > 0) {
        return pathRef.current.getPointAtLength(val % length).y;
      }
    }
    return 0;
  });

  const transform = useMotionTemplate`translateX(${x}px) translateY(${y}px) translateX(-50%) translateY(-50%)`;

  // Helper function to safely parse dimensions
  const parseUnit = (value: string | undefined) => {
    if (!value) return 0;
    // If value contains units like '%', 'px', 'rem', etc., return as is
    if (isNaN(Number(value))) return value;
    // Otherwise, return as number
    return Number(value);
  };

  const rxValue = parseUnit(rx) || 0;
  const ryValue = parseUnit(ry) || 0;

  // Calculate the path coordinates
  const createPathD = () => {
    // Safely handle numeric and string values
    const isNumericRx = typeof rxValue === 'number';
    const isNumericRy = typeof ryValue === 'number';
    
    // For percentage calculations, we need to ensure we're adding strings with % at the end
    const rightEdge = isNumericRx ? `${100 - Number(rxValue)}%` : `calc(100% - ${rxValue})`;
    const bottomEdge = isNumericRy ? `${100 - Number(ryValue)}%` : `calc(100% - ${ryValue})`;
    
    return `M 0 ${ryValue} A ${rxValue} ${ryValue} 0 0 1 ${rxValue} 0 H ${rightEdge} A ${rxValue} ${ryValue} 0 0 1 100% ${ryValue} V ${bottomEdge} A ${rxValue} ${ryValue} 0 0 1 ${rightEdge} 100% H ${rxValue} A ${rxValue} ${ryValue} 0 0 1 0 ${bottomEdge} Z`;
  };

  return (
    <>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
        className="absolute h-full w-full"
        width="100%"
        height="100%"
        {...otherProps}
      >
        <path
          fill="none"
          ref={pathRef}
          d={createPathD()}
        />
      </svg>
      <motion.div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          display: "inline-block",
          transform,
        }}
      >
        {children}
      </motion.div>
    </>
  );
};
