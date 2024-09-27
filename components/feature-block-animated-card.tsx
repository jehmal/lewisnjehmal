"use client";
import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { BoxReveal } from "@/components/magicui/box-reveal";
import ShimmerButton from "@/components/magicui/shimmer-button";
import AnimatedListDemo from "@/components/example/animated-list-demo";
import { Button } from "@/components/ui/button";
import ReactMarkdown from 'react-markdown';

import { ThumbsUp, ThumbsDown, MessageSquare, History, Calculator } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import AnimatedCircularProgressBar from "@/components/magicui/animated-circular-progress-bar";
import SparklesText from "@/components/magicui/sparkles-text";
import { ChatSidebar, ChatSidebarBody, ChatSidebarTab } from "@/components/ui/chatsidebar";
import { Timeline } from "@/components/ui/timeline";
import { MovingBorder } from "@/components/ui/moving-border";
import ShinyButton from "@/components/magicui/shiny-button";
import CableSizeCalculator from "@/components/cable-size-calculator";
import MaximumDemandCalculator from "@/components/maximum-demand-calculator";
import { InfiniteMovingCards } from "@/components/ui/infinite-moving-cards";
import Image from "next/image";

interface Message {
  role: 'user' | 'assistant';
  content: string;
  context?: string;
  timestamp: string;
}

const formatDate = (date: Date) => {
  return new Intl.DateTimeFormat('en-AU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(date);
};

// Function to extract figure references
const extractFigureReferences = (text: string): { quote: string; name: string; title: string; image: string }[] => {
  const figureRegex = /figure\s+(\d+(\.\d+)*(\([a-z]\))?)/gi;
  const matches = Array.from(new Set(text.match(figureRegex) || [])); // Remove duplicates
  return matches.map(match => {
    const figureName = match.split(' ')[1];
    let formattedFigureName = figureName
      .replace(/\./g, '_')
      .replace(/\(([a-z])\)/, '($1)')
      .toUpperCase();
    
    // Special case for figures like 3.3(h) and 3.3(i) which are lowercase in the file names
    if (formattedFigureName.includes('(H)') || formattedFigureName.includes('(I)')) {
      formattedFigureName = formattedFigureName.toLowerCase();
    }

    const imagePath = `/WA - Electrical standards Fig/Figure_${formattedFigureName}.jpg`;
    console.log(`Extracted figure: ${match}, Image path: ${imagePath}`); // Add this line for debugging
    return {
      quote: `Reference to ${match}`,
      name: match,
      title: "Referenced Figure",
      image: imagePath
    };
  });
};

// Component to display figures
const FigureDisplay = ({ figures }: { figures: { quote: string; name: string; title: string; image: string }[] }) => {
  if (figures.length === 0) return null;

  console.log('Figures to display:', figures); // Keep this line for debugging

  return (
    <div className="mt-6 relative">
      <div className="overflow-x-auto scrollbar-hide">
        <div className="flex space-x-4 pb-4" style={{ minWidth: 'max-content' }}>
          {figures.map((figure, index) => (
            <div key={index} className="flex-shrink-0 w-[250px]">
              <InfiniteMovingCards
                items={[figure]}
                className="w-full"
              />
            </div>
          ))}
        </div>
      </div>
      {figures.length > 1 && (
        <>
          <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white to-transparent dark:from-gray-800 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent dark:from-gray-800 pointer-events-none" />
        </>
      )}
    </div>
  );
};

export function CardDemo() {
  const [inputValue, setInputValue] = useState('');
  const [conversation, setConversation] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const chatHistoryRef = React.useRef<HTMLDivElement>(null);
  const [factCheckResults, setFactCheckResults] = useState<{[key: number]: { result: string, isCorrect: boolean } }>({});
  const [isFactChecking, setIsFactChecking] = useState<{[key: number]: boolean}>({});
  const [ratings, setRatings] = useState<{[key: number]: 'up' | 'down' | null}>({});


  const [progressValue, setProgressValue] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'ask' | 'history' | 'calculators'>('ask');
  const [expandedAnswerIndex, setExpandedAnswerIndex] = useState<number | null>(null);
  const [searchKeyword, setSearchKeyword] = useState('');

  const filteredConversation = conversation.filter(message =>
    message.content.toLowerCase().includes(searchKeyword.toLowerCase())
  );

  const filteredTimelineData = filteredConversation
    .filter(message => message.role === 'user')
    .map((message, index) => ({
      title: message.timestamp,
      content: (
        <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg flex-grow relative min-h-[100px]">
          <p className="font-bold mb-2">You:</p>
          <ReactMarkdown className="whitespace-pre-wrap prose dark:prose-invert max-w-none pr-24">
            {message.content}
          </ReactMarkdown>
          <div className="mt-3">
            <ShinyButton
              text="View Answer"
              className="text-xs"
              onClick={() => setExpandedAnswerIndex(index * 2 + 1)}
              shimmerColor="#eca72c"
              background="#ee5622"
            />
          </div>
        </div>
      ),
    }));

  const tabs = [
    {
      label: "Ask",
      icon: <MessageSquare className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
    },
    {
      label: "History",
      icon: <History className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
    },
    {
      label: "Calculators",
      icon: <Calculator className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
    },
  ];

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isLoading) {
      setProgressValue(0);
      interval = setInterval(() => {
        setProgressValue((prev) => (prev >= 90 ? 90 : prev + 10));
      }, 500);
    } else {
      setProgressValue(100);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  const scrollToBottom = () => {
    if (chatHistoryRef.current) {
      chatHistoryRef.current.scrollTop = chatHistoryRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    const savedConversation = localStorage.getItem('conversation');
    if (savedConversation) {
      setConversation(JSON.parse(savedConversation));
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [conversation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    setIsLoading(true);
    setError(null);
    
    const userMessage: Message = { 
      role: 'user', 
      content: inputValue, 
      timestamp: formatDate(new Date())
    };
    const updatedConversation = [...conversation, userMessage];
    setConversation(updatedConversation);
    localStorage.setItem('conversation', JSON.stringify(updatedConversation));
    
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_API_KEY}`
        },
        body: JSON.stringify({ message: inputValue }),
      });

      if (!response.ok) throw new Error('Failed to get response from server');

      const data = await response.json();
      const assistantMessage: Message = { 
        role: 'assistant', 
        content: data.response,
        context: data.context,
        timestamp: formatDate(new Date())
      };
      const newConversation = [...updatedConversation, assistantMessage];
      setConversation(newConversation);
      localStorage.setItem('conversation', JSON.stringify(newConversation));
    } catch (error) {
      console.error('Error:', error);
      setError('An unexpected error occurred. Please try again later.');
    } finally {
      setIsLoading(false);
      setInputValue('');
    }
  };

  const clearConversation = () => {
    setConversation([]);
    localStorage.removeItem('conversation');
  };

  const handleFactCheck = async (index: number) => {
    const message = conversation[index - 1];
    const assistantResponse = conversation[index];
    
    if (message.role !== 'user' || assistantResponse.role !== 'assistant') return;

    setIsFactChecking({...isFactChecking, [index]: true});

    try {
      const response = await fetch('/api/fact-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: message.content, 
          assistantResponse: assistantResponse.content
        }),
      });

      if (!response.ok) throw new Error('Failed to get fact-check response');

      const data = await response.json();
      setFactCheckResults({...factCheckResults, [index]: data});
    } catch (error) {
      console.error('Fact-check error:', error);
      setError('An error occurred during fact-checking.');
    } finally {
      setIsFactChecking({...isFactChecking, [index]: false});
    }
  };

  const handleRating = (index: number, rating: 'up' | 'down') => {
    setRatings(prev => {
      const newRatings = { ...prev, [index]: rating };
      return newRatings;
    });
  };

  const handleTabChange = (tab: string) => {
    console.log('Tab changed to:', tab);
    setActiveTab(tab.toLowerCase() as 'ask' | 'history' | 'calculators');
    setSidebarOpen(false);
  };

  const lastUserMessage = conversation.filter(msg => msg.role === 'user').pop();
  const lastAssistantMessage = conversation.filter(msg => msg.role === 'assistant').pop();

  const ExpandableAnswer = ({ answer, onClose }: { answer: Message, onClose: () => void }) => {
    const figures = extractFigureReferences(answer.content);

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div 
          className="bg-white dark:bg-gray-800 p-6 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto relative"
          onClick={(e) => e.stopPropagation()}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
        >
          <MovingBorder duration={3000} rx="25" ry="25">
            <div className="absolute inset-0 bg-white dark:bg-gray-800 rounded-lg" />
          </MovingBorder>
          <div className="relative z-10 p-6">
            <h3 className="text-lg font-bold mb-4">TradeGuru&apos;s Answer:</h3>
            <ReactMarkdown className="whitespace-pre-wrap prose dark:prose-invert max-w-none">
              {answer.content}
            </ReactMarkdown>
            <div className="mt-4 flex justify-end">
              <ShinyButton
                text="Close"
                className="bg-gray-500 hover:bg-gray-600"
                onClick={onClose}
                shimmerColor="#eca72c"
                background="#ee5622"
              />
            </div>
            {figures.length > 0 && (
              <div className="mt-6">
                <h4 className="text-md font-semibold mb-2">Referenced Figures:</h4>
                <FigureDisplay figures={figures} />
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    );
  };

  const renderMessage = (message: Message, index: number) => {
    const figures = extractFigureReferences(message.content);
  
    return (
      <div key={index} className={cn(
        "p-4 rounded-lg mb-4",
        message.role === 'user' ? 'bg-gray-100 dark:bg-gray-700' : 'bg-white/70 dark:bg-gray-600'
      )}>
        <p className="font-bold mb-2">{message.role === 'user' ? 'You:' : 'TradeGuru:'}</p>
        <ReactMarkdown className="whitespace-pre-wrap prose dark:prose-invert max-w-none">
          {message.content}
        </ReactMarkdown>
        {message.role === 'assistant' && (
          <>
            <div className="mt-4 flex items-center space-x-2 flex-wrap">
              <Button
                onClick={() => handleFactCheck(index)}
                disabled={isFactChecking[index]}
                className={cn(
                  "text-xs mt-2",
                  factCheckResults[index] 
                    ? (factCheckResults[index].isCorrect ? "bg-green-500" : "bg-red-500") 
                    : "bg-blue-500"
                )}
              >
                {isFactChecking[index] ? 'Checking...' : (factCheckResults[index] ? 'View Fact-Check' : 'Fact Check')}
              </Button>
              <Button
                onClick={() => handleRating(index, 'up')}
                className={cn("p-2 mt-2", ratings[index] === 'up' ? "bg-green-500" : "bg-gray-200")}
              >
                <ThumbsUp className="w-4 h-4" />
              </Button>
              <Button
                onClick={() => handleRating(index, 'down')}
                className={cn("p-2 mt-2", ratings[index] === 'down' ? "bg-red-500" : "bg-gray-200")}
              >
                <ThumbsDown className="w-4 h-4" />
              </Button>
            </div>
            {figures.length > 0 && <FigureDisplay figures={figures} />}
          </>
        )}
      </div>
    );
  };

  return (
    <div className="w-full max-w-6xl mx-auto bg-white dark:bg-gray-800 rounded-xl shadow-lg relative flex flex-col md:flex-row">
      <ChatSidebar open={sidebarOpen} setOpen={setSidebarOpen} activeTab={activeTab} setActiveTab={handleTabChange}>
        <ChatSidebarBody className="justify-between gap-10 bg-gray-200 dark:bg-gray-700">
          <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
            <div className="mt-8 flex flex-col gap-2">
              {tabs.map((tab, idx) => (
                <ChatSidebarTab 
                  key={idx} 
                  tab={tab}
                />
              ))}
            </div>
          </div>
        </ChatSidebarBody>
      </ChatSidebar>

      <div className="flex-1 p-4 md:p-6 overflow-y-auto max-h-[90vh]">
        <div className="flex flex-col gap-6">
          {activeTab === 'ask' && (
            <div className="w-full space-y-6">
              <div className="flex flex-col md:flex-row items-center space-y-1 md:space-y-0 md:space-x-1">
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  Ask
                </span>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  <SparklesText
                    text="TradeGuru"
                    colors={{ first: "#ee5622", second: "#eca72c" }}
                    className="inline-block"
                    sparklesCount={3}
                  />
                </h3>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex flex-col md:flex-row items-start space-y-2 md:space-y-0 md:space-x-4">
                  <div className="w-full md:flex-grow">
                    <Input
                      type="text"
                      placeholder="Type your question here..."
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      className="w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <ShimmerButton
                      type="submit"
                      disabled={isLoading}
                      shimmerColor="#eca72c"
                      background="#ee5622"
                      className="flex items-center justify-center px-4 py-2"
                    >
                      {isLoading ? 'Thinking...' : 'Send'}
                    </ShimmerButton>
                    {isLoading && (
                      <div className="relative">
                        <AnimatedCircularProgressBar
                          max={100}
                          min={0}
                          value={progressValue}
                          gaugePrimaryColor="#ee5622"
                          gaugeSecondaryColor="rgba(238, 86, 34, 0.2)"
                          className="w-10 h-10"
                        />
                        <span className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-xs font-semibold">
                          {progressValue}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </form>

              <div className="md:hidden space-y-6">
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Example Questions:</h4>
                  <AnimatedListDemo className="h-40" />
                </div>
              </div>

              <div className="hidden md:flex md:space-x-6">
                <div className="w-1/4 space-y-6">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Example Questions:</h4>
                    <AnimatedListDemo className="h-40" />
                  </div>
                </div>
                <div className="w-3/4">
                  {/* Chat messages will be here */}
                </div>
              </div>

              <div className="space-y-4">
                {lastUserMessage && (
                  <BoxReveal width="100%" boxColor="#eca72c" duration={0.5}>
                    <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg">
                      <p className="font-bold">You:</p>
                      <ReactMarkdown className="whitespace-pre-wrap prose dark:prose-invert max-w-none">
                        {lastUserMessage.content}
                      </ReactMarkdown>
                    </div>
                  </BoxReveal>
                )}
                {lastAssistantMessage && (
                  <BoxReveal width="100%" boxColor="#eca72c" duration={0.5}>
                    <div className="bg-white/70 dark:bg-gray-600 p-3 rounded-lg">
                      <p className="font-bold">TradeGuru:</p>
                      <ReactMarkdown className="whitespace-pre-wrap prose dark:prose-invert max-w-none">
                        {lastAssistantMessage.content}
                      </ReactMarkdown>
                      <div className="mt-2 flex items-center space-x-2 flex-wrap">
                        <Button
                          onClick={() => handleFactCheck(conversation.length - 1)}
                          disabled={isFactChecking[conversation.length - 1]}
                          className={cn(
                            "text-xs mt-2",
                            factCheckResults[conversation.length - 1] 
                              ? (factCheckResults[conversation.length - 1].isCorrect ? "bg-green-500" : "bg-red-500") 
                              : "bg-blue-500"
                          )}
                        >
                          {isFactChecking[conversation.length - 1] ? 'Checking...' : (factCheckResults[conversation.length - 1] ? 'View Fact-Check' : 'Fact Check')}
                        </Button>
                        <Button
                          onClick={() => handleRating(conversation.length - 1, 'up')}
                          className={cn("p-2 mt-2", ratings[conversation.length - 1] === 'up' ? "bg-green-500" : "bg-gray-200")}
                        >
                          <ThumbsUp className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => handleRating(conversation.length - 1, 'down')}
                          className={cn("p-2 mt-2", ratings[conversation.length - 1] === 'down' ? "bg-red-500" : "bg-gray-200")}
                        >
                          <ThumbsDown className="w-4 h-4" />
                        </Button>
                      </div>
                      <FigureDisplay figures={extractFigureReferences(lastAssistantMessage.content)} />
                    </div>
                  </BoxReveal>
                )}
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <SparklesText
                  text="Ask TradeGuru"
                  colors={{ first: "#ee5622", second: "#eca72c" }}
                  className="text-lg font-semibold"
                  sparklesCount={3}
                />
              </div>
              <Input
                type="text"
                placeholder="Search what you've spoken about before..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 mb-4"
              />
              <ShimmerButton
                onClick={clearConversation}
                shimmerColor="#eca72c"
                background="#ee5622"
                className="px-4 py-2"
              >
                Clear Conversation History
              </ShimmerButton>
              {filteredConversation.length > 0 ? (
                <Timeline data={filteredTimelineData} lineColor="#ee5622" />
              ) : (
                <p className="text-gray-600 dark:text-gray-400">No conversation history found for the keyword.</p>
              )}
              <AnimatePresence>
                {expandedAnswerIndex !== null && (
                  <ExpandableAnswer 
                    answer={conversation[expandedAnswerIndex]} 
                    onClose={() => setExpandedAnswerIndex(null)}
                  />
                )}
              </AnimatePresence>
            </div>
          )}

          {activeTab === 'calculators' && (
            <div className="space-y-4">
              <CableSizeCalculator />
              <MaximumDemandCalculator />
            </div>
          )}
          
          {error && (
            <div className="mt-4 p-4 bg-red-100 text-red-700 rounded-lg">
              <p>{error}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
