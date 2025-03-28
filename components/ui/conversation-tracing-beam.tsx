"use client";
import React from "react";
import { TracingBeam } from "./tracing-beam";
import { BoxReveal } from "../magicui/box-reveal";
import type { TimelineEntry } from "../../types/timeline";
import { cn } from "../../lib/utils";

interface ConversationTracingBeamProps {
  data: TimelineEntry[];
  className?: string;
}

export function ConversationTracingBeam({ data, className }: ConversationTracingBeamProps) {
  return (
    <div className={cn("w-full space-y-6", className)}>
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 pl-12 md:pl-24">Conversation Content</h2>
      <TracingBeam className="w-full">
        <div className="pl-16 md:pl-32 relative">
          {data.map((item, index) => (
            <div 
              key={`content-${index}`}
              className={cn(
                "relative mb-20 last:mb-0",
                index === 0 && "pt-4" // Add padding to the first item
              )}
            >
              <div id={`item-${index}`} className="absolute -top-20" /> {/* Anchor for navigation */}
              <BoxReveal 
                width="100%" 
                boxColor="#ee5622" 
                duration={0.5 + index * 0.1}
              >
                <div 
                  className="w-full transition-all duration-300 hover:shadow-lg rounded-lg"
                  onClick={item.onDotClick}
                >
                  <div className="mb-2 text-sm font-medium text-orange-600 dark:text-orange-400">
                    {item.title}
                  </div>
                  {item.content}
                </div>
              </BoxReveal>
            </div>
          ))}
        </div>
      </TracingBeam>
    </div>
  );
} 