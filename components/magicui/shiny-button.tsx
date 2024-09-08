"use client";

import { motion, type AnimationProps } from "framer-motion";

import { cn } from "@/lib/utils";

const animationProps = {
  initial: { "--x": "100%", scale: 0.8 },
  animate: { "--x": "-100%", scale: 1 },
  whileTap: { scale: 0.95 },
  transition: {
    repeat: Infinity,
    repeatType: "loop",
    repeatDelay: 1,
    type: "spring",
    stiffness: 20,
    damping: 15,
    mass: 2,
    scale: {
      type: "spring",
      stiffness: 200,
      damping: 5,
      mass: 0.5,
    },
  },
} as AnimationProps;

interface ShinyButtonProps {
  text: string;
  className?: string;
  onClick?: () => void;
  shimmerColor?: string;
  background?: string;
}

const ShinyButton = ({
  text = "shiny-button",
  className,
  onClick,
  shimmerColor = "hsl(var(--primary))",
  background = "hsl(var(--primary))",
}: ShinyButtonProps) => {
  return (
    <motion.button
      {...animationProps}
      className={cn(
        "relative rounded-lg px-6 py-2 font-medium backdrop-blur-xl transition-[box-shadow] duration-300 ease-in-out hover:shadow",
        className,
      )}
      onClick={onClick}
      style={{
        background: background,
      }}
    >
      <span
        className="relative block h-full w-full text-sm uppercase tracking-wide text-white"
        style={{
          maskImage: `linear-gradient(-75deg, ${shimmerColor} calc(var(--x) + 20%), transparent calc(var(--x) + 30%), ${shimmerColor} calc(var(--x) + 100%))`,
        }}
      >
        {text}
      </span>
      <span
        style={{
          mask: "linear-gradient(#fff, #fff) content-box, linear-gradient(#fff, #fff)",
          maskComposite: "exclude",
        }}
        className="absolute inset-0 z-10 block rounded-[inherit] bg-[linear-gradient(-75deg,rgba(255,255,255,0.1)_calc(var(--x)+20%),rgba(255,255,255,0.5)_calc(var(--x)+25%),rgba(255,255,255,0.1)_calc(var(--x)+100%))] p-px"
      ></span>
    </motion.button>
  );
};

export default ShinyButton;
