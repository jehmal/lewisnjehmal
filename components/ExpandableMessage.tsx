'use client';

import React, { useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Button } from '@/components/ui/button';
import { MagicCard } from '@/components/magicui/magic-card';
import Particles from '@/components/magicui/particles';
import { useTheme } from 'next-themes';
import Meteors from '@/components/magicui/meteors';

interface ExpandableMessageProps {
  message: string;
  onClose: () => void;
}

export const ExpandableMessage: React.FC<ExpandableMessageProps> = ({ message, onClose }) => {
  const { theme } = useTheme();
  const [color, setColor] = React.useState("#ffffff");

  useEffect(() => {
    setColor(theme === "dark" ? "#ffffff" : "#000000");
  }, [theme]);

  useEffect(() => {
    console.log("ExpandableMessage rendered with message:", message);
  }, [message]);

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 z-[99999]"
         style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
         onClick={onClose}>
      <MagicCard className="max-w-3xl w-full h-[80vh] overflow-hidden relative"
                 gradientColor="#eca72c"
                 gradientOpacity={0.2}>
        <div className="absolute inset-0 overflow-hidden">
          <Meteors number={40} color="#eca72c" />
        </div>
        <Particles
          className="absolute inset-0"
          quantity={100}
          ease={80}
          color={color}
          refresh
        />
        <div className="bg-white/90 dark:bg-gray-800/90 p-8 rounded-xl relative h-full flex flex-col"
             onClick={(e) => e.stopPropagation()}>
          <div className="relative z-10">
            <h2 className="text-2xl font-bold mb-4 text-black dark:text-white">TradeGuru's Response</h2>
            <Button
              onClick={onClose}
              className="absolute top-2 right-2 bg-transparent hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full p-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </Button>
          </div>
          <div className="mt-4 bg-white/80 dark:bg-gray-700/80 rounded-xl p-6 shadow-inner relative z-10 flex-grow overflow-y-auto">
            <ReactMarkdown className="whitespace-pre-wrap prose max-w-none text-black dark:text-white">
              {message}
            </ReactMarkdown>
          </div>
        </div>
      </MagicCard>
    </div>
  );
};