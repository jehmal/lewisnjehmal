"use client";
import React, { useState, useEffect, useCallback } from "react";
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
import MaximumDemandCalculator from "@/components/MaximumDemandCalculator";
import { InfiniteMovingCards } from "@/components/ui/infinite-moving-cards";
import { useUser } from '@/contexts/UserContext';
import { supabase } from '@/lib/supabase';
import AuthUI from '@/components/AuthUI';
import Image from "next/image";


interface Message {
  role: 'user' | 'assistant';
  content: string;
  context?: string;
  timestamp: string;
  created_at: string; // Add this line
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-AU', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    day: '2-digit',
    month: '2-digit',
    year: '2-digit'
  }).format(date).replace(',', '');
};

// Updated extractFigureReferences function
const extractFigureReferences = (text: string): { quote: string; name: string; title: string; image: string }[] => {
  const figureRegex = /(WAES |WA |ASNZ3000 )?(?:Figure|Table)\s+(\d+(\.\d+)*(\([a-z]\))?)/gi;
  const matches = Array.from(new Set(text.match(figureRegex) || [])); // Remove duplicates
  return matches.map(match => {
    const isWA = match.toLowerCase().startsWith('wa') || match.toLowerCase().startsWith('waes');
    const isASNZ = match.toLowerCase().includes('asnz3000');
    const figureName = match.split(' ').slice(-1)[0];
    let formattedFigureName = figureName
      .replace(/\./g, '_')
      .replace(/\(([a-z])\)/, '_$1')
      .toLowerCase();
    
    // Ensure all figures use underscore format
    formattedFigureName = formattedFigureName.replace(/\(([a-z])\)/, '_$1');

    const prefix = isWA ? 'WA_' : isASNZ ? 'ASNZ3000_' : 'AN3000_';
    const extension = isWA ? '.jpg' : '.png';
    const type = match.toLowerCase().includes('table') ? 'Table' : 'Figure';
    const imagePath = `/All Tables & Figures/${prefix}${type}_${formattedFigureName}${extension}`;
    console.log(`Extracted figure: ${match}, Image path: ${imagePath}`);
    return {
      quote: `Reference to ${match}`,
      name: match,
      title: "Referenced Figure",
      image: imagePath
    };
  });
};

// Updated FigureDisplay component
const FigureDisplay = ({ figures }: { figures: { quote: string; name: string; title: string; image: string }[] }) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  if (figures.length === 0) return null;

  console.log('Figures to display:', figures); // Keep this line for debugging

  return (
    <div className="mt-6 relative">
      <div className="overflow-x-auto scrollbar-hide">
        <div className="flex space-x-4 pb-4" style={{ minWidth: 'max-content' }}>
          {figures.map((figure, index) => (
            <div key={index} className="flex-shrink-0 w-[250px] cursor-pointer" onClick={() => setSelectedImage(figure.image)}>
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
      {selectedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => setSelectedImage(null)}>
          <div className="relative max-w-4xl max-h-[90vh] overflow-auto bg-white dark:bg-gray-800 p-2 rounded-lg">
            <Image
              src={selectedImage}
              alt="Full size figure"
              width={800}
              height={600}
              layout="responsive"
              objectFit="contain"
            />
            <button
              className="absolute top-2 right-2 text-white bg-gray-800 rounded-full p-2"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedImage(null);
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export function CardDemo() {
  const { user, loading } = useUser();
  const [inputValue, setInputValue] = useState('');
  const [conversation, setConversation] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const chatHistoryRef = React.useRef<HTMLDivElement>(null);
  const [ratings, setRatings] = useState<{[key: number]: 'up' | 'down' | null}>({});


  const [progressValue, setProgressValue] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'ask' | 'history' | 'calculators'>('ask');
  const [expandedAnswerIndex, setExpandedAnswerIndex] = useState<number | null>(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [isNewRequestPending, setIsNewRequestPending] = useState(false);

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
    }))
    .reverse(); // Reverse the array to show latest messages at the top

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

  const fetchLatestConversation = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true }) // Change to created_at for more accurate ordering
        .limit(50); // Increase the limit to get more messages

      if (error) throw error;

      if (data && data.length > 0) {
        const formattedData = data.map((message: Message) => ({
          ...message,
          timestamp: formatDate(message.created_at) // Use created_at instead of timestamp
        }));
        setConversation(formattedData);
      }
    } catch (error) {
      console.error('Error fetching latest conversation:', error);
      setError('Failed to fetch latest conversation');
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchLatestConversation();
    }
  }, [user, fetchLatestConversation]);

  const saveConversation = useCallback(async (newMessages: Message[]) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('conversations')
        .insert(
          newMessages.map(message => ({
            user_id: user.id,
            role: message.role,
            content: message.content,
            context: message.context,
            timestamp: new Date().toISOString() // Use current time for consistency
          }))
        );

      if (error) throw error;
      console.log('Conversation saved successfully');
      await fetchLatestConversation(); // Fetch the updated conversation after saving
    } catch (error) {
      console.error('Error saving conversation:', error);
      setError('Failed to save conversation');
    }
  }, [user, fetchLatestConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [conversation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || !user) return;

    setIsLoading(true);
    setError(null);
    setIsNewRequestPending(true);
    
    const userMessage: Message = { 
      role: 'user', 
      content: inputValue, 
      timestamp: formatDate(new Date().toISOString()),
      created_at: new Date().toISOString()
    };
    
    setConversation(prev => [...prev, userMessage]);
    
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_API_KEY}`
        },
        body: JSON.stringify({ 
          message: inputValue,
          assistantId: 'asst_sljG2pcKWrSaQY3aWIsDFObe',
          conversation: [userMessage]
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response from server');
      }

      const data = await response.json();
      const assistantMessage: Message = { 
        role: 'assistant', 
        content: data.response,
        context: data.context,
        timestamp: formatDate(new Date().toISOString()),
        created_at: new Date().toISOString()
      };
      
      setConversation(prev => [...prev, assistantMessage]);
      await saveConversation([userMessage, assistantMessage]);
    } catch (error) {
      console.error('Error:', error);
      setError('An unexpected error occurred. Please try again later.');
    } finally {
      setIsLoading(false);
      setInputValue('');
      setIsNewRequestPending(false);
    }
  };

  const clearConversation = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;

      setConversation([]);
      setError(null);
    } catch (error) {
      console.error('Error clearing conversation:', error);
      setError('Failed to clear conversation history');
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

  const ExpandableAnswer = ({ answer, onClose }: { answer: Message | undefined, onClose: () => void }) => {
    if (!answer) {
      return null; // or return some fallback UI
    }

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

  const renderChatMessages = () => {
    const messagesToRender = activeTab === 'ask' 
      ? conversation.slice(-2)  // Get the last two messages
      : conversation;

    return (
      <div className="space-y-4">
        {messagesToRender.map((message, index) => (
          <BoxReveal key={index} width="100%" boxColor="#eca72c" duration={0.5}>
            <div className={`p-3 rounded-lg ${message.role === 'user' ? 'bg-gray-100 dark:bg-gray-700' : 'bg-white/70 dark:bg-gray-600'}`}>
              <p className="font-bold">{message.role === 'user' ? 'You:' : 'TradeGuru:'}</p>
              <p className="text-xs text-gray-500 mb-2">{message.timestamp}</p>
              <ReactMarkdown className="whitespace-pre-wrap prose dark:prose-invert max-w-none">
                {message.content}
              </ReactMarkdown>
              {message.role === 'assistant' && (
                <>
                  <FigureDisplay figures={extractFigureReferences(message.content)} />
                  <div className="mt-4 flex items-center justify-center space-x-4">
                    <Button
                      onClick={() => handleRating(index, 'up')}
                      className={cn("p-2", ratings[index] === 'up' ? "bg-green-500" : "bg-gray-200")}
                    >
                      <ThumbsUp className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={() => handleRating(index, 'down')}
                      className={cn("p-2", ratings[index] === 'down' ? "bg-red-500" : "bg-gray-200")}
                    >
                      <ThumbsDown className="w-4 h-4" />
                    </Button>
                  </div>
                </>
              )}
            </div>
          </BoxReveal>
        ))}
        {isNewRequestPending && (
          <div className="text-center text-gray-500 dark:text-gray-400">
            Generating response...
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <AuthUI />;
  }

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

              <div className="hidden md:flex md:space-x-6">
                <div className="w-1/4 space-y-6">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Example Questions:</h4>
                    <AnimatedListDemo className="h-40" />
                  </div>
                </div>
                <div className="w-3/4">
                  {renderChatMessages()}
                </div>
              </div>

              <div className="md:hidden">
                {renderChatMessages()}
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
                {expandedAnswerIndex !== null && conversation[expandedAnswerIndex] && (
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
              <MaximumDemandCalculator />
              {/* You can add more calculators here */}
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
