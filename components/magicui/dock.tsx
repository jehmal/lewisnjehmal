"use client";

import React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { useMotionValue, motion, MotionValue } from "framer-motion";

import { cn } from "@/lib/utils";

export interface DockProps extends VariantProps<typeof dockVariants> {
  className?: string;
  magnification?: number;
  distance?: number;
  direction?: "top" | "middle" | "bottom";
  children: React.ReactNode;
}

const DEFAULT_MAGNIFICATION = 60;
const DEFAULT_DISTANCE = 140;

const dockVariants = cva(
  "mx-auto w-max mt-8 h-[58px] p-2 flex gap-2 rounded-2xl border supports-backdrop-blur:bg-white/10 supports-backdrop-blur:dark:bg-black/10 backdrop-blur-md",
);

const Dock = React.forwardRef<HTMLDivElement, DockProps>(
  (
    {
      className,
      children,
      magnification = DEFAULT_MAGNIFICATION,
      distance = DEFAULT_DISTANCE,
      direction = "bottom",
      ...props
    },
    ref,
  ) => {
    const mouseX = useMotionValue(Infinity);

    const renderChildren = () => {
      return React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, {
            mouseX,
            magnification,
            distance,
          } as DockIconProps);
        }
        return child;
      });
    };

    return (
      <motion.div
        ref={ref}
        onMouseMove={(e) => mouseX.set(e.pageX)}
        onMouseLeave={() => mouseX.set(Infinity)}
        {...props}
        className={cn(dockVariants({ className }), {
          "items-start": direction === "top",
          "items-center": direction === "middle",
          "items-end": direction === "bottom",
        })}
      >
        {renderChildren()}
      </motion.div>
    );
  },
);

Dock.displayName = "Dock";

export interface DockIconProps {
  children: React.ReactNode;
  onClick?: () => void;
  mouseX?: MotionValue<number>;
  magnification?: number;
  distance?: number;
}

const DockIcon: React.FC<DockIconProps> = ({ children, onClick, mouseX, magnification, distance }) => {
  const [scale, setScale] = React.useState(1);
  // Change this line
  const iconRef = React.useRef<HTMLButtonElement | null>(null);

  React.useEffect(() => {
    if (mouseX && magnification && distance && iconRef.current) {
      const unsubscribe = mouseX.onChange((latestX) => {
        const iconRect = iconRef.current?.getBoundingClientRect();
        if (iconRect) {
          const iconCenterX = iconRect.left + iconRect.width / 2;
          const distanceFromMouse = Math.abs(latestX - iconCenterX);
          const scaleValue = Math.max(1, 1 + (magnification / 100) * (1 - distanceFromMouse / distance));
          setScale(scaleValue);
        }
      });
      return unsubscribe;
    }
  }, [mouseX, magnification, distance]);

  return (
    <motion.button
      ref={iconRef}
      onClick={onClick}
      style={{ scale }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
    >
      {children}
    </motion.button>
  );
};

export { Dock, DockIcon, dockVariants };
