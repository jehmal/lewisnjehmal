"use client";

import { cn } from "@/lib/utils";
import React, { useState } from "react";
import Image from "next/image";

export const InfiniteMovingCards = ({
  items,
  pauseOnHover = true,
  className,
}: {
  items: {
    quote: string;
    name: string;
    title: string;
    image: string;
  }[];
  pauseOnHover?: boolean;
  className?: string;
}) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageError, setImageError] = useState<{[key: string]: boolean}>({});

  return (
    <>
      <div className={cn("relative z-20 overflow-hidden", className)}>
        <ul className="flex gap-4 py-4">
          {items.map((item, idx) => (
            <li
              className="w-[250px] flex-shrink-0 rounded-2xl border border-slate-700 px-6 py-4"
              style={{
                background: "linear-gradient(180deg, #2a2a2a, #1a1a1a)",
              }}
              key={item.name + idx}
            >
              <blockquote className="relative h-full flex flex-col justify-between">
                <div className="relative z-20 flex-grow">
                  <div className="relative w-full h-32 mb-4 cursor-pointer" onClick={() => setSelectedImage(item.image)}>
                    {!imageError[item.image] ? (
                      <Image
                        src={item.image}
                        alt={`Figure ${item.name}`}
                        fill
                        sizes="250px"
                        style={{ objectFit: "contain" }}
                        onError={() => setImageError(prev => ({...prev, [item.image]: true}))}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-500">
                        Image not found
                      </div>
                    )}
                  </div>
                  <p className="text-sm leading-[1.6] text-gray-100 font-normal">
                    {item.quote}
                  </p>
                </div>
                <footer className="relative z-20 mt-4">
                  <div className="text-sm text-gray-300 font-semibold">
                    {item.name}
                  </div>
                  <div className="text-xs text-gray-400">
                    {item.title}
                  </div>
                </footer>
              </blockquote>
            </li>
          ))}
        </ul>
      </div>
      {selectedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50" onClick={() => setSelectedImage(null)}>
          <div className="relative w-full max-w-4xl h-[80vh]">
            <Image
              src={selectedImage}
              alt="Selected Figure"
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              style={{ objectFit: "contain" }}
            />
          </div>
        </div>
      )}
    </>
  );
};
