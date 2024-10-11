"use client";

import { cn } from "@/lib/utils";
import React, { useState } from "react";
import Image from "next/image";
import ShinyButton from "@/components/magicui/shiny-button";

export const InfiniteMovingCards = ({
  items,
  className,
}: {
  items: {
    quote: string;
    name: string;
    title: string;
    image: string;
  }[];
  className?: string;
}) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageError, setImageError] = useState<{[key: string]: boolean}>({});

  const handleImageError = (image: string) => {
    console.error(`Failed to load image: ${image}`);
    setImageError(prev => ({...prev, [image]: true}));
  };

  return (
    <>
      <div className={cn("relative z-20 overflow-hidden", className)}>
        <ul className="flex gap-4 py-4">
          {items.map((item, idx) => (
            <li
              className="w-[250px] flex-shrink-0 rounded-2xl border border-slate-700 px-6 py-4 bg-gray-100 dark:bg-gray-700"
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
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        style={{ objectFit: "contain" }}
                        onError={() => handleImageError(item.image)}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-500">
                        Image not found
                      </div>
                    )}
                  </div>
                  <p className="text-sm leading-[1.6] text-gray-800 dark:text-gray-100 font-normal">
                    {item.quote}
                  </p>
                </div>
                <footer className="relative z-20 mt-4">
                  <div className="text-sm text-gray-700 dark:text-gray-300 font-semibold">
                    {item.name}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
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
            <div className="absolute top-4 right-4">
              <ShinyButton
                text="Close"
                onClick={() => setSelectedImage(null)}
                shimmerColor="#eca72c"
                background="#ee5622"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};
