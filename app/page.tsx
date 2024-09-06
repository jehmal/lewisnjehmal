'use client';

import { useState, useEffect } from 'react';
import { generateChatResponse } from './actions/openai';
import { searchExa } from './actions/exa';
import { FadeText } from "@/components/magicui/fade-text";
import TypingAnimation from "@/components/magicui/typing-animation";
import Meteors from "@/components/magicui/meteors";
import GridPattern from "@/components/magicui/animated-grid-pattern";
import { CalendarIcon, FileTextIcon, BarChartIcon, GlobeIcon, ChatBubbleIcon } from "@radix-ui/react-icons";
import { BentoGrid, BentoCard } from "@/components/magicui/bento-grid";
import Marquee from "@/components/magicui/marquee";
import AnimatedListDemo from "@/components/example/animated-list-demo";
import AnimatedBeamMultipleOutputDemo from "@/components/example/animated-beam-multiple-outputs";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Dock, DockIcon } from "@/components/magicui/dock";
import Link from 'next/link';
import { ModeToggle } from "@/components/mode-toggle";
import { AnimatedSubscribeButton } from "@/components/magicui/animated-subscribe-button";
import Globe from "@/components/magicui/globe";
import { Input } from "@/components/ui/input";
import { CardDemo } from "@/components/feature-block-animated-card";
import DotPattern from "@/components/magicui/dot-pattern";

interface File {
  name: string;
  body: string;
}

const files: File[] = [
  {
    name: "bitcoin.pdf",
    body: "Bitcoin is a cryptocurrency invented in 2008 by an unknown person or group of people using the name Satoshi Nakamoto.",
  },
  {
    name: "finances.xlsx",
    body: "A spreadsheet or worksheet is a file made of rows and columns that help sort data, arrange data easily, and calculate numerical data.",
  },
  {
    name: "logo.svg",
    body: "Scalable Vector Graphics is an Extensible Markup Language-based vector image format for two-dimensional graphics with support for interactivity and animation.",
  },
  {
    name: "keys.gpg",
    body: "GPG keys are used to encrypt and decrypt email, files, directories, and whole disk partitions and to authenticate messages.",
  },
  {
    name: "seed.txt",
    body: "A seed phrase, seed recovery phrase or backup seed phrase is a list of words which store all the information needed to recover Bitcoin funds on-chain.",
  },
];

const features = [
  {
    Icon: FileTextIcon,
    name: "Electrical Standards Expertise",
    description: "Access up-to-date information on electrical standards and regulations, ensuring your work is always compliant.",
    href: "#",
    cta: "Explore standards",
    className: "col-span-1",
    background: (
      <div className="absolute inset-0 flex items-center justify-center opacity-10">
        <svg className="w-64 h-64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2Z" stroke="#ECA72C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M14 2V8H20" stroke="#ECA72C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M16 13H8" stroke="#EE5622" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M16 17H8" stroke="#EE5622" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M10 9H9H8" stroke="#EE5622" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    ),
  },
  {
    Icon: GlobeIcon,
    name: "Made by Tradies, for Tradies",
    description: "Our platform is built by experienced electricians who understand your daily challenges and needs.",
    href: "#",
    cta: "Learn more",
    className: "col-span-1",
    background: (
      <div className="absolute inset-0 flex items-center justify-center opacity-10">
        <svg className="w-64 h-64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="#ECA72C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M2 12H22" stroke="#EE5622" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M12 2C14.5013 4.73835 15.9228 8.29203 16 12C15.9228 15.708 14.5013 19.2616 12 22C9.49872 19.2616 8.07725 15.708 8 12C8.07725 8.29203 9.49872 4.73835 12 2V2Z" stroke="#EE5622" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    ),
  },
  {
    Icon: ChatBubbleIcon,
    name: "All Messages Saved",
    description: "Every conversation is securely stored, allowing you to reference past discussions and decisions at any time.",
    href: "#",
    cta: "Explore history",
    className: "col-span-1",
    background: (
      <div className="absolute inset-0 flex items-center justify-center opacity-10">
        <svg className="w-64 h-64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2ZM20 16H6L4 18V4H20V16Z" fill="#ECA72C"/>
          <path d="M6 12H18V14H6V12ZM6 9H18V11H6V9ZM6 6H18V8H6V6Z" fill="#EE5622"/>
        </svg>
      </div>
    ),
  },
];

function BentoDemo() {
  return (
    <BentoGrid className="grid-cols-1 md:grid-cols-3 gap-4">
      {features.map((feature, idx) => (
        <BentoCard key={idx} {...feature} />
      ))}
    </BentoGrid>
  );
}

function DockDemo({ onChatToggle }: { onChatToggle: () => void }) {
  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50">
      <Dock>
        <DockIcon onClick={onChatToggle}>
          <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
            <ChatBubbleIcon className="w-8 h-8" />
          </div>
        </DockIcon>
      </Dock>
    </div>
  );
}

export default function Home() {
  const [hasError, setHasError] = useState(false);
  const [showCardDemo, setShowCardDemo] = useState(false);

  useEffect(() => {
    console.log('Home component mounted');
  }, []);

  const handleToggleCardDemo = () => {
    setShowCardDemo(prev => !prev);
  };

  if (hasError) {
    return <div>Something went wrong. Please refresh the page.</div>;
  }

  return (
    <div className="min-h-screen flex flex-col bg-white text-gray-800 relative overflow-hidden">
      {/* Header */}
      <header className="bg-white bg-opacity-90 text-gray-800 p-4 border-b border-gray-200">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold text-hunyadi-yellow">TradeGuru</h1>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-24 bg-white bg-opacity-80 relative">
        <div className="absolute inset-0 z-0">
          <Globe />
        </div>
        <div className="container mx-auto text-center relative z-10 flex flex-col items-center">
          <FadeText
            text="Master Your Trades with TradeGuru"
            className="text-5xl font-extrabold mb-6 text-hunyadi-yellow font-sans"
            direction="up"
            framerProps={{
              hidden: { opacity: 0, y: 20 },
              show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } },
            }}
          />
          <TypingAnimation
            text="AI-powered insights for smarter trading decisions"
            duration={30}
            className="text-xl mb-10 font-sans text-gray-600"
          />
          <AnimatedSubscribeButton
            buttonColor="#ee5622"
            buttonTextColor="#000000"
            subscribeStatus={showCardDemo}
            initialText="Try Demo"
            changeText={showCardDemo ? "Hide Demo" : "Try Demo"}
            onClick={handleToggleCardDemo}
          />
        </div>
      </section>

      {/* CardDemo Section */}
      {showCardDemo && (
        <section className="py-12 bg-gray-100 dark:bg-gray-900 relative overflow-hidden">
          <DotPattern
            width={32}
            height={32}
            cx={1}
            cy={1}
            cr={1}
            className="absolute inset-0 h-full w-full text-gray-300 dark:text-gray-700 [mask-image:radial-gradient(white,transparent_85%)]"
          />
          <div className="container mx-auto relative z-10">
            <CardDemo />
          </div>
        </section>
      )}

      {/* Features Section */}
      <section id="features" className="py-24 bg-white bg-opacity-90 relative">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-center mb-16 text-hunyadi-yellow">Key Features</h2>
          <div className="max-w-4xl mx-auto">
            <BentoDemo />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gray-100 bg-opacity-90 text-gray-800 py-24 border-t border-gray-200">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl font-bold mb-6 text-hunyadi-yellow">Ready to Elevate Your Trading?</h2>
          <p className="text-xl mb-10 text-gray-600">Join TradeGuru today and start making smarter trades.</p>
          <div className="flex flex-col items-center gap-6">
            <button className="bg-flame text-black px-8 py-4 rounded-full text-lg font-semibold hover:bg-hunyadi-yellow hover:text-black transition duration-300">
              Sign Up Now
            </button>
            <AnimatedSubscribeButton
              buttonColor="#eca72c"
              buttonTextColor="#000000"
              subscribeStatus={false}
              initialText="Subscribe to Updates"
              changeText="Subscribed!"
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white bg-opacity-90 text-gray-600 py-8 border-t border-gray-200 relative z-10">
        <div className="container mx-auto text-center">
          <p>&copy; 2024 TradeGuru. All rights reserved.</p>
        </div>
      </footer>

      {/* Dock */}
      <DockDemo onChatToggle={handleToggleCardDemo} />
    </div>
  );
}

