"use client";
import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { BoxReveal } from "@/components/magicui/box-reveal";
import ShimmerButton from "@/components/magicui/shimmer-button";
import AnimatedListDemo from "@/components/example/animated-list-demo";
import { Button } from "@/components/ui/button";
import ReactMarkdown from 'react-markdown';
import NumberTicker from "@/components/magicui/number-ticker";
import { ThumbsUp, ThumbsDown, MessageSquare, History } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useExpandableMessage } from '@/components/ExpandableMessageProvider';
import AnimatedCircularProgressBar from "@/components/magicui/animated-circular-progress-bar";
import SparklesText from "@/components/magicui/sparkles-text";
import { ChatSidebar, ChatSidebarBody, ChatSidebarTab } from "@/components/ui/chatsidebar";
import { Timeline } from "@/components/ui/timeline";
import { MovingBorder } from "@/components/ui/moving-border";
import ShinyButton from "@/components/magicui/shiny-button";

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

export function CardDemo() {
  const [inputValue, setInputValue] = useState('');
  const [conversation, setConversation] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const chatHistoryRef = React.useRef<HTMLDivElement>(null);
  const [factCheckResults, setFactCheckResults] = useState<{[key: number]: { result: string, isCorrect: boolean } }>({});
  const [isFactChecking, setIsFactChecking] = useState<{[key: number]: boolean}>({});
  const [ratings, setRatings] = useState<{[key: number]: 'up' | 'down' | null}>({});
  const [goodAnswers, setGoodAnswers] = useState(0);
  const [badAnswers, setBadAnswers] = useState(0);

  const [progressValue, setProgressValue] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'ask' | 'history'>('ask');
  const [expandedAnswerIndex, setExpandedAnswerIndex] = useState<number | null>(null);

  const tabs = [
    {
      label: "Ask",
      icon: <MessageSquare className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
    },
    {
      label: "History",
      icon: <History className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
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
      const goodCount = Object.values(newRatings).filter(r => r === 'up').length;
      const badCount = Object.values(newRatings).filter(r => r === 'down').length;
      setGoodAnswers(goodCount);
      setBadAnswers(badCount);
      return newRatings;
    });
  };

  const handleTabChange = (tab: string) => {
    console.log('Tab changed to:', tab);
    setActiveTab(tab.toLowerCase() as 'ask' | 'history');
    setSidebarOpen(false);
  };

  console.log('Current active tab:', activeTab);

  const lastUserMessage = conversation.filter(msg => msg.role === 'user').pop();
  const lastAssistantMessage = conversation.filter(msg => msg.role === 'assistant').pop();

  const timelineData = conversation
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

  const ExpandableAnswer = ({ answer, onClose }: { answer: Message, onClose: () => void }) => (
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
        <div className="relative z-10">
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
        </div>
      </motion.div>
    </motion.div>
  );

  return (
    <div className="w-full max-w-6xl mx-auto bg-white dark:bg-gray-800 rounded-xl shadow-lg relative flex">
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

      <div className="flex-1 p-6 overflow-y-auto max-h-[90vh]">
        <div className="flex flex-col md:flex-row gap-6">
          {activeTab === 'ask' && (
            <div className="w-full md:w-1/4 space-y-6">
              <div>
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Example Questions:</h4>
                <AnimatedListDemo className="h-40" />
              </div>
              <div className="space-y-2">
                <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">Response Ratings:</span>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center">
                    <ThumbsUp className="w-4 h-4 mr-1 text-green-500" />
                    <NumberTicker value={goodAnswers} className="text-sm" />
                  </div>
                  <div className="flex items-center">
                    <ThumbsDown className="w-4 h-4 mr-1 text-red-500" />
                    <NumberTicker value={badAnswers} className="text-sm" />
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className={cn("w-full transition-all duration-300", activeTab === 'ask' ? "md:w-3/4" : "md:w-full")}>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {activeTab === 'ask' ? (
                <>
                  Ask 
                  <SparklesText
                    text="TradeGuru"
                    colors={{ first: "#ee5622", second: "#eca72c" }}
                    className="ml-2 inline-block"
                    sparklesCount={3}
                  />
                </>
              ) : (
                "Conversation History"
              )}
            </h3>
            
            {activeTab === 'ask' ? (
              <div className="space-y-4">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="flex items-start space-x-4">
                    <div className="flex-grow">
                      <Input
                        type="text"
                        placeholder="Type your question here..."
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        className="w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
                      />
                    </div>
                    <div className="flex-shrink-0 flex items-center">
                      <ShimmerButton
                        type="submit"
                        disabled={isLoading}
                        shimmerColor="#eca72c"
                        background="#ee5622"
                        className="flex items-center justify-center px-4 py-2"
                      >
                        {isLoading ? (
                          <span className="text-base text-white">Thinking...</span>
                        ) : (
                          'Send'
                        )}
                      </ShimmerButton>
                      {isLoading && (
                        <div className="ml-2 relative">
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
                    </div>
                  </BoxReveal>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <ShimmerButton
                  onClick={clearConversation}
                  shimmerColor="#eca72c"
                  background="#44355B"
                  className="mb-4"
                >
                  Clear Conversation History
                </ShimmerButton>
                {conversation.length > 0 ? (
                  <Timeline data={timelineData} lineColor="#ee5622" />
                ) : (
                  <p className="text-gray-600 dark:text-gray-400">No conversation history yet.</p>
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