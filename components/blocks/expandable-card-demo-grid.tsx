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

  if (figures.length === 0) return null;

  return (
    <>
      <AnimatePresence>
        {active && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 h-full w-full z-10"
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {active && (
          <div className="fixed inset-0 grid place-items-center z-[100]">
            <motion.button
              key={`button-${active.name}-${id}`}
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.05 } }}
              className="flex absolute top-2 right-2 lg:hidden items-center justify-center bg-white rounded-full h-6 w-6"
              onClick={() => setActive(null)}
            >
              <CloseIcon />
            </motion.button>
            <motion.div
              layoutId={`card-${active.name}-${id}`}
              ref={ref}
              className="w-full max-w-[500px] h-full md:h-fit md:max-h-[90%] flex flex-col bg-white dark:bg-neutral-900 sm:rounded-3xl overflow-hidden"
            >
              <motion.div layoutId={`image-${active.name}-${id}`}>
                <Image
                  priority
                  width={500}
                  height={500}
                  src={active.image}
                  alt={active.name}
                  className="w-full h-auto sm:rounded-tr-lg sm:rounded-tl-lg object-contain"
                />
              </motion.div>
              <div className="p-4">
                <motion.h3
                  layoutId={`title-${active.name}-${id}`}
                  className="font-bold text-neutral-700 dark:text-neutral-200"
                >
                  {active.name}
                </motion.h3>
                <motion.p
                  layoutId={`description-${active.title}-${id}`}
                  className="text-neutral-600 dark:text-neutral-400"
                >
                  {active.title}
                </motion.p>
                <motion.p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
                  {active.quote}
                </motion.p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {figures.map((figure) => (
          <motion.div
            layoutId={`card-${figure.name}-${id}`}
            key={`card-${figure.name}-${id}`}
            onClick={() => setActive(figure)}
            className="p-4 flex flex-col justify-between items-center hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded-xl cursor-pointer"
          >
            <div className="flex gap-4 items-center">
              <motion.div layoutId={`image-${figure.name}-${id}`} className="w-20 h-20 flex-shrink-0">
                <Image
                  width={80}
                  height={80}
                  src={figure.image}
                  alt={figure.name}
                  className="w-full h-full rounded-lg object-cover"
                />
              </motion.div>
              <div>
                <motion.h3
                  layoutId={`title-${figure.name}-${id}`}
                  className="font-medium text-neutral-800 dark:text-neutral-200"
                >
                  {figure.name}
                </motion.h3>
                <motion.p
                  layoutId={`description-${figure.title}-${id}`}
                  className="text-sm text-neutral-600 dark:text-neutral-400"
                >
                  {figure.title}
                </motion.p>
              </div>
            </div>
            <motion.button
              layoutId={`button-${figure.name}-${id}`}
              className="mt-2 px-4 py-2 text-sm rounded-full font-bold bg-[#ee5622] hover:bg-[#ff6733] text-white transition-colors duration-200"
            >
              View
            </motion.button>
          </motion.div>
        ))}
      </ul>
    </>
  );
}

const CloseIcon = () => {
  return (
    <motion.svg
      initial={{
        opacity: 0,
      }}
      animate={{
        opacity: 1,
      }}
      exit={{
        opacity: 0,
        transition: {
          duration: 0.05,
        },
      }}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4 text-black"
    >
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <path d="M18 6l-12 12" />
      <path d="M6 6l12 12" />
    </motion.svg>
  );
};
