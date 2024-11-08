"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { BoxReveal } from "@/components/magicui/box-reveal";
import ShimmerButton from "@/components/magicui/shimmer-button";
import AnimatedListDemo from "@/components/example/animated-list-demo";
import { Button } from "@/components/ui/button";
import ReactMarkdown from 'react-markdown';

import { ThumbsUp, ThumbsDown, MessageSquare, History, Calculator, Minus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import AnimatedCircularProgressBar from "@/components/magicui/animated-circular-progress-bar";
import SparklesText from "@/components/magicui/sparkles-text";
import { ChatSidebar, ChatSidebarBody, ChatSidebarTab } from "@/components/ui/chatsidebar";
import { Timeline } from "@/components/ui/timeline";
import { MovingBorder } from "@/components/ui/moving-border";
import ShinyButton from "@/components/magicui/shiny-button";
import MaximumDemandCalculator from "@/components/MaximumDemandCalculator";
import { useUser } from '@/contexts/UserContext';
import { supabase } from '@/lib/supabase';
import AuthUI from '@/components/AuthUI';
import { ExpandableCardDemo } from '@/components/blocks/expandable-card-demo-grid';


interface Message {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  context?: string | null;
  timestamp: string;
  created_at: string;
  good_response?: boolean;
  neutral_response?: boolean;
  bad_response?: boolean;
  user_id?: string;
  related_question_id?: string;
}

interface Figure {
  name: string;
  title: string;
  image: string;
  quote: string;
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
const extractFigureReferences = (content: string): Figure[] => {
  const references = new Map<string, Figure>();
  
  // Handle Tables
  const tablePattern = /Table\s+([A-Za-z0-9][._][0-9](?:[._][0-9])?)/gi;
  const tableMatches = Array.from(content.matchAll(tablePattern));
  
  for (const match of tableMatches) {
    const tableNumber = match[1];
    const formattedNumber = tableNumber
      .toLowerCase()
      .replace(/\./g, '_')
      .replace(/([a-z])_(\d)/g, '$1_$2');
      
    let imagePath = `/All Tables & Figures/AN3000_Table_${formattedNumber}.png`;
    
    // Check if special case with jpg extension
    if (tableNumber.toLowerCase().startsWith('c')) {
      imagePath = `/All Tables & Figures/AN3000_Table_${formattedNumber}.jpg`;
    }

    // Use the table number as the key to prevent duplicates
    const key = `Table_${tableNumber}`;
    if (!references.has(key)) {
      references.set(key, {
        name: `Table ${tableNumber}`,
        title: `Reference to Table ${tableNumber}`,
        image: imagePath,
        quote: `This is Table ${tableNumber} from AS/NZS 3000`
      });
    }
  }

  // Handle Figures
  const figurePattern = /Figure\s+(\d+\.\d+)/gi;
  const figureMatches = Array.from(content.matchAll(figurePattern));

  for (const match of figureMatches) {
    const figureNumber = match[1];
    const formattedNumber = figureNumber.replace('.', '_');
    
    // Use the figure number as the key to prevent duplicates
    const key = `Figure_${figureNumber}`;
    if (!references.has(key)) {
      references.set(key, {
        name: `Figure ${figureNumber}`,
        title: `Reference to Figure ${figureNumber}`,
        image: `/All Tables & Figures/AN3000_Figure_${formattedNumber}.png`,
        quote: `This is Figure ${figureNumber} from AS/NZS 3000`
      });
    }
  }

  return Array.from(references.values());
};

// Add a utility function to check if file exists
const checkImageExists = async (path: string): Promise<boolean> => {
  try {
    const response = await fetch(path, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
};

export function CardDemo() {
  const [inputValue, setInputValue] = useState('');
  const [conversation, setConversation] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progressValue, setProgressValue] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'ask' | 'history' | 'calculators'>('ask');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [ratings, setRatings] = useState<{[key: string]: 'up' | 'down' | 'neutral' | null}>({});
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [isNewRequestPending, setIsNewRequestPending] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const { user } = useUser();
  const [expandedAnswerIndex, setExpandedAnswerIndex] = useState<number | null>(null);

  const filteredConversation = conversation.filter(message =>
    message.content.toLowerCase().includes(searchKeyword.toLowerCase())
  );

  const filteredTimelineData = filteredConversation
    .filter(message => message.role === 'user')
    .map((message) => {
      const userIndex = filteredConversation.indexOf(message);
      return {
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
                onClick={() => setExpandedAnswerIndex(userIndex + 1)}
                shimmerColor="#eca72c"
                background="#ee5622"
              />
            </div>
          </div>
        ),
      };
    })
    .reverse();

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

  const fetchLatestConversation = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*, good_response, neutral_response, bad_response')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        const formattedData = data.map((message: Message) => ({
          ...message,
          timestamp: formatDate(message.created_at)
        }));
        setConversation(formattedData);
        console.log('Fetched conversation:', formattedData);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || !user) return;

    setIsLoading(true);
    setError(null);
    setIsNewRequestPending(true);
    
    const userMessage: Message = { 
      role: 'user', 
      content: inputValue.trim(),
      timestamp: formatDate(new Date().toISOString()),
      created_at: new Date().toISOString(),
      user_id: user.id
    };
    
    console.log('Saving user message:', userMessage);

    try {
      // First, save the user's question
      const { data: savedQuestion, error: questionError } = await supabase
        .from('conversations')
        .insert([userMessage])
        .select()
        .single();

      if (questionError) {
        console.error('Error saving question:', questionError);
        throw new Error('Failed to save question');
      }

      console.log('Question saved successfully:', savedQuestion);

      // Update local state with saved question
      setConversation(prev => [...prev, savedQuestion]);
      setInputValue(''); // Clear input immediately

      // Get AI response
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
      
      const figures = extractFigureReferences(data.response);
      
      // Check each figure/table path and filter out non-existent ones
      const validFigures = await Promise.all(
        figures.map(async (fig) => {
          const exists = await checkImageExists(fig.image);
          if (!exists && fig.image.endsWith('.png')) {
            // Try jpg if png doesn't exist
            const jpgPath = fig.image.replace('.png', '.jpg');
            const jpgExists = await checkImageExists(jpgPath);
            if (jpgExists) {
              return { ...fig, image: jpgPath };
            }
          }
          return exists ? fig : null;
        })
      );

      const filteredFigures = validFigures.filter((fig): fig is Figure => fig !== null);

      // Create assistant message without the figures field for database
      const assistantMessage: Omit<Message, 'figures'> = { 
        role: 'assistant', 
        content: data.response,
        context: data.context,
        timestamp: formatDate(new Date().toISOString()),
        created_at: new Date().toISOString(),
        user_id: user.id,
        related_question_id: savedQuestion.id
      };

      console.log('Saving assistant message:', assistantMessage);

      // Save the assistant's response
      const { data: savedResponse, error: responseError } = await supabase
        .from('conversations')
        .insert([assistantMessage])
        .select()
        .single();

      if (responseError) {
        console.error('Error saving response:', responseError);
        throw new Error('Failed to save response');
      }

      // Add figures back to the saved response for local state
      const responseWithFigures = {
        ...savedResponse,
        figures: filteredFigures
      };

      console.log('Response saved successfully:', savedResponse);

      // Update local state with the response including figures
      setConversation(prev => {
        const withoutTemp = prev.filter(msg => msg.id !== savedQuestion.id);
        return [...withoutTemp, savedQuestion, responseWithFigures];
      });

      console.log('Message pair verified and saved');

    } catch (error) {
      console.error('Error in submission:', error);
      setError(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
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

  const handleRating = async (messageId: string, rating: 'up' | 'down' | 'neutral') => {
    const message = conversation.find(msg => msg.id === messageId);
    console.log('Rating message:', message);

    if (!message || message.role !== 'assistant') {
      console.error('Invalid message for rating:', message);
      return;
    }

    try {
      const updateData = {
        good_response: rating === 'up',
        neutral_response: rating === 'neutral',
        bad_response: rating === 'down'
      };
      console.log('Updating database with:', updateData);

      const { data, error } = await supabase
        .from('conversations')
        .update(updateData)
        .eq('id', messageId)
        .select();

      if (error) throw error;

      console.log('Database update result:', data);

      // Update the local state
      setRatings(prev => ({ ...prev, [messageId]: rating }));

      // Update the conversation state
      setConversation(prev => prev.map(msg => 
        msg.id === messageId ? { ...msg, ...updateData } : msg
      ));

      setFeedbackMessage("Thank you for your feedback!");
      setTimeout(() => setFeedbackMessage(null), 2000);
    } catch (error) {
      console.error('Error saving rating:', error);
      setError('Failed to save rating');
    }
  };

  const handleTabChange = (tab: string) => {
    console.log('Tab changed to:', tab);
    setActiveTab(tab.toLowerCase() as 'ask' | 'history' | 'calculators');
    setSidebarOpen(false);
  };

  const ExpandableAnswer = ({ answerIndex, onClose }: { answerIndex: number, onClose: () => void }) => {
    const answer = conversation[answerIndex];
    if (!answer || answer.role !== 'assistant') {
      return null;
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
                <ExpandableCardDemo figures={figures} />
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    );
  };

  const renderChatMessages = () => {
    let messagesToRender: Message[] = [];

    if (activeTab === 'ask') {
      // Find the last user message
      const lastUserIndex = conversation.findLastIndex(msg => msg.role === 'user');
      if (lastUserIndex !== -1) {
        messagesToRender.push(conversation[lastUserIndex]);
        // Get the corresponding assistant message if it exists
        if (lastUserIndex + 1 < conversation.length && conversation[lastUserIndex + 1].role === 'assistant') {
          messagesToRender.push(conversation[lastUserIndex + 1]);
        }
      }
    } else {
      messagesToRender = conversation;
    }

    console.log('Messages to render:', messagesToRender);

    return (
      <div className="space-y-4">
        {messagesToRender.map((message) => (
          <BoxReveal key={`${message.role}-${message.id}-${message.timestamp}`} width="100%" boxColor="#eca72c" duration={0.5}>
            <div className={`p-3 rounded-lg ${message.role === 'user' ? 'bg-gray-100 dark:bg-gray-700' : 'bg-white/70 dark:bg-gray-600'}`}>
              <p className="font-bold">{message.role === 'user' ? 'You:' : 'TradeGuru:'}</p>
              <p className="text-xs text-gray-500 mb-2">{message.timestamp}</p>
              <ReactMarkdown className="whitespace-pre-wrap prose dark:prose-invert max-w-none">
                {message.content}
              </ReactMarkdown>
              {message.role === 'assistant' && (
                <>
                  <div className="mt-4">
                    <ExpandableCardDemo figures={extractFigureReferences(message.content)} />
                  </div>
                  <div className="mt-4 flex items-center justify-center space-x-4">
                    <Button
                      onClick={() => handleRating(message.id!, 'up')}
                      className={cn("p-2", ratings[message.id!] === 'up' ? "bg-green-400" : "bg-gray-200")}
                    >
                      <ThumbsUp className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={() => handleRating(message.id!, 'neutral')}
                      className={cn("p-2", ratings[message.id!] === 'neutral' ? "bg-yellow-500" : "bg-gray-200")}
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={() => handleRating(message.id!, 'down')}
                      className={cn("p-2", ratings[message.id!] === 'down' ? "bg-red-500" : "bg-gray-200")}
                    >
                      <ThumbsDown className="w-4 h-4" />
                    </Button>
                  </div>
                  {feedbackMessage && (
                    <div className="mt-2 text-center text-sm text-gray-500">
                      {feedbackMessage}
                    </div>
                  )}
                </>
              )}
            </div>
          </BoxReveal>
        ))}
        {isNewRequestPending && (
          <div className="text-center text-gray-500 dark:text-gray-400 mt-4">
            Generating response...
          </div>
        )}
      </div>
    );
  };

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

      <div className="flex-1 flex flex-col">
        {activeTab === 'ask' && (
          <div className="sticky top-0 bg-white dark:bg-gray-800 p-4 shadow-md sticky-header z-[50]">
            <div className="flex flex-col md:flex-row items-center space-y-1 md:space-y-0 md:space-x-1 mb-4">
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
          </div>
        )}

        <div className="flex-1 p-4 md:p-6 overflow-y-auto max-h-[calc(90vh-140px)]" ref={chatContainerRef}>
          <div className="flex flex-col gap-6">
            {activeTab === 'ask' && (
              <div className="w-full space-y-6">
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
                    text="Conversation History"
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
                      answerIndex={expandedAnswerIndex}
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
    </div>
  );
}
