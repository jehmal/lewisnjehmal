"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

interface MeteorsProps {
  number?: number;
  color?: string;
}

export const Meteors = ({ number = 20, color = "slate-500" }: MeteorsProps) => {
  const [meteorStyles, setMeteorStyles] = useState<Array<React.CSSProperties>>(
    [],
  );

  useEffect(() => {
    const styles = [...new Array(number)].map(() => ({
      top: Math.floor(Math.random() * 100) + "%",
      left: Math.floor(Math.random() * 100) + "%",
      animationDelay: Math.random() * 1 + 0.2 + "s",
      animationDuration: Math.floor(Math.random() * 8 + 4) + "s",
    }));
    setMeteorStyles(styles);
  }, [number]);

  return (
    <>
      {meteorStyles.map((style, idx) => (
        <span
          key={idx}
          className={cn(
            `pointer-events-none absolute h-0.5 w-0.5 rotate-[215deg] animate-meteor rounded-[100%] shadow-[0_0_0_1px_#ffffff10]`,
            `before:absolute before:top-1/2 before:h-[1px] before:w-[50px] before:-translate-y-[50%] before:bg-gradient-to-r before:from-${color} before:to-transparent before:content-['']`
          )}
          style={{
            ...style,
            background: `linear-gradient(to right, ${color}, transparent)`,
          }}
        />
      ))}
    </>
  );
};

export default Meteors;
