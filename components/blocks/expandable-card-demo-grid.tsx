"use client";
import Image from "next/image";
import React, { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useOutsideClick } from "@/hooks/use-outside-click";

interface Figure {
  quote: string;
  name: string;
  title: string;
  image: string;
}

export function ExpandableCardDemo({ figures }: { figures: Figure[] }) {
  const [active, setActive] = useState<Figure | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setActive(null);
      }
    }

    if (active) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [active]);

  useOutsideClick(ref, () => setActive(null));

  if (figures.length === 0) {
    return null;
  }

  return (
    <div className="relative">
      <AnimatePresence>
        {active && (
          <>
            <div 
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[99999]"
              style={{ position: 'fixed', top: 0, left: 0 }}
            />
            <div 
              className="fixed inset-0 flex items-center justify-center p-4 z-[100000]"
              style={{ position: 'fixed', top: 0, left: 0 }}
            >
              <div className="relative w-full max-w-4xl">
                <button
                  className="absolute top-4 right-4 z-[100001] flex items-center justify-center bg-white/10 backdrop-blur-sm border border-white/20 rounded-full h-8 w-8 hover:bg-white/20 transition-colors"
                  onClick={() => setActive(null)}
                >
                  <CloseIcon />
                </button>
                <motion.div
                  ref={ref}
                  className="bg-white dark:bg-neutral-900 rounded-2xl overflow-hidden shadow-2xl"
                >
                  <div className="aspect-auto max-h-[80vh] overflow-auto">
                    <div className="relative">
                      <Image
                        priority
                        width={1200}
                        height={800}
                        src={active.image}
                        alt={active.name}
                        className="w-full h-auto object-contain"
                        style={{ maxHeight: 'calc(80vh - 120px)' }}
                      />
                    </div>
                    <div className="p-6">
                      <h3 className="text-xl font-bold text-neutral-700 dark:text-neutral-200">
                        {active.name}
                      </h3>
                      <p className="mt-2 text-neutral-600 dark:text-neutral-400">
                        {active.title}
                      </p>
                      <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
                        {active.quote}
                      </p>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </>
        )}
      </AnimatePresence>

      <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {figures.map((figure) => (
          <div
            key={`card-${figure.name}-${id}`}
            className="p-4 flex flex-col justify-between items-center hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded-xl cursor-pointer"
          >
            <div className="flex gap-4 items-center">
              <div className="w-20 h-20 flex-shrink-0">
                <Image
                  width={80}
                  height={80}
                  src={figure.image}
                  alt={figure.name}
                  className="w-full h-full rounded-lg object-cover"
                />
              </div>
              <div>
                <h3 className="font-medium text-neutral-800 dark:text-neutral-200">
                  {figure.name}
                </h3>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  {figure.title}
                </p>
              </div>
            </div>
            <button
              className="mt-2 px-4 py-2 text-sm rounded-full font-bold bg-[#ee5622] hover:bg-[#ff6733] text-white transition-colors duration-200"
              onClick={() => setActive(figure)}
            >
              View
            </button>
          </div>
        ))}
      </ul>
    </div>
  );
}

const CloseIcon = () => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4 text-white"
    >
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <path d="M18 6l-12 12" />
      <path d="M6 6l12 12" />
    </svg>
  );
};
