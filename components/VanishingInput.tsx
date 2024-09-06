"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export function VanishingInput({
  placeholders,
  onChange,
  onSubmit,
  isLoading,
}: {
  placeholders: string[];
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  isLoading: boolean;
}) {
  const [currentPlaceholder, setCurrentPlaceholder] = useState(0);
  const [value, setValue] = useState("");
  const [animating, setAnimating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentPlaceholder((prev) => (prev + 1) % placeholders.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [placeholders]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (value.trim()) {
      setAnimating(true);
      onSubmit(e);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full relative max-w-xl mx-auto bg-white dark:bg-gray-800 h-12 rounded-full overflow-hidden shadow-lg"
    >
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          onChange(e);
        }}
        className={cn(
          "w-full h-full px-4 text-gray-900 dark:text-white bg-transparent focus:outline-none text-center",
          animating && "opacity-0"
        )}
        disabled={animating || isLoading}
      />
      <AnimatePresence initial={false} mode="wait">
        {!value && !animating && (
          <motion.span
            key={currentPlaceholder}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute left-0 right-0 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none text-center px-4"
          >
            {placeholders[currentPlaceholder]}
          </motion.span>
        )}
      </AnimatePresence>
      <button
        type="submit"
        className={cn(
          "absolute right-2 top-1/2 transform -translate-y-1/2 bg-hunyadi-yellow text-white px-4 py-1 rounded-full transition-all duration-300",
          (isLoading || !value.trim()) && "opacity-50 cursor-not-allowed"
        )}
        disabled={isLoading || !value.trim()}
      >
        {isLoading ? "Thinking..." : "Send"}
      </button>
      {animating && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0 }}
          className="absolute inset-0 bg-hunyadi-yellow flex items-center justify-center"
        >
          <span className="text-white">Sending...</span>
        </motion.div>
      )}
    </form>
  );
}